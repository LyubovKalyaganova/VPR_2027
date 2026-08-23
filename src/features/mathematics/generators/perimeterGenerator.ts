/**
 * Генератор M19: периметр.
 * Контракт: M19_GENERATOR_SPEC.md
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

export const M19_SKILL_ID = 'math.geometry.perimeter.calculate' as const;
export const M19_TOPIC_ID = 'math.geometry.perimeter' as const;
export const M19_GENERATOR_ID = 'gen.math.geometry.perimeter' as const;

export type PerimeterSubtype = 'all_sides_given' | 'rect_formula' | 'composite_perimeter';
export type PerimeterFeature = 'square' | 'rectangle' | 'triangle' | 'formula_2ab' | 'composite';

export type M19GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: PerimeterSubtype;
};

export type M19SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M19GeneratorParams = {
  subtype: PerimeterSubtype;
  features: PerimeterFeature[];
  sides: number[];
  perimeter: number;
  seed: number;
};

const SUBTYPE_TITLES: Record<PerimeterSubtype, string> = {
  all_sides_given: 'Все стороны даны',
  rect_formula: 'Периметр по формуле (a+b)×2',
  composite_perimeter: 'Периметр составной фигуры',
};

function allowed(difficulty: Level): PerimeterSubtype[] {
  if (difficulty === 1) return ['all_sides_given'];
  if (difficulty === 2) return ['rect_formula'];
  return ['composite_perimeter'];
}

export function isValidM19Level(
  params: Pick<M19GeneratorParams, 'subtype' | 'sides' | 'perimeter' | 'features'>,
  difficulty: Level,
): boolean {
  const sum = params.sides.reduce((a, b) => a + b, 0);
  if (difficulty === 1) {
    return params.subtype === 'all_sides_given' && params.sides.length >= 3 && params.perimeter === sum;
  }
  if (difficulty === 2) {
    if (params.subtype !== 'rect_formula') return false;
    if (params.features.includes('square') && params.sides.length === 1) {
      return params.perimeter === params.sides[0]! * 4;
    }
    if (params.sides.length === 2) {
      return params.perimeter === (params.sides[0]! + params.sides[1]!) * 2;
    }
    return false;
  }
  return params.subtype === 'composite_perimeter' && params.features.includes('composite') && params.perimeter > 0;
}

export function perimeterFingerprint(params: M19GeneratorParams): string {
  return [params.subtype, params.sides.join(','), params.perimeter].join('|');
}

function resolveSubtype(difficulty: Level, requested: PerimeterSubtype | undefined, rng: SeededRng): PerimeterSubtype {
  const list = allowed(difficulty);
  if (requested && list.includes(requested)) return requested;
  return pickOne(rng, list);
}

function finish(
  difficulty: Level,
  params: M19GeneratorParams,
  question: string,
  explanation: string,
  models: number[],
  rng: SeededRng,
): Task {
  if (!isValidM19Level(params, difficulty)) throw new Error(`M19 L${difficulty} invalid`);
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  let answers: string[] | undefined;
  let correctAnswer: string | number = params.perimeter;
  if (taskType === 'singleChoice') {
    const distractors = uniqueDistractorsFromModels(params.perimeter, models, rng);
    if (distractors.length < 3) throw new Error('M19: мало дистракторов');
    answers = buildChoiceAnswers(params.perimeter, distractors.slice(0, 3), rng);
    correctAnswer = String(params.perimeter);
  }
  return baseTask({
    id: `generated-m19-${difficulty}-${params.subtype}-${params.sides.join('x')}-${params.perimeter}`,
    section: 'Геометрия',
    topic: 'Периметр',
    skill: SUBTYPE_TITLES[params.subtype],
    topicId: M19_TOPIC_ID,
    skillId: M19_SKILL_ID,
    difficulty,
    taskType,
    question,
    correctAnswer,
    answers,
    explanation,
    generatorId: M19_GENERATOR_ID,
    generatorParams: params,
    hint1: 'Периметр — сумма длин сторон внешнего контура.',
    hint2: 'Не считай площадь (произведение сторон).',
    hint3: `Ответ: ${params.perimeter}.`,
  });
}

function buildL1(rng: SeededRng, seed: number): Task {
  const kind = pickOne(rng, ['triangle', 'square', 'rect'] as const);
  if (kind === 'triangle') {
    const a = randomInt(rng, 3, 12);
    const b = randomInt(rng, 3, 12);
    const c = randomInt(rng, Math.max(3, Math.abs(a - b) + 1), a + b - 1);
    const perimeter = a + b + c;
    const params: M19GeneratorParams = {
      subtype: 'all_sides_given',
      features: ['triangle'],
      sides: [a, b, c],
      perimeter,
      seed,
    };
    return finish(
      1,
      params,
      `Стороны треугольника равны ${a} см, ${b} см и ${c} см. Найди периметр (в см).`,
      `P = ${a} + ${b} + ${c} = ${perimeter}.`,
      [a + b, a * b, perimeter + 2, Math.abs(a + b - c), a + b + c + a],
      rng,
    );
  }
  if (kind === 'square') {
    const a = randomInt(rng, 3, 12);
    const perimeter = 4 * a;
    const params: M19GeneratorParams = {
      subtype: 'all_sides_given',
      features: ['square'],
      sides: [a, a, a, a],
      perimeter,
      seed,
    };
    return finish(
      1,
      params,
      `У квадрата каждая сторона равна ${a} см. Стороны: ${a} см, ${a} см, ${a} см, ${a} см. Найди периметр (в см).`,
      `P = ${a} + ${a} + ${a} + ${a} = ${perimeter}.`,
      [a * a, 2 * a, 3 * a, perimeter + a, a + a],
      rng,
    );
  }
  const a = randomInt(rng, 4, 14);
  const b = randomInt(rng, 3, 12);
  const perimeter = 2 * (a + b);
  const params: M19GeneratorParams = {
    subtype: 'all_sides_given',
    features: ['rectangle'],
    sides: [a, b, a, b],
    perimeter,
    seed,
  };
  return finish(
    1,
    params,
    `У прямоугольника стороны ${a} см, ${b} см, ${a} см и ${b} см. Найди периметр (в см).`,
    `P = ${a} + ${b} + ${a} + ${b} = ${perimeter}.`,
    [a * b, a + b, 2 * a, 2 * b, perimeter / 2],
    rng,
  );
}

function buildL2(rng: SeededRng, seed: number): Task {
  if (pickOne(rng, [true, false])) {
    const a = randomInt(rng, 5, 15);
    const b = randomInt(rng, 3, 12);
    const perimeter = (a + b) * 2;
    const params: M19GeneratorParams = {
      subtype: 'rect_formula',
      features: ['rectangle', 'formula_2ab'],
      sides: [a, b],
      perimeter,
      seed,
    };
    return finish(
      2,
      params,
      `Длины сторон прямоугольника ${a} см и ${b} см. Найди периметр (в см).`,
      `P = (${a} + ${b}) × 2 = ${perimeter}.`,
      [a * b, a + b, 2 * a + b, a + 2 * b, (a + b) * 2 + 2],
      rng,
    );
  }
  const a = randomInt(rng, 4, 14);
  const perimeter = 4 * a;
  const params: M19GeneratorParams = {
    subtype: 'rect_formula',
    features: ['square', 'formula_2ab'],
    sides: [a],
    perimeter,
    seed,
  };
  return finish(
    2,
    params,
    `Сторона квадрата равна ${a} см. Найди периметр (в см).`,
    `P = ${a} × 4 = ${perimeter}.`,
    [a * a, 2 * a, 3 * a, a * a + a],
    rng,
  );
}

function buildL3(rng: SeededRng, seed: number): Task {
  // L-shape outer perimeter from bounding W×H with cut w×h at corner:
  // P = 2*(W+H)
  const W = randomInt(rng, 5, 10);
  const H = randomInt(rng, 4, 9);
  const w = randomInt(rng, 1, W - 2);
  const h = randomInt(rng, 1, H - 2);
  const perimeter = 2 * (W + H);
  const params: M19GeneratorParams = {
    subtype: 'composite_perimeter',
    features: ['composite'],
    sides: [W, H, w, h],
    perimeter,
    seed,
  };
  const question =
    `Составная фигура: прямоугольник ${W} см × ${H} см, из угла которого «вырезан» прямоугольник ${w} см × ${h} см ` +
    `(вырез у края, внешний контур — буква «Г»). Найди периметр внешнего контура (в см).`;
  return finish(
    3,
    params,
    question,
    `Для такой Г-фигуры периметр внешнего контура равен периметру большого прямоугольника: 2×(${W}+${H}) = ${perimeter}.`,
    [2 * (W + H) + 2 * (w + h), W * H - w * h, 2 * (W + H) - 2 * (w + h), W + H + w + h],
    rng,
  );
}

export function generateM19Task(options: M19GenerateOptions): Task {
  rejectAdvancedLevels('M19', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if (subtype === 'all_sides_given') return buildL1(rng, options.seed);
      if (subtype === 'rect_formula') return buildL2(rng, options.seed);
      return buildL3(rng, options.seed);
    } catch {
      // retry
    }
  }
  throw new Error(`M19: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM19Series(options: M19SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed }) => generateM19Task({ difficulty, seed }),
    (task) => perimeterFingerprint(task.generatorParams as M19GeneratorParams),
    'M19',
  );
}
