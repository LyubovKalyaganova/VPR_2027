import type { Task } from '../../types';
import { textsEqual } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

function parsePairs(task: Task): Record<string, string> {
  const map: Record<string, string> = {};
  const raw = Array.isArray(task.correctAnswer) ? task.correctAnswer : [];
  for (const pair of raw) {
    const [left, right] = String(pair).split('|');
    if (left && right) {
      map[left] = right;
    }
  }
  return map;
}

export const matchingChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      return false;
    }
    const expected = parsePairs(task);
    const leftItems = task.matchingLeft ?? Object.keys(expected);
    if (leftItems.length === 0) {
      return false;
    }
    return leftItems.every((left) => {
      const given = answer[left];
      const correct = expected[left];
      return typeof given === 'string' && typeof correct === 'string' && textsEqual(given, correct, true);
    });
  },
};
