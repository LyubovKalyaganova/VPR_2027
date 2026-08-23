/**
 * Генератор M16: скорость как величина (единицы / сравнение / перевод).
 * Контракт: M16_GENERATOR_SPEC.md
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

export const M16_SKILL_ID = 'math.quantities.speed.convert' as const;
export const M16_TOPIC_ID = 'math.quantities.speed' as const;
export const M16_GENERATOR_ID = 'gen.math.quantities.speed' as const;

export type SpeedSubtype = 'recognize_speed_unit' | 'compare_same_unit' | 'compare_awkward';
export type SpeedFeature =
  | 'unit_km_h'
  | 'unit_m_min'
  | 'unit_m_s'
  | 'who_faster'
  | 'how_much_faster'
  | 'needs_convert'
  | 'choose_unit';

export type M16GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: SpeedSubtype;
};

export type M16SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M16GeneratorParams = {
  subtype: SpeedSubtype;
  features: SpeedFeature[];
  kind: 'recognize' | 'compare';
  values: number[];
  units: string[];
  correctLabel: string;
  numericAnswer: number | null;
  seed: number;
};

const SUBTYPE_TITLES: Record<SpeedSubtype, string> = {
  recognize_speed_unit: 'Узнать единицу скорости',
  compare_same_unit: 'Сравнить скорости в одной единице',
  compare_awkward: 'Перевод единиц и сравнение',
};

const L1: SpeedSubtype[] = ['recognize_speed_unit'];
const L2: SpeedSubtype[] = ['compare_same_unit'];
const L3: SpeedSubtype[] = ['compare_awkward'];

/** Ротация L3: convert+compare / convert+diff / convert только как часть серии. */
const L3_MODES = ['compare_kmmin', 'diff_after_kmmin', 'compare_ms', 'diff_after_ms', 'convert_kmmin'] as const;
type L3Mode = (typeof L3_MODES)[number];

function allowed(difficulty: Level): SpeedSubtype[] {
  if (difficulty === 1) return L1;
  if (difficulty === 2) return L2;
  return L3;
}

export function isValidM16Level(
  params: Pick<M16GeneratorParams, 'subtype' | 'kind' | 'values' | 'units' | 'features'>,
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    return (
      params.subtype === 'recognize_speed_unit' &&
      params.kind === 'recognize' &&
      params.values.length >= 1 &&
      !params.features.includes('needs_convert')
    );
  }
  if (difficulty === 2) {
    return (
      params.subtype === 'compare_same_unit' &&
      params.kind === 'compare' &&
      params.values.length === 2 &&
      params.units[0] === params.units[1] &&
      !params.features.includes('needs_convert')
    );
  }
  // L3: обязательно преобразование; единицы исходных величин различны
  if (!params.features.includes('needs_convert')) return false;
  if (params.subtype !== 'compare_awkward' || params.kind !== 'compare') return false;
  if (params.values.length < 2) return false;
  if (params.units.length < 2) return false;
  if (params.units[0] === params.units[1]) return false;
  return true;
}

/** L3 не должен сводиться к вычитанию уже одинаковых км/ч без перевода. */
export function isTrivialSameUnitL3(params: M16GeneratorParams, question: string): boolean {
  if (!params.features.includes('needs_convert')) return true;
  if (params.units[0] === params.units[1]) return true;
  if (/подсказка|10 м\/с = 36|1 км\/мин = 60 км\/ч =/i.test(question)) return true;
  // явное равенство перевода в тексте условия
  if (/\d+\s*м\/с\s*=\s*\d+\s*км\/ч/i.test(question)) return true;
  return false;
}

export function speedFingerprint(params: M16GeneratorParams): string {
  return [params.subtype, params.values.join(','), params.units.join(','), params.correctLabel].join('|');
}

function resolveSubtype(difficulty: Level, requested: SpeedSubtype | undefined, rng: SeededRng): SpeedSubtype {
  const list = allowed(difficulty);
  if (requested && list.includes(requested)) return requested;
  return pickOne(rng, list);
}

