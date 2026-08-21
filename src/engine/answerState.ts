import type { Task } from '../types';
import { parseUserNumber } from './normalize';
import type { UserAnswer } from './session';

export function isAnswerReady(task: Task, answer: UserAnswer): boolean {
  if (answer === null || answer === undefined) {
    return false;
  }

  switch (task.taskType) {
    case 'singleChoice':
    case 'shortAnswer':
    case 'fillBlank':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'numberAnswer':
      return parseUserNumber(answer) !== null;
    case 'multipleChoice':
      return Array.isArray(answer) && answer.length > 0;
    case 'ordering': {
      const expected = task.items ?? (Array.isArray(task.correctAnswer) ? task.correctAnswer : []);
      return Array.isArray(answer) && expected.length > 0 && answer.length === expected.length;
    }
    case 'matching': {
      if (typeof answer !== 'object' || Array.isArray(answer)) {
        return false;
      }
      const left = task.matchingLeft ?? [];
      return left.length > 0 && left.every((item) => Boolean(answer[item]));
    }
    case 'classification': {
      if (typeof answer !== 'object' || Array.isArray(answer)) {
        return false;
      }
      const items = task.items ?? [];
      return items.length > 0 && items.every((item) => Boolean(answer[item]));
    }
    default:
      return false;
  }
}

export function emptyAnswer(task: Task): UserAnswer {
  switch (task.taskType) {
    case 'multipleChoice':
    case 'ordering':
      return [];
    case 'matching':
    case 'classification':
      return {};
    default:
      return null;
  }
}

export function collectHints(task: Task): string[] {
  return [task.hint1, task.hint2, task.hint3].filter((hint): hint is string => Boolean(hint));
}

export function formatCorrectAnswer(task: Task): string {
  switch (task.taskType) {
    case 'multipleChoice':
    case 'ordering':
      return Array.isArray(task.correctAnswer) ? task.correctAnswer.join(', ') : String(task.correctAnswer);
    case 'matching':
    case 'classification':
      return Array.isArray(task.correctAnswer)
        ? task.correctAnswer.map((pair) => String(pair).replace('|', ' — ')).join('; ')
        : String(task.correctAnswer);
    default:
      return String(task.correctAnswer);
  }
}
