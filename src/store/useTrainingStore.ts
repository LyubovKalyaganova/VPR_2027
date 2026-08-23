import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localAttemptRecorder } from '../db';
import { TaskEngine } from '../engine';
import type { SessionSummary, TaskSession, UserAnswer } from '../engine';
import { MATH_SKILLS, type MathSkill } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { WORLD_SKILLS } from '../data/taxonomy/world';
import { getDemoTasks } from '../data/questions/demoTasks';
import { selectWeightedMathSessionTasks } from '../features/mathematics/mathTrainingSelection';
import { selectWeightedRussianSessionTasks } from '../features/russian/russianTrainingSelection';
import { selectWeightedWorldSessionTasks } from '../features/world/worldTrainingSelection';
import { selectAdaptiveTasks } from '../services/adaptiveTaskSelector';
import { calculateSkillMastery } from '../services/masteryService';
import { getReviewState } from '../services/reviewScheduler';
import { getDailyPlan } from '../services/dailyPlanRunner';
import { getRemainingDailyTaskIds } from '../services/dailyPlanProgressService';
import { taskRepository } from '../services/taskRepository';
import type { Attempt, Task, SubjectId, TrainingMode } from '../types';
import { shuffle } from '../utils/shuffle';

/**
 * quick / normal / random: взвешенный mix (MATH_SKILL_WEIGHTS → recommendSessionSkillMix → generators).
 * Не равномерный shuffle по всему банку.
 */
function pickWorldTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedWorldSessionTasks(5);
    case 'normal':
      return selectWeightedWorldSessionTasks(10);
    case 'random':
      return selectWeightedWorldSessionTasks(10, { seed: Date.now() >>> 0 });
    default:
      return taskRepository.getWorldTasks();
  }
}

function pickRussianTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedRussianSessionTasks(5);
    case 'normal':
      return selectWeightedRussianSessionTasks(10);
    case 'random':
      return selectWeightedRussianSessionTasks(10, { seed: Date.now() >>> 0 });
    default:
      return taskRepository.getRussianTasks();
  }
}

function assertSubjectTasks(tasks: Task[], subject: SubjectId): void {
  const wrong = tasks.find((task) => task.subject !== subject);
  if (wrong) {
    throw new Error(`Сессия ${subject}: найдено задание другого предмета (${wrong.id}, ${wrong.subject})`);
  }
}

function pickMathTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedMathSessionTasks(5);
    case 'normal':
    case 'random':
      return selectWeightedMathSessionTasks(10);
    default:
      return taskRepository.getMathTasks();
  }
}

export const taskEngine = new TaskEngine(taskRepository.getById, localAttemptRecorder);

const MISTAKES_COUNT = 5;
const REVIEW_COUNT = 5;

function mathSkillAttempts(attempts: Attempt[], userId: string): Attempt[] {
  return attempts.filter(
    (attempt) =>
      attempt.userId === userId &&
      attempt.subject === 'mathematics' &&
      typeof attempt.skillId === 'string' &&
      attempt.skillId.length > 0,
  );
}

/**
 * Математические навыки, у которых по reviewScheduler уже наступило повторение.
 * DEMO без skillId и чужой userId сюда не попадают.
 */
export function selectDueMathSkills(attempts: Attempt[], userId: string, nowIso?: string): MathSkill[] {
  const relevant = mathSkillAttempts(attempts, userId);
  return MATH_SKILLS.filter((skill) => {
    const mastery = calculateSkillMastery(relevant, skill.id, userId);
    return getReviewState(mastery, nowIso).isReviewDue;
  });
}

/**
 * Подбор заданий для режима review: только due-навыки, дальше adaptiveTaskSelector.
 */
export function selectReviewTasks(attempts: Attempt[], userId: string, nowIso?: string): Task[] {
  const dueSkills = selectDueMathSkills(attempts, userId, nowIso);
  if (dueSkills.length === 0) {
    return [];
  }
  return selectAdaptiveTasks({
    userId,
    subject: 'mathematics',
    count: REVIEW_COUNT,
    attempts: mathSkillAttempts(attempts, userId),
    tasks: taskRepository.getBySubject('mathematics'),
    skills: dueSkills,
    nowIso,
  });
}