/** L1: выбор правильной записи скорости (не trivia «это скорость»). */
function buildRecognize(rng: SeededRng, seed: number, indexHint: number): Task {
  const speed = randomInt(rng, 25, 110);
  const form = indexHint % 3 === 0 ? 'choose_unit' : 'which_record';

  if (form === 'choose_unit') {
    const correct = 'км/ч';
    const distractors = uniqueDistractorsFromModels(correct, ['кг', 'м²', 'ч', 'км', 'мин', 'л'], rng, 3);
    const answers = buildChoiceAnswers(correct, distractors, rng);
    const contexts = [
      `Автомобиль проехал путь за час. В какой единице удобно записать его скорость ${speed} …?`,
      `Поезд движется быстро. Какую единицу выбрать для скорости ${speed}?`,
      `Скорость велосипедиста — ${speed}. Какая единица подходит?`,
    ];
    const params: M16GeneratorParams = {
      subtype: 'recognize_speed_unit',
      features: ['unit_km_h', 'choose_unit'],
      kind: 'recognize',
      values: [speed],
      units: [correct],
      correctLabel: correct,
      numericAnswer: null,
      seed,
    };
    if (!isValidM16Level(params, 1)) throw new Error('M16 L1 choose_unit invalid');
    return baseTask({
      id: `generated-m16-1-unit-${speed}-${indexHint}`,
      section: 'Величины',
      topic: 'Скорость',
      skill: SUBTYPE_TITLES.recognize_speed_unit,
      topicId: M16_TOPIC_ID,
      skillId: M16_SKILL_ID,
      difficulty: 1,
      taskType: 'singleChoice',
      question: pickOne(rng, contexts),
      correctAnswer: correct,
      answers,
      explanation: `Скорость часто записывают в км/ч (километры в час).`,
      generatorId: M16_GENERATOR_ID,
      generatorParams: params,
      hint2: 'Скорость — путь за время.',
    });
  }

  const correct = `${speed} км/ч`;
  const distractors = uniqueDistractorsFromModels(
    correct,
    [`${speed} км`, `${speed} ч`, `${speed} кг`, `${speed} м`, `${speed} мин`, `${speed} см`],
    rng,
    3,
  );
  const answers = buildChoiceAnswers(correct, distractors, rng);
  const params: M16GeneratorParams = {
    subtype: 'recognize_speed_unit',
    features: ['unit_km_h'],
    kind: 'recognize',
    values: [speed],
    units: ['км/ч'],
    correctLabel: correct,
    numericAnswer: null,
    seed,
  };
  if (!isValidM16Level(params, 1)) throw new Error('M16 L1 which_record invalid');
  return baseTask({
    id: `generated-m16-1-rec-${speed}-${indexHint}`,
    section: 'Величины',
    topic: 'Скорость',
    skill: SUBTYPE_TITLES.recognize_speed_unit,
    topicId: M16_TOPIC_ID,
    skillId: M16_SKILL_ID,
    difficulty: 1,
    taskType: 'singleChoice',
    question: 'Какая из записей означает скорость?',
    correctAnswer: correct,
    answers,
    explanation: `Скорость записывают как путь в единицу времени, например ${correct}.`,
    generatorId: M16_GENERATOR_ID,
    generatorParams: params,
    hint2: 'Ищи запись вида «… км/ч».',
  });
}

