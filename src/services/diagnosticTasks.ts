import type { SubjectId, Task } from '../types';
import { taskRepository } from './taskRepository';

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

function isFriendlyDiagnostic(task: Task): boolean {
  if (task.taskType === 'audio' || task.taskType === 'constructedResponse') {
    return false;
  }
  if (task.difficulty > 2) {
    return false;
  }
  if (task.passage && task.passage.length > 350) {
    return false;
  }
  return true;
}

function pickOne(tasks: readonly Task[], rng: () => number): Task | undefined {
  if (tasks.length === 0) {
    return undefined;
  }
  return tasks[Math.floor(rng() * tasks.length)];
}

/**
 * По одному короткому заданию на предмет — без аудирования и длинных текстов.
 */
export function pickDiagnosticTasks(
  subjects: readonly SubjectId[],
  seed = 20270825,
): Task[] {
  const rng = mulberry32(seed >>> 0);
  const picked: Task[] = [];
  const seen = new Set<string>();
  for (const subject of subjects) {
    const pool = taskRepository.getBySubject(subject);
    const friendly = pool.filter(isFriendlyDiagnostic);
    const fallback = pool.filter(
      (task) => task.difficulty <= 2 && task.taskType !== 'audio' && task.taskType !== 'constructedResponse',
    );
    const task = pickOne(friendly.length > 0 ? friendly : fallback, rng);
    if (!task || seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    picked.push(task);
  }
  return picked;
}
