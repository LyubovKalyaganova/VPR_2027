import type { Attempt } from '../types';
import type { DailyPlanDaySummary } from './dailyPlanHistoryService';
import { getAchievements, getNextAchievementHint } from './achievementService';
import { getChildProgress } from './progressService';

const USER = 'user-achievements';
const OTHER = 'user-other-achievements';
const ADD = 'math.calculation.multi_digit.addition';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'questionId'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `attempt-${overrides.questionId}`,
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId,
    sessionId: overrides.sessionId ?? 'session-achievements',
    date: overrides.date ?? '2026-08-21T12:00:00.000Z',
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
    mode: overrides.mode ?? 'quick',
  };
}

function uniqueAttempts(count: number, start = 1, date = '2026-08-21T12:00:00.000Z'): Attempt[] {
  const items: Attempt[] = [];
  for (let index = 0; index < count; index += 1) {
    const n = start + index;
    items.push(
      attempt({
        attemptId: `u-${n}`,
        questionId: `q-${String(n).padStart(3, '0')}`,
        date,
      }),
    );
  }
  return items;
}

function dayAttempts(days: number): Attempt[] {
  const items: Attempt[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = 14 + index;
    items.push(
      attempt({
        attemptId: `d-${day}`,
        questionId: `day-q-${day}`,
        date: `2026-08-${String(day).padStart(2, '0')}T12:00:00.000Z`,
      }),
    );
  }
  return items;
}

function completedPlan(date = '2026-08-20'): DailyPlanDaySummary {
  return {
    date,
    total: 5,
    completed: 5,
    remaining: 0,
    isCompleted: true,
    correct: 4,
    incorrect: 1,
    accuracy: 80,
    status: 'completed',
  };
}

function incompletePlan(date = '2026-08-21'): DailyPlanDaySummary {
  return {
    date,
    total: 5,
    completed: 2,
    remaining: 3,
    isCompleted: false,
    correct: 1,
    incorrect: 1,
    accuracy: 50,
    status: 'incomplete',
  };
}

function read(achievements: ReturnType<typeof getAchievements>, id: string) {
  return achievements.find((item) => item.id === id);
}

function evaluate(attempts: Attempt[], planSummaries: DailyPlanDaySummary[] = []) {
  const progress = getChildProgress(attempts, USER);
  const input = {
    userId: USER,
    attempts,
    mathSkills: progress.mathSkills,
    planSummaries,
  };
  const achievements = getAchievements(input);
  return { achievements, input, progress };
}

