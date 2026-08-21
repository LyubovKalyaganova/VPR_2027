import type { Task } from '../../types';
import type { UserAnswer } from '../session';

export interface AnswerChecker {
  check(task: Task, answer: UserAnswer): boolean;
}
