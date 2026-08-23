import { MATH_TASKS } from '../data/questions/mathTasks';
import { getDemoTasks, getTaskById as getDemoTaskById } from '../data/questions/demoTasks';
import { getGeneratedMathTaskById, getGeneratedMathTrainingPool } from './mathTrainingPool';
import { getGeneratedRussianTaskById, getGeneratedRussianTrainingPool } from './russianTrainingPool';
import { getGeneratedWorldTaskById, getGeneratedWorldTrainingPool } from './worldTrainingPool';
import {
  getGeneratedLiteraryReadingTaskById,
  getGeneratedLiteraryReadingTrainingPool,
} from './literaryReadingTrainingPool';
import { getGeneratedEnglishTaskById, getGeneratedEnglishTrainingPool } from './englishTrainingPool';
import type { Difficulty, SourceType, SubjectId, Task, TaskType } from '../types';

export type TaskFilter = {
  subject?: SubjectId;
  topicId?: string;
  skillId?: string;
  difficulty?: Difficulty;
  taskType?: TaskType;
  sourceType?: SourceType;
};

/** Статический учебный банк (исторические 10 заданий M03/M04). */
function getStaticMathTasks(): Task[] {
  return MATH_TASKS;
}

/**
 * Полный математический банк для тренировки:
 * статика + сгенерированный пул M01–M35.
 */
function getMathTasks(): Task[] {
  return [...getStaticMathTasks(), ...getGeneratedMathTrainingPool()];
}

function getRussianTasks(): Task[] {
  return getGeneratedRussianTrainingPool();
}

function getWorldTasks(): Task[] {
  return getGeneratedWorldTrainingPool();
}

function getLiteraryReadingTasks(): Task[] {
  return getGeneratedLiteraryReadingTrainingPool();
}

function getEnglishTasks(): Task[] {
  return getGeneratedEnglishTrainingPool();
}

function getById(id: string): Task | undefined {
  return (
    getDemoTaskById(id) ??
    MATH_TASKS.find((task) => task.id === id) ??
    getGeneratedMathTaskById(id) ??
    getGeneratedRussianTaskById(id) ??
    getGeneratedWorldTaskById(id) ??
    getGeneratedLiteraryReadingTaskById(id) ??
    getGeneratedEnglishTaskById(id)
  );
}

/** DEMO-банк и предметные банки вместе. */
function getAll(): Task[] {
  return [
    ...getDemoTasks(),
    ...getMathTasks(),
    ...getRussianTasks(),
    ...getWorldTasks(),
    ...getLiteraryReadingTasks(),
    ...getEnglishTasks(),
  ];
}

function find(filter: TaskFilter): Task[] {
  return getAll().filter((task) => {
    if (filter.subject !== undefined && task.subject !== filter.subject) {
      return false;
    }
    if (filter.topicId !== undefined && task.topicId !== filter.topicId) {
      return false;
    }
    if (filter.skillId !== undefined && task.skillId !== filter.skillId) {
      return false;
    }
    if (filter.difficulty !== undefined && task.difficulty !== filter.difficulty) {
      return false;
    }
    if (filter.taskType !== undefined && task.taskType !== filter.taskType) {
      return false;
    }
    if (filter.sourceType !== undefined && task.sourceType !== filter.sourceType) {
      return false;
    }
    return true;
  });
}

function getBySubject(subject: SubjectId): Task[] {
  return find({ subject });
}

function getByTopic(topicId: string): Task[] {
  return find({ topicId });
}

function getBySkill(skillId: string): Task[] {
  return find({ skillId });
}

function getByDifficulty(difficulty: Difficulty): Task[] {
  return find({ difficulty });
}

function getByTaskType(taskType: TaskType): Task[] {
  return find({ taskType });
}

function getBySourceType(sourceType: SourceType): Task[] {
  return find({ sourceType });
}

export const taskRepository = {
  getById,
  getDemoTasks,
  getMathTasks,
  getRussianTasks,
  getWorldTasks,
  getLiteraryReadingTasks,
  getEnglishTasks,
  getStaticMathTasks,
  getBySubject,
  getAll,
  find,
  getByTopic,
  getBySkill,
  getByDifficulty,
  getByTaskType,
  getBySourceType,
};

export function requireTask(id: string): Task {
  const task = getById(id);
  if (!task) {
    throw new Error(`Задание ${id} не найдено`);
  }
  return task;
}
