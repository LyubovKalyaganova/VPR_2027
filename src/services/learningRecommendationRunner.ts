import { MATH_SKILLS } from '../data/taxonomy/math';
import { localAttemptRecorder } from '../db';
import type { Attempt, SubjectId } from '../types';
import { selectMistakeTasks } from '../store/useTrainingStore';
import type { DailyPlan } from './dailyPlanService';
import { getDailyPlanProgress } from './dailyPlanProgressService';
import {
  getCalendarDate,
  getStoredDailyPlan,
  localDailyPlanStorage,
  type DailyPlanStorageBackend,
} from './dailyPlanStorage';
import { calculateSkillMastery, isWeakSkill } from './masteryService';
import { getReviewState } from './reviewScheduler';
import {
  getLearningRecommendation,
  type DailyPlanRecommendationState,
  type LearningRecommendation,
} from './learningRecommendationService';

export type RecommendationLaunch =
  | { start: 'startDaily' }
  | { start: 'startMistakes' }
  | { start: 'startReview' }
  | { start: 'startWeak' }
  | { start: 'startMath'; mode: 'normal' };

/**
 * Соответствие recommendation.action существующим методам useTrainingStore.
 * Не создаёт сессию и не выбирает задания.
 */
export function resolveRecommendationLaunch(
  recommendation: LearningRecommendation | null | undefined,
): RecommendationLaunch | null {
  if (!recommendation) {
    return null;
  }
  switch (recommendation.action) {
    case 'daily':
      return { start: 'startDaily' };
    case 'mistakes':
      return { start: 'startMistakes' };
    case 'review':
      return { start: 'startReview' };
    case 'weak':
      return { start: 'startWeak' };
    case 'normal':
      return { start: 'startMath', mode: 'normal' };
    default:
      return null;
  }
}

export type GetLearningRecommendationForUserInput = {
  userId: string;
  subject?: SubjectId;
  nowIso?: string;
  attempts?: readonly Attempt[];
  storage?: DailyPlanStorageBackend;
};

const EMPTY_DAILY_PLAN: DailyPlanRecommendationState = {
  total: 0,
  completed: 0,
  remaining: 0,
  isCompleted: false,
};

function readUserAttempts(
  userId: string,
  attempts: readonly Attempt[] | undefined,
): Attempt[] {
  const source = attempts ?? localAttemptRecorder.getAll(userId);
  return source.filter(
    (attempt) => attempt.userId === userId && attempt.mode !== 'demo',
  );
}

function storedPlanToDailyPlan(stored: {
  userId: string;
  subject: SubjectId;
  items: DailyPlan['items'];
  createdAt: string;
}): DailyPlan {
  return {
    userId: stored.userId,
    subject: stored.subject,
    createdAt: stored.createdAt,
    totalCount: stored.items.length,
    items: stored.items.map((item) => ({
      taskId: item.taskId,
      skillId: item.skillId,
      source: item.source,
    })),
  };
}

function readDailyPlanState(input: {
  userId: string;
  subject: SubjectId;
  nowIso: string;
  storage: DailyPlanStorageBackend;
  attempts: Attempt[];
}): DailyPlanRecommendationState {
  const date = getCalendarDate(input.nowIso);
  const stored = getStoredDailyPlan(input.userId, input.subject, date, input.storage);
  if (!stored || stored.items.length === 0) {
    return { ...EMPTY_DAILY_PLAN };
  }

  const progress = getDailyPlanProgress({
    plan: storedPlanToDailyPlan({
      userId: stored.userId,
      subject: stored.subject,
      items: stored.items,
      createdAt: input.nowIso,
    }),
    attempts: input.attempts,
    userId: input.userId,
    nowIso: input.nowIso,
  });

  return {
    total: progress.total,
    completed: progress.completed,
    remaining: progress.remaining,
    isCompleted: progress.isCompleted,
  };
}

function collectMathSkillIds(
  attempts: Attempt[],
  userId: string,
  nowIso: string,
): {
  dueSkillIds: string[];
  weakSkillIds: string[];
  newSkillIds: string[];
  reinforcementSkillIds: string[];
} {
  const dueSkillIds: string[] = [];
  const weakSkillIds: string[] = [];
  const newSkillIds: string[] = [];
  const reinforcementSkillIds: string[] = [];

  for (const skill of MATH_SKILLS) {
    const mastery = calculateSkillMastery(attempts, skill.id, userId);
    const review = getReviewState(mastery, nowIso);
    const weak = isWeakSkill(mastery);

    if (review.isReviewDue) {
      dueSkillIds.push(skill.id);
    }
    if (weak) {
      weakSkillIds.push(skill.id);
    }
    if (mastery.status === 'new') {
      newSkillIds.push(skill.id);
      continue;
    }
    if (
      mastery.attemptsCount > 0 &&
      !review.isReviewDue &&
      !weak &&
      (mastery.status === 'developing' ||
        mastery.status === 'confident' ||
        mastery.status === 'mastered')
    ) {
      reinforcementSkillIds.push(skill.id);
    }
  }

  const hasSkillData = newSkillIds.length < MATH_SKILLS.length;
  return {
    dueSkillIds,
    weakSkillIds,
    newSkillIds: hasSkillData ? newSkillIds : [],
    reinforcementSkillIds,
  };
}

/**
 * Мост: собирает уже существующие данные пользователя и передаёт их
 * в чистый getLearningRecommendation(). Не пишет Attempt и не создаёт DailyPlan.
 *
 * Сегодняшний план читается через getStoredDailyPlan, а не getDailyPlan:
 * getDailyPlan при отсутствии записи сам сохраняет новый план.
 */
export function getLearningRecommendationForUser(
  input: GetLearningRecommendationForUserInput,
): LearningRecommendation {
  const userId = input.userId;
  const subject = input.subject ?? 'mathematics';
  const nowIso = input.nowIso ?? new Date().toISOString();
  const storage = input.storage ?? localDailyPlanStorage;
  const attempts = readUserAttempts(userId, input.attempts);

  const dailyPlan = readDailyPlanState({
    userId,
    subject,
    nowIso,
    storage,
    attempts,
  });

  const skillIds =
    subject === 'mathematics'
      ? collectMathSkillIds(attempts, userId, nowIso)
      : {
          dueSkillIds: [],
          weakSkillIds: [],
          newSkillIds: [],
          reinforcementSkillIds: [],
        };

  const mistakesCount =
    subject === 'mathematics' ? selectMistakeTasks(attempts, userId).length : 0;

  return getLearningRecommendation({
    userId,
    dailyPlan,
    mistakes: { count: mistakesCount },
    dueSkillIds: skillIds.dueSkillIds,
    weakSkillIds: skillIds.weakSkillIds,
    newSkillIds: skillIds.newSkillIds,
    reinforcementSkillIds: skillIds.reinforcementSkillIds,
    attempts,
  });
}
