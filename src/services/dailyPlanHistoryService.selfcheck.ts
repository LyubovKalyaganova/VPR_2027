import type { Attempt } from '../types';
import type { DailyPlanItem } from './dailyPlanService';
import { getDailyPlanHistory } from './dailyPlanHistoryService';
import { createMemoryDailyPlanStorage, saveDailyPlan } from './dailyPlanStorage';

const USER = 'user-daily-history';
const OTHER = 'user-other-history';
const ADD = 'math.calculation.multi_digit.addition';
const TODAY = '2026-08-21';
const D20 = '2026-08-20';
const D19 = '2026-08-19';
const D18 = '2026-08-18';
const FIVE = ['A', 'B', 'C', 'D', 'E'];

function items(taskIds: readonly string[]): DailyPlanItem[] {
  return taskIds.map((taskId) => ({
    taskId,
    skillId: ADD,
    source: 'reinforcement',
  }));
}

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'questionId'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `attempt-${overrides.questionId}`,
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId,
    sessionId: overrides.sessionId ?? 'session-history',
    date: overrides.date ?? `${TODAY}T12:00:00.000Z`,
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

function history(options: {
  dates?: string[];
  attempts?: Attempt[];
  userId?: string;
  subject?: 'mathematics' | 'russian';
  limit?: number;
  nowIso?: string;
}) {
  const storage = createMemoryDailyPlanStorage();
  const userId = options.userId ?? USER;
  const subject = options.subject ?? 'mathematics';
  for (const date of options.dates ?? []) {
    saveDailyPlan(userId, subject, date, items(FIVE), storage);
  }
  return getDailyPlanHistory({
    userId,
    subject,
    limit: options.limit,
    nowIso: options.nowIso ?? `${TODAY}T12:00:00.000Z`,
    attempts: options.attempts ?? [],
    storage,
  });
}

export function runDailyPlanHistorySelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const empty = history({ dates: [], attempts: [] });
  check(empty.length === 0, 'A: нет планов → пустая история');

  const full = history({
    dates: [TODAY],
    attempts: FIVE.map((questionId) => attempt({ questionId })),
  });
  check(full.length === 1, 'B: один план в истории');
  check(full[0]?.completed === 5 && full[0]?.total === 5, 'B: 5/5');
  check(full[0]?.isCompleted === true, 'B: isCompleted true');

  const partial = history({
    dates: [TODAY],
    attempts: [attempt({ questionId: 'A' }), attempt({ questionId: 'B' })],
  });
  check(partial[0]?.completed === 2 && partial[0]?.remaining === 3, 'C: 2/5, remaining 3');
  check(partial[0]?.isCompleted === false, 'C: незавершён');

  const wrong = history({
    dates: [TODAY],
    attempts: [attempt({ questionId: 'A', isCorrect: false })],
  });
  check(wrong[0]?.completed === 1, 'D: неверный ответ считается выполнением');

  const repeats = history({
    dates: [TODAY],
    attempts: [
      attempt({ attemptId: 'r1', questionId: 'A', isCorrect: false }),
      attempt({ attemptId: 'r2', questionId: 'A', isCorrect: true }),
      attempt({ attemptId: 'r3', questionId: 'A', isCorrect: true }),
    ],
  });
  check(repeats[0]?.completed === 1, 'E: повторные Attempt одного задания считаются один раз');

  const stranger = history({
    dates: [TODAY],
    attempts: [attempt({ questionId: 'A', userId: OTHER }), attempt({ questionId: 'B', userId: OTHER })],
  });
  check(stranger[0]?.completed === 0, 'F: Attempt другого userId не учитывается');

  const demo = history({
    dates: [TODAY],
    attempts: [
      attempt({
        questionId: 'A',
        skillId: undefined,
        topicId: undefined,
        mode: 'quick',
      }),
    ],
  });
  check(demo[0]?.completed === 0, 'G: DEMO без skillId не учитывается');

  const otherSubject = history({
    dates: [TODAY],
    attempts: [attempt({ questionId: 'A', subject: 'russian' })],
  });
  check(otherSubject[0]?.completed === 0, 'H: Attempt другого subject не учитывается');

  const otherDay = history({
    dates: [D20],
    attempts: [
      attempt({ questionId: 'A', date: `${TODAY}T12:00:00.000Z` }),
      attempt({ questionId: 'B', date: `${TODAY}T12:00:00.000Z` }),
      attempt({ questionId: 'C', date: `${TODAY}T12:00:00.000Z` }),
    ],
  });
  check(otherDay[0]?.date === D20 && otherDay[0]?.completed === 0, 'I: план другого дня не получает сегодняшние Attempt');

  const sorted = history({
    dates: [D18, TODAY, D19],
    attempts: [],
  });
  check(
    sorted.map((day) => day.date).join(',') === `${TODAY},${D19},${D18}`,
    'J: история от нового дня к старому',
  );

  const limited = history({
    dates: [D18, D19, D20, TODAY],
    attempts: [],
    limit: 2,
  });
  check(limited.length === 2, 'K: limit отсекает лишние дни');
  check(limited[0]?.date === TODAY && limited[1]?.date === D20, 'K: limit берёт самые новые');

  const todayOpen = history({
    dates: [TODAY],
    attempts: [attempt({ questionId: 'A' }), attempt({ questionId: 'B' })],
  });
  check(todayOpen.length === 1 && todayOpen[0]?.date === TODAY, 'L: сегодняшний незавершённый план в истории');
  check(todayOpen[0]?.completed === 2 && todayOpen[0]?.remaining === 3, 'L: 2/5, осталось 3');
  check(todayOpen[0]?.isCompleted === false, 'L: сегодня не выполнен');

  const todayDone = history({
    dates: [TODAY],
    attempts: FIVE.map((questionId) => attempt({ questionId })),
  });
  check(todayDone[0]?.completed === 5 && todayDone[0]?.remaining === 0, 'M: сегодняшний завершённый план 5/5');
  check(todayDone[0]?.isCompleted === true, 'M: План выполнен');

  const gaps = history({
    dates: [TODAY, D18],
    attempts: [],
  });
  check(gaps.every((day) => day.date !== D19 && day.date !== D20), 'N: отсутствующий день не создаётся искусственно');
  check(gaps.length === 2, 'N: только реально сохранённые планы');

  const emptyAgain = history({ dates: [], attempts: [] });
  check(emptyAgain.length === 0, 'O: пустая история не создаёт фиктивных данных');
  check(
    emptyAgain.every((day) => day.total > 0),
    'O: нет фиктивных 0/5',
  );

  const otherUserPlan = history({
    dates: [TODAY],
    attempts: FIVE.map((questionId) => attempt({ questionId })),
    userId: OTHER,
  });
  check(otherUserPlan[0]?.completed === 0, 'F: DailyPlan другого пользователя считается отдельно');

  return failures;
}

export function reportDailyPlanHistorySelfChecks(): void {
  const failures = runDailyPlanHistorySelfChecks();
  if (failures.length > 0) {
    throw new Error(`daily plan history self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportDailyPlanHistorySelfChecks();
console.log('daily plan history self-check passed');
