import type { Task } from '../../types';
import type { UserAnswer } from '../session';
import { matchingChecker } from './matching';
import { singleChoiceChecker } from './singleChoice';
import type { AnswerChecker } from './types';

/**
 * audio — озвучивание (Task.transcript / UI) + ответ как у singleChoice или matching.
 */
export const audioChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (task.matchingLeft && task.matchingLeft.length > 0) {
      return matchingChecker.check(task, answer);
    }
    const normalized: Task = {
      ...task,
      correctAnswer: String(task.correctAnswer),
    };
    return singleChoiceChecker.check(normalized, answer);
  },
};
