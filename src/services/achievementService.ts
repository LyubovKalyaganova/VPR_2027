import type { Attempt, SkillMastery } from '../types';
import type { DailyPlanDaySummary } from './dailyPlanHistoryService';
import { getCalendarDate } from './dailyPlanStorage';
import { getUserProgress, type SkillProgress } from './progressService';

export type AchievementId =
  | 'first-step'
  | 'tasks-10'
  | 'tasks-25'
  | 'tasks-50'
  | 'streak-3'
  | 'streak-5'
  | 'streak-10'
  | 'first-plan'
  | 'days-3'
  | 'days-7'
  | 'skill-mastered';

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  achieved: boolean;
  achievedAt: string | null;
};

export type GetAchievementsInput = {
  userId: string;
  attempts: readonly Attempt[];
  mathSkills: readonly SkillProgress[];
  planSummaries: readonly DailyPlanDaySummary[];
};

type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
};

const DEFINITIONS: readonly AchievementDefinition[] = [
  { id: 'first-step', title: 'Первый шаг', description: 'Решено хотя бы одно задание' },
  { id: 'tasks-10', title: '10 заданий', description: 'Решено 10 разных заданий' },
  { id: 'tasks-25', title: '25 заданий', description: 'Решено 25 разных заданий' },
  { id: 'tasks-50', title: '50 заданий', description: 'Решено 50 разных заданий' },
  { id: 'streak-3', title: 'Серия 3', description: 'Текущая серия правильных ответов — 3' },
  { id: 'streak-5', title: 'Серия 5', description: 'Текущая серия правильных ответов — 5' },
  { id: 'streak-10', title: 'Серия 10', description: 'Текущая серия правильных ответов — 10' },
  { id: 'first-plan', title: 'Первый план', description: 'Ежедневный план выполнен полностью' },
  { id: 'days-3', title: '3 дня обучения', description: 'Занятия в 3 разных дня' },
  { id: 'days-7', title: '7 дней обучения', description: 'Занятия в 7 разных дня' },
  { id: 'skill-mastered', title: 'Навык освоен', description: 'Есть освоенный навык' },
];

function hasSkillId(attempt: Attempt): boolean {
  return typeof attempt.skillId === 'string' && attempt.skillId.length > 0;
}

