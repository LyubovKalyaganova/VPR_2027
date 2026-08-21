import type { Task } from '../../types';
import { textsEqual } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

export const orderingChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    const expected = Array.isArray(task.correctAnswer) ? task.correctAnswer.map(String) : [];
    if (!Array.isArray(answer) || expected.length === 0 || answer.length !== expected.length) {
      return false;
    }
    return expected.every((item, index) => textsEqual(item, String(answer[index] ?? ''), true));
  },
};
