/**
 * Генератор M09: перевод и сравнение единиц.
 * Контракт: M09_GENERATOR_SPEC.md
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

export const M09_SKILL_ID = 'math.quantities.units.convert' as const;
export const M09_TOPIC_ID = 'math.quantities.units' as const;
export const M09_GENERATOR_ID = 'gen.math.quantities.units' as const;

export type UnitsSubtype = 'to_smaller' | 'to_larger' | 'compare' | 'choose_unit';
export type QuantityFamily = 'length' | 'mass' | 'time' | 'capacity';
export type UnitsFeature =
  | 'coeff_10'
  | 'coeff_100'
  | 'coeff_1000'
  | 'coeff_60'
  | 'length'
  | 'mass'
  | 'time'
  | 'capacity'
  | 'compound'
  | 'wrong_concat_trap';

export type M09GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: UnitsSubtype;
};

export type M09SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type CompoundPart = { value: number; unit: string };

export type M09GeneratorParams = {
  quantityFamily: QuantityFamily;
  fromUnit: string;
  toUnit: string;
  valueFrom: number;
  valueTo: number;
  compoundParts?: CompoundPart[];
  subtype: UnitsSubtype;
  features: UnitsFeature[];
  seed: number;
};

type UnitPair = {
  family: QuantityFamily;
  larger: string;
  smaller: string;
  coeff: 10 | 100 | 1000 | 60;
};

const L1_PAIRS: UnitPair[] = [
  { family: 'length', larger: 'см', smaller: 'мм', coeff: 10 },
  { family: 'length', larger: 'дм', smaller: 'см', coeff: 10 },
  { family: 'length', larger: 'м', smaller: 'дм', coeff: 10 },
  { family: 'length', larger: 'м', smaller: 'см', coeff: 100 },
];

const L2_PAIRS: UnitPair[] = [
  ...L1_PAIRS,
  { family: 'length', larger: 'км', smaller: 'м', coeff: 1000 },
  { family: 'time', larger: 'ч', smaller: 'мин', coeff: 60 },
  { family: 'capacity', larger: 'л', smaller: 'мл', coeff: 1000 },
  // масса намеренно не в типовом L2-переводе: это ядро M12
];

const L3_COMPOUND: Array<{
  family: QuantityFamily;
  major: string;
  minor: string;
  coeff: number;
}> = [
  { family: 'length', major: 'м', minor: 'см', coeff: 100 },
  { family: 'length', major: 'м', minor: 'дм', coeff: 10 },
  { family: 'length', major: 'дм', minor: 'см', coeff: 10 },
  { family: 'time', major: 'ч', minor: 'мин', coeff: 60 },
  // кг/г — редко, не доминирует (граница с M12)
  { family: 'mass', major: 'кг', minor: 'г', coeff: 1000 },
];

const CHOOSE_UNIT_CASES: Array<{
  question: string;
  correct: string;
  wrong: string[];
  family: QuantityFamily;
}> = [
  {
    question: 'Чем удобнее измерить длину карандаша?',
    correct: 'см',
    wrong: ['км', 'кг', 'ч'],
    family: 'length',
  },
  {
    question: 'Чем измеряют массу яблока?',
    correct: 'г',
    wrong: ['км', 'мм', 'мин'],
    family: 'mass',
  },
  {
    question: 'Чем измеряют длительность урока?',
    correct: 'мин',
    wrong: ['см', 'кг', 'мм'],
    family: 'time',
  },
  {
    question: 'Чем измеряют расстояние между городами?',
    correct: 'км',
    wrong: ['мм', 'г', 'мин'],
    family: 'length',
  },
  {
    question: 'Какая единица подходит для измерения времени перемены?',
    correct: 'мин',
    wrong: ['кг', 'мм', 'км'],
    family: 'time',
  },
  {
    question: 'Что измеряют в часах?',
    correct: 'время',
    wrong: ['массу', 'длину', 'площадь'],
    family: 'time',
  },
  {
    question: 'Выбери подходящую единицу: толщина тетради.',
    correct: 'мм',
    wrong: ['км', 'т', 'ч'],
    family: 'length',
  },
  {
    question: 'Чем измеряют объём воды в стакане?',
    correct: 'л',
    wrong: ['км', 'ч', 'мм'],
    family: 'capacity',
  },
  {
    question: 'Какая единица подходит для вместимости кастрюли?',
    correct: 'л',
    wrong: ['кг', 'мин', 'см'],
    family: 'capacity',
  },
  {
    question: 'Выбери пару единиц одной величины: л и …',
    correct: 'мл',
    wrong: ['кг', 'мин', 'м'],
    family: 'capacity',
  },
];

const SUBTYPE_TITLES: Record<UnitsSubtype, string> = {
  to_smaller: 'Перевод в более мелкую единицу',
  to_larger: 'Перевод в более крупную единицу',
  compare: 'Сравнение величин в разных единицах',
  choose_unit: 'Выбор единицы измерения',
};

const L1_SUBTYPES: UnitsSubtype[] = ['choose_unit', 'choose_unit', 'to_smaller', 'to_larger'];
const L2_SUBTYPES: UnitsSubtype[] = ['compare', 'to_smaller', 'to_larger'];
const L3_SUBTYPES: UnitsSubtype[] = ['to_smaller', 'compare'];

const MAX_ATTEMPTS = 100;

function coeffFeature(coeff: number): UnitsFeature {
  if (coeff === 10) return 'coeff_10';
  if (coeff === 100) return 'coeff_100';
  if (coeff === 1000) return 'coeff_1000';
  return 'coeff_60';
}

function familyFeature(family: QuantityFamily): UnitsFeature {
  return family;
}

export function unitsFingerprint(params: {
  subtype: UnitsSubtype;
  quantityFamily: QuantityFamily;
  fromUnit: string;
  toUnit: string;
  valueFrom: number;
  valueTo: number;
  compoundParts?: CompoundPart[];
}): string {
  const compound = (params.compoundParts ?? [])
    .map((part) => `${part.value}${part.unit}`)
    .join('+');
  return [
    params.subtype,
    params.quantityFamily,
    params.fromUnit,
    params.toUnit,
    params.valueFrom,
    params.valueTo,
    compound,
  ].join('|');
}

/** Независимый пересчёт: value * coeff (в более мелкую). */
export function convertLargerToSmaller(value: number, coeff: number): number {
  return value * coeff;
}

