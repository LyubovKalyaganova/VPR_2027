/**
 * Stage 15: training flow, modes, isolation, duplicates, persistence smoke.
 * Does not modify FROZEN subject content.
 */
import { MemoryAttemptRecorder } from '../db/memoryAttemptRecorder';
import { TaskEngine } from '../engine';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { selectWeightedMathSessionTasks } from '../features/mathematics/mathTrainingSelection';
import { selectAdaptiveTasks } from './adaptiveTaskSelector';
import { calculateSkillMastery } from './masteryService';
import { getSessionSkillBreakdown, getSubjectScore } from './progressService';
import {
  assertUniqueTaskIds,
  dedupeTasksById,
  pickRandomSubjectTasks,
  pickTopicSessionTasks,
} from './trainingSessionBuilder';
import { taskRepository } from './taskRepository';
import type { Attempt, SubjectId } from '../types';

const USER = 'stage15-user';
const SUBJECTS: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];

function attempt(
  overrides: Partial<Attempt> & Pick<Attempt, 'isCorrect' | 'skillId' | 'subject'>,
): Attempt {
  return {
    attemptId: overrides.attemptId ?? `a-${Math.random().toString(36).slice(2, 8)}`,
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId ?? 'q-1',
    sessionId: overrides.sessionId ?? 'session-1',
    date: overrides.date ?? '2026-08-23T12:00:00.000Z',
    answer: overrides.answer ?? 'x',
    isCorrect: overrides.isCorrect,
    timeSpent: overrides.timeSpent ?? 3000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 2,
    subject: overrides.subject,
    topic: overrides.topic ?? 't',
    skill: overrides.skill ?? 's',
    topicId: overrides.topicId,
    skillId: overrides.skillId,
    mode: overrides.mode ?? 'quick',
  };
}

