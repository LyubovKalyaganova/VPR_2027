/**
 * Ленивый пул сгенерированных заданий L01–L24 (subject: reading).
 */
import type { Task } from '../types';
import { buildReadingTrainingPool } from '../features/reading/literaryReadingTrainingSelection';

let cachedPool: Task[] | null = null;
const byId = new Map<string, Task>();

export function getGeneratedReadingTrainingPool(): Task[] {
  if (cachedPool) return cachedPool;
  cachedPool = buildReadingTrainingPool({ perLevel: 2, seed: 20270823 });
  byId.clear();
  for (const task of cachedPool) byId.set(task.id, task);
  return cachedPool;
}

export function getGeneratedReadingTaskById(id: string): Task | undefined {
  if (!cachedPool) getGeneratedReadingTrainingPool();
  return byId.get(id);
}

export function resetGeneratedReadingTrainingPoolForTests(): void {
  cachedPool = null;
  byId.clear();
}

/** Alias per literaryReading naming */
export const getGeneratedLiteraryReadingTrainingPool = getGeneratedReadingTrainingPool;
export const getGeneratedLiteraryReadingTaskById = getGeneratedReadingTaskById;
