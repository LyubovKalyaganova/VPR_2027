import type { Attempt, Difficulty, ErrorType, MasteryStatus, SkillMastery } from '../types';
import { calculateNextReviewAt, nextReviewIntervalDays } from './reviewScheduler';

/** Веса последних 10 попыток: от самой старой к самой новой. MASTERY_SPEC.md §6.1. */
const RECENCY_WEIGHTS = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1] as const;

const HINT_MULTIPLIER: Record<0 | 1 | 2 | 3, number> = {
  0: 1,
  1: 0.9,
  2: 0.8,
  3: 0.7,
};

const DIFFICULTY_COEFFICIENT: Record<Difficulty, number> = {
  1: 0.9,
  2: 0.95,
  3: 1,
  4: 1.05,
  5: 1.1,
};

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
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

function hasSkillId(attempt: Attempt, skillId: string): boolean {
  return typeof attempt.skillId === 'string' && attempt.skillId === skillId;
}

/**
 * Только попытки выбранного пользователя и навыка.
 * DEMO и старые Attempt без skillId отбрасываются (MASTERY_SPEC.md §30, §35).
 */
export function selectSkillAttempts(attempts: Attempt[], skillId: string, userId: string): Attempt[] {
  return attempts
    .filter(
      (attempt) =>
        attempt.userId === userId &&
        hasSkillId(attempt, skillId) &&
        typeof attempt.isCorrect === 'boolean' &&
        isDifficulty(attempt.difficulty),
    )
    .slice()
    .sort(compareAttempts);
}

function hintMultiplier(hintsUsed: unknown): number {
  return isHintsUsed(hintsUsed) ? HINT_MULTIPLIER[hintsUsed] : HINT_MULTIPLIER[0];
}

/**
 * attemptValue = correctness × hintMultiplier × difficultyCoefficient, не больше 1.
 * MASTERY_SPEC.md §7–§10. timeSpent в формулу не входит (§37).
 */
function attemptValue(attempt: Attempt): number {
  const correctness = attempt.isCorrect ? 1 : 0;
  const hints = attempt.isCorrect ? hintMultiplier(attempt.hintsUsed) : 1;
  const difficulty = DIFFICULTY_COEFFICIENT[attempt.difficulty];
  return Math.min(1, correctness * hints * difficulty);
}

function recencyWeights(count: number): readonly number[] {
  return RECENCY_WEIGHTS.slice(RECENCY_WEIGHTS.length - count);
}

function computeMasteryScore(window: Attempt[]): number {
  const weights = recencyWeights(window.length);
  let weightedSum = 0;
  let weightSum = 0;
  for (let index = 0; index < window.length; index += 1) {
    const weight = weights[index];
    weightedSum += attemptValue(window[index]) * weight;
    weightSum += weight;
  }
  const weightedScore = weightSum === 0 ? 0 : weightedSum / weightSum;
  let score = Math.round(weightedScore * 100);
  if (score < 0) {
    score = 0;
  }
  if (score > 100) {
    score = 100;
  }
  return score;
}

/** MASTERY_SPEC.md §11. */
function applyEarlyCap(score: number, attemptsCount: number): number {
  if (attemptsCount < 3) {
    return Math.min(score, 60);
  }
  if (attemptsCount < 5) {
    return Math.min(score, 80);
  }
  return score;
}

function statusFromScore(score: number): Exclude<MasteryStatus, 'new'> {
  if (score >= 80) {
    return 'mastered';
  }
  if (score >= 60) {
    return 'confident';
  }
  if (score >= 40) {
    return 'developing';
  }
  return 'not_mastered';
}

/**
 * §3 задаёт диапазоны статуса по score.
 * §19 дополнительно требует score >= 90, серию ≥ 3 и последнюю попытку без подсказок.
 * Если §3 даёт mastered, но §19 не выполнен — статус confident.
 */
function resolveStatus(
  score: number,
  consecutiveCorrect: number,
  lastHintsUsed: number,
): Exclude<MasteryStatus, 'new'> {
  const byScore = statusFromScore(score);
  const meetsMasteredGate = score >= 90 && consecutiveCorrect >= 3 && lastHintsUsed === 0;
  if (byScore === 'mastered' && !meetsMasteredGate) {
    return 'confident';
  }
  return byScore;
}

