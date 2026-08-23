/**
 * Генератор M11: расчёт промежутков времени.
 * Контракт: M11_GENERATOR_SPEC.md
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  randomInt,
  rejectAdvancedLevels,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';

export const M11_SKILL_ID = 'math.quantities.time.calculate' as const;
export const M11_TOPIC_ID = 'math.quantities.time' as const;
export const M11_GENERATOR_ID = 'gen.math.quantities.time' as const;

export type TimeCalcSubtype = 'convert_hm' | 'duration' | 'find_end' | 'find_start';
export type TimeCalcFeature = 'whole_hours' | 'with_minutes' | 'cross_hour' | 'cross_midnight';
export type TimeAnswerKind = 'hours' | 'minutes' | 'clock';

export type M11GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: TimeCalcSubtype };
export type M11SeriesOptions = { seed: number; countPerLevel?: number };

export type M11GeneratorParams = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  subtype: TimeCalcSubtype;
  features: TimeCalcFeature[];
  /** Числовой смысл ответа (часы, минуты длительности или абсолютные минуты для clock). */
  answerMinutes: number;
  answerKind: TimeAnswerKind;
  /** Человекочитаемый ответ: число или «H:MM». */
  answerText: string;
  seed: number;
};

const TITLES: Record<TimeCalcSubtype, string> = {
  convert_hm: 'Перевод часов и минут',
  duration: 'Длительность по началу и концу',
  find_end: 'Найти конец события',
  find_start: 'Найти начало события',
};

const L1_SUB: TimeCalcSubtype[] = ['convert_hm', 'duration', 'find_end'];
const L2_SUB: TimeCalcSubtype[] = ['duration', 'find_end', 'find_start', 'convert_hm'];
const L3_SUB: TimeCalcSubtype[] = ['duration', 'find_end', 'find_start'];

export function minutesToClock(total: number): { h: number; m: number } {
  const norm = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { h: Math.floor(norm / 60), m: norm % 60 };
}

export function clockToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

