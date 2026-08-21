import type { Attempt, SkillMastery } from '../types';

/** Единственные интервалы MVP. MASTERY_SPEC.md §15–§17. */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7] as const;
export type ReviewIntervalDays = (typeof REVIEW_INTERVAL_DAYS)[number];

export interface SkillReviewState {
  userId: string;
  skillId: string;
  reviewIntervalDays: ReviewIntervalDays | null;
  nextReviewAt: string | null;
  isReviewDue: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isReviewIntervalDays(value: number): value is ReviewIntervalDays {
  return value === 0 || value === 1 || value === 3 || value === 7;
}

function isHintsUsed(value: unknown): value is 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function attemptTimestamp(attempt: Attempt): number {
  const parsed = Date.parse(attempt.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareAttempts(a: Attempt, b: Attempt): number {
  const byDate = attemptTimestamp(a) - attemptTimestamp(b);
  if (byDate !== 0) {
    return byDate;
  }
  return a.attemptId.localeCompare(b.attemptId);
}

function selectReviewAttempts(attempts: Attempt[], skillId: string, userId: string): Attempt[] {
  return attempts
    .filter(
      (attempt) =>
        attempt.userId === userId &&
        typeof attempt.skillId === 'string' &&
        attempt.skillId === skillId &&
        typeof attempt.isCorrect === 'boolean',
    )
    .slice()
    .sort(compareAttempts);
}

/**
 * Следующий интервал после одной попытки.
 * Ошибка → 0 (§16). Правильные подряд: 1 → 3 → 7 (§17). Подсказка не ускоряет шаг (§18).
 */
export function nextReviewIntervalDays(params: {
  previousIntervalDays: number;
  consecutiveCorrect: number;
  isCorrect: boolean;
  usedHint: boolean;
}): ReviewIntervalDays {
  if (!params.isCorrect) {
    return 0;
  }
  const withoutHint: ReviewIntervalDays =
    params.consecutiveCorrect <= 1 ? 1 : params.consecutiveCorrect === 2 ? 3 : 7;
  if (!params.usedHint) {
    return withoutHint;
  }
  const nextAllowedStep: ReviewIntervalDays =
    params.previousIntervalDays === 0
      ? 1
      : isReviewIntervalDays(params.previousIntervalDays)
        ? params.previousIntervalDays
        : 1;
  return nextAllowedStep <= withoutHint ? nextAllowedStep : withoutHint;
}

function replayInterval(skillAttempts: Attempt[]): ReviewIntervalDays | null {
  if (skillAttempts.length === 0) {
    return null;
  }
  let interval: ReviewIntervalDays = 0;
  let consecutiveCorrect = 0;
  for (const attempt of skillAttempts) {
    if (attempt.isCorrect) {
      consecutiveCorrect += 1;
    } else {
      consecutiveCorrect = 0;
    }
    const usedHint = isHintsUsed(attempt.hintsUsed) ? attempt.hintsUsed > 0 : false;
    interval = nextReviewIntervalDays({
      previousIntervalDays: interval,
      consecutiveCorrect,
      isCorrect: attempt.isCorrect,
      usedHint,
    });
  }
  return interval;
}

/**
 * Интервал навыка по Attempt выбранного userId и skillId.
 * Нет подходящих попыток → null (новый ребёнок, без 1/3/7).
 */
export function calculateReviewInterval(
  attempts: Attempt[],
  skillId: string,
  userId: string,
): ReviewIntervalDays | null {
  return replayInterval(selectReviewAttempts(attempts, skillId, userId));
}

/**
 * nextReviewAt = дата последней релевантной попытки + interval дней (ISO).
 * interval 0 → та же дата («сразу»). Нет попытки или нет интервала → null.
 */
export function calculateNextReviewAt(
  lastAttemptAt: string | null,
  intervalDays: number | null,
): string | null {
  if (lastAttemptAt === null || intervalDays === null) {
    return null;
  }
  const parsed = Date.parse(lastAttemptAt);
  if (Number.isNaN(parsed)) {
    return lastAttemptAt;
  }
  return new Date(parsed + intervalDays * MS_PER_DAY).toISOString();
}

/**
 * Повторение назначено и срок наступил: nextReviewAt <= now.
 * Нет даты (новый ребёнок) → не просрочено.
 */
export function isReviewDue(nextReviewAt: string | null, nowIso?: string): boolean {
  if (nextReviewAt === null) {
    return false;
  }
  const due = Date.parse(nextReviewAt);
  if (Number.isNaN(due)) {
    return false;
  }
  const now = Date.parse(nowIso ?? new Date().toISOString());
  if (Number.isNaN(now)) {
    return false;
  }
  return due <= now;
}

function emptyReviewState(userId: string, skillId: string): SkillReviewState {
  return {
    userId,
    skillId,
    reviewIntervalDays: null,
    nextReviewAt: null,
    isReviewDue: false,
  };
}

/** Состояние повторения поверх уже посчитанного SkillMastery. */
export function getReviewState(mastery: SkillMastery, nowIso?: string): SkillReviewState {
  if (mastery.status === 'new' || mastery.masteryScore === null || mastery.lastAttemptAt === null) {
    return emptyReviewState(mastery.userId, mastery.skillId);
  }
  const reviewIntervalDays = isReviewIntervalDays(mastery.reviewIntervalDays)
    ? mastery.reviewIntervalDays
    : null;
  const nextReviewAt =
    mastery.nextReviewAt ?? calculateNextReviewAt(mastery.lastAttemptAt, reviewIntervalDays);
  return {
    userId: mastery.userId,
    skillId: mastery.skillId,
    reviewIntervalDays,
    nextReviewAt,
    isReviewDue: isReviewDue(nextReviewAt, nowIso),
  };
}

/** То же состояние, но напрямую из Attempt, без повторного расчёта masteryScore. */
export function getReviewStateFromAttempts(
  attempts: Attempt[],
  skillId: string,
  userId: string,
  nowIso?: string,
): SkillReviewState {
  const skillAttempts = selectReviewAttempts(attempts, skillId, userId);
  if (skillAttempts.length === 0) {
    return emptyReviewState(userId, skillId);
  }
  const reviewIntervalDays = replayInterval(skillAttempts);
  const lastAttemptAt = skillAttempts[skillAttempts.length - 1].date;
  const nextReviewAt = calculateNextReviewAt(lastAttemptAt, reviewIntervalDays);
  return {
    userId,
    skillId,
    reviewIntervalDays,
    nextReviewAt,
    isReviewDue: isReviewDue(nextReviewAt, nowIso),
  };
}