export function runAchievementSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const empty = evaluate([]);
  check(
    empty.achievements.every((item) => item.achieved === false && item.achievedAt === null),
    'A: новый ребёнок — 0 достижений',
  );
  check(empty.achievements.length === 11, 'A: каталог из 11 достижений');

  const first = evaluate([attempt({ questionId: 'q-001' })]);
  check(read(first.achievements, 'first-step')?.achieved === true, 'B: 1 задание → Первый шаг');
  check(read(first.achievements, 'tasks-10')?.achieved === false, 'B: 1 задание не даёт 10 заданий');
  check(read(first.achievements, 'days-3')?.achieved === false, 'B: 1 день не даёт 3 дня');

  const ten = evaluate(uniqueAttempts(10));
  check(read(ten.achievements, 'tasks-10')?.achieved === true, 'C: 10 уникальных → 10 заданий');
  check(read(ten.achievements, 'tasks-25')?.achieved === false, 'C: 10 не дают 25');
  check(ten.progress.stats.solvedQuestionsCount === 10, 'C: используется solvedQuestionsCount');

  const twentyFive = evaluate(uniqueAttempts(25));
  check(read(twentyFive.achievements, 'tasks-25')?.achieved === true, 'C: 25 уникальных → 25 заданий');
  check(read(twentyFive.achievements, 'tasks-50')?.achieved === false, 'C: 25 не дают 50');
  const fifty = evaluate(uniqueAttempts(50));
  check(read(fifty.achievements, 'tasks-50')?.achieved === true, 'C: 50 уникальных → 50 заданий');

  const repeats = evaluate([
    attempt({ attemptId: 'r1', questionId: 'same', isCorrect: false }),
    attempt({ attemptId: 'r2', questionId: 'same', isCorrect: true }),
    attempt({ attemptId: 'r3', questionId: 'same', isCorrect: true }),
  ]);
  check(read(repeats.achievements, 'first-step')?.achieved === true, 'D: повтор одного задания — Первый шаг');
  check(read(repeats.achievements, 'tasks-10')?.achieved === false, 'D: повтор не увеличивает unique count до 10');

  const streak3 = evaluate(uniqueAttempts(3));
  check(read(streak3.achievements, 'streak-3')?.achieved === true, 'E: currentStreak 3 → Серия 3');
  check(read(streak3.achievements, 'streak-5')?.achieved === false, 'E: серия 3 не даёт серию 5');

  const streak5 = evaluate(uniqueAttempts(5));
  check(read(streak5.achievements, 'streak-5')?.achieved === true, 'F: currentStreak 5 → Серия 5');
  check(read(streak5.achievements, 'streak-10')?.achieved === false, 'F: серия 5 не даёт серию 10');

  const streak10 = evaluate(uniqueAttempts(10));
  check(read(streak10.achievements, 'streak-10')?.achieved === true, 'G: currentStreak 10 → Серия 10');
  check(read(streak10.achievements, 'streak-3')?.achieved === true, 'G: серия 10 включает серию 3');
  check(read(streak10.achievements, 'streak-5')?.achieved === true, 'G: серия 10 включает серию 5');

  const brokenStreak = evaluate([
    ...uniqueAttempts(5),
    attempt({
      attemptId: 'z-break',
      questionId: 'q-break',
      isCorrect: false,
      date: '2026-08-21T18:00:00.000Z',
    }),
  ]);
  check(read(brokenStreak.achievements, 'streak-3')?.achieved === false, 'E/F: currentStreak, не bestStreak');

  const firstPlan = evaluate([], [completedPlan()]);
  check(read(firstPlan.achievements, 'first-plan')?.achieved === true, 'H: полностью выполненный DailyPlan → Первый план');
  const noPlan = evaluate([], [incompletePlan()]);
  check(read(noPlan.achievements, 'first-plan')?.achieved === false, 'H: незавершённый план не считается');

  const threeDays = evaluate(dayAttempts(3));
  check(read(threeDays.achievements, 'days-3')?.achieved === true, 'I: 3 разных дня → 3 дня обучения');
  check(read(threeDays.achievements, 'days-7')?.achieved === false, 'I: 3 дня не дают 7');

  const sevenDays = evaluate(dayAttempts(7));
  check(read(sevenDays.achievements, 'days-7')?.achieved === true, 'J: 7 разных дней → 7 дней обучения');

  const masteredAttempts: Attempt[] = [];
  for (let index = 0; index < 5; index += 1) {
    masteredAttempts.push(
      attempt({
        attemptId: `m-${index}`,
        questionId: `q-m-${index}`,
        date: '2026-08-21T12:00:00.000Z',
      }),
    );
  }
  const mastered = evaluate(masteredAttempts);
  check(
    mastered.progress.mathSkills.some((item) => item.mastery.status === 'mastered'),
    'K: calculateSkillMastery даёт status mastered',
  );
  check(read(mastered.achievements, 'skill-mastered')?.achieved === true, 'K: mastered → Навык освоен');

  const demo = evaluate([
    attempt({
      questionId: 'demo-1',
      skillId: undefined,
      topicId: undefined,
      mode: 'quick',
    }),
  ]);
  check(
    demo.achievements.every((item) => item.achieved === false),
    'L: DEMO без skillId не создаёт достижений',
  );

  const stranger = evaluate([
    attempt({ questionId: 'q-001', userId: OTHER }),
    attempt({ questionId: 'q-002', userId: OTHER }),
    attempt({ questionId: 'q-003', userId: OTHER }),
  ]);
  check(
    stranger.achievements.every((item) => item.achieved === false),
    'M: чужой userId не влияет',
  );

  const firstReload = evaluate(uniqueAttempts(10), [completedPlan()]);
  const secondReload = evaluate(uniqueAttempts(10), [completedPlan()]);
  check(
    JSON.stringify(firstReload.achievements) === JSON.stringify(secondReload.achievements),
    'N: одинаковые данные → одинаковые достижения',
  );

  const hintAtEight = evaluate(uniqueAttempts(8));
  check(
    getNextAchievementHint(hintAtEight.achievements, hintAtEight.input) === 'До 10 заданий осталось 2',
    'мотивация: до 10 заданий осталось 2',
  );

  return failures;
}

export function reportAchievementSelfChecks(): void {
  const failures = runAchievementSelfChecks();
  if (failures.length > 0) {
    throw new Error(`achievement self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportAchievementSelfChecks();
console.log('achievement self-check passed');