function attemptTime(attempt: Attempt): number {
  const parsed = Date.parse(attempt.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isNewerAttempt(candidate: Attempt, current: Attempt): boolean {
  const delta = attemptTime(candidate) - attemptTime(current);
  if (delta !== 0) {
    return delta > 0;
  }
  return candidate.attemptId.localeCompare(current.attemptId) > 0;
}

/**
 * Актуальные математические ошибки пользователя: последняя попытка по questionId неверна.
 */
export function selectMistakeTasks(attempts: Attempt[], userId: string): Task[] {
  const latestByQuestion = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (attempt.userId !== userId || attempt.subject !== 'mathematics') {
      continue;
    }
    if (typeof attempt.skillId !== 'string' || attempt.skillId.length === 0) {
      continue;
    }
    if (typeof attempt.questionId !== 'string' || attempt.questionId.length === 0) {
      continue;
    }
    const current = latestByQuestion.get(attempt.questionId);
    if (!current || isNewerAttempt(attempt, current)) {
      latestByQuestion.set(attempt.questionId, attempt);
    }
  }

  const currentMistakes = [...latestByQuestion.values()]
    .filter((attempt) => attempt.isCorrect === false)
    .sort((left, right) => {
      const byDate = attemptTime(right) - attemptTime(left);
      if (byDate !== 0) {
        return byDate;
      }
      return right.attemptId.localeCompare(left.attemptId);
    });

  const tasks: Task[] = [];
  const seen = new Set<string>();
  for (const attempt of currentMistakes) {
    if (tasks.length >= MISTAKES_COUNT) {
      break;
    }
    if (seen.has(attempt.questionId)) {
      continue;
    }
    const task = taskRepository.getById(attempt.questionId);
    if (!task || task.subject !== 'mathematics') {
      continue;
    }
    seen.add(attempt.questionId);
    tasks.push(task);
  }
  return tasks;
}

interface TrainingState {
  sessions: Record<string, TaskSession>;
  summaries: Record<string, SessionSummary>;
  startDemo: (userId: string) => string;
  startMath: (userId: string, mode?: TrainingMode) => string;
  startRussian: (userId: string, mode?: TrainingMode) => string;
  startWorld: (userId: string, mode?: TrainingMode) => string;
  startMathTopic: (userId: string, topicId: string) => string | null;
  startRussianTopic: (userId: string, topicId: string) => string | null;
  startWorldTopic: (userId: string, topicId: string) => string | null;
  startWeak: (userId: string) => string | null;
  startRussianWeak: (userId: string) => string | null;
  startWorldWeak: (userId: string) => string | null;
  startReview: (userId: string) => string | null;
  startDaily: (userId: string) => string | null;
  startMistakes: (userId: string) => string | null;
  startMistakeReview: (userId: string, sessionId: string) => string | null;
  setAnswer: (sessionId: string, answer: UserAnswer) => void;
  useHint: (sessionId: string) => void;
  submit: (sessionId: string) => void;
  next: (sessionId: string) => TaskSession | undefined;
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      sessions: {},
      summaries: {},
      startDemo: (userId) => {
        const session = taskEngine.createSession({
          userId,
          mode: 'demo',
          tasks: getDemoTasks(),
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startMath: (userId, mode = 'quick') => {
        const session = taskEngine.createSession({
          userId,
          mode,
          tasks: pickMathTasks(mode),
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startRussian: (userId, mode = 'quick') => {
        const tasks = pickRussianTasks(mode);
        assertSubjectTasks(tasks, 'russian');
        const session = taskEngine.createSession({
          userId,
          mode,
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startWorld: (userId, mode = 'quick') => {
        const tasks = pickWorldTasks(mode);
        assertSubjectTasks(tasks, 'world');
        const session = taskEngine.createSession({
          userId,
          mode,
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startWeak: (userId) => {
        const tasks = selectAdaptiveTasks({
          userId,
          subject: 'mathematics',
          count: 5,
          attempts: localAttemptRecorder.getAll(userId),
          tasks: taskRepository.getBySubject('mathematics'),
          skills: MATH_SKILLS,
        });
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'weak',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startRussianWeak: (userId) => {
        const tasks = selectAdaptiveTasks({
          userId,
          subject: 'russian',
          count: 5,
          attempts: localAttemptRecorder.getAll(userId),
          tasks: taskRepository.getBySubject('russian'),
          skills: RUSSIAN_SKILLS,
        });
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'russian');
        const session = taskEngine.createSession({
          userId,
          mode: 'weak',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startWorldWeak: (userId) => {
        const tasks = selectAdaptiveTasks({
          userId,
          subject: 'world',
          count: 5,
          attempts: localAttemptRecorder.getAll(userId),
          tasks: taskRepository.getBySubject('world'),
          skills: WORLD_SKILLS,
        });
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'world');
        const session = taskEngine.createSession({
          userId,
          mode: 'weak',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startReview: (userId) => {
        const tasks = selectReviewTasks(localAttemptRecorder.getAll(userId), userId);
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'review',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startDaily: (userId) => {
        const nowIso = new Date().toISOString();
        const plan = getDailyPlan({
          userId,
          subject: 'mathematics',
          count: 5,
          nowIso,
        });
        const remainingIds = getRemainingDailyTaskIds({
          plan,
          attempts: localAttemptRecorder.getAll(userId),
          userId,
          nowIso,
        });
        const tasks: Task[] = [];
        const seen = new Set<string>();
        for (const taskId of remainingIds) {
          if (seen.has(taskId)) {
            continue;
          }
          const task = taskRepository.getById(taskId);
          if (!task) {
            continue;
          }
          seen.add(taskId);
          tasks.push(task);
        }
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'daily',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startMathTopic: (userId, topicId) => {
        const tasks = taskRepository
          .getByTopic(topicId)
          .filter((task) => task.subject === 'mathematics');
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks: shuffle(tasks).slice(0, 10),
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startRussianTopic: (userId, topicId) => {
        const tasks = taskRepository.getByTopic(topicId).filter((task) => task.subject === 'russian');
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'russian');
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks: shuffle(tasks).slice(0, 10),
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startWorldTopic: (userId, topicId) => {
        const tasks = taskRepository.getByTopic(topicId).filter((task) => task.subject === 'world');
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'world');
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks: shuffle(tasks).slice(0, 10),
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startMistakes: (userId) => {
        const tasks = selectMistakeTasks(localAttemptRecorder.getAll(userId), userId);
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'mistakes',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startMistakeReview: (userId, sessionId) => {
        const summary = get().summaries[sessionId];
        if (!summary || summary.incorrectTaskIds.length === 0) {
          return null;
        }
        const tasks = summary.incorrectTaskIds
          .map((id) => taskRepository.getById(id))
          .filter((task): task is NonNullable<typeof task> => {
            if (!task) {
              return false;
            }
            return typeof task.skillId === 'string' && task.skillId.length > 0;
          });
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'mistakes',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      setAnswer: (sessionId, answer) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }
        const updated = taskEngine.setAnswer(session, answer);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updated },
        }));
      },
      useHint: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }
        const updated = taskEngine.useHint(session);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updated },
        }));
      },
      submit: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }
        const updated = taskEngine.submit(session);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updated },
        }));
      },
      next: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return undefined;
        }
        const updated = taskEngine.next(session);
        const summaries = { ...get().summaries };
        if (updated.phase === 'completed') {
          summaries[sessionId] = taskEngine.getSummary(updated);
        }
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updated },
          summaries,
        }));
        return updated;
      },
    }),
    {
      name: 'vpr-4-2027-training',
      partialize: (state) => ({
        sessions: state.sessions,
        summaries: state.summaries,
      }),
    },
  ),
);
