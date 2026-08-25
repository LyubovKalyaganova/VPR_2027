import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localAttemptRecorder } from '../db';
import { TaskEngine } from '../engine';
import type { SessionSummary, TaskSession, UserAnswer } from '../engine';
import { MATH_SKILLS, type MathSkill } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { WORLD_SKILLS } from '../data/taxonomy/world';
import { READING_SKILLS } from '../data/taxonomy/literaryReading';
import { ENGLISH_SKILLS } from '../data/taxonomy/english';
import { skillsForSubject } from '../data/taxonomy/catalog';
import { getDemoTasks } from '../data/questions/demoTasks';
import { selectWeightedMathSessionTasks } from '../features/mathematics/mathTrainingSelection';
import { selectWeightedRussianSessionTasks } from '../features/russian/russianTrainingSelection';
import { selectWeightedWorldSessionTasks } from '../features/world/worldTrainingSelection';
import { selectWeightedReadingSessionTasks } from '../features/reading/literaryReadingTrainingSelection';
import { selectWeightedEnglishSessionTasks } from '../features/english/englishTrainingSelection';
import { selectAdaptiveTasks } from '../services/adaptiveTaskSelector';
import { calculateSkillMastery } from '../services/masteryService';
import { getReviewState } from '../services/reviewScheduler';
import { getCombinedDailyPlan } from '../services/dailyPlanRunner';
import { getRemainingDailyTaskIds } from '../services/dailyPlanProgressService';
import { pickDiagnosticTasks } from '../services/diagnosticTasks';
import { taskRepository } from '../services/taskRepository';
import {
  assertUniqueTaskIds,
  pickRandomSubjectTasks,
  pickTopicSessionTasks,
} from '../services/trainingSessionBuilder';
import type { Attempt, Task, SubjectId, TrainingMode } from '../types';

/**
 * quick / normal: взвешенный mix (trainingWeight → generators).
 * random: равномерный shuffle из банка предмета.
 */
function pickWorldTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedWorldSessionTasks(5);
    case 'normal':
      return selectWeightedWorldSessionTasks(10);
    case 'random':
      return pickRandomSubjectTasks('world', 10);
    default:
      return taskRepository.getWorldTasks();
  }
}

function pickReadingTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedReadingSessionTasks(5);
    case 'normal':
      return selectWeightedReadingSessionTasks(10);
    case 'random':
      return pickRandomSubjectTasks('reading', 10);
    default:
      return taskRepository.getLiteraryReadingTasks();
  }
}

function pickEnglishTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedEnglishSessionTasks(5);
    case 'normal':
      return selectWeightedEnglishSessionTasks(10);
    case 'random':
      return pickRandomSubjectTasks('english', 10);
    default:
      return taskRepository.getEnglishTasks();
  }
}

function pickRussianTasks(mode: TrainingMode): Task[] {
  switch (mode) {
    case 'quick':
      return selectWeightedRussianSessionTasks(5);
    case 'normal':
      return selectWeightedRussianSessionTasks(10);
    case 'random':
      return pickRandomSubjectTasks('russian', 10);
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
      return selectWeightedMathSessionTasks(10);
    case 'random':
      return pickRandomSubjectTasks('mathematics', 10);
    default:
      return taskRepository.getMathTasks();
  }
}

function createTopicSessionTasks(subject: SubjectId, topicId: string): Task[] {
  const tasks = taskRepository.getByTopic(topicId).filter((task) => task.subject === subject);
  const picked = pickTopicSessionTasks(tasks, 10);
  assertUniqueTaskIds(picked);
  return picked;
}

export const taskEngine = new TaskEngine(taskRepository.getById, localAttemptRecorder);

const MISTAKES_COUNT = 5;
const REVIEW_COUNT = 5;

function skillAttempts(attempts: Attempt[], userId: string, subject: SubjectId): Attempt[] {
  return attempts.filter(
    (attempt) =>
      attempt.userId === userId &&
      attempt.subject === subject &&
      typeof attempt.skillId === 'string' &&
      attempt.skillId.length > 0,
  );
}

export function selectDueSkills(
  attempts: Attempt[],
  userId: string,
  subject: SubjectId,
  nowIso?: string,
): { id: string }[] {
  const relevant = skillAttempts(attempts, userId, subject);
  return skillsForSubject(subject).filter((skill) => {
    const mastery = calculateSkillMastery(relevant, skill.id, userId);
    return getReviewState(mastery, nowIso).isReviewDue;
  });
}

/**
 * Математические навыки, у которых по reviewScheduler уже наступило повторение.
 * DEMO без skillId и чужой userId сюда не попадают.
 */
export function selectDueMathSkills(attempts: Attempt[], userId: string, nowIso?: string): MathSkill[] {
  const dueIds = new Set(selectDueSkills(attempts, userId, 'mathematics', nowIso).map((skill) => skill.id));
  return MATH_SKILLS.filter((skill) => dueIds.has(skill.id));
}

/**
 * Подбор заданий для режима review: только due-навыки, дальше adaptiveTaskSelector.
 */