function emptyMastery(userId: string, skillId: string): SkillMastery {
  return {
    userId,
    skillId,
    masteryScore: null,
    attemptsCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastAttemptAt: null,
    lastCorrectAt: null,
    currentStreak: 0,
    incorrectStreak: 0,
    lastDifficulty: null,
    lastHintsUsed: 0,
    nextReviewAt: null,
    reviewIntervalDays: 0,
    status: 'new',
  };
}

/**
 * Чистый расчёт SkillMastery по Attempt. Не читает localStorage, DOM и React.
 */
export function calculateSkillMastery(
  attempts: Attempt[],
  skillId: string,
  userId: string,
): SkillMastery {
  const skillAttempts = selectSkillAttempts(attempts, skillId, userId);
  if (skillAttempts.length === 0) {
    return emptyMastery(userId, skillId);
  }

  let currentStreak = 0;
  let incorrectStreak = 0;
  let reviewIntervalDays = 0;
  let lastCorrectAt: string | null = null;

  for (const attempt of skillAttempts) {
    if (attempt.isCorrect) {
      currentStreak += 1;
      incorrectStreak = 0;
      lastCorrectAt = attempt.date;
      const usedHint = isHintsUsed(attempt.hintsUsed) ? attempt.hintsUsed > 0 : false;
      reviewIntervalDays = nextReviewIntervalDays({
        previousIntervalDays: reviewIntervalDays,
        consecutiveCorrect: currentStreak,
        isCorrect: true,
        usedHint,
      });
    } else {
      incorrectStreak += 1;
      currentStreak = 0;
      reviewIntervalDays = nextReviewIntervalDays({
        previousIntervalDays: reviewIntervalDays,
        consecutiveCorrect: 0,
        isCorrect: false,
        usedHint: false,
      });
    }
  }

  const lastAttempt = skillAttempts[skillAttempts.length - 1];
  const window = skillAttempts.slice(-10);
  const masteryScore = applyEarlyCap(computeMasteryScore(window), skillAttempts.length);
  const lastHintsUsed = isHintsUsed(lastAttempt.hintsUsed) ? lastAttempt.hintsUsed : 0;

  return {
    userId,
    skillId,
    masteryScore,
    attemptsCount: skillAttempts.length,
    correctCount: skillAttempts.filter((attempt) => attempt.isCorrect).length,
    incorrectCount: skillAttempts.filter((attempt) => !attempt.isCorrect).length,
    lastAttemptAt: lastAttempt.date,
    lastCorrectAt,
    currentStreak,
    incorrectStreak,
    lastDifficulty: lastAttempt.difficulty,
    lastHintsUsed,
    nextReviewAt: calculateNextReviewAt(lastAttempt.date, reviewIntervalDays),
    reviewIntervalDays,
    status: resolveStatus(masteryScore, currentStreak, lastHintsUsed),
  };
}

/**
 * MASTERY_SPEC.md §20. Для status === 'new' слабым навык не считается.
 */
export function isWeakSkill(mastery: SkillMastery): boolean {
  if (mastery.status === 'new' || mastery.masteryScore === null) {
    return false;
  }
  const lastAttemptIncorrect = mastery.incorrectStreak >= 1;
  return mastery.masteryScore < 60 || mastery.incorrectStreak >= 2 || lastAttemptIncorrect;
}

/**
 * MASTERY_SPEC.md §19.
 */
export function isMasteredSkill(mastery: SkillMastery): boolean {
  return (
    mastery.status === 'mastered' &&
    mastery.masteryScore !== null &&
    mastery.masteryScore >= 90 &&
    mastery.currentStreak >= 3 &&
    mastery.lastHintsUsed === 0
  );
}

/**
 * Attempt не содержит taskType, поэтому точный тип по §13 сейчас определить нельзя.
 * Для неправильного ответа возвращается 'unknown' (§12).
 */
export function classifyAttemptError(attempt: Attempt): ErrorType | null {
  if (attempt.isCorrect) {
    return null;
  }
  return 'unknown';
}