export function convertSmallerToLarger(value: number, coeff: number): number | null {
  if (value % coeff !== 0) {
    return null;
  }
  return value / coeff;
}

export function compoundToSmaller(
  major: number,
  minor: number,
  coeff: number,
): number {
  return major * coeff + minor;
}

export function isValidM09Level(
  params: Pick<M09GeneratorParams, 'features' | 'subtype' | 'compoundParts'>,
  difficulty: Level,
): boolean {
  const hasCompound = Boolean(params.compoundParts?.length) || params.features.includes('compound');
  if (difficulty === 1) {
    if (hasCompound || params.subtype === 'compare') return false;
    if (params.subtype === 'choose_unit') return true;
    return params.features.includes('coeff_10') || params.features.includes('coeff_100');
  }
  if (difficulty === 2) {
    if (hasCompound || params.subtype === 'choose_unit') return false;
    if (params.subtype === 'compare') return true;
    return params.features.includes('coeff_1000') || params.features.includes('coeff_60');
  }
  return hasCompound;
}

function allowedSubtypes(difficulty: Level): UnitsSubtype[] {
  if (difficulty === 1) return L1_SUBTYPES;
  if (difficulty === 2) return L2_SUBTYPES;
  return L3_SUBTYPES;
}

function resolveSubtype(difficulty: Level, requested: UnitsSubtype | undefined, rng: SeededRng): UnitsSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  return pickOne(rng, allowed);
}