function attemptTimestamp(attempt: Attempt): number {
  const parsed = Date.parse(attempt.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareAttempts(left: Attempt, right: Attempt): number {
  const byDate = attemptTimestamp(left) - attemptTimestamp(right);
  if (byDate !== 0) {
    return byDate;
  }
  return left.attemptId.localeCompare(right.attemptId);
}

function selectQualifyingAttempts(attempts: readonly Attempt[], userId: string): Attempt[] {
  if (!userId) {
    return [];
  }
  return attempts
    .filter((attempt) => attempt.userId === userId && hasSkillId(attempt))
    .slice()
    .sort(compareAttempts);
}

function uniqueMilestoneDates(attempts: readonly Attempt[]): {
  firstStepAt: string | null;
  tasks10At: string | null;
  tasks25At: string | null;
  tasks50At: string | null;
  days3At: string | null;
  days7At: string | null;
  learningDaysCount: number;
} {
  const seenQuestions = new Set<string>();
  const seenDays = new Set<string>();
  let firstStepAt: string | null = null;
  let tasks10At: string | null = null;
  let tasks25At: string | null = null;
  let tasks50At: string | null = null;
  let days3At: string | null = null;
  let days7At: string | null = null;

  for (const attempt of attempts) {
    if (attempt.questionId && !seenQuestions.has(attempt.questionId)) {
      seenQuestions.add(attempt.questionId);
      if (seenQuestions.size === 1) {
        firstStepAt = attempt.date;
      }
      if (seenQuestions.size === 10) {
        tasks10At = attempt.date;
      }
      if (seenQuestions.size === 25) {
        tasks25At = attempt.date;
      }
      if (seenQuestions.size === 50) {
        tasks50At = attempt.date;
      }
    }

    const day = getCalendarDate(attempt.date);
    if (!seenDays.has(day)) {
      seenDays.add(day);
      if (seenDays.size === 3) {
        days3At = attempt.date;
      }
      if (seenDays.size === 7) {
        days7At = attempt.date;
      }
    }
  }

  return {
    firstStepAt,
    tasks10At,
    tasks25At,
    tasks50At,
    days3At,
    days7At,
    learningDaysCount: seenDays.size,
  };
}

function streakAchievedAt(attempts: readonly Attempt[], currentStreak: number, needed: number): string | null {
  if (currentStreak < needed) {
    return null;
  }
  const run = attempts.slice(-currentStreak);
  return run[needed - 1]?.date ?? null;
}

function firstCompletedPlan(planSummaries: readonly DailyPlanDaySummary[]): DailyPlanDaySummary | null {
  const completed = planSummaries
    .filter((summary) => summary.isCompleted && summary.total > 0 && summary.completed === summary.total)
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  return completed[0] ?? null;
}

function firstPlanAchievedAt(
  plan: DailyPlanDaySummary,
  attempts: readonly Attempt[],
): string {
  let lastOnDay: Attempt | null = null;
  for (const attempt of attempts) {
    if (getCalendarDate(attempt.date) === plan.date) {
      lastOnDay = attempt;
    }
  }
  return lastOnDay?.date ?? `${plan.date}T12:00:00.000Z`;
}

function firstMasteredSkill(mathSkills: readonly SkillProgress[]): SkillMastery | null {
  const mastered = mathSkills
    .map((item) => item.mastery)
    .filter((mastery) => mastery.status === 'mastered');
  if (mastered.length === 0) {
    return null;
  }
  return mastered.reduce((earliest, current) => {
    const earliestAt = earliest.lastCorrectAt ?? earliest.lastAttemptAt;
    const currentAt = current.lastCorrectAt ?? current.lastAttemptAt;
    if (!currentAt) {
      return earliest;
    }
    if (!earliestAt || currentAt.localeCompare(earliestAt) < 0) {
      return current;
    }
    return earliest;
  });
}

function makeAchievement(
  definition: AchievementDefinition,
  achieved: boolean,
  achievedAt: string | null,
): Achievement {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    achieved,
    achievedAt: achieved ? achievedAt : null,
  };
}

/**
 * Вычисляет достижения из Attempt, прогресса и сводок DailyPlan.
 * Не читает storage и не сохраняет награды.
 */
export function getAchievements(input: GetAchievementsInput): Achievement[] {
  const qualifying = selectQualifyingAttempts(input.attempts, input.userId);
  const stats = getUserProgress(qualifying, input.userId);
  const milestones = uniqueMilestoneDates(qualifying);
  const completedPlan = firstCompletedPlan(input.planSummaries);
  const mastered = firstMasteredSkill(input.mathSkills);
  const uniqueCount = stats.solvedQuestionsCount;
  const streak = stats.currentStreak;

  const byId: Record<AchievementId, { achieved: boolean; achievedAt: string | null }> = {
    'first-step': {
      achieved: uniqueCount >= 1,
      achievedAt: milestones.firstStepAt,
    },
    'tasks-10': {
      achieved: uniqueCount >= 10,
      achievedAt: milestones.tasks10At,
    },
    'tasks-25': {
      achieved: uniqueCount >= 25,
      achievedAt: milestones.tasks25At,
    },
    'tasks-50': {
      achieved: uniqueCount >= 50,
      achievedAt: milestones.tasks50At,
    },
    'streak-3': {
      achieved: streak >= 3,
      achievedAt: streakAchievedAt(qualifying, streak, 3),
    },
    'streak-5': {
      achieved: streak >= 5,
      achievedAt: streakAchievedAt(qualifying, streak, 5),
    },
    'streak-10': {
      achieved: streak >= 10,
      achievedAt: streakAchievedAt(qualifying, streak, 10),
    },
    'first-plan': {
      achieved: completedPlan !== null,
      achievedAt: completedPlan ? firstPlanAchievedAt(completedPlan, qualifying) : null,
    },
    'days-3': {
      achieved: milestones.learningDaysCount >= 3,
      achievedAt: milestones.days3At,
    },
    'days-7': {
      achieved: milestones.learningDaysCount >= 7,
      achievedAt: milestones.days7At,
    },
    'skill-mastered': {
      achieved: mastered !== null,
      achievedAt: mastered ? mastered.lastCorrectAt ?? mastered.lastAttemptAt : null,
    },
  };

  return DEFINITIONS.map((definition) => {
    const state = byId[definition.id];
    return makeAchievement(definition, state.achieved, state.achievedAt);
  });
}

function remainingPhrase(left: number, unit: string): string {
  return `До ${unit} осталось ${left}`;
}

/**
 * Короткое детерминированное сообщение о ближайшей цели.
 * Без случайных фраз и без отдельного движка мотивации.
 */
export function getNextAchievementHint(achievements: readonly Achievement[], input: GetAchievementsInput): string | null {
  const achieved = new Set(achievements.filter((item) => item.achieved).map((item) => item.id));
  const qualifying = selectQualifyingAttempts(input.attempts, input.userId);
  const stats = getUserProgress(qualifying, input.userId);
  const days = uniqueMilestoneDates(qualifying).learningDaysCount;
  const uniqueCount = stats.solvedQuestionsCount;
  const streak = stats.currentStreak;

  if (!achieved.has('first-step')) {
    return 'Реши первое задание — откроется «Первый шаг»';
  }
  if (!achieved.has('tasks-10')) {
    return remainingPhrase(10 - uniqueCount, '10 заданий');
  }
  if (!achieved.has('tasks-25')) {
    return remainingPhrase(25 - uniqueCount, '25 заданий');
  }
  if (!achieved.has('tasks-50')) {
    return remainingPhrase(50 - uniqueCount, '50 заданий');
  }
  if (!achieved.has('streak-3')) {
    return streak === 2
      ? 'Ещё один правильный ответ — и серия станет 3'
      : remainingPhrase(3 - streak, 'серии 3');
  }
  if (!achieved.has('streak-5')) {
    return streak === 4
      ? 'Ещё один правильный ответ — и серия станет 5'
      : remainingPhrase(5 - streak, 'серии 5');
  }
  if (!achieved.has('streak-10')) {
    return streak === 9
      ? 'Ещё один правильный ответ — и серия станет 10'
      : remainingPhrase(10 - streak, 'серии 10');
  }
  if (!achieved.has('first-plan')) {
    return 'Выполни план на сегодня — откроется «Первый план»';
  }
  if (!achieved.has('days-3')) {
    return remainingPhrase(3 - days, '3 дней обучения');
  }
  if (!achieved.has('days-7')) {
    return remainingPhrase(7 - days, '7 дней обучения');
  }
  if (!achieved.has('skill-mastered')) {
    return 'Освой один навык — откроется «Навык освоен»';
  }
  return null;
}
