import type { SubjectId, Task } from '../../types';
import type { ExamBlueprint, ExamSelectionResult, ExamSlotSpec } from './examTypes';
import { taskRepository } from '../taskRepository';

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matchesEnglishHost(task: Task, slotId: string): boolean {
  return task.vprTaskType === `VPR-${slotId}`;
}

function matchesSlotSkill(task: Task, slot: ExamSlotSpec): boolean {
  if (!task.skillId) {
    return false;
  }
  return slot.hostSkillIds.includes(task.skillId);
}

function candidatesForSlot(subjectId: SubjectId, slot: ExamSlotSpec, pool: Task[]): Task[] {
  const subjectPool = pool.filter((task) => task.subject === subjectId);
  const bySkill = subjectPool.filter((task) => matchesSlotSkill(task, slot));
  if (subjectId === 'english') {
    const byVpr = bySkill.filter((task) => matchesEnglishHost(task, slot.slotId));
    if (byVpr.length > 0) {
      return byVpr;
    }
  }
  return bySkill;
}

function pickTaskForSlot(
  subjectId: SubjectId,
  slot: ExamSlotSpec,
  pool: Task[],
  usedIds: Set<string>,
  seed: number,
  slotIndex: number,
): Task | undefined {
  const candidates = candidatesForSlot(subjectId, slot, pool).filter((task) => !usedIds.has(task.id));
  if (candidates.length === 0) {
    return undefined;
  }
  return seededShuffle(candidates, seed + slotIndex * 17)[0];
}

export function selectExamTasks(blueprint: ExamBlueprint, seed = Date.now() >>> 0): ExamSelectionResult {
  const pool = taskRepository.getBySubject(blueprint.subjectId);
  const usedIds = new Set<string>();
  const tasks: Task[] = [];
  const missingSlots: string[] = [];

  blueprint.slots.forEach((slot, index) => {
    const picked = pickTaskForSlot(blueprint.subjectId, slot, pool, usedIds, seed, index);
    if (!picked) {
      missingSlots.push(slot.slotId);
      return;
    }
    usedIds.add(picked.id);
    tasks.push(picked);
  });

  return {
    tasks,
    slots: blueprint.slots.slice(0, tasks.length),
    missingSlots,
  };
}

export function assertFullExamSelection(blueprint: ExamBlueprint, seed?: number): ExamSelectionResult {
  const result = selectExamTasks(blueprint, seed);
  if (result.missingSlots.length > 0) {
    throw new Error(
      `Недостаточно заданий для ВПР ${blueprint.subjectId}: слоты ${result.missingSlots.join(', ')}`,
    );
  }
  if (result.tasks.some((task) => task.subject !== blueprint.subjectId)) {
    throw new Error(`Subject isolation нарушена для ${blueprint.subjectId}`);
  }
  const ids = result.tasks.map((task) => task.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Дубликаты task id в экзамене ${blueprint.subjectId}`);
  }
  return result;
}

export function canBuildExam(blueprint: ExamBlueprint): boolean {
  const result = selectExamTasks(blueprint);
  return result.missingSlots.length === 0 && result.tasks.length === blueprint.totalSlots;
}