function buildChooseUnit(rng: SeededRng, seed: number, difficulty: Level = 1): Task {
  const item = pickOne(rng, CHOOSE_UNIT_CASES);
  const answers = buildChoiceAnswers(item.correct, item.wrong.slice(0, 3), rng);
  const features: UnitsFeature[] = [familyFeature(item.family)];
  const params: M09GeneratorParams = {
    quantityFamily: item.family,
    fromUnit: item.correct,
    toUnit: item.correct,
    valueFrom: 0,
    valueTo: 0,
    subtype: 'choose_unit',
    features,
    seed,
  };
  return baseTask({
    id: `generated-m09-${difficulty}-choose-${item.correct}-${seed}`,
    section: 'Величины',
    topic: 'Единицы измерения',
    skill: SUBTYPE_TITLES.choose_unit,
    topicId: M09_TOPIC_ID,
    skillId: M09_SKILL_ID,
    difficulty,
    taskType: 'singleChoice',
    question: item.question,
    correctAnswer: item.correct,
    answers,
    explanation: `Подходящая единица — ${item.correct}.`,
    generatorId: M09_GENERATOR_ID,
    generatorParams: params,
    hint2: 'Подумай, что именно измеряют и какой порядок величины.',
  });
}

function convertDistractors(
  correct: number,
  valueFrom: number,
  coeff: number,
  direction: 'to_smaller' | 'to_larger',
  rng: SeededRng,
): string[] {
  const models: Array<number | null> = [
    direction === 'to_smaller' ? valueFrom / coeff : valueFrom * coeff,
    valueFrom,
    direction === 'to_smaller' ? valueFrom * (coeff === 100 ? 10 : 100) : Math.floor(valueFrom / (coeff === 100 ? 10 : 100)),
    correct + coeff,
    Math.max(1, correct - 1),
    correct * 10,
  ];
  return uniqueDistractorsFromModels(correct, models, rng, 3);
}

function buildSimpleConvert(
  rng: SeededRng,
  difficulty: Level,
  subtype: 'to_smaller' | 'to_larger',
  seed: number,
): Task | null {
  const pool =
    difficulty === 1
      ? L1_PAIRS
      : L2_PAIRS.filter((item) => item.coeff === 1000 || item.coeff === 60);
  const pair = pickOne(rng, pool);
  if (difficulty === 1 && pair.coeff !== 10 && pair.coeff !== 100) {
    return null;
  }

  let valueFrom: number;
  let valueTo: number;
  let fromUnit: string;
  let toUnit: string;
  let question: string;

  if (subtype === 'to_smaller') {
    valueFrom = randomInt(rng, 2, difficulty === 1 ? 9 : 20);
    valueTo = convertLargerToSmaller(valueFrom, pair.coeff);
    fromUnit = pair.larger;
    toUnit = pair.smaller;
    question = `Сколько ${toUnit} в ${valueFrom} ${fromUnit}?`;
  } else {
    const maxMajor = difficulty === 1 ? 9 : 15;
    const major = randomInt(rng, 2, maxMajor);
    valueFrom = major * pair.coeff;
    valueTo = major;
    fromUnit = pair.smaller;
    toUnit = pair.larger;
    question = `Сколько ${toUnit} в ${valueFrom} ${fromUnit}?`;
  }

  const features: UnitsFeature[] = [
    coeffFeature(pair.coeff),
    familyFeature(pair.family),
  ];
  const params: M09GeneratorParams = {
    quantityFamily: pair.family,
    fromUnit,
    toUnit,
    valueFrom,
    valueTo,
    subtype,
    features,
    seed,
  };
  if (!isValidM09Level(params, difficulty)) {
    return null;
  }

  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const distractors =
    taskType === 'singleChoice'
      ? convertDistractors(valueTo, valueFrom, pair.coeff, subtype, rng)
      : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    return null;
  }

  return baseTask({
    id: `generated-m09-${difficulty}-${subtype}-${valueFrom}${fromUnit}-${valueTo}${toUnit}`,
    section: 'Величины',
    topic: 'Единицы измерения',
    skill: SUBTYPE_TITLES[subtype],
    topicId: M09_TOPIC_ID,
    skillId: M09_SKILL_ID,
    difficulty,
    taskType,
    question,
    correctAnswer: taskType === 'numberAnswer' ? valueTo : String(valueTo),
    answers: taskType === 'singleChoice' ? buildChoiceAnswers(valueTo, distractors, rng) : undefined,
    explanation: `${valueFrom} ${fromUnit} = ${valueTo} ${toUnit} (коэффициент ${pair.coeff}).`,
    generatorId: M09_GENERATOR_ID,
    generatorParams: params,
    hint2: `Вспомни: 1 ${pair.larger} = ${pair.coeff} ${pair.smaller}.`,
  });
}

