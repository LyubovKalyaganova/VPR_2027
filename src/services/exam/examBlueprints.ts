import type { SubjectId } from '../../types';
import { VPR_2027_OFFICIAL } from '../../features/mathematics/mathTrainingWeights';
import { VPR_2027_RUSSIAN_OFFICIAL } from '../../features/russian/russianTrainingWeights';
import { VPR_2027_WORLD_OFFICIAL } from '../../features/world/worldTrainingWeights';
import { VPR_2027_READING_OFFICIAL } from '../../features/reading/literaryReadingTrainingWeights';
import { VPR_2027_ENGLISH_OFFICIAL } from '../../features/english/englishTrainingWeights';
import { getSubject } from '../../data/demo/subjects';
import { resolveSkillIds } from './examSkillResolver';
import type { ExamBlueprint, ExamGradingScale, ExamSlotSpec } from './examTypes';

const DEFAULT_DURATION_MINUTES = 45;

/** Баллы подпунктов ОМ — сумма 28, П-задания выше (из CONTENT_MATRIX_WORLD). */
const WORLD_SLOT_POINTS: Record<string, number> = {
  '1': 1,
  '2.1': 2,
  '2.2': 1,
  '2.3': 1,
  '3': 2,
  '4': 2,
  '5': 1,
  '6': 3,
  '7.1': 1,
  '7.2': 2,
  '8.1': 1,
  '8.2': 3,
  '9.1': 2,
  '9.2': 2,
  '10.1': 1,
  '10.2': 3,
};

const WORLD_P_SLOTS = new Set(['6', '7.2', '8.2', '10.2']);

const READING_TRAINING_ANALOG = new Set(['3', '13']);

const ENGLISH_GRADING: ExamGradingScale = {
  '2': [0, 9],
  '3': [10, 14],
  '4': [15, 21],
  '5': [22, 25],
};

const READING_GRADING: ExamGradingScale = {
  '2': [0, 5],
  '3': [6, 10],
  '4': [11, 15],
  '5': [16, 19],
};

function slot(
  subjectId: SubjectId,
  slotId: string,
  focus: string,
  codes: readonly string[],
  points: number,
  extra?: Partial<ExamSlotSpec>,
): ExamSlotSpec {
  return {
    slotId,
    label: String(slotId),
    points,
    hostSkillCodes: codes,
    hostSkillIds: resolveSkillIds(subjectId, codes),
    focus,
    ...extra,
  };
}

function buildMathBlueprint(): ExamBlueprint {
  const subjectId = 'mathematics' as const;
  const slots = VPR_2027_OFFICIAL.tasks.map((task) =>
    slot(subjectId, String(task.n), task.focus, task.skills, task.points),
  );
  return {
    subjectId,
    title: getSubject(subjectId)?.title ?? 'Математика',
    source: VPR_2027_OFFICIAL.source,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    totalSlots: slots.length,
    maxScore: VPR_2027_OFFICIAL.maxPrimaryScore,
    gradingScale: null,
    scoringNote:
      'Это тренировочный вариант по структуре ВПР, а не официальная работа. Баллы помогают понять, что повторить.',
    slots,
  };
}

function buildRussianBlueprint(): ExamBlueprint {
  const subjectId = 'russian' as const;
  const slots = VPR_2027_RUSSIAN_OFFICIAL.tasks.map((task) =>
    slot(subjectId, String(task.n), task.focus, task.skills, 1),
  );
  return {
    subjectId,
    title: getSubject(subjectId)?.title ?? 'Русский язык',
    source: VPR_2027_RUSSIAN_OFFICIAL.source,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    totalSlots: slots.length,
    maxScore: slots.length,
    gradingScale: null,
    scoringNote:
      'Показаны процент и число верных ответов. Школьная оценка по официальной шкале здесь не выставляется.',
    slots,
  };
}

function buildWorldBlueprint(): ExamBlueprint {
  const subjectId = 'world' as const;
  const slots = VPR_2027_WORLD_OFFICIAL.tasks.map((task) => {
    const id = String(task.n);
    const extended = WORLD_P_SLOTS.has(id);
    return slot(subjectId, id, task.focus, task.skills, WORLD_SLOT_POINTS[id] ?? 1, {
      level: extended ? 'P' : 'B',
      trainingAnalog: extended,
    });
  });
  return {
    subjectId,
    title: getSubject(subjectId)?.title ?? 'Окружающий мир',
    source: VPR_2027_WORLD_OFFICIAL.source,
    durationMinutes: VPR_2027_WORLD_OFFICIAL.timeMinutes,
    totalSlots: slots.length,
    maxScore: VPR_2027_WORLD_OFFICIAL.maxPoints,
    gradingScale: null,
    scoringNote:
      'Часть заданий с развёрнутым ответом проверяется упрощённо. На настоящей ВПР учитель оценивает иначе.',
    slots,
  };
}

function buildReadingBlueprint(): ExamBlueprint {
  const subjectId = 'reading' as const;
  const slots = VPR_2027_READING_OFFICIAL.tasks.map((task) => {
    const id = String(task.n);
    return slot(subjectId, id, task.focus, task.skills, task.points, {
      level: task.level,
      trainingAnalog: READING_TRAINING_ANALOG.has(id),
    });
  });
  return {
    subjectId,
    title: getSubject(subjectId)?.title ?? 'Литературное чтение',
    source: VPR_2027_READING_OFFICIAL.source,
    durationMinutes: VPR_2027_READING_OFFICIAL.timeMinutes,
    totalSlots: slots.length,
    maxScore: VPR_2027_READING_OFFICIAL.maxPoints,
    gradingScale: READING_GRADING,
    scoringNote: 'Задания 3 и 13 проверяются упрощённо — это подготовка, а не оценка учителя.',
    slots,
  };
}

function buildEnglishBlueprint(): ExamBlueprint {
  const subjectId = 'english' as const;
  const slots = VPR_2027_ENGLISH_OFFICIAL.tasks.map((task) =>
    slot(subjectId, String(task.n), task.focus, task.skills, task.points, {
      level: task.level,
      trainingAnalog: String(task.n) === '4',
    }),
  );
  return {
    subjectId,
    title: getSubject(subjectId)?.title ?? 'Английский язык',
    source: VPR_2027_ENGLISH_OFFICIAL.source,
    durationMinutes: VPR_2027_ENGLISH_OFFICIAL.timeMinutes,
    totalSlots: slots.length,
    maxScore: VPR_2027_ENGLISH_OFFICIAL.maxPoints,
    gradingScale: ENGLISH_GRADING,
    scoringNote: 'Задание 4 (анкета) проверяется упрощённо. На настоящей ВПР критерии другие.',
    slots,
  };
}

const BLUEPRINTS: Record<SubjectId, ExamBlueprint> = {
  mathematics: buildMathBlueprint(),
  russian: buildRussianBlueprint(),
  world: buildWorldBlueprint(),
  reading: buildReadingBlueprint(),
  english: buildEnglishBlueprint(),
};

export function getExamBlueprint(subjectId: SubjectId): ExamBlueprint | undefined {
  return BLUEPRINTS[subjectId];
}

export function getAllExamBlueprints(): ExamBlueprint[] {
  return Object.values(BLUEPRINTS);
}

export function assertExamBlueprint(subjectId: SubjectId): ExamBlueprint {
  const blueprint = getExamBlueprint(subjectId);
  if (!blueprint) {
    throw new Error(`Blueprint для предмета ${subjectId} не найден`);
  }
  return blueprint;
}
