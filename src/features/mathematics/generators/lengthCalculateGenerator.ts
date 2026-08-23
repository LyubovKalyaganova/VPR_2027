/**
 * Генератор M13: длина км/м/см/мм.
 * Контракт: M13_GENERATOR_SPEC.md
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

export const M13_SKILL_ID = 'math.quantities.length.calculate' as const;
export const M13_TOPIC_ID = 'math.quantities.length' as const;
export const M13_GENERATOR_ID = 'gen.math.quantities.length' as const;

export type LengthSubtype = 'convert' | 'compare' | 'add_sub' | 'compound';
export type LengthFeature =
  | 'cm_mm'
  | 'm_cm'
  | 'km_m'
  | 'add'
  | 'sub'
  | 'compound'
  | 'three_units';

export type M13GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: LengthSubtype };
export type M13SeriesOptions = { seed: number; countPerLevel?: number };

export type M13GeneratorParams = {
  valueMm: number;
  subtype: LengthSubtype;
  features: LengthFeature[];
  seed: number;
  label?: string;
};

const TITLES: Record<LengthSubtype, string> = {
  convert: 'Перевод единиц длины',
  compare: 'Сравнение длин',
  add_sub: 'Сложение и вычитание длин',
  compound: 'Составная запись длины',
};

const L1S: LengthSubtype[] = ['convert'];
const L2S: LengthSubtype[] = ['convert', 'compare', 'add_sub'];
const L3S: LengthSubtype[] = ['compound', 'add_sub'];

export function lengthFingerprint(p: M13GeneratorParams): string {
  return `${p.subtype}|${p.valueMm}|${p.features.join(',')}|${p.label ?? ''}`;
}

export function isValidM13Level(features: LengthFeature[], difficulty: Level): boolean {
  const compound = features.includes('compound') || features.includes('three_units');
  if (difficulty === 1) return !compound && (features.includes('cm_mm') || features.includes('m_cm'));
  if (difficulty === 2) return !features.includes('three_units');
  return compound;
}

function pack(
  difficulty: Level,
  seed: number,
  subtype: LengthSubtype,
  params: M13GeneratorParams,
  question: string,
  answer: number,
  explanation: string,
  rng: SeededRng,
  models: number[],
): Task | null {
  if (!isValidM13Level(params.features, difficulty)) return null;
  if (difficulty < 3) {
    const d = uniqueDistractorsFromModels(answer, models, rng, 3);
    if (d.length !== 3) return null;
    return baseTask({
      id: `generated-m13-${difficulty}-${subtype}-${answer}-${seed}`,
      section: 'Величины',
      topic: 'Длина',
      skill: TITLES[subtype],
      topicId: M13_TOPIC_ID,
      skillId: M13_SKILL_ID,
      difficulty,
      taskType: 'singleChoice',
      question,
      correctAnswer: String(answer),
      answers: buildChoiceAnswers(answer, d, rng),
      explanation,
      generatorId: M13_GENERATOR_ID,
      generatorParams: params,
      hint2: '1 см = 10 мм, 1 м = 100 см, 1 км = 1000 м.',
    });
  }
  return baseTask({
    id: `generated-m13-3-${subtype}-${answer}-${seed}`,
    section: 'Величины',
    topic: 'Длина',
    skill: TITLES[subtype],
    topicId: M13_TOPIC_ID,
    skillId: M13_SKILL_ID,
    difficulty: 3,
    taskType: 'numberAnswer',
    question,
    correctAnswer: answer,
    explanation,
    generatorId: M13_GENERATOR_ID,
    generatorParams: params,
    hint2: '1 см = 10 мм, 1 м = 100 см, 1 км = 1000 м.',
  });
}

function build(rng: SeededRng, difficulty: Level, subtype: LengthSubtype, seed: number): Task | null {
  if (difficulty === 1) {
    const cmMm = rng() < 0.5;
    if (cmMm) {
      const cm = randomInt(rng, 2, 9);
      const answer = cm * 10;
      return pack(
        difficulty,
        seed,
        'convert',
        { valueMm: answer, subtype: 'convert', features: ['cm_mm'], seed, label: `${cm}cm` },
        `Сколько миллиметров в ${cm} см?`,
        answer,
        `${cm} см = ${answer} мм.`,
        rng,
        [cm * 100, cm, answer + 10, cm * 10 + 1],
      );
    }
    const m = randomInt(rng, 2, 9);
    const answer = m * 100;
    return pack(
      difficulty,
      seed,
      'convert',
      { valueMm: answer * 10, subtype: 'convert', features: ['m_cm'], seed, label: `${m}m` },
      `Сколько сантиметров в ${m} м?`,
      answer,
      `${m} м = ${answer} см.`,
      rng,
      [m * 1000, m * 10, answer + 100, m],
    );
  }

  if (difficulty === 2) {
    if (subtype === 'add_sub') {
      const a = pickOne(rng, [25, 30, 40, 45, 50, 60]);
      const b = pickOne(rng, [10, 15, 20, 25, 30]);
      const add = rng() < 0.5;
      const answer = add ? a + b : a - b;
      if (answer <= 0) return null;
      return pack(
        difficulty,
        seed,
        'add_sub',
        {
          valueMm: answer * 10,
          subtype: 'add_sub',
          features: [add ? 'add' : 'sub', 'm_cm'],
          seed,
        },
        add ? `${a} см + ${b} см = ? см` : `${a} см − ${b} см = ? см`,
        answer,
        `Ответ: ${answer} см.`,
        rng,
        [a + b, Math.abs(a - b), a * 10 + b, answer + 5],
      );
    }
    if (subtype === 'compare') {
      const m = randomInt(rng, 1, 3);
      const cm = randomInt(rng, 10, 90);
      const left = m * 100;
      const answer = Math.max(left, cm);
      return pack(
        difficulty,
        seed,
        'compare',
        { valueMm: answer * 10, subtype: 'compare', features: ['m_cm'], seed },
        `Что больше (ответь в см): ${m} м или ${cm} см?`,
        answer,
        `${m} м = ${left} см.`,
        rng,
        [Math.min(left, cm), m * 10 + cm, left + cm],
      );
    }
    const km = randomInt(rng, 1, 5);
    const answer = km * 1000;
    return pack(
      difficulty,
      seed,
      'convert',
      { valueMm: answer * 1000, subtype: 'convert', features: ['km_m'], seed, label: `${km}km` },
      `Сколько метров в ${km} км?`,
      answer,
      `${km} км = ${answer} м.`,
      rng,
      [km * 100, km * 10, answer + 1000, km],
    );
  }

  // L3
  if (subtype === 'compound' || rng() < 0.55) {
    const m = randomInt(rng, 1, 4);
    const dm = randomInt(rng, 1, 9);
    const cm = randomInt(rng, 1, 9);
    const answer = m * 100 + dm * 10 + cm;
    return pack(
      difficulty,
      seed,
      'compound',
      {
        valueMm: answer * 10,
        subtype: 'compound',
        features: ['compound', 'three_units', 'm_cm'],
        seed,
        label: `${m}m${dm}dm${cm}cm`,
      },
      `Сколько сантиметров в ${m} м ${dm} дм ${cm} см?`,
      answer,
      `${m}×100 + ${dm}×10 + ${cm} = ${answer} см.`,
      rng,
      [Number(`${m}${dm}${cm}`), m * 100 + cm, answer + 10, m * 10 + dm],
    );
  }
  const km = randomInt(rng, 2, 5);
  const m = pickOne(rng, [150, 250, 350, 450, 500]);
  const answer = km * 1000 - m;
  return pack(
    difficulty,
    seed,
    'add_sub',
    {
      valueMm: answer * 1000,
      subtype: 'add_sub',
      features: ['compound', 'sub', 'km_m'],
      seed,
      label: `${km}km-${m}m`,
    },
    `${km} км − ${m} м = ? м`,
    answer,
    `${km}×1000 − ${m} = ${answer} м.`,
    rng,
    [km * 1000 - m / 10, km * 100 - m, answer + 100, m],
  );
}

export function generateM13Task(options: M13GenerateOptions): Task {
  rejectAdvancedLevels('M13', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
  const subtype =
    options.subtype && allowed.includes(options.subtype) ? options.subtype : pickOne(rng, allowed);
  for (let i = 0; i < 80; i += 1) {
    const task = build(rng, difficulty, subtype, options.seed);
    if (task) return task;
  }
  throw new Error(`M13: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM13Series(options: M13SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
      return generateM13Task({ difficulty, seed, subtype: allowed[index % allowed.length] });
    },
    (task) => lengthFingerprint(task.generatorParams as M13GeneratorParams),
    'M13',
  );
}
