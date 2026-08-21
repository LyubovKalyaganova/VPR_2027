import type { Attempt } from '../types';
import { getDailyPlan } from './dailyPlanRunner';
import { getDailyPlanProgress } from './dailyPlanProgressService';
import {
  DAILY_PLANS_STORAGE_KEY,
  createMemoryDailyPlanStorage,
  getCalendarDate,
  getStoredDailyPlan,
  parseDailyPlanStorage,
  saveDailyPlan,
} from './dailyPlanStorage';

const USER_A = 'daily-plan-storage-user-a';
const USER_B = 'daily-plan-storage-user-b';
const ADD = 'math.calculation.multi_digit.addition';
const DAY_ONE = '2026-08-21T12:00:00.000Z';
const DAY_TWO = '2026-08-22T12:00:00.000Z';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'questionId'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `attempt-${overrides.questionId}`,
    userId: overrides.userId ?? USER_A,
    questionId: overrides.questionId,
    sessionId: overrides.sessionId ?? 'session-daily-storage',
    date: overrides.date ?? DAY_ONE,
    answer: overrides.answer ?? '1',
    isCorrect: overrides.isCorrect ?? true,
    timeSpent: overrides.timeSpent ?? 4000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 3,
    subject: overrides.subject ?? 'mathematics',
    topic: overrides.topic ?? 'Сложение',
    skill: overrides.skill ?? 'Сложение',
    topicId: 'topicId' in overrides ? overrides.topicId : 'math.calculation.multi_digit',
    skillId: 'skillId' in overrides ? overrides.skillId : ADD,
    mode: overrides.mode ?? 'daily',
  };
}

function idsOf(taskIds: string[]): string {
  return taskIds.join(',');
}

