import type { Task } from '../../types';
import type { UserAnswer } from '../session';
import { singleChoiceChecker } from './singleChoice';
import type { AnswerChecker } from './types';

/**
 * audio — озвучивание (Task.transcript / UI) + ответ как у singleChoice.
 * Контракт Task не меняется: те же поля answers и correctAnswer.
 */
export const audioChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    const normalized: Task = {
      ...task,
      correctAnswer: String(task.correctAnswer),
    };
    return singleChoiceChecker.check(normalized, answer);
  },
};
