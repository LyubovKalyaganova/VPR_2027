import type { Attempt, Difficulty, SkillMastery, SubjectId, Task } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { orderSkillIdsByTrainingWeight } from '../features/mathematics/mathTrainingSelection';
import { calculateSkillMastery, selectSkillAttempts } from './masteryService';
import { getReviewState, type SkillReviewState } from './reviewScheduler';
import { shuffle } from '../utils/shuffle';

export type AdaptiveTaskSelectorInput = {
  userId: string;
  subject: SubjectId;
  count: number;
  attempts: Attempt[];
  tasks: Task[];
  skills?: readonly { id: string }[];
  excludeQuestionIds?: string[];
  nowIso?: string;
};

type SkillPickContext = {
  skillId: string;
  mastery: SkillMastery;
  review: SkillReviewState;
  skillTasks: Task[];
  lastIncorrect: boolean;
  recentIncorrectCount: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_CONSECUTIVE_SAME_SKILL = 2;

function preferredDifficulties(mastery: SkillMastery): Difficulty[] {
  if (mastery.status === 'new' || mastery.masteryScore === null || mastery.masteryScore < 40) {
    return [1, 2];
  }
  if (mastery.masteryScore < 70) {
    return [2, 3];
  }
  if (mastery.masteryScore < 90) {
    return [3, 4];
  }
  return [4, 5];
}

function difficultyDistance(difficulty: Difficulty, preferred: Difficulty[]): number {
  if (preferred.includes(difficulty)) {
    return 0;
  }
  return Math.min(...preferred.map((item) => Math.abs(difficulty - item)));
}

function daysSince(iso: string | null, nowIso: string): number {
  if (iso === null) {
    return 0;
  }
  const then = Date.parse(iso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(then) || Number.isNaN(now) || now < then) {
    return 0;
  }
  return (now - then) / MS_PER_DAY;
}

function countRecentIncorrect(attempts: Attempt[], skillId: string, userId: string): number {
  return selectSkillAttempts(attempts, skillId, userId)
    .slice(-5)
    .filter((attempt) => !attempt.isCorrect).length;
}

/**
 * Ключи по убыванию важности — MASTERY_SPEC.md §21–§22 и правила этапа 6Б-3А.
 */
function priorityKeys(context: SkillPickContext, nowIso: string): number[] {
  const { mastery, review } = context;
  const dueUrgent =
    review.isReviewDue && (review.reviewIntervalDays === 0 || context.lastIncorrect)
      ? 3
      : review.isReviewDue
        ? 2
        : 0;
  const score = mastery.masteryScore;
  return [
    dueUrgent,
    context.lastIncorrect ? 1 : 0,
    score !== null && score < 40 ? 1 : 0,
    mastery.incorrectStreak >= 2 ? 1 : 0,
    context.recentIncorrectCount,
    mastery.incorrectCount,
    mastery.status === 'not_mastered' ? 1 : 0,
    mastery.status === 'new' ? 1 : 0,
    score === null ? 50 : 100 - score,
    daysSince(mastery.lastAttemptAt, nowIso),
    mastery.status === 'mastered' ? 0 : 1,
  ];
}

function compareContexts(a: SkillPickContext, b: SkillPickContext, nowIso: string): number {
  const keysA = priorityKeys(a, nowIso);
  const keysB = priorityKeys(b, nowIso);
  for (let index = 0; index < keysA.length; index += 1) {
    if (keysA[index] !== keysB[index]) {
      return keysB[index] - keysA[index];
    }
  }
  return a.skillId.localeCompare(b.skillId);
}

function chooseTask(
  skillTasks: Task[],
  mastery: SkillMastery,
  exclude: Set<string>,
  alreadySelected: Set<string>,
): Task | undefined {
  const unused = skillTasks.filter((task) => !alreadySelected.has(task.id));
  if (unused.length === 0) {
    return undefined;
  }
  const notExcluded = unused.filter((task) => !exclude.has(task.id));
  const candidates = notExcluded.length > 0 ? notExcluded : unused;
  const preferred = preferredDifficulties(mastery);
  const ordered = shuffle(candidates).sort(
    (left, right) =>
      difficultyDistance(left.difficulty, preferred) - difficultyDistance(right.difficulty, preferred),
  );
  return ordered[0];
}

function trailingSameSkillCount(selected: Task[]): number {
  if (selected.length === 0) {
    return 0;
  }
  const lastSkillId = selected[selected.length - 1].skillId;
  let count = 0;
  for (let index = selected.length - 1; index >= 0; index -= 1) {
    if (selected[index].skillId !== lastSkillId) {
      break;
    }
    count += 1;
  }
  return count;
}

function buildContexts(
  input: AdaptiveTaskSelectorInput,
  poolTasks: Task[],
  skillIds: string[],
  nowIso: string,
): SkillPickContext[] {
  return skillIds.map((skillId) => {
    const mastery = calculateSkillMastery(input.attempts, skillId, input.userId);
    const review = getReviewState(mastery, nowIso);
    return {
      skillId,
      mastery,
      review,
      skillTasks: poolTasks.filter((task) => task.skillId === skillId),
      lastIncorrect: mastery.incorrectStreak >= 1,
      recentIncorrectCount: countRecentIncorrect(input.attempts, skillId, input.userId),
    };
  });
}

/**
 * Чистый адаптивный подбор Task[]. Не читает store, DOM и localStorage.
 */
export function selectAdaptiveTasks(input: AdaptiveTaskSelectorInput): Task[] {
  if (input.count <= 0) {
    return [];
  }

  const allowedSkillIds = new Set((input.skills ?? MATH_SKILLS).map((skill) => skill.id));
  const poolTasks = input.tasks.filter(
    (task) =>
      task.subject === input.subject &&
      typeof task.skillId === 'string' &&
      task.skillId.length > 0 &&
      allowedSkillIds.has(task.skillId),
  );
  const skillIds = [...new Set(poolTasks.map((task) => task.skillId as string))];
  if (skillIds.length === 0) {
    return [];
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const exclude = new Set(input.excludeQuestionIds ?? []);
  const contexts = buildContexts(input, poolTasks, skillIds, nowIso);
  const allNew = contexts.every((context) => context.mastery.status === 'new');
  // Cold start: для математики — порядок по trainingWeight; иначе shuffle.
  // При наличии истории weakness/review приоритетнее весов (compareContexts).
  const rotation = allNew
    ? input.subject === 'mathematics'
      ? (() => {
          const order = orderSkillIdsByTrainingWeight(skillIds);
          const rank = new Map(order.map((id, index) => [id, index]));
          return [...contexts].sort(
            (a, b) => (rank.get(a.skillId) ?? 999) - (rank.get(b.skillId) ?? 999),
          );
        })()
      : shuffle(contexts)
    : [...contexts].sort((left, right) => compareContexts(left, right, nowIso));

  const selected: Task[] = [];
  const selectedIds = new Set<string>();
  let rotationIndex = 0;

  while (selected.length < input.count) {
    const lastSkillId = selected.at(-1)?.skillId;
    const consecutive = trailingSameSkillCount(selected);
    const withTasks = rotation.filter(
      (context) => chooseTask(context.skillTasks, context.mastery, exclude, selectedIds) !== undefined,
    );
    if (withTasks.length === 0) {
      break;
    }

    let pool = withTasks;
    if (consecutive >= MAX_CONSECUTIVE_SAME_SKILL && lastSkillId) {
      const others = withTasks.filter((context) => context.skillId !== lastSkillId);
      if (others.length > 0) {
        pool = others;
      }
    }

    let chosen: SkillPickContext;
    if (allNew) {
      const start = rotationIndex;
      chosen = pool[0];
      for (let offset = 0; offset < rotation.length; offset += 1) {
        const candidate = rotation[(start + offset) % rotation.length];
        if (pool.includes(candidate)) {
          chosen = candidate;
          rotationIndex = start + offset + 1;
          break;
        }
      }
    } else {
      pool.sort((left, right) => compareContexts(left, right, nowIso));
      chosen = pool[0];
    }

    const task = chooseTask(chosen.skillTasks, chosen.mastery, exclude, selectedIds);
    if (!task) {
      break;
    }
    selected.push(task);
    selectedIds.add(task.id);
  }

  return selected;
}