export function selectReviewTasks(
  attempts: Attempt[],
  userId: string,
  subject: SubjectId = 'mathematics',
  nowIso?: string,
): Task[] {
  const dueSkills = selectDueSkills(attempts, userId, subject, nowIso);
  if (dueSkills.length === 0) {
    return [];
  }
  return selectAdaptiveTasks({
    userId,
    subject,
    count: REVIEW_COUNT,
    attempts: skillAttempts(attempts, userId, subject),
    tasks: taskRepository.getBySubject(subject),
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
 * Актуальные ошибки пользователя: последняя попытка по questionId неверна.
 */
export function selectMistakeTasks(
  attempts: Attempt[],
  userId: string,
  subject?: SubjectId,
): Task[] {
  const latestByQuestion = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (attempt.userId !== userId) {
      continue;
    }
    if (subject && attempt.subject !== subject) {
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
    if (!task) {
      continue;
    }
    if (subject && task.subject !== subject) {
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
  startLiteraryReading: (userId: string, mode?: TrainingMode) => string;
  startEnglish: (userId: string, mode?: TrainingMode) => string;
  startMathTopic: (userId: string, topicId: string) => string | null;
  startRussianTopic: (userId: string, topicId: string) => string | null;
  startWorldTopic: (userId: string, topicId: string) => string | null;
  startLiteraryReadingTopic: (userId: string, topicId: string) => string | null;
  startEnglishTopic: (userId: string, topicId: string) => string | null;
  startWeak: (userId: string) => string | null;
  startRussianWeak: (userId: string) => string | null;
  startWorldWeak: (userId: string) => string | null;
  startLiteraryReadingWeak: (userId: string) => string | null;
  startEnglishWeak: (userId: string) => string | null;
  startReview: (userId: string, subject?: SubjectId) => string | null;
  startDaily: (userId: string, subjects?: SubjectId[]) => string | null;
  startMistakes: (userId: string, subject?: SubjectId) => string | null;
  startDiagnostic: (userId: string, subjects: SubjectId[]) => string | null;
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
        const tasks = pickMathTasks(mode);
        assertSubjectTasks(tasks, 'mathematics');
        assertUniqueTaskIds(tasks);
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
      startLiteraryReading: (userId, mode = 'quick') => {
        const tasks = pickReadingTasks(mode);
        assertSubjectTasks(tasks, 'reading');
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
      startEnglish: (userId, mode = 'quick') => {
        const tasks = pickEnglishTasks(mode);
        assertSubjectTasks(tasks, 'english');
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
      startLiteraryReadingWeak: (userId) => {
        const tasks = selectAdaptiveTasks({
          userId,
          subject: 'reading',
          count: 5,
          attempts: localAttemptRecorder.getAll(userId),
          tasks: taskRepository.getBySubject('reading'),
          skills: READING_SKILLS,
        });
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'reading');
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
      startEnglishWeak: (userId) => {
        const tasks = selectAdaptiveTasks({
          userId,
          subject: 'english',
          count: 5,
          attempts: localAttemptRecorder.getAll(userId),
          tasks: taskRepository.getBySubject('english'),
          skills: ENGLISH_SKILLS,
        });
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'english');
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
      startReview: (userId, subject = 'mathematics') => {
        const tasks = selectReviewTasks(localAttemptRecorder.getAll(userId), userId, subject);
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
      startDaily: (userId, subjects) => {
        const nowIso = new Date().toISOString();
        const list = subjects && subjects.length > 0 ? subjects : (['mathematics'] as SubjectId[]);
        const combined = getCombinedDailyPlan({
          userId,
          subjects: list,
          nowIso,
        });
        const remainingIds = combined.plans.flatMap((plan) =>
          getRemainingDailyTaskIds({
            plan,
            attempts: localAttemptRecorder.getAll(userId),
            userId,
            nowIso,
          }),
        );
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
      startDiagnostic: (userId, subjects) => {
        const tasks = pickDiagnosticTasks(subjects);
        if (tasks.length === 0) {
          return null;
        }
        assertUniqueTaskIds(tasks);
        const session = taskEngine.createSession({
          userId,
          mode: 'diagnostic',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startMathTopic: (userId, topicId) => {
        const tasks = createTopicSessionTasks('mathematics', topicId);
        if (tasks.length === 0) {
          return null;
        }
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startRussianTopic: (userId, topicId) => {
        const tasks = createTopicSessionTasks('russian', topicId);
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'russian');
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startWorldTopic: (userId, topicId) => {
        const tasks = createTopicSessionTasks('world', topicId);
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'world');
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startLiteraryReadingTopic: (userId, topicId) => {
        const tasks = createTopicSessionTasks('reading', topicId);
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'reading');
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startEnglishTopic: (userId, topicId) => {
        const tasks = createTopicSessionTasks('english', topicId);
        if (tasks.length === 0) {
          return null;
        }
        assertSubjectTasks(tasks, 'english');
        const session = taskEngine.createSession({
          userId,
          mode: 'topic',
          tasks,
        });
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        }));
        return session.id;
      },
      startMistakes: (userId, subject) => {
        const tasks = selectMistakeTasks(localAttemptRecorder.getAll(userId), userId, subject);
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
          .filter((task): task is NonNullable<typeof task> => Boolean(task));
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
