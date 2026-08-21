import type { Task } from '../../types';
import { parseUserNumber } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

export const numberAnswerChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    const actual = parseUserNumber(answer);
    const expected = parseUserNumber(task.correctAnswer);
    if (actual === null || expected === null) {
      return false;
    }
    return actual === expected;
  },
};