export function formatHM(total: number): string {
  const { h, m } = minutesToClock(total);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function timeCalcFingerprint(p: M11GeneratorParams): string {
  return `${p.subtype}|${p.startMinutes}|${p.endMinutes}|${p.durationMinutes}|${p.answerKind}|${p.answerText}`;
}

export function isValidM11Level(features: TimeCalcFeature[], difficulty: Level): boolean {
  const cross = features.includes('cross_hour') || features.includes('cross_midnight');
  if (difficulty === 1) return features.includes('whole_hours') && !cross && !features.includes('with_minutes');
  if (difficulty === 2) return features.includes('with_minutes') && !cross;
  return cross;
}

/** Ответ не должен быть «минутами от полуночи» / ЧЧММ-кодом. */
export function isTechnicalTimeAnswer(answerText: string, answerKind: TimeAnswerKind): boolean {
  if (answerKind === 'clock') {
    return !/^\d{1,2}:\d{2}$/.test(answerText);
  }
  const n = Number(answerText);
  if (!Number.isFinite(n)) return true;
  // ЧЧММ вроде 1500, 1010 — только как подозрительный код, не как длительность < 1000
  if (n >= 1000 && n <= 2359 && String(Math.trunc(n)).length === 4) return true;
  return false;
}

function numericDistractors(correct: number, rng: SeededRng, extras: number[] = []): string[] {
  return uniqueDistractorsFromModels(
    correct,
    [
      ...extras,
      correct + 10,
      correct - 10,
      correct + 40,
      correct + 100,
      correct - 60,
      Math.floor(correct / 2),
      correct * 2,
      100,
      60,
    ],
    rng,
    3,
  );
}

function clockDistractors(correctTotal: number, rng: SeededRng): string[] {
  const models = [10, -10, 20, -20, 30, -30, 60, -60, 5, -5, 40, -40].map((off) =>
    formatHM(correctTotal + off),
  );
  return uniqueDistractorsFromModels(formatHM(correctTotal), models, rng, 3);
}

function finish(
  difficulty: Level,
  seed: number,
  subtype: TimeCalcSubtype,
  paramsBase: Omit<M11GeneratorParams, 'seed' | 'subtype'>,
  question: string,
  rng: SeededRng,
  explanation: string,
): Task | null {
  if (!isValidM11Level(paramsBase.features, difficulty)) return null;
  if (isTechnicalTimeAnswer(paramsBase.answerText, paramsBase.answerKind)) return null;
  const params: M11GeneratorParams = { ...paramsBase, subtype, seed };
  const answer = params.answerText;

  if (params.answerKind === 'clock') {
    if (difficulty < 3) {
      const d = clockDistractors(params.answerMinutes, rng);
      if (d.length !== 3) return null;
      return baseTask({
        id: `generated-m11-${difficulty}-${subtype}-${answer}-${seed}`,
        section: 'Величины',
        topic: 'Время',
        skill: TITLES[subtype],
        topicId: M11_TOPIC_ID,
        skillId: M11_SKILL_ID,
        difficulty,
        taskType: 'singleChoice',
        question,
        correctAnswer: answer,
        answers: buildChoiceAnswers(answer, d, rng),
        explanation,
        generatorId: M11_GENERATOR_ID,
        generatorParams: params,
        hint2: 'В 1 часе 60 минут. При нехватке минут займи 1 час.',
      });
    }
    return baseTask({
      id: `generated-m11-3-${subtype}-${answer}-${seed}`,
      section: 'Величины',
      topic: 'Время',
      skill: TITLES[subtype],
      topicId: M11_TOPIC_ID,
      skillId: M11_SKILL_ID,
      difficulty: 3,
      taskType: 'shortAnswer',
      question,
      correctAnswer: answer,
      explanation,
      generatorId: M11_GENERATOR_ID,
      generatorParams: params,
      hint2: 'Запиши время как часы:минуты, например 10:10.',
    });
  }

  const numeric = Number(answer);
  if (difficulty < 3) {
    const d = numericDistractors(numeric, rng, [params.durationMinutes]);
    if (d.length !== 3) return null;
    return baseTask({
      id: `generated-m11-${difficulty}-${subtype}-${answer}-${seed}`,
      section: 'Величины',
      topic: 'Время',
      skill: TITLES[subtype],
      topicId: M11_TOPIC_ID,
      skillId: M11_SKILL_ID,
      difficulty,
      taskType: 'singleChoice',
      question,
      correctAnswer: String(numeric),
      answers: buildChoiceAnswers(numeric, d, rng),
      explanation,
      generatorId: M11_GENERATOR_ID,
      generatorParams: params,
      hint2: 'В 1 часе 60 минут. При нехватке минут займи 1 час.',
    });
  }
  return baseTask({
    id: `generated-m11-3-${subtype}-${answer}-${seed}`,
    section: 'Величины',
    topic: 'Время',
    skill: TITLES[subtype],
    topicId: M11_TOPIC_ID,
    skillId: M11_SKILL_ID,
    difficulty: 3,
    taskType: 'numberAnswer',
    question,
    correctAnswer: numeric,
    explanation,
    generatorId: M11_GENERATOR_ID,
    generatorParams: params,
    hint2: 'В 1 часе 60 минут. При нехватке минут займи 1 час.',
  });
}

function build(rng: SeededRng, difficulty: Level, subtype: TimeCalcSubtype, seed: number): Task | null {
  if (difficulty === 1) {
    if (subtype === 'convert_hm') {
      const hours = randomInt(rng, 2, 5);
      const answer = hours * 60;
      return finish(
        difficulty,
        seed,
        subtype,
        {
          startMinutes: 0,
          endMinutes: answer,
          durationMinutes: answer,
          features: ['whole_hours'],
          answerMinutes: answer,
          answerKind: 'minutes',
          answerText: String(answer),
        },
        `Сколько минут в ${hours} ч?`,
        rng,
        `${hours} ч = ${hours}×60 = ${answer} мин.`,
      );
    }
    const startH = randomInt(rng, 8, 14);
    const durH = randomInt(rng, 1, 3);
    const start = clockToMinutes(startH, 0);
    const end = start + durH * 60;
    if (subtype === 'duration') {
      return finish(
        difficulty,
        seed,
        subtype,
        {
          startMinutes: start,
          endMinutes: end,
          durationMinutes: durH * 60,
          features: ['whole_hours'],
          answerMinutes: durH,
          answerKind: 'hours',
          answerText: String(durH),
        },
        `Сколько часов прошло с ${formatHM(start)} до ${formatHM(end)}?`,
        rng,
        `Длительность ${durH} ч.`,
      );
    }
    return finish(
      difficulty,
      seed,
      'find_end',
      {
        startMinutes: start,
        endMinutes: end,
        durationMinutes: durH * 60,
        features: ['whole_hours'],
        answerMinutes: end,
        answerKind: 'clock',
        answerText: formatHM(end),
      },
      `Событие началось в ${formatHM(start)} и длилось ${durH} ч. В какое время оно закончилось?`,
      rng,
      `Конец: ${formatHM(end)}.`,
    );
  }

  if (difficulty === 2) {
    const startH = randomInt(rng, 8, 16);
    const startM = pickOne(rng, [0, 5, 10, 15, 20, 25, 30, 35, 40]);
    const dur = pickOne(rng, [10, 15, 20, 25, 30, 35, 40]);
    const start = clockToMinutes(startH, startM);
    const end = start + dur;
    if (minutesToClock(end).h !== startH) {
      return null;
    }
    if (subtype === 'convert_hm') {
      const h = randomInt(rng, 1, 3);
      const m = pickOne(rng, [10, 15, 20, 30, 45]);
      const answer = h * 60 + m;
      return finish(
        difficulty,
        seed,
        subtype,
        {
          startMinutes: 0,
          endMinutes: answer,
          durationMinutes: answer,
          features: ['with_minutes'],
          answerMinutes: answer,
          answerKind: 'minutes',
          answerText: String(answer),
        },
        `Сколько минут в ${h} ч ${m} мин?`,
        rng,
        `${h}×60 + ${m} = ${answer}.`,
      );
    }
    if (subtype === 'duration') {
      return finish(
        difficulty,
        seed,
        subtype,
        {
          startMinutes: start,
          endMinutes: end,
          durationMinutes: dur,
          features: ['with_minutes'],
          answerMinutes: dur,
          answerKind: 'minutes',
          answerText: String(dur),
        },
        `Сколько минут прошло с ${formatHM(start)} до ${formatHM(end)}?`,
        rng,
        `Длительность ${dur} мин.`,
      );
    }
    if (subtype === 'find_end') {
      return finish(
        difficulty,
        seed,
        subtype,
        {
          startMinutes: start,
          endMinutes: end,
          durationMinutes: dur,
          features: ['with_minutes'],
          answerMinutes: end,
          answerKind: 'clock',
          answerText: formatHM(end),
        },
        `Занятие началось в ${formatHM(start)} и длилось ${dur} мин. В какое время оно закончилось?`,
        rng,
        `Конец ${formatHM(end)}.`,
      );
    }
    return finish(
      difficulty,
      seed,
      'find_start',
      {
        startMinutes: start,
        endMinutes: end,
        durationMinutes: dur,
        features: ['with_minutes'],
        answerMinutes: start,
        answerKind: 'clock',
        answerText: formatHM(start),
      },
      `Событие закончилось в ${formatHM(end)} и длилось ${dur} мин. В какое время оно началось?`,
      rng,
      `Начало ${formatHM(start)}.`,
    );
  }

  const crossMidnight = rng() < 0.35;
  let start: number;
  let dur: number;
  let end: number;
  if (crossMidnight) {
    start = clockToMinutes(23, pickOne(rng, [40, 45, 50, 55]));
    dur = pickOne(rng, [20, 25, 30, 40, 50]);
    end = start + dur;
  } else {
    start = clockToMinutes(randomInt(rng, 8, 18), pickOne(rng, [40, 45, 50, 55]));
    dur = pickOne(rng, [15, 20, 25, 30, 35, 40]);
    end = start + dur;
    if (minutesToClock(end).h === minutesToClock(start).h) return null;
  }
  const features: TimeCalcFeature[] = [
    'with_minutes',
    crossMidnight ? 'cross_midnight' : 'cross_hour',
  ];
  if (subtype === 'duration') {
    return finish(
      difficulty,
      seed,
      subtype,
      {
        startMinutes: start,
        endMinutes: end,
        durationMinutes: dur,
        features,
        answerMinutes: dur,
        answerKind: 'minutes',
        answerText: String(dur),
      },
      `Сколько минут прошло с ${formatHM(start)} до ${formatHM(end)}?`,
      rng,
      `Длительность ${dur} мин (с переходом).`,
    );
  }
  if (subtype === 'find_end') {
    return finish(
      difficulty,
      seed,
      subtype,
      {
        startMinutes: start,
        endMinutes: end,
        durationMinutes: dur,
        features,
        answerMinutes: end,
        answerKind: 'clock',
        answerText: formatHM(end),
      },
      `Поездка началась в ${formatHM(start)} и длилась ${dur} мин. В какое время она закончилась?`,
      rng,
      `Конец ${formatHM(end)}.`,
    );
  }
  return finish(
    difficulty,
    seed,
    'find_start',
    {
      startMinutes: start,
      endMinutes: end,
      durationMinutes: dur,
      features,
      answerMinutes: start,
      answerKind: 'clock',
      answerText: formatHM(start),
    },
    `Событие закончилось в ${formatHM(end)}, оно длилось ${dur} мин. В какое время оно началось?`,
    rng,
    `Начало ${formatHM(start)}.`,
  );
}

export function generateM11Task(options: M11GenerateOptions): Task {
  rejectAdvancedLevels('M11', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const allowed = difficulty === 1 ? L1_SUB : difficulty === 2 ? L2_SUB : L3_SUB;
  const subtype =
    options.subtype && allowed.includes(options.subtype) ? options.subtype : pickOne(rng, allowed);
  for (let i = 0; i < 100; i += 1) {
    const task = build(rng, difficulty, subtype, options.seed);
    if (task) return task;
  }
  throw new Error(`M11: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM11Series(options: M11SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const allowed = difficulty === 1 ? L1_SUB : difficulty === 2 ? L2_SUB : L3_SUB;
      return generateM11Task({ difficulty, seed, subtype: allowed[index % allowed.length] });
    },
    (task) => timeCalcFingerprint(task.generatorParams as M11GeneratorParams),
    'M11',
  );
}
