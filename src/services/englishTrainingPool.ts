/**
 * Ленивый пул сгенерированных заданий E01–E18 (subject: english).
 */
import type { Task } from '../types';
import { buildEnglishTrainingPool } from '../features/english/englishTrainingSelection';

let cachedPool: Task[] | null = null;
const byId = new Map<string, Task>();

export function getGeneratedEnglishTrainingPool(): Task[] {
  if (cachedPool) return cachedPool;
  cachedPool = buildEnglishTrainingPool({ perLevel: 2, seed: 20270824 });
  byId.clear();
  for (const task of cachedPool) byId.set(task.id, task);
  return cachedPool;
}

export function getGeneratedEnglishTaskById(id: string): Task | undefined {
  if (!cachedPool) getGeneratedEnglishTrainingPool();
  return byId.get(id);
}

export function resetGeneratedEnglishTrainingPoolForTests(): void {
  cachedPool = null;
  byId.clear();
}