function buildCompare(rng: SeededRng, difficulty: Level, seed: number): Task | null {
  const pair = pickOne(rng, L2_PAIRS);
  const aValue = randomInt(rng, 1, 5);
  const mode = pickOne(rng, ['eq', 'gt', 'lt'] as const);
  const step = Math.max(1, Math.floor(pair.coeff / 10));

  if (difficulty === 3) {
    const minor = randomInt(rng, 1, Math.min(pair.coeff - 1, 90));
    const compoundSmall = compoundToSmaller(aValue, minor, pair.coeff);
    let bValue: number;
    let relation: 'больше' | 'меньше' | 'равны';
    if (mode === 'eq') {
      bValue = compoundSmall;
      relation = 'равны';
    } else if (mode === 'gt') {
      bValue = Math.max(1, compoundSmall - step);
      relation = 'больше';
    } else {
      bValue = compoundSmall + step;
      relation = 'меньше';
    }
    const leftText = `${aValue} ${pair.larger} ${minor} ${pair.smaller}`;
    const rightText = `${bValue} ${pair.smaller}`;
    const correctAnswer =
      relation === 'равны' ? 'равны' : relation === 'больше' ? leftText : rightText;
    const distractors = uniqueDistractorsFromModels(
      correctAnswer,
      [leftText, rightText, 'равны', 'нельзя сравнить'],
      rng,
      3,
    );
    if (distractors.length !== 3) {
      return null;
    }
    const params: M09GeneratorParams = {
      quantityFamily: pair.family,
      fromUnit: pair.larger,
      toUnit: pair.smaller,
      valueFrom: aValue,
      valueTo: compoundSmall,
      compoundParts: [
        { value: aValue, unit: pair.larger },
        { value: minor, unit: pair.smaller },
      ],
      subtype: 'compare',
      features: [
        coeffFeature(pair.coeff),
        familyFeature(pair.family),
        'compound',
        'wrong_concat_trap',
      ],
      seed,
    };
    return baseTask({
      id: `generated-m09-3-compare-${aValue}${pair.larger}${minor}-${bValue}`,
      section: 'Величины',
      topic: 'Единицы измерения',
      skill: SUBTYPE_TITLES.compare,
      topicId: M09_TOPIC_ID,
      skillId: M09_SKILL_ID,
      difficulty: 3,
      taskType: 'singleChoice',
      question:
        relation === 'равны'
          ? `Сравни: ${leftText} и ${rightText}. Выбери верный ответ.`
          : `Что больше: ${leftText} или ${rightText}?`,
      correctAnswer,
      answers: buildChoiceAnswers(correctAnswer, distractors, rng),
      explanation: `${leftText} = ${compoundSmall} ${pair.smaller}.`,
      generatorId: M09_GENERATOR_ID,
      generatorParams: params,
    });
  }

  let bValue: number;
  let relation: 'больше' | 'меньше' | 'равны';
  if (mode === 'eq') {
    bValue = aValue * pair.coeff;
    relation = 'равны';
  } else if (mode === 'gt') {
    bValue = aValue * pair.coeff - step;
    relation = 'больше';
  } else {
    bValue = aValue * pair.coeff + step;
    relation = 'меньше';
  }
  const leftText = `${aValue} ${pair.larger}`;
  const rightText = `${bValue} ${pair.smaller}`;
  const correctAnswer =
    relation === 'равны' ? 'равны' : relation === 'больше' ? leftText : rightText;
  const distractors = uniqueDistractorsFromModels(
    correctAnswer,
    [leftText, rightText, 'равны', 'нельзя сравнить'],
    rng,
    3,
  );
  if (distractors.length !== 3) {
    return null;
  }
  const params: M09GeneratorParams = {
    quantityFamily: pair.family,
    fromUnit: pair.larger,
    toUnit: pair.smaller,
    valueFrom: aValue,
    valueTo: aValue * pair.coeff,
    subtype: 'compare',
    features: [coeffFeature(pair.coeff), familyFeature(pair.family)],
    seed,
  };
  return baseTask({
    id: `generated-m09-2-compare-${aValue}${pair.larger}-${bValue}`,
    section: 'Величины',
    topic: 'Единицы измерения',
    skill: SUBTYPE_TITLES.compare,
    topicId: M09_TOPIC_ID,
    skillId: M09_SKILL_ID,
    difficulty: 2,
    taskType: 'singleChoice',
    question:
      relation === 'равны'
        ? `Сравни: ${leftText} и ${rightText}. Выбери верный ответ.`
        : `Что больше: ${leftText} или ${rightText}?`,
    correctAnswer,
    answers: buildChoiceAnswers(correctAnswer, distractors, rng),
    explanation: `${leftText} = ${aValue * pair.coeff} ${pair.smaller}.`,
    generatorId: M09_GENERATOR_ID,
    generatorParams: params,
  });
}

