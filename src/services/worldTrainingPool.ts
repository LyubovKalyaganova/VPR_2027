/**
 * Ленивый пул сгенерированных заданий W01–W25.
 */
import type { Task } from '../types';
import { buildWorldTrainingPool } from '../features/world/worldTrainingSelection';

let cachedPool: Task[] | null = null;
const byId = new Map<string, Task>();

export function getGeneratedWorldTrainingPool(): Task[] {
  if (cachedPool) return cachedPool;
  cachedPool = buildWorldTrainingPool({ perLevel: 2, seed: 20270823 });
  byId.clear();
  for (const task of cachedPool) byId.set(task.id, task);
  return cachedPool;
}

export function getGeneratedWorldTaskById(id: string): Task | undefined {
  if (!cachedPool) getGeneratedWorldTrainingPool();
  return byId.get(id);
}

export function resetGeneratedWorldTrainingPoolForTests(): void {
  cachedPool = null;
  byId.clear();
}
