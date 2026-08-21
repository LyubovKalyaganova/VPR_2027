import type { Task } from '../../types';
import { textsEqual } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

function parseMap(task: Task): Record<string, string> {
  const map: Record<string, string> = {};
  const raw = Array.isArray(task.correctAnswer) ? task.correctAnswer : [];
  for (const pair of raw) {
    const [item, category] = String(pair).split('|');
    if (item && category) {
      map[item] = category;
    }
  }
  return map;
}

export const classificationChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      return false;
    }
    const expected = parseMap(task);
    const items = task.items ?? Object.keys(expected);
    if (items.length === 0) {
      return false;
    }
    return items.every((item) => {
      const given = answer[item];
      const correct = expected[item];
      return typeof given === 'string' && typeof correct === 'string' && textsEqual(given, correct, true);
    });
  },
};
