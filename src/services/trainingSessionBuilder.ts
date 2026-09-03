import type { SubjectId, Task } from '../types';
import { shuffle } from '../utils/shuffle';
import { taskRepository } from './taskRepository';

/** Уникальные задания по id, порядок сохраняется. */
export function dedupeTasksById(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  const unique: Task[] = [];
  for (const task of tasks) {
    if (seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    unique.push(task);
  }
  return unique;
}

/**
 * Случайная тренировка: равномерный shuffle из банка предмета (не weighted mix).
 * Опционально — только открытые по учебному месяцу навыки.
 */
export function pickRandomSubjectTasks(
  subject: SubjectId,
  count: number,
  options?: { allowedSkillIds?: readonly string[] },
): Task[] {
  let pool = dedupeTasksById(taskRepository.getBySubject(subject));
  if (options?.allowedSkillIds && options.allowedSkillIds.length > 0) {
    const allowed = new Set(options.allowedSkillIds);
    const filtered = pool.filter((task) => task.skillId && allowed.has(task.skillId));
    if (filtered.length > 0) {
      pool = filtered;
    }
  }
  if (pool.length === 0) {
    return [];
  }
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/**
 * Тематическая сессия: shuffle + без повторяющихся id, до count заданий.
 */
export function pickTopicSessionTasks(tasks: Task[], count: number): Task[] {
  const unique = dedupeTasksById(tasks);
  return shuffle(unique).slice(0, Math.min(count, unique.length));
}

/** Проверка: в сессии нет дубликатов task id. */
export function assertUniqueTaskIds(tasks: Task[]): void {
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) {
      throw new Error(`Дубликат задания в сессии: ${task.id}`);
    }
    seen.add(task.id);
  }
}
