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

export function subjectLabel(subject: TrainSubject): string {
  if (subject === 'russian') return 'Русский язык';
  if (subject === 'world') return 'Окружающий мир';
  if (subject === 'reading') return 'Литературное чтение';
  if (subject === 'english') return 'Английский язык';
  return 'Математика';
}

export type TrainModeConfig = {
  id: TrainingMode;
  title: string;
  text: string;
  disabled?: boolean;
  mathOnly?: boolean;
};

export function modesForSubject(subject: TrainSubject): TrainModeConfig[] {
  const bySubject = subjectTitle(subject);
  return [
    {
      id: 'quick',
      title: 'Быстрая тренировка',
      text: `5 заданий по ${bySubject} с умным подбором`,
    },
    {
      id: 'normal',
      title: 'Обычная тренировка',
      text: `До 10 заданий по ${bySubject} с умным подбором`,
    },
    {
      id: 'random',
      title: 'Случайная тренировка',
      text: `10 случайных заданий по ${bySubject}`,
    },
    { id: 'weak', title: 'Надо подтянуть', text: 'Повтори темы, которые пока идут хуже' },
    { id: 'topic', title: 'Повторение темы', text: 'Задания одной выбранной темы, до 10' },
    {
      id: 'mistakes',
      title: 'Работа над ошибками',
      text: 'Повторение заданий, где были ошибки',
    },
    {
      id: 'review',
      title: 'Повторение',
      text: 'Задания, которые пора повторить',
    },
    {
      id: 'daily',
      title: 'Ежедневный план',
      text: 'Задания на сегодня по этому предмету',
    },
    {
      id: 'exam',
      title: 'Пройти ВПР',
      text: 'Тренировочный вариант: таймер и те же типы заданий. Это не официальный бланк.',
    },
  ];
}

export function trainingModesForSubject(subject: TrainSubject): TrainModeConfig[] {
  return modesForSubject(subject).filter((mode) => mode.id !== 'exam');
}

export function examModeForSubject(subject: TrainSubject): TrainModeConfig {
  return modesForSubject(subject).find((mode) => mode.id === 'exam')!;
}
