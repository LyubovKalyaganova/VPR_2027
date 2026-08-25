import type { Attempt } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { localAttemptRecorder } from '../db';
import { createDailyPlan } from './dailyPlanService';
import { getDailyPlan } from './dailyPlanRunner';
import { createMemoryDailyPlanStorage } from './dailyPlanStorage';
import { calculateSkillMastery, isWeakSkill } from './masteryService';
import { taskRepository } from './taskRepository';

const NEW_USER = 'daily-plan-runner-selfcheck-new-user';
const HISTORY_USER = 'daily-plan-runner-selfcheck-history-user';
const OTHER_USER = 'daily-plan-runner-selfcheck-other-user';
const COUNT_USER = 'daily-plan-runner-selfcheck-count-user';
const OVERSIZE_USER = 'daily-plan-runner-selfcheck-oversize-user';
const EXCLUDE_USER = 'daily-plan-runner-selfcheck-exclude-user';
const ADD = 'math.calculation.multi_digit.addition';
const NOW = '2026-08-21T12:00:00.000Z';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'isCorrect'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? 'attempt-1',
    userId: overrides.userId ?? HISTORY_USER,
    questionId: overrides.questionId ?? 'math-training-001',
    sessionId: overrides.sessionId ?? 'session-1',
    date: overrides.date ?? '2026-08-20T12:00:00.000Z',
    answer: overrides.answer ?? '359',
    isCorrect: overrides.isCorrect,
    timeSpent: overrides.timeSpent ?? 4000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 3,
    subject: overrides.subject ?? 'mathematics',
    topic: overrides.topic ?? 'Сложение',
    skill: overrides.skill ?? 'Сложение',
    topicId: 'topicId' in overrides ? overrides.topicId : 'math.calculation.multi_digit',
    skillId: 'skillId' in overrides ? overrides.skillId : ADD,
    mode: overrides.mode ?? 'quick',
  };
}

function uniqueTaskIds(taskIds: string[]): boolean {
  return new Set(taskIds).size === taskIds.length;
}

function runnerSources() {
  return {
    tasks: taskRepository.getBySubject('mathematics').slice(),
    skills: MATH_SKILLS,
  };
}