export function runDailyPlanStorageSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const dateOne = getCalendarDate(DAY_ONE);
  const dateTwo = getCalendarDate(DAY_TWO);
  check(dateOne !== dateTwo, 'календарные даты двух дней различаются');

  const storageA = createMemoryDailyPlanStorage();
  check(getStoredDailyPlan(USER_A, 'mathematics', dateOne, storageA) === null, 'A: сначала сохранённого плана нет');
  const first = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: storageA,
  });
  check(first.items.length > 0, 'A: первый getDailyPlan создаёт план');
  const firstIds = first.items.map((item) => item.taskId);
  const second = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: storageA,
  });
  check(idsOf(second.items.map((item) => item.taskId)) === idsOf(firstIds), 'A: повторный вызов в тот же день даёт те же taskIds');

  const raw = storageA.getItem(DAILY_PLANS_STORAGE_KEY);
  const reloadStorage = createMemoryDailyPlanStorage();
  if (raw) {
    reloadStorage.setItem(DAILY_PLANS_STORAGE_KEY, raw);
  }
  const afterReload = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: reloadStorage,
  });
  check(idsOf(afterReload.items.map((item) => item.taskId)) === idsOf(firstIds), 'B: повторное чтение storage не меняет состав');

  const twoIds = firstIds.slice(0, 2);
  const partialAttempts = twoIds.map((questionId, index) =>
    attempt({ attemptId: `partial-${index}`, questionId }),
  );
  const partialProgress = getDailyPlanProgress({
    plan: first,
    attempts: partialAttempts,
    userId: USER_A,
    nowIso: DAY_ONE,
  });
  const afterPartial = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: storageA,
  });
  check(idsOf(afterPartial.items.map((item) => item.taskId)) === idsOf(firstIds), 'C: после частичного выполнения состав плана тот же');
  check(partialProgress.completed === 2, 'C: progress 2 / 5');
  check(partialProgress.remaining === first.items.length - 2, 'C: remaining считает невыполненные');
  check(partialProgress.isCompleted === false, 'C: план ещё не завершён');

  const allAttempts = firstIds.map((questionId, index) =>
    attempt({ attemptId: `full-${index}`, questionId }),
  );
  const fullProgress = getDailyPlanProgress({
    plan: first,
    attempts: allAttempts,
    userId: USER_A,
    nowIso: DAY_ONE,
  });
  const afterFull = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: storageA,
  });
  check(fullProgress.completed === first.items.length, 'D: все задания выполнены');
  check(fullProgress.remaining === 0 && fullProgress.isCompleted === true, 'D: progress 5 / 5');
  check(idsOf(afterFull.items.map((item) => item.taskId)) === idsOf(firstIds), 'D: в тот же день новый набор не создаётся');

  const nextDay = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_TWO,
    storage: storageA,
  });
  const storedDayOne = getStoredDailyPlan(USER_A, 'mathematics', dateOne, storageA);
  const storedDayTwo = getStoredDailyPlan(USER_A, 'mathematics', dateTwo, storageA);
  check(storedDayOne !== null, 'E: план первого дня остаётся в storage');
  check(storedDayTwo !== null, 'E: для нового дня создаётся отдельная запись');
  check(idsOf(nextDay.items.map((item) => item.taskId)) === idsOf(storedDayTwo?.taskIds ?? []), 'E: сегодняшний план читается из записи нового дня');
  check(storedDayOne?.date !== storedDayTwo?.date, 'E: старый план не используется как сегодняшний');

  const twoUsers = createMemoryDailyPlanStorage();
  saveDailyPlan(
    USER_A,
    'mathematics',
    dateOne,
    [{ taskId: 'plan-a-1', skillId: ADD, source: 'weak' }],
    twoUsers,
  );
  saveDailyPlan(
    USER_B,
    'mathematics',
    dateOne,
    [{ taskId: 'plan-b-1', skillId: ADD, source: 'review' }],
    twoUsers,
  );
  check(getStoredDailyPlan(USER_A, 'mathematics', dateOne, twoUsers)?.taskIds.join(',') === 'plan-a-1', 'F: план user A не смешивается');
  check(getStoredDailyPlan(USER_B, 'mathematics', dateOne, twoUsers)?.taskIds.join(',') === 'plan-b-1', 'F: план user B не смешивается');

  const subjects = createMemoryDailyPlanStorage();
  const mathPlan = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: subjects,
  });
  const russianPlan = getDailyPlan({
    userId: USER_A,
    subject: 'russian',
    count: 5,
    nowIso: DAY_ONE,
    storage: subjects,
  });
  check(mathPlan.subject === 'mathematics', 'G: mathematics хранится отдельно');
  check(russianPlan.subject === 'russian', 'G: другой SubjectId не смешивается с mathematics');
  check(getStoredDailyPlan(USER_A, 'mathematics', dateOne, subjects)?.subject === 'mathematics', 'G: запись mathematics на месте');
  check(getStoredDailyPlan(USER_A, 'russian', dateOne, subjects)?.subject === 'russian', 'G: запись другого предмета на месте');

  const broken = createMemoryDailyPlanStorage();
  broken.setItem(DAILY_PLANS_STORAGE_KEY, '{not-json');
  check(parseDailyPlanStorage('{not-json').plans.length === 0, 'H: повреждённый JSON даёт пустой snapshot');
  let brokenThrew = false;
  try {
    getDailyPlan({
      userId: USER_A,
      subject: 'mathematics',
      count: 5,
      nowIso: DAY_ONE,
      storage: broken,
    });
  } catch {
    brokenThrew = true;
  }
  check(!brokenThrew, 'H: повреждённое содержимое storage не роняет приложение');

  const missing = createMemoryDailyPlanStorage();
  saveDailyPlan(
    USER_A,
    'mathematics',
    dateOne,
    [
      { taskId: 'math-training-001', skillId: ADD, source: 'reinforcement' },
      { taskId: 'missing-task-does-not-exist', skillId: ADD, source: 'weak' },
    ],
    missing,
  );
  let missingThrew = false;
  let restoredCount = 0;
  try {
    const restored = getDailyPlan({
      userId: USER_A,
      subject: 'mathematics',
      count: 5,
      nowIso: DAY_ONE,
      storage: missing,
    });
    restoredCount = restored.items.length;
    check(
      restored.items.every((item) => item.taskId !== 'missing-task-does-not-exist'),
      'I: отсутствующий Task пропускается',
    );
    check(
      restored.items.some((item) => item.taskId === 'math-training-001'),
      'I: существующий Task восстанавливается',
    );
  } catch {
    missingThrew = true;
  }
  check(!missingThrew, 'I: отсутствующий Task не роняет приложение');
  check(restoredCount === 1, 'I: план текущего дня не дополняется новыми заданиями взамен пропавших');

  const excludeStorage = createMemoryDailyPlanStorage();
  const original = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: excludeStorage,
  });
  const excludedId = original.items[0]?.taskId;
  const withExclude = getDailyPlan({
    userId: USER_A,
    subject: 'mathematics',
    count: 5,
    nowIso: DAY_ONE,
    storage: excludeStorage,
    excludeQuestionIds: excludedId ? [excludedId] : ['math-training-001'],
  });
  check(
    idsOf(withExclude.items.map((item) => item.taskId)) === idsOf(original.items.map((item) => item.taskId)),
    'J: excludeQuestionIds не пересоздаёт уже сохранённый план дня',
  );
  if (excludedId) {
    check(
      withExclude.items.some((item) => item.taskId === excludedId),
      'J: стабильность существующего плана важнее нового exclude',
    );
  }

  return failures;
}

export function reportDailyPlanStorageSelfChecks(): void {
  const failures = runDailyPlanStorageSelfChecks();
  if (failures.length > 0) {
    throw new Error(`daily plan storage self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportDailyPlanStorageSelfChecks();
console.log('daily plan storage self-check passed');
