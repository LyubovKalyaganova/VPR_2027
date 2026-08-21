import { MATH_SKILLS } from '../data/taxonomy/math';
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

function skillsForSubject(subject: SubjectId): readonly { id: string }[] {
  if (subject === 'mathematics') {
    return MATH_SKILLS;
  }
  return [];
}

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
