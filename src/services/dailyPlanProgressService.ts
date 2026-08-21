import type { Attempt } from '../types';
import type { DailyPlan } from './dailyPlanService';

export type DailyPlanProgress = {
  total: number;
  completed: number;
  remaining: number;
  isCompleted: boolean;
  completedQuestionIds: string[];
};

export type GetDailyPlanProgressInput = {
  plan: DailyPlan;
  attempts: readonly Attempt[];
  userId: string;
  nowIso: string;
};

function calendarDayKey(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  const date = new Date(parsed);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hasSkillId(attempt: Attempt): boolean {
  return typeof attempt.skillId === 'string' && attempt.skillId.length > 0;
}

/**
 * Вычисляет выполнение текущего DailyPlan по уже существующим Attempt.
 * Не читает storage, Zustand, DOM и не пересчитывает сам план.
 */
export function getDailyPlanProgress(input: GetDailyPlanProgressInput): DailyPlanProgress {
  const total = input.plan.items.length;
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      remaining: 0,
      isCompleted: false,
      completedQuestionIds: [],
    };
  }

  const today = calendarDayKey(input.nowIso);
  const planIds = new Set(input.plan.items.map((item) => item.taskId));
  const completed = new Set<string>();

  for (const attempt of input.attempts) {
    if (attempt.userId !== input.userId) {
      continue;
    }
    if (attempt.mode !== 'daily') {
      continue;
    }
    if (!hasSkillId(attempt)) {
      continue;
    }
    if (!planIds.has(attempt.questionId)) {
      continue;
    }
    if (calendarDayKey(attempt.date) !== today) {
      continue;
    }
    completed.add(attempt.questionId);
  }

  const completedQuestionIds = [...completed];
  const completedCount = completedQuestionIds.length;

  return {
    total,
    completed: completedCount,
    remaining: Math.max(0, total - completedCount),
    isCompleted: completedCount === total && total > 0,
    completedQuestionIds,
  };
}

/**
 * Оставшиеся taskId сегодняшнего DailyPlan в исходном порядке.
 * Не меняет сохранённый план и не подбирает новые задания.
 */
export function getRemainingDailyTaskIds(input: GetDailyPlanProgressInput): string[] {
  const completed = new Set(getDailyPlanProgress(input).completedQuestionIds);
  const remaining: string[] = [];
  const seen = new Set<string>();
  for (const item of input.plan.items) {
    if (seen.has(item.taskId)) {
      continue;
    }
    seen.add(item.taskId);
    if (!completed.has(item.taskId)) {
      remaining.push(item.taskId);
    }
  }
  return remaining;
}