function buildCompound(rng: SeededRng, seed: number): Task | null {
  // Предпочитаем не-массу, чтобы не клонировать M12
  const nonMass = L3_COMPOUND.filter((s) => s.family !== 'mass');
  const spec = rng() < 0.85 ? pickOne(rng, nonMass) : pickOne(rng, L3_COMPOUND);
  const major = randomInt(rng, 1, 5);
  const minor = randomInt(rng, 1, Math.min(spec.coeff - 1, 90));
  // избежать «красивого» нуля в младшей
  if (minor === 0) {
    return null;
  }
  const valueTo = compoundToSmaller(major, minor, spec.coeff);
  const concatTrap = Number(`${major}${minor}`);
  const features: UnitsFeature[] = [
    coeffFeature(spec.coeff),
    familyFeature(spec.family),
    'compound',
    'wrong_concat_trap',
  ];
  const compoundParts: CompoundPart[] = [
    { value: major, unit: spec.major },
    { value: minor, unit: spec.minor },
  ];
  const params: M09GeneratorParams = {
    quantityFamily: spec.family,
    fromUnit: spec.major,
    toUnit: spec.minor,
    valueFrom: major,
    valueTo,
    compoundParts,
    subtype: 'to_smaller',
    features,
    seed,
  };
  const question = `Сколько ${spec.minor} в ${major} ${spec.major} ${minor} ${spec.minor}?`;
  return baseTask({
    id: `generated-m09-3-compound-${major}${spec.major}${minor}${spec.minor}`,
    section: 'Величины',
    topic: 'Единицы измерения',
    skill: SUBTYPE_TITLES.to_smaller,
    topicId: M09_TOPIC_ID,
    skillId: M09_SKILL_ID,
    difficulty: 3,
    taskType: 'numberAnswer',
    question,
    correctAnswer: valueTo,
    explanation: `${major} ${spec.major} ${minor} ${spec.minor} = ${major}×${spec.coeff} + ${minor} = ${valueTo} ${spec.minor}. Не путай с записью ${concatTrap}.`,
    generatorId: M09_GENERATOR_ID,
    generatorParams: params,
    hint2: `1 ${spec.major} = ${spec.coeff} ${spec.minor}. Переведи крупные единицы и сложи.`,
  });
}

export function generateM09Task(options: M09GenerateOptions): Task {
  rejectAdvancedLevels('M09', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      let task: Task | null = null;
      if (subtype === 'choose_unit') {
        task = buildChooseUnit(rng, options.seed, difficulty);
      } else if (subtype === 'compare') {
        task = buildCompare(rng, difficulty, options.seed);
      } else if (difficulty === 3 && subtype === 'to_smaller') {
        task = buildCompound(rng, options.seed);
      } else if (subtype === 'to_smaller' || subtype === 'to_larger') {
        task = buildSimpleConvert(rng, difficulty, subtype, options.seed);
      }
      if (!task) {
        continue;
      }
      const params = task.generatorParams as M09GeneratorParams;
      if (!isValidM09Level(params, difficulty)) {
        continue;
      }
      return task;
    } catch {
      // retry
    }
  }
  throw new Error(`M09: не удалось сгенерировать задание L${difficulty} (seed=${options.seed})`);
}

export function generateM09Series(options: M09SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      const subtype = subtypes[index % subtypes.length] ?? subtypes[0];
      return generateM09Task({ difficulty, seed, subtype });
    },
    (task) => unitsFingerprint(task.generatorParams as M09GeneratorParams),
    'M09',
  );
}
