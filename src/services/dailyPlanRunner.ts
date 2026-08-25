import { dailyPlanCountForSelection, skillsForSubject } from '../data/taxonomy/catalog';
import { localAttemptRecorder } from '../db';
import type { SubjectId } from '../types';
import { createDailyPlan, type DailyPlan, type DailyPlanItem } from './dailyPlanService';
import {
  getCalendarDate,
  getStoredDailyPlan,
  saveDailyPlan,
  type DailyPlanStorageBackend,
  localDailyPlanStorage,
} from './dailyPlanStorage';
import { taskRepository } from './taskRepository';

const DEFAULT_COUNT = 5;

export type GetDailyPlanInput = {
  userId: string;
  subject: SubjectId;
  count?: number;
  nowIso?: string;
  excludeQuestionIds?: readonly string[];
  storage?: DailyPlanStorageBackend;
};

export type CombinedDailyPlan = {
  subjects: SubjectId[];
  plans: DailyPlan[];
  items: DailyPlanItem[];
  totalCount: number;
};

function restoreDailyPlan(input: {
  userId: string;
  subject: SubjectId;
  createdAt: string;
  items: readonly DailyPlanItem[];
}): DailyPlan {
  const items: DailyPlanItem[] = [];
  const seen = new Set<string>();
  for (const item of input.items) {
    if (seen.has(item.taskId)) {
      continue;
    }
    const task = taskRepository.getById(item.taskId);
    if (!task) {
      continue;
    }
    seen.add(item.taskId);
    items.push({
      taskId: task.id,
      skillId: item.skillId || task.skillId || '',
      source: item.source,
    });
  }
  return {
    userId: input.userId,
    subject: input.subject,
    createdAt: input.createdAt,
    totalCount: items.length,
    items,
  };
}

/**
 * Мост между реальными источниками приложения и чистым createDailyPlan().
 * Состав плана фиксируется на календарный день: userId + date + subject.
 */
export function getDailyPlan(input: GetDailyPlanInput): DailyPlan {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const date = getCalendarDate(nowIso);
  const storage = input.storage ?? localDailyPlanStorage;
  const stored = getStoredDailyPlan(input.userId, input.subject, date, storage);
  if (stored) {
    return restoreDailyPlan({
      userId: stored.userId,
      subject: stored.subject,
      createdAt: nowIso,
      items: stored.items,
    });
  }

  const count = input.count ?? DEFAULT_COUNT;
  const attempts = localAttemptRecorder.getAll(input.userId);
  const tasks = taskRepository.getBySubject(input.subject).slice();
  const skills = skillsForSubject(input.subject);
  const plan = createDailyPlan({
    userId: input.userId,
    subject: input.subject,
    count,
    attempts,
    tasks,
    skills,
    nowIso,
    excludeQuestionIds: input.excludeQuestionIds,
  });
  saveDailyPlan(input.userId, input.subject, date, plan.items, storage);
  return plan;
}

export function getCombinedDailyPlan(input: {
  userId: string;
  subjects: readonly SubjectId[];
  nowIso?: string;
  storage?: DailyPlanStorageBackend;
}): CombinedDailyPlan {
  const subjects = input.subjects.length > 0 ? [...input.subjects] : (['mathematics'] as SubjectId[]);
  const count = dailyPlanCountForSelection(subjects.length);
  const plans = subjects.map((subject) =>
    getDailyPlan({
      userId: input.userId,
      subject,
      count,
      nowIso: input.nowIso,
      storage: input.storage,
    }),
  );
  const items = plans.flatMap((plan) => plan.items);
  return {
    subjects,
    plans,
    items,
    totalCount: items.length,
  };
}
