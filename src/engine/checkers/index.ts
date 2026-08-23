import type { Task, TaskType } from '../../types';
import type { UserAnswer } from '../session';
import { classificationChecker } from './classification';
import { audioChecker } from './audio';
import { fillBlankChecker } from './fillBlank';
import { imageTaskChecker } from './imageTask';
import { matchingChecker } from './matching';
import { multipleChoiceChecker } from './multipleChoice';
import { numberAnswerChecker } from './numberAnswer';
import { orderingChecker } from './ordering';
import { shortAnswerChecker } from './shortAnswer';
import { singleChoiceChecker } from './singleChoice';
import type { AnswerChecker } from './types';

const CHECKERS: Partial<Record<TaskType, AnswerChecker>> = {
  singleChoice: singleChoiceChecker,
  multipleChoice: multipleChoiceChecker,
  shortAnswer: shortAnswerChecker,
  numberAnswer: numberAnswerChecker,
  matching: matchingChecker,
  ordering: orderingChecker,
  classification: classificationChecker,
  fillBlank: fillBlankChecker,
  audio: audioChecker,
  imageTask: imageTaskChecker,
};

export function checkTask(task: Task, answer: UserAnswer): boolean {
  const checker = CHECKERS[task.taskType];
  if (!checker) {
    throw new Error(`Проверка для типа «${task.taskType}» пока не подключена`);
  }
  return checker.check(task, answer);
}

export {
  audioChecker,
  classificationChecker,
  fillBlankChecker,
  imageTaskChecker,
  matchingChecker,
  multipleChoiceChecker,
  numberAnswerChecker,
  orderingChecker,
  shortAnswerChecker,
  singleChoiceChecker,
};
