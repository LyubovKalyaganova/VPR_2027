import type { Task } from '../../types';
import { textsEqual } from '../normalize';
import type { UserAnswer } from '../session';
import type { AnswerChecker } from './types';

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLocaleLowerCase('ru-RU');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

export const multipleChoiceChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (!Array.isArray(answer) || !Array.isArray(task.correctAnswer)) {
      return false;
    }
    const expected = uniqueNormalized(task.correctAnswer.map(String));
    const given = uniqueNormalized(answer);
    if (expected.length !== given.length) {
      return false;
    }
    return expected.every((item) => given.some((value) => textsEqual(item, value, false)));
  },
};
