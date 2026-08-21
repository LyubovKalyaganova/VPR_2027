import type { Attempt, SkillMastery, SubjectId, Task } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { selectAdaptiveTasks } from './adaptiveTaskSelector';
import { calculateSkillMastery, isWeakSkill } from './masteryService';
import { getReviewState } from './reviewScheduler';

export type DailyPlanSource = 'weak' | 'review' | 'reinforcement';

export type DailyPlanItem = {
  taskId: string;
  skillId: string;
  source: DailyPlanSource;
};

export type DailyPlan = {
  userId: string;
  subject: SubjectId;
  createdAt: string;
  totalCount: number;
  items: DailyPlanItem[];
};

export type DailyPlanInput = {
  userId: string;
  subject: SubjectId;
  count: number;
  attempts: readonly Attempt[];
  tasks: readonly Task[];
  skills?: readonly { id: string }[];
  nowIso?: string;
  excludeQuestionIds?: readonly string[];
};

export type DailyPlanQuotas = {
  weak: number;
  review: number;
  reinforcement: number;
};

type SkillClass = {
  id: string;
  mastery: SkillMastery;
  due: boolean;
  weak: boolean;
};

function relevantAttempts(attempts: readonly Attempt[], userId: string, subject: SubjectId): Attempt[] {
  return attempts.filter(
    (attempt) =>
      attempt.userId === userId &&
      attempt.subject === subject &&
      typeof attempt.skillId === 'string' &&
      attempt.skillId.length > 0,
  );
}

function poolTasks(
  tasks: readonly Task[],
  subject: SubjectId,
  skillIds: ReadonlySet<string>,
): Task[] {
  return tasks.filter(
    (task) =>
      task.subject === subject &&
      typeof task.skillId === 'string' &&
      task.skillId.length > 0 &&
      skillIds.has(task.skillId),
  );
}

/**
 * Квоты 60% weak / 20% review / 20% reinforcement.
 * Сумма всегда равна count, пустых слотов нет.
 */
export function splitDailyPlanQuotas(count: number): DailyPlanQuotas {
  if (count <= 0) {
    return { weak: 0, review: 0, reinforcement: 0 };
  }
  let weak = Math.round(count * 0.6);
  let review = Math.round(count * 0.2);
  let reinforcement = count - weak - review;
  if (reinforcement < 0) {
    weak += reinforcement;
    reinforcement = 0;
  }
  if (weak < 0) {
    review += weak;
    weak = 0;
  }
  if (review < 0) {
    reinforcement += review;
    review = 0;
  }
  return { weak, review, reinforcement };
}

function classifySkills(
  skillIds: readonly { id: string }[],
  attempts: Attempt[],
  userId: string,
  nowIso: string,
): SkillClass[] {
  return skillIds.map((skill) => {
    const mastery = calculateSkillMastery(attempts, skill.id, userId);
    const review = getReviewState(mastery, nowIso);
    return {
      id: skill.id,
      mastery,
      due: review.isReviewDue,
      weak: isWeakSkill(mastery),
    };
  });
}

function asSkillRefs(ids: string[]): { id: string }[] {
  return ids.map((id) => ({ id }));
}

function emptyPlan(userId: string, subject: SubjectId, createdAt: string): DailyPlan {
  return {
    userId,
    subject,
    createdAt,
    totalCount: 0,
    items: [],
  };
}

/**
 * Чистый расчёт ежедневного плана.
 * Не читает localStorage, Zustand, taskRepository, DOM и React.
 */
export function createDailyPlan(input: DailyPlanInput): DailyPlan {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const userId = input.userId;
  const subject = input.subject;
  const createdAt = nowIso;

  if (input.count <= 0) {
    return emptyPlan(userId, subject, createdAt);
  }

  const skillRefs = input.skills ?? MATH_SKILLS;
  const attempts = relevantAttempts(input.attempts, userId, subject);
  const allowedSkillIds = new Set(skillRefs.map((skill) => skill.id));
  const tasks = poolTasks(input.tasks, subject, allowedSkillIds);

  if (tasks.length === 0) {
    return emptyPlan(userId, subject, createdAt);
  }

  const classified = classifySkills(skillRefs, attempts, userId, nowIso);
  const reviewSkills = classified.filter((item) => item.due);
  const weakSkills = classified.filter((item) => item.weak && !item.due);
  const reinforcementPreferred = classified.filter(
    (item) =>
      !item.due &&
      !item.weak &&
      item.mastery.attemptsCount > 0 &&
      (item.mastery.status === 'developing' || item.mastery.status === 'confident'),
  );
  const reinforcementNew = classified.filter((item) => !item.due && !item.weak && item.mastery.status === 'new');
  const reinforcementMastered = classified.filter(
    (item) => !item.due && !item.weak && item.mastery.status === 'mastered',
  );
  const reinforcementOther = classified.filter(
    (item) =>
      !item.due &&
      !item.weak &&
      item.mastery.status !== 'new' &&
      item.mastery.status !== 'developing' &&
      item.mastery.status !== 'confident' &&
      item.mastery.status !== 'mastered',
  );

  const quotas = splitDailyPlanQuotas(input.count);
  const exclude = [...(input.excludeQuestionIds ?? [])];
  const items: DailyPlanItem[] = [];
  const selectedIds = new Set<string>();

  const pick = (source: DailyPlanSource, skills: SkillClass[], count: number): void => {
    if (count <= 0 || skills.length === 0 || items.length >= input.count) {
      return;
    }
    const needed = Math.min(count, input.count - items.length);
    const selected = selectAdaptiveTasks({
      userId,
      subject,
      count: needed,
      attempts,
      tasks,
      skills: asSkillRefs(skills.map((item) => item.id)),
      excludeQuestionIds: exclude,
      nowIso,
    });
    for (const task of selected) {
      if (items.length >= input.count) {
        break;
      }
      if (!task.skillId || selectedIds.has(task.id)) {
        continue;
      }
      selectedIds.add(task.id);
      exclude.push(task.id);
      items.push({
        taskId: task.id,
        skillId: task.skillId,
        source,
      });
    }
  };

  const remaining = () => input.count - items.length;

  pick('review', reviewSkills, quotas.review);
  pick('weak', weakSkills, quotas.weak);

  const reinforcementBatches = [
    reinforcementPreferred,
    reinforcementOther,
    reinforcementNew,
    reinforcementMastered,
  ];
  let reinforcementNeed = quotas.reinforcement;
  for (const batch of reinforcementBatches) {
    const before = items.length;
    pick('reinforcement', batch, reinforcementNeed);
    reinforcementNeed -= items.length - before;
  }

  pick('review', reviewSkills, remaining());
  pick('weak', weakSkills, remaining());
  for (const batch of reinforcementBatches) {
    pick('reinforcement', batch, remaining());
  }
  pick('reinforcement', classified, remaining());

  return {
    userId,
    subject,
    createdAt,
    totalCount: items.length,
    items,
  };
}