function buildCompareSame(rng: SeededRng, seed: number): Task {
  let a = randomInt(rng, 35, 95);
  let b = randomInt(rng, 35, 95);
  while (a === b) b = randomInt(rng, 35, 95);
  const mode = pickOne(rng, ['who', 'diff'] as const);
  const faster = Math.max(a, b);
  const slower = Math.min(a, b);
  const diff = faster - slower;
  const unit = 'км/ч';

  if (mode === 'who') {
    const correct = `${faster} ${unit}`;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [`${slower} ${unit}`, `${diff} ${unit}`, `${a + b} ${unit}`, `${faster} км`],
      rng,
      3,
    );
    const answers = buildChoiceAnswers(correct, distractors, rng);
    const params: M16GeneratorParams = {
      subtype: 'compare_same_unit',
      features: ['unit_km_h', 'who_faster'],
      kind: 'compare',
      values: [a, b],
      units: [unit, unit],
      correctLabel: correct,
      numericAnswer: faster,
      seed,
    };
    if (!isValidM16Level(params, 2)) throw new Error('M16 L2 invalid');
    return baseTask({
      id: `generated-m16-2-who-${a}-${b}`,
      section: 'Величины',
      topic: 'Скорость',
      skill: SUBTYPE_TITLES.compare_same_unit,
      topicId: M16_TOPIC_ID,
      skillId: M16_SKILL_ID,
      difficulty: 2,
      taskType: 'singleChoice',
      question: `Какая скорость больше: ${a} ${unit} или ${b} ${unit}?`,
      correctAnswer: correct,
      answers,
      explanation: `${faster} ${unit} больше, чем ${slower} ${unit}.`,
      generatorId: M16_GENERATOR_ID,
      generatorParams: params,
      hint2: 'При одинаковых единицах сравни числа.',
    });
  }

  const params: M16GeneratorParams = {
    subtype: 'compare_same_unit',
    features: ['unit_km_h', 'how_much_faster'],
    kind: 'compare',
    values: [a, b],
    units: [unit, unit],
    correctLabel: String(diff),
    numericAnswer: diff,
    seed,
  };
  if (!isValidM16Level(params, 2)) throw new Error('M16 L2 invalid');
  const distractors = uniqueDistractorsFromModels(diff, [slower, faster, a + b, diff + 5, diff + 10], rng, 3);
  const answers = buildChoiceAnswers(diff, distractors, rng);
  return baseTask({
    id: `generated-m16-2-diff-${a}-${b}`,
    section: 'Величины',
    topic: 'Скорость',
    skill: SUBTYPE_TITLES.compare_same_unit,
    topicId: M16_TOPIC_ID,
    skillId: M16_SKILL_ID,
    difficulty: 2,
    taskType: 'singleChoice',
    question: `На сколько км/ч скорость ${faster} км/ч больше скорости ${slower} км/ч?`,
    correctAnswer: String(diff),
    answers,
    explanation: `${faster} − ${slower} = ${diff} (км/ч).`,
    generatorId: M16_GENERATOR_ID,
    generatorParams: params,
    hint2: 'Вычти меньшую скорость из большей.',
  });
}

/** 10 м/с = 36 км/ч (школьный ориентир 4 класса); ученик применяет сам. */
function msToKmh(ms: number): number {
  return (ms * 36) / 10;
}

