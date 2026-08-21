import type { Task } from '../../types';
import { textsEqual } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

export const shortAnswerChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (typeof answer !== 'string') {
      return false;
    }
    const candidates = [
      String(task.correctAnswer),
      ...(task.acceptableAnswers ?? []),
    ];
    return candidates.some((candidate) => textsEqual(answer, candidate, true));
  },
};
