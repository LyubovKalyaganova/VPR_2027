import type { Attempt, SubjectId } from '../types';
import { localAttemptRecorder } from '../db';
import type { DailyPlan, DailyPlanItem } from './dailyPlanService';
import {
  getDailyPlanProgress,
  type DailyPlanProgress,
} from './dailyPlanProgressService';
import {
  getCalendarDate,
  listStoredDailyPlans,
  listStoredDailyPlansForUser,
  type DailyPlanStorageBackend,
  type StoredDailyPlan,
} from './dailyPlanStorage';

export type DailyPlanHistoryStatus = 'completed' | 'incomplete';

export type DailyPlanDaySummary = {
  date: string;
  total: number;
  completed: number;
  remaining: number;
  isCompleted: boolean;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  status: DailyPlanHistoryStatus;
};

export type GetDailyPlanHistoryInput = {
  userId: string;
  subject: SubjectId;
  limit?: number;
  nowIso?: string;
  attempts?: readonly Attempt[];
  storage?: DailyPlanStorageBackend;
};

const HISTORY_LIMIT = 7;

function hasSkillId(attempt: Attempt): boolean {
  return typeof attempt.skillId === 'string' && attempt.skillId.length > 0;
}

function attemptTimestamp(attempt: Attempt): number {
  const parsed = Date.parse(attempt.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isoOnCalendarDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function storedPlanToDailyPlan(plan: StoredDailyPlan, createdAt: string): DailyPlan {
  return {
    userId: plan.userId,
    subject: plan.subject,
    createdAt,
    totalCount: plan.items.length,
    items: plan.items,
  };
}

function itemsFromTaskIds(taskIds: readonly string[]): DailyPlanItem[] {
  const items: DailyPlanItem[] = [];
  const seen = new Set<string>();
  for (const taskId of taskIds) {
    if (seen.has(taskId)) {
      continue;
    }
    seen.add(taskId);
    items.push({
      taskId,
      skillId: '',
      source: 'reinforcement',
    });
  }
  return items;
}

function subjectAttempts(attempts: readonly Attempt[], subject: SubjectId): Attempt[] {
  return attempts.filter((attempt) => attempt.subject === subject);
}

/**
 * Правильность по последней daily-попытке — только для сводки HomePage.
 * completed / remaining / isCompleted считает dailyPlanProgressService.
 */
function lastAttemptStats(
  attempts: readonly Attempt[],
  userId: string,
  subject: SubjectId,
  date: string,
  questionIds: ReadonlySet<string>,
): { correct: number; incorrect: number } {
  const lastByQuestion = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (
      attempt.userId !== userId ||
      attempt.subject !== subject ||
      attempt.mode !== 'daily' ||
      !hasSkillId(attempt) ||
      !questionIds.has(attempt.questionId) ||
      getCalendarDate(attempt.date) !== date
    ) {
      continue;
    }
    const previous = lastByQuestion.get(attempt.questionId);
    if (!previous) {
      lastByQuestion.set(attempt.questionId, attempt);
      continue;
    }
    const byDate = attemptTimestamp(attempt) - attemptTimestamp(previous);
    if (byDate > 0 || (byDate === 0 && attempt.attemptId.localeCompare(previous.attemptId) > 0)) {
      lastByQuestion.set(attempt.questionId, attempt);
    }
  }
  let correct = 0;
  let incorrect = 0;
  for (const attempt of lastByQuestion.values()) {
    if (attempt.isCorrect) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }
  return { correct, incorrect };
}

function toSummary(
  date: string,
  progress: DailyPlanProgress,
  stats: { correct: number; incorrect: number },
): DailyPlanDaySummary {
  return {
    date,
    total: progress.total,
    completed: progress.completed,
    remaining: progress.remaining,
    isCompleted: progress.isCompleted,
    correct: stats.correct,
    incorrect: stats.incorrect,
    accuracy: progress.completed > 0 ? Math.round((stats.correct / progress.completed) * 100) : null,
    status: progress.isCompleted ? 'completed' : 'incomplete',
  };
}

function progressForPlan(
  plan: DailyPlan,
  attempts: readonly Attempt[],
  userId: string,
  date: string,
): DailyPlanProgress {
  return getDailyPlanProgress({
    plan,
    attempts: subjectAttempts(attempts, plan.subject),
    userId,
    nowIso: isoOnCalendarDate(date),
  });
}

export function getDailyPlanDaySummary(input: {
  userId: string;
  date: string;
  subject: SubjectId;
  taskIds: readonly string[];
  attempts: readonly Attempt[];
}): DailyPlanDaySummary {
  const items = itemsFromTaskIds(input.taskIds);
  const plan: DailyPlan = {
    userId: input.userId,
    subject: input.subject,
    createdAt: isoOnCalendarDate(input.date),
    totalCount: items.length,
    items,
  };
  const progress = progressForPlan(plan, input.attempts, input.userId, input.date);
  const stats = lastAttemptStats(
    input.attempts,
    input.userId,
    input.subject,
    input.date,
    new Set(items.map((item) => item.taskId)),
  );
  return toSummary(input.date, progress, stats);
}

export function summaryFromDailyPlan(
  plan: DailyPlan,
  attempts: readonly Attempt[],
  date: string,
): DailyPlanDaySummary {
  const progress = progressForPlan(plan, attempts, plan.userId, date);
  const stats = lastAttemptStats(
    attempts,
    plan.userId,
    plan.subject,
    date,
    new Set(plan.items.map((item) => item.taskId)),
  );
  return toSummary(date, progress, stats);
}

function summaryFromStoredPlan(
  plan: StoredDailyPlan,
  attempts: readonly Attempt[],
): DailyPlanDaySummary {
  const nowIso = isoOnCalendarDate(plan.date);
  const dailyPlan = storedPlanToDailyPlan(plan, nowIso);
  const progress = progressForPlan(dailyPlan, attempts, plan.userId, plan.date);
  const stats = lastAttemptStats(
    attempts,
    plan.userId,
    plan.subject,
    plan.date,
    new Set(plan.taskIds),
  );
  return toSummary(plan.date, progress, stats);
}

/**
 * История DailyPlan из storage + Attempt.
 * Не создаёт новый ключ localStorage и не придумывает дни без плана.
 */
export function getDailyPlanHistory(input: GetDailyPlanHistoryInput): DailyPlanDaySummary[] {
  const limit = input.limit ?? HISTORY_LIMIT;
  const attempts = input.attempts ?? localAttemptRecorder.getAll(input.userId);
  return listStoredDailyPlans(input.userId, input.subject, input.storage)
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, Math.max(0, limit))
    .map((plan) => summaryFromStoredPlan(plan, attempts));
}

export function getMergedDailyPlanHistory(input: {
  userId: string;
  limit?: number;
  attempts?: readonly Attempt[];
  storage?: DailyPlanStorageBackend;
}): DailyPlanDaySummary[] {
  const limit = input.limit ?? HISTORY_LIMIT;
  const attempts = input.attempts ?? localAttemptRecorder.getAll(input.userId);
  const byDate = new Map<string, DailyPlanDaySummary>();
  for (const plan of listStoredDailyPlansForUser(input.userId, input.storage)) {
    const row = summaryFromStoredPlan(plan, attempts);
    const current = byDate.get(row.date);
    if (!current) {
      byDate.set(row.date, row);
      continue;
    }
    const total = current.total + row.total;
    const completed = current.completed + row.completed;
    const correct = current.correct + row.correct;
    const incorrect = current.incorrect + row.incorrect;
    const answered = correct + incorrect;
    byDate.set(row.date, {
      date: row.date,
      total,
      completed,
      remaining: Math.max(0, total - completed),
      isCompleted: total > 0 && completed === total,
      correct,
      incorrect,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
      status: total > 0 && completed === total ? 'completed' : 'incomplete',
    });
  }
  return [...byDate.values()]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, Math.max(0, limit));
}
