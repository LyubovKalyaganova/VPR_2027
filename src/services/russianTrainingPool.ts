/**
 * Ленивый пул сгенерированных заданий R01–R25.
 */
import type { Task } from '../types';
import { buildRussianTrainingPool } from '../features/russian/russianTrainingSelection';

let cachedPool: Task[] | null = null;
const byId = new Map<string, Task>();

export function getGeneratedRussianTrainingPool(): Task[] {
  if (cachedPool) return cachedPool;
  cachedPool = buildRussianTrainingPool({ perLevel: 2, seed: 20270823 });
  byId.clear();
  for (const task of cachedPool) byId.set(task.id, task);
  return cachedPool;
}

export function getGeneratedRussianTaskById(id: string): Task | undefined {
  if (!cachedPool) getGeneratedRussianTrainingPool();
  return byId.get(id);
}

export function resetGeneratedRussianTrainingPoolForTests(): void {
  cachedPool = null;
  byId.clear();
}