function buildAwkward(rng: SeededRng, seed: number, mode: L3Mode): Task {
  if (mode === 'convert_kmmin') {
    const perMin = pickOne(rng, [1, 2, 3]);
    const kmh = perMin * 60;
    const distractors = uniqueDistractorsFromModels(
      kmh,
      [perMin, perMin * 100, kmh + 10, perMin * 6, 60, perMin * 10],
      rng,
      3,
    );
    const answers = buildChoiceAnswers(kmh, distractors, rng);
    const params: M16GeneratorParams = {
      subtype: 'compare_awkward',
      features: ['unit_km_h', 'unit_m_min', 'needs_convert'],
      kind: 'compare',
      values: [perMin, kmh],
      units: ['км/мин', 'км/ч'],
      correctLabel: String(kmh),
      numericAnswer: kmh,
      seed,
    };
    if (!isValidM16Level(params, 3) || isTrivialSameUnitL3(params, `Вырази ${perMin} км/мин`)) {
      throw new Error('M16 L3 convert invalid');
    }
    return baseTask({
      id: `generated-m16-3-tokmh-${perMin}-${seed}`,
      section: 'Величины',
      topic: 'Скорость',
      skill: SUBTYPE_TITLES.compare_awkward,
      topicId: M16_TOPIC_ID,
      skillId: M16_SKILL_ID,
      difficulty: 3,
      taskType: 'singleChoice',
      question: `Вырази скорость ${perMin} км/мин в километрах в час.`,
      correctAnswer: String(kmh),
      answers,
      explanation: `В 1 минуте путь ${perMin} км, в 60 минутах — ${kmh} км, то есть ${kmh} км/ч.`,
      generatorId: M16_GENERATOR_ID,
      generatorParams: params,
      hint2: 'Сколько минут в часе?',
    });
  }

  if (mode === 'compare_kmmin' || mode === 'diff_after_kmmin') {
    const perMin = pickOne(rng, [1, 2]);
    const leftKmh = perMin * 60;
    let other = pickOne(rng, [45, 50, 55, 70, 80, 90, 100].filter((v) => v !== leftKmh));
    while (other === leftKmh) other = randomInt(rng, 40, 100);

    if (mode === 'diff_after_kmmin') {
      const diff = Math.abs(leftKmh - other);
      const distractors = uniqueDistractorsFromModels(
        diff,
        [
          Math.abs(perMin - other), // забыли перевести
          leftKmh + other,
          other,
          leftKmh,
          diff + 10,
          Math.abs(perMin * 10 - other),
        ],
        rng,
        3,
      );
      const answers = buildChoiceAnswers(diff, distractors, rng);
      const params: M16GeneratorParams = {
        subtype: 'compare_awkward',
        features: ['unit_km_h', 'unit_m_min', 'needs_convert', 'how_much_faster'],
        kind: 'compare',
        values: [perMin, other],
        units: ['км/мин', 'км/ч'],
        correctLabel: String(diff),
        numericAnswer: diff,
        seed,
      };
      const question = `На сколько км/ч отличается скорость ${perMin} км/мин от скорости ${other} км/ч?`;
      if (!isValidM16Level(params, 3) || isTrivialSameUnitL3(params, question)) {
        throw new Error('M16 L3 diff kmmin invalid');
      }
      return baseTask({
        id: `generated-m16-3-diff-kmmin-${perMin}-${other}`,
        section: 'Величины',
        topic: 'Скорость',
        skill: SUBTYPE_TITLES.compare_awkward,
        topicId: M16_TOPIC_ID,
        skillId: M16_SKILL_ID,
        difficulty: 3,
        taskType: 'singleChoice',
        question,
        correctAnswer: String(diff),
        answers,
        explanation: `${perMin} км/мин = ${leftKmh} км/ч. |${leftKmh} − ${other}| = ${diff}.`,
        generatorId: M16_GENERATOR_ID,
        generatorParams: params,
        hint2: 'Сначала приведи обе скорости к км/ч.',
      });
    }

    const fasterIsLeft = leftKmh > other;
    const correct = fasterIsLeft ? `${perMin} км/мин` : `${other} км/ч`;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [
        fasterIsLeft ? `${other} км/ч` : `${perMin} км/мин`,
        `${perMin} км/ч`,
        `${other} км/мин`,
        `${leftKmh} км/ч`,
      ],
      rng,
      3,
    );
    const answers = buildChoiceAnswers(correct, distractors, rng);
    const params: M16GeneratorParams = {
      subtype: 'compare_awkward',
      features: ['unit_km_h', 'unit_m_min', 'needs_convert', 'who_faster'],
      kind: 'compare',
      values: [perMin, other],
      units: ['км/мин', 'км/ч'],
      correctLabel: correct,
      numericAnswer: Math.max(leftKmh, other),
      seed,
    };
    const question = `Что больше: ${perMin} км/мин или ${other} км/ч?`;
    if (!isValidM16Level(params, 3) || isTrivialSameUnitL3(params, question)) {
      throw new Error('M16 L3 compare kmmin invalid');
    }
    return baseTask({
      id: `generated-m16-3-cmp-kmmin-${perMin}-${other}`,
      section: 'Величины',
      topic: 'Скорость',
      skill: SUBTYPE_TITLES.compare_awkward,
      topicId: M16_TOPIC_ID,
      skillId: M16_SKILL_ID,
      difficulty: 3,
      taskType: 'singleChoice',
      question,
      correctAnswer: correct,
      answers,
      explanation: `${perMin} км/мин = ${leftKmh} км/ч. Сравни с ${other} км/ч.`,
      generatorId: M16_GENERATOR_ID,
      generatorParams: params,
      hint2: 'Приведи к одной единице (км/ч).',
    });
  }

  // compare_ms / diff_after_ms
  const ms = pickOne(rng, [5, 10, 15, 20]);
  const kmhEq = msToKmh(ms);
  let other = pickOne(rng, [18, 24, 30, 36, 40, 48, 54, 60, 72, 80].filter((v) => v !== kmhEq));
  while (other === kmhEq) other = randomInt(rng, 20, 90);

  if (mode === 'diff_after_ms') {
    const diff = Math.abs(kmhEq - other);
    const distractors = uniqueDistractorsFromModels(
      diff,
      [
        Math.abs(ms - other), // без перевода
        kmhEq,
        other,
        diff + 6,
        Math.abs(ms * 3 - other),
        ms + other,
      ],
      rng,
      3,
    );
    const answers = buildChoiceAnswers(diff, distractors, rng);
    const params: M16GeneratorParams = {
      subtype: 'compare_awkward',
      features: ['unit_km_h', 'unit_m_s', 'needs_convert', 'how_much_faster'],
      kind: 'compare',
      values: [ms, other],
      units: ['м/с', 'км/ч'],
      correctLabel: String(diff),
      numericAnswer: diff,
      seed,
    };
    const question = `На сколько км/ч отличается скорость ${ms} м/с от скорости ${other} км/ч?`;
    if (!isValidM16Level(params, 3) || isTrivialSameUnitL3(params, question)) {
      throw new Error('M16 L3 diff ms invalid');
    }
    return baseTask({
      id: `generated-m16-3-diff-ms-${ms}-${other}`,
      section: 'Величины',
      topic: 'Скорость',
      skill: SUBTYPE_TITLES.compare_awkward,
      topicId: M16_TOPIC_ID,
      skillId: M16_SKILL_ID,
      difficulty: 3,
      taskType: 'singleChoice',
      question,
      correctAnswer: String(diff),
      answers,
      explanation: `${ms} м/с = ${kmhEq} км/ч (из соотношения 10 м/с = 36 км/ч). |${kmhEq} − ${other}| = ${diff}.`,
      generatorId: M16_GENERATOR_ID,
      generatorParams: params,
      hint2: 'Сначала переведи м/с в км/ч.',
    });
  }

  const leftIsFaster = kmhEq > other;
  const correct = leftIsFaster ? `${ms} м/с` : `${other} км/ч`;
  const distractors = uniqueDistractorsFromModels(
    correct,
    [leftIsFaster ? `${other} км/ч` : `${ms} м/с`, `${ms} км/ч`, `${other} м/с`, `${kmhEq} км/ч`],
    rng,
    3,
  );
  const answers = buildChoiceAnswers(correct, distractors, rng);
  const params: M16GeneratorParams = {
    subtype: 'compare_awkward',
    features: ['unit_km_h', 'unit_m_s', 'needs_convert', 'who_faster'],
    kind: 'compare',
    values: [ms, other],
    units: ['м/с', 'км/ч'],
    correctLabel: correct,
    numericAnswer: Math.max(kmhEq, other),
    seed,
  };
  const question = `Что больше: ${ms} м/с или ${other} км/ч?`;
  if (!isValidM16Level(params, 3) || isTrivialSameUnitL3(params, question)) {
    throw new Error('M16 L3 compare ms invalid');
  }
  return baseTask({
    id: `generated-m16-3-cmp-ms-${ms}-${other}`,
    section: 'Величины',
    topic: 'Скорость',
    skill: SUBTYPE_TITLES.compare_awkward,
    topicId: M16_TOPIC_ID,
    skillId: M16_SKILL_ID,
    difficulty: 3,
    taskType: 'singleChoice',
    question,
    correctAnswer: correct,
    answers,
    explanation: `${ms} м/с = ${kmhEq} км/ч. Сравни с ${other} км/ч.`,
    generatorId: M16_GENERATOR_ID,
    generatorParams: params,
    hint2: 'Переведи м/с в км/ч, затем сравни.',
  });
}

export function generateM16Task(options: M16GenerateOptions & { seriesIndex?: number }): Task {
  rejectAdvancedLevels('M16', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);
  const indexHint = options.seriesIndex ?? randomInt(rng, 0, 99);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if (subtype === 'recognize_speed_unit') return buildRecognize(rng, options.seed, indexHint + attempt);
      if (subtype === 'compare_same_unit') return buildCompareSame(rng, options.seed);
      const mode = L3_MODES[(indexHint + attempt) % L3_MODES.length]!;
      return buildAwkward(rng, options.seed, mode);
    } catch {
      // retry
    }
  }
  throw new Error(`M16: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM16Series(options: M16SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => generateM16Task({ difficulty, seed, seriesIndex: index }),
    (task) => speedFingerprint(task.generatorParams as M16GeneratorParams),
    'M16',
  );
}
