import type { Task } from '../../types';
import type { UserAnswer } from '../session';
import { numberAnswerChecker } from './numberAnswer';
import { shortAnswerChecker } from './shortAnswer';
import { singleChoiceChecker } from './singleChoice';
import type { AnswerChecker } from './types';

/**
 * imageTask — визуальное условие (Task.image) + тот же ответ, что у choice / number / short.
 * Выбор режима: есть answers → singleChoice; correctAnswer number → number; иначе short.
 */
export const imageTaskChecker: AnswerChecker = {
  check(task: Task, answer: UserAnswer): boolean {
    if (task.answers && task.answers.length > 0) {
      const normalized: Task = {
        ...task,
        correctAnswer: String(task.correctAnswer),
      };
      return singleChoiceChecker.check(normalized, answer);
    }
    if (typeof task.correctAnswer === 'number') {
      return numberAnswerChecker.check(task, answer);
    }
    return shortAnswerChecker.check(task, answer);
  },
};
