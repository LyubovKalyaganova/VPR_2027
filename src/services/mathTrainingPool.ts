/**
 * Ленивый пул сгенерированных заданий M01–M35 для repository / adaptive / topic.
 * MATH_TASKS (статика) остаётся; пул дополняет, а не заменяет.
 */
import type { Task } from '../types';
import { buildMathTrainingPool } from '../features/mathematics/mathTrainingSelection';

let cachedPool: Task[] | null = null;
const byId = new Map<string, Task>();

export function getGeneratedMathTrainingPool(): Task[] {
  if (cachedPool) {
    return cachedPool;
  }
  cachedPool = buildMathTrainingPool({ perLevel: 2, seed: 20270823 });
  byId.clear();
  for (const task of cachedPool) {
    byId.set(task.id, task);
  }
  return cachedPool;
}

export function getGeneratedMathTaskById(id: string): Task | undefined {
  if (!cachedPool) {
    getGeneratedMathTrainingPool();
  }
  return byId.get(id);
}

/** Только для тестов: сброс кэша. */
export function resetGeneratedMathTrainingPoolForTests(): void {
  cachedPool = null;
  byId.clear();
}
