import type { Task } from '../../types';
import { textsEqual } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

export const singleChoiceChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (typeof answer !== 'string' || typeof task.correctAnswer !== 'string') {
      return false;
    }
    return textsEqual(answer, task.correctAnswer, false);
  },
};
