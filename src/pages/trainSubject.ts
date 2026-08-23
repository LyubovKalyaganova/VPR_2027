import type { SubjectId, TrainingMode } from '../types';

export type TrainSubject = 'mathematics' | 'russian';

export function parseTrainSubject(value: string | null | undefined): TrainSubject {
  return value === 'russian' ? 'russian' : 'mathematics';
}

export function trainSubjectToSubjectId(subject: TrainSubject): SubjectId {
  return subject;
}

export function subjectTitle(subject: TrainSubject): string {
  return subject === 'russian' ? 'русскому языку' : 'математике';
}

export type TrainModeConfig = {
  id: TrainingMode;
  title: string;
  text: string;
  disabled?: boolean;
  mathOnly?: boolean;
};

export function modesForSubject(subject: TrainSubject): TrainModeConfig[] {
  const bank = subject === 'russian' ? 'русского' : 'математического';
  return [
    { id: 'quick', title: 'Быстрая тренировка', text: `5 заданий из ${bank} банка (weighted mix)` },
    { id: 'normal', title: 'Обычная тренировка', text: `До 10 заданий из ${bank} банка (weighted mix)` },
    { id: 'random', title: 'Случайная тренировка', text: `Случайный weighted mix из ${bank} банка, до 10` },
    { id: 'weak', title: 'Слабые места', text: 'Тренировка по вашим слабым навыкам' },
    { id: 'topic', title: 'Повторение темы', text: 'Задания одной выбранной темы, до 10' },
    {
      id: 'mistakes',
      title: 'Работа над ошибками',
      text: 'Повторение заданий, где были ошибки',
      disabled: subject === 'russian',
      mathOnly: true,
    },
    {
      id: 'review',
      title: 'Повторение',
      text: 'Задания, которые пора повторить',
      disabled: subject === 'russian',
      mathOnly: true,
    },
    {
      id: 'daily',
      title: 'Ежедневный план',
      text: '5 заданий на сегодня',
      disabled: subject === 'russian',
      mathOnly: true,
    },
    { id: 'exam', title: 'Реальная ВПР', text: 'Пробный вариант появится позже', disabled: true },
  ];
}