export function runStage15TrainingFlowSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  // Quick = 5, normal = 10
  check(selectWeightedMathSessionTasks(5).length === 5, 'quick math = 5');
  check(selectWeightedMathSessionTasks(10).length === 10, 'normal math = 10');

  // Random from subject bank, unique ids
  for (const subject of SUBJECTS) {
    const random = pickRandomSubjectTasks(subject, 10);
    check(random.length > 0, `random ${subject} non-empty`);
    check(random.every((task) => task.subject === subject), `random ${subject} isolation`);
    try {
      assertUniqueTaskIds(random);
    } catch {
      failures.push(`random ${subject} duplicate ids`);
    }
  }

  const randomMath = pickRandomSubjectTasks('mathematics', 10);
  // Random uses full subject bank
  const mathBank = taskRepository.getBySubject('mathematics');
  check(
    randomMath.every((task) => mathBank.some((item) => item.id === task.id)),
    'random math tasks from subject bank',
  );
  check(mathBank.length >= randomMath.length, 'random math subset of bank');

  // Topic dedupe
  const mathTopicId = MATH_SKILLS[0]?.topicId;
  if (mathTopicId) {
    const topicPool = taskRepository.getByTopic(mathTopicId).filter((t) => t.subject === 'mathematics');
    const topicSession = pickTopicSessionTasks(topicPool, 10);
    check(topicSession.length > 0, 'topic session non-empty');
    try {
      assertUniqueTaskIds(topicSession);
    } catch {
      failures.push('topic session duplicate ids');
    }
    check(
      topicSession.every((task) => task.topicId === mathTopicId),
      'topic tasks from selected topic',
    );
  }

  // Weak cold start vs history
  const coldWeak = selectAdaptiveTasks({
    userId: USER,
    subject: 'mathematics',
    count: 5,
    attempts: [],
    tasks: taskRepository.getBySubject('mathematics'),
    skills: MATH_SKILLS,
  });
  check(coldWeak.length > 0, 'weak cold-start non-empty');
  check(coldWeak.length <= 5, 'weak cold-start <= 5');

  const weakSkill = MATH_SKILLS[0]?.id;
  const strongSkill = MATH_SKILLS[1]?.id;
  if (weakSkill && strongSkill) {
    const historyAttempts: Attempt[] = [
      attempt({ skillId: weakSkill, subject: 'mathematics', isCorrect: false, attemptId: 'w1' }),
      attempt({ skillId: weakSkill, subject: 'mathematics', isCorrect: false, attemptId: 'w2' }),
      attempt({ skillId: strongSkill, subject: 'mathematics', isCorrect: true, attemptId: 's1' }),
      attempt({ skillId: strongSkill, subject: 'mathematics', isCorrect: true, attemptId: 's2' }),
      attempt({ skillId: strongSkill, subject: 'mathematics', isCorrect: true, attemptId: 's3' }),
    ];
    const weakM = calculateSkillMastery(historyAttempts, weakSkill, USER);
    const strongM = calculateSkillMastery(historyAttempts, strongSkill, USER);
    check(
      (weakM.masteryScore ?? 0) < (strongM.masteryScore ?? 100),
      'weak history: weak skill score lower',
    );
    const historyPick = selectAdaptiveTasks({
      userId: USER,
      subject: 'mathematics',
      count: 1,
      attempts: historyAttempts,
      tasks: taskRepository.getBySubject('mathematics'),
      skills: MATH_SKILLS,
    });
    check(historyPick[0]?.skillId === weakSkill, 'weak history prioritizes weak skill');
  }

  // Subject isolation in scores
  const isoAttempts: Attempt[] = [
    attempt({
      skillId: MATH_SKILLS[0]!.id,
      subject: 'mathematics',
      isCorrect: true,
      attemptId: 'm1',
    }),
    attempt({
      skillId: RUSSIAN_SKILLS[0]!.id,
      subject: 'russian',
      isCorrect: false,
      attemptId: 'r1',
    }),
  ];
  const mathScore = getSubjectScore(isoAttempts, USER, 'mathematics');
  const rusScore = getSubjectScore(isoAttempts, USER, 'russian');
  check(mathScore !== null && rusScore !== null && mathScore !== rusScore, 'subject scores isolated');

  // Persistence smoke: recorder + engine (static bank — ids resolve in repository)
  const recorder = new MemoryAttemptRecorder();
  const engine = new TaskEngine((id) => taskRepository.getById(id), recorder);
  const tasks = taskRepository.getStaticMathTasks().slice(0, 2);
  check(tasks.length === 2, 'persistence static tasks');
  const session = engine.createSession({ userId: USER, mode: 'quick', tasks });
  const firstTask = tasks[0]!;
  let active = engine.setAnswer(session, firstTask.correctAnswer ?? '1');
  active = engine.submit(active);
  check(recorder.getAll(USER).length === 1, 'attempt recorded');
  active = engine.next(active) ?? active;
  check(recorder.getAll(USER).length === 1, 'attempt count after first next');

  // Demo mode should not persist (TaskEngine skip)
  const demoSession = engine.createSession({
    userId: USER,
    mode: 'demo',
    tasks: [firstTask],
  });
  let demoActive = engine.setAnswer(demoSession, firstTask.correctAnswer ?? '1');
  demoActive = engine.submit(demoActive);
  check(recorder.getAll(USER).length === 1, 'demo attempt not persisted');

  // Session breakdown
  const persisted = recorder.getAll(USER);
  const breakdown = getSessionSkillBreakdown(persisted, session.id, USER);
  check(breakdown.length >= 0, 'session breakdown callable');

  // dedupe helper
  const duped = dedupeTasksById([tasks[0]!, tasks[0]!]);
  check(duped.length === 1, 'dedupeTasksById');

  // All 5 subject banks accessible
  for (const subject of SUBJECTS) {
    check(taskRepository.getBySubject(subject).length > 0, `bank ${subject} non-empty`);
  }

  return failures;
}

export function reportStage15TrainingFlowSelfChecks(): void {
  const failures = runStage15TrainingFlowSelfChecks();
  if (failures.length > 0) {
    throw new Error(`Stage 15 training flow self-check failed:\n- ${failures.join('\n- ')}`);
  }
}
