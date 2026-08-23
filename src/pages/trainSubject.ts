import type { SubjectId, TrainingMode } from '../types';

export type TrainSubject = 'mathematics' | 'russian' | 'world' | 'reading' | 'english';

export function parseTrainSubject(value: string | null | undefined): TrainSubject {
  if (value === 'russian') return 'russian';
  if (value === 'world') return 'world';
  if (value === 'reading' || value === 'literaryReading') return 'reading';
  if (value === 'english') return 'english';
  return 'mathematics';
}

export function trainSubjectToSubjectId(subject: TrainSubject): SubjectId {
  return subject;
}

export function subjectTitle(subject: TrainSubject): string {
  if (subject === 'russian') return 'русскому языку';
  if (subject === 'world') return 'окружающему миру';
  if (subject === 'reading') return 'литературному чтению';
  if (subject === 'english') return 'английскому языку';
  return 'математике';
}

export type TrainModeConfig = {
  id: TrainingMode;
  title: string;
  text: string;
  disabled?: boolean;
  mathOnly?: boolean;
};

export function modesForSubject(subject: TrainSubject): TrainModeConfig[] {
  const bank =
    subject === 'russian'
      ? 'русского'
      : subject === 'world'
        ? 'окружающего мира'
        : subject === 'reading'
          ? 'литературного чтения'
          : subject === 'english'
            ? 'английского'
            : 'математического';
  const mathOnlyDisabled = subject !== 'mathematics';
  return [
    { id: 'quick', title: 'Быстрая тренировка', text: `5 заданий из ${bank} банка (weighted mix)` },
    { id: 'normal', title: 'Обычная тренировка', text: `До 10 заданий из ${bank} банка (weighted mix)` },
    { id: 'random', title: 'Случайная тренировка', text: `10 случайных заданий из ${bank} банка` },
    { id: 'weak', title: 'Слабые места', text: 'Тренировка по вашим слабым навыкам' },
    { id: 'topic', title: 'Повторение темы', text: 'Задания одной выбранной темы, до 10' },
    {
      id: 'mistakes',
      title: 'Работа над ошибками',
      text: 'Повторение заданий, где были ошибки',
      disabled: mathOnlyDisabled,
      mathOnly: true,
    },
    {
      id: 'review',
      title: 'Повторение',
      text: 'Задания, которые пора повторить',
      disabled: mathOnlyDisabled,
      mathOnly: true,
    },
    {
      id: 'daily',
      title: 'Ежедневный план',
      text: '5 заданий на сегодня',
      disabled: mathOnlyDisabled,
      mathOnly: true,
    },
    { id: 'exam', title: 'Реальная ВПР', text: 'Пробный вариант появится позже', disabled: true },
  ];
}