export function runDailyPlanRunnerSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const storage = createMemoryDailyPlanStorage();
  check(localAttemptRecorder.getAll(NEW_USER).length === 0, 'A: изолированный userId не имеет Attempt в recorder');
  const newChild = getDailyPlan({
    userId: NEW_USER,
    subject: 'mathematics',
    count: 5,
    nowIso: NOW,
    storage,
  });
  check(newChild.items.length > 0, 'A: новый ребёнок получает план из банка');
  check(newChild.items.length <= 5, 'A: максимум 5 заданий');
  check(uniqueTaskIds(newChild.items.map((item) => item.taskId)), 'A: задания уникальны');
  check(
    newChild.items.every((item) => item.source === 'reinforcement'),
    'A: без истории план идёт из reinforcement',
  );
  check(newChild.createdAt === NOW, 'H: nowIso доходит до DailyPlan.createdAt');
  check(newChild.userId === NEW_USER && newChild.subject === 'mathematics', 'A: userId и subject сохранены');

  const sources = runnerSources();
  const historyAttempts = [
    attempt({ attemptId: 'h1', isCorrect: false, date: '2026-08-21T10:00:00.000Z' }),
    attempt({ attemptId: 'h2', isCorrect: false, date: '2026-08-21T11:00:00.000Z', questionId: 'math-training-003' }),
    attempt({ attemptId: 'h3', isCorrect: true, date: '2026-08-21T12:00:00.000Z', questionId: 'math-training-004' }),
  ];
  check(localAttemptRecorder.getAll(HISTORY_USER).length === 0, 'B: история не записана в production recorder');
  const historyPlan = createDailyPlan({
    userId: HISTORY_USER,
    subject: 'mathematics',
    count: 5,
    attempts: historyAttempts,
    tasks: sources.tasks,
    skills: sources.skills,
    nowIso: NOW,
  });
  check(isWeakSkill(calculateSkillMastery(historyAttempts, ADD, HISTORY_USER)), 'B: история даёт weak через masteryService');
  check(
    historyPlan.items.some((item) => item.skillId === ADD && (item.source === 'weak' || item.source === 'review')),
    'B: план учитывает математическую историю',
  );

  const demoAttempts = [
    attempt({
      attemptId: 'demo-1',
      isCorrect: false,
      date: NOW,
      questionId: 'demo-math-single-1',
      skillId: undefined,
      topicId: undefined,
    }),
  ];
  const demoPlan = createDailyPlan({
    userId: HISTORY_USER,
    subject: 'mathematics',
    count: 5,
    attempts: demoAttempts,
    tasks: sources.tasks,
    skills: sources.skills,
    nowIso: NOW,
  });
  check(demoPlan.items.length > 0, 'C: DEMO не ломает расчёт');
  check(
    demoPlan.items.every((item) => item.source === 'reinforcement'),
    'C: Attempt без skillId не влияет на weak/review',
  );
  const liveWithDemoUser = getDailyPlan({
    userId: NEW_USER,
    subject: 'mathematics',
    count: 5,
    nowIso: NOW,
    storage,
  });
  check(liveWithDemoUser.items.length > 0, 'C: runner жив после DEMO-сценария');

  const mixedAttempts = [
    ...historyAttempts,
    attempt({
      attemptId: 'other-1',
      userId: OTHER_USER,
      isCorrect: false,
      date: NOW,
      questionId: 'math-training-002',
      skillId: 'math.calculation.multi_digit.subtraction',
    }),
  ];
  const withStranger = createDailyPlan({
    userId: HISTORY_USER,
    subject: 'mathematics',
    count: 5,
    attempts: mixedAttempts,
    tasks: sources.tasks,
    skills: sources.skills,
    nowIso: NOW,
  });
  check(
    withStranger.items.every(
      (item) =>
        item.skillId !== 'math.calculation.multi_digit.subtraction' ||
        (item.source !== 'weak' && item.source !== 'review'),
    ),
    'D: чужой userId не делает чужой навык weak/review для текущего пользователя',
  );
  check(localAttemptRecorder.getAll(OTHER_USER).length === 0, 'D: чужой userId не записан в recorder');
  const otherLive = getDailyPlan({
    userId: OTHER_USER,
    subject: 'mathematics',
    count: 5,
    nowIso: NOW,
    storage,
  });
  check(
    otherLive.items.every((item) => item.source === 'reinforcement'),
    'D: runner для чужого userId не видит чужую историю, её нет в recorder',
  );

  const count3 = getDailyPlan({
    userId: COUNT_USER,
    subject: 'mathematics',
    count: 3,
    nowIso: NOW,
    storage: createMemoryDailyPlanStorage(),
  });
  check(count3.items.length <= 3, 'E: count = 3 → максимум 3');
  check(count3.totalCount === count3.items.length, 'E: totalCount совпадает с числом item');

  const bank = taskRepository.getBySubject('mathematics');
  const skillBankSize = bank.filter((task) => typeof task.skillId === 'string' && task.skillId.length > 0).length;
  const oversized = getDailyPlan({
    userId: OVERSIZE_USER,
    subject: 'mathematics',
    count: 1000,
    nowIso: NOW,
    storage: createMemoryDailyPlanStorage(),
  });
  check(oversized.items.length <= skillBankSize, 'F: count больше банка → только существующие задания');
  check(uniqueTaskIds(oversized.items.map((item) => item.taskId)), 'F: уникальность при большом count');

  const excludedId = 'math-training-001';
  const excluded = getDailyPlan({
    userId: EXCLUDE_USER,
    subject: 'mathematics',
    count: 5,
    nowIso: NOW,
    excludeQuestionIds: [excludedId],
    storage: createMemoryDailyPlanStorage(),
  });
  check(
    excluded.items.every((item) => item.taskId !== excludedId),
    'G: excludeQuestionIds не возвращается, пока есть альтернативы',
  );
  check(excluded.items.length > 0, 'G: план всё равно строится');

  const emptyBank = createDailyPlan({
    userId: NEW_USER,
    subject: 'mathematics',
    count: 5,
    attempts: [],
    tasks: [],
    skills: MATH_SKILLS,
    nowIso: NOW,
  });
  check(emptyBank.items.length === 0 && emptyBank.totalCount === 0, 'I: пустой банк → пустой план, без падения');
  const otherSubject = getDailyPlan({
    userId: NEW_USER,
    subject: 'russian',
    count: 5,
    nowIso: NOW,
    storage: createMemoryDailyPlanStorage(),
  });
  check(otherSubject.items.length > 0, 'I: русский тоже получает план из банка');

  check(localAttemptRecorder.getAll(NEW_USER).length === 0, 'storage: self-check не создал Attempt для new user');
  check(localAttemptRecorder.getAll(HISTORY_USER).length === 0, 'storage: self-check не создал Attempt для history user');

  return failures;
}

export function reportDailyPlanRunnerSelfChecks(): void {
  const failures = runDailyPlanRunnerSelfChecks();
  if (failures.length > 0) {
    throw new Error(`daily plan runner self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportDailyPlanRunnerSelfChecks();
console.log('daily plan runner self-check passed');
