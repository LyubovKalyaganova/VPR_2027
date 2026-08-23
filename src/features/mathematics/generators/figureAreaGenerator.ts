/**
 * Генератор M20: площадь фигуры.
 * Контракт: M20_GENERATOR_SPEC.md
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

export const M20_SKILL_ID = 'math.geometry.figure_area.calculate' as const;
export const M20_TOPIC_ID = 'math.geometry.figure_area' as const;
export const M20_GENERATOR_ID = 'gen.math.geometry.figure_area' as const;

export type AreaSubtype = 'rect_or_square' | 'typical_area' | 'composite_or_cells';
export type AreaFeature = 'rectangle' | 'square' | 'cells' | 'composite_sum' | 'composite_diff';

export type M20GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: AreaSubtype;
};

export type M20SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M20GeneratorParams = {
  subtype: AreaSubtype;
  features: AreaFeature[];
  dims: number[];
  area: number;
  seed: number;
};

const SUBTYPE_TITLES: Record<AreaSubtype, string> = {
  rect_or_square: 'Площадь прямоугольника или квадрата',
  typical_area: 'Типовой расчёт площади',
  composite_or_cells: 'Составная фигура или клетки',
};

function allowed(difficulty: Level): AreaSubtype[] {
  if (difficulty === 1) return ['rect_or_square'];
  if (difficulty === 2) return ['typical_area'];
  return ['composite_or_cells'];
}

export function isValidM20Level(
  params: Pick<M20GeneratorParams, 'subtype' | 'dims' | 'area' | 'features'>,
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    if (params.subtype !== 'rect_or_square') return false;
    if (params.features.includes('square') && params.dims.length === 1) {
      return params.area === params.dims[0]! * params.dims[0]!;
    }
    if (params.dims.length === 2) {
      return params.area === params.dims[0]! * params.dims[1]!;
    }
    return false;
  }
  if (difficulty === 2) {
    if (params.subtype !== 'typical_area') return false;
    if (params.features.includes('square') && params.dims.length === 1) {
      return params.area === params.dims[0]! * params.dims[0]!;
    }
    return params.dims.length === 2 && params.area === params.dims[0]! * params.dims[1]!;
  }
  return (
    params.subtype === 'composite_or_cells' &&
    (params.features.includes('cells') ||
      params.features.includes('composite_sum') ||
      params.features.includes('composite_diff')) &&
    params.area > 0
  );
}

export function areaFingerprint(params: M20GeneratorParams): string {
  return [params.subtype, params.dims.join(','), params.area, params.features.join(',')].join('|');
}

function resolveSubtype(difficulty: Level, requested: AreaSubtype | undefined, rng: SeededRng): AreaSubtype {
  const list = allowed(difficulty);
  if (requested && list.includes(requested)) return requested;
  return pickOne(rng, list);
}

function finish(
  difficulty: Level,
  params: M20GeneratorParams,
  question: string,
  explanation: string,
  models: number[],
  rng: SeededRng,
): Task {
  if (!isValidM20Level(params, difficulty)) throw new Error(`M20 L${difficulty} invalid`);
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  let answers: string[] | undefined;
  let correctAnswer: string | number = params.area;
  if (taskType === 'singleChoice') {
    const distractors = uniqueDistractorsFromModels(params.area, models, rng);
    if (distractors.length < 3) throw new Error('M20: мало дистракторов');
    answers = buildChoiceAnswers(params.area, distractors.slice(0, 3), rng);
    correctAnswer = String(params.area);
  }
  return baseTask({
    id: `generated-m20-${difficulty}-${params.subtype}-${params.dims.join('x')}-${params.area}`,
    section: 'Геометрия',
    topic: 'Площадь фигур',
    skill: SUBTYPE_TITLES[params.subtype],
    topicId: M20_TOPIC_ID,
    skillId: M20_SKILL_ID,
    difficulty,
    taskType,
    question,
    correctAnswer,
    answers,
    explanation,
    generatorId: M20_GENERATOR_ID,
    generatorParams: params,
    hint1: 'Площадь прямоугольника — произведение сторон.',
    hint2: 'Не считай периметр вместо площади.',
    hint3: `Ответ: ${params.area}.`,
  });
}

function buildL1(rng: SeededRng, seed: number): Task {
  if (pickOne(rng, [true, false])) {
    const a = randomInt(rng, 3, 9);
    const b = randomInt(rng, 2, 8);
    const area = a * b;
    const params: M20GeneratorParams = {
      subtype: 'rect_or_square',
      features: ['rectangle'],
      dims: [a, b],
      area,
      seed,
    };
    return finish(
      1,
      params,
      `Прямоугольник со сторонами ${a} см и ${b} см. Найди площадь (в см²).`,
      `S = ${a} × ${b} = ${area}.`,
      [a + b, 2 * (a + b), a * b + a, Math.abs(a - b) * Math.max(a, b)],
      rng,
    );
  }
  const a = randomInt(rng, 3, 10);
  const area = a * a;
  const params: M20GeneratorParams = {
    subtype: 'rect_or_square',
    features: ['square'],
    dims: [a],
    area,
    seed,
  };
  return finish(
    1,
    params,
    `Сторона квадрата ${a} см. Найди площадь (в см²).`,
    `S = ${a} × ${a} = ${area}.`,
    [4 * a, 2 * a, a * a + a, a + a],
    rng,
  );
}

function buildL2(rng: SeededRng, seed: number): Task {
  if (pickOne(rng, [true, true, false])) {
    const a = randomInt(rng, 6, 14);
    const b = randomInt(rng, 5, 12);
    const area = a * b;
    const params: M20GeneratorParams = {
      subtype: 'typical_area',
      features: ['rectangle'],
      dims: [a, b],
      area,
      seed,
    };
    return finish(
      2,
      params,
      `Найди площадь прямоугольника со сторонами ${a} см и ${b} см (в см²).`,
      `S = ${a} × ${b} = ${area}.`,
      [2 * (a + b), a + b, a * b - a, a * (b + 1)],
      rng,
    );
  }
  const a = randomInt(rng, 6, 12);
  const area = a * a;
  const params: M20GeneratorParams = {
    subtype: 'typical_area',
    features: ['square'],
    dims: [a],
    area,
    seed,
  };
  return finish(
    2,
    params,
    `Квадратная площадка со стороной ${a} м. Найди площадь (в м²).`,
    `S = ${a} × ${a} = ${area}.`,
    [4 * a, 2 * a, a * a - a, (a + 1) * (a + 1)],
    rng,
  );
}

function buildL3(rng: SeededRng, seed: number): Task {
  const mode = pickOne(rng, ['sum', 'diff', 'cells'] as const);
  if (mode === 'cells') {
    const w = randomInt(rng, 3, 8);
    const h = randomInt(rng, 2, 6);
    const area = w * h;
    const params: M20GeneratorParams = {
      subtype: 'composite_or_cells',
      features: ['cells'],
      dims: [w, h],
      area,
      seed,
    };
    return finish(
      3,
      params,
      `Фигура на клетчатой бумаге — прямоугольник ${w}×${h} клеток. Клетка равна 1 см. Найди площадь в см².`,
      `S = ${w} × ${h} = ${area} см².`,
      [2 * (w + h), w + h, w * h + w, (w - 1) * h],
      rng,
    );
  }
  if (mode === 'sum') {
    const a = randomInt(rng, 3, 8);
    const b = randomInt(rng, 2, 6);
    const c = randomInt(rng, 2, 7);
    const d = randomInt(rng, 2, 6);
    const area = a * b + c * d;
    const params: M20GeneratorParams = {
      subtype: 'composite_or_cells',
      features: ['composite_sum'],
      dims: [a, b, c, d],
      area,
      seed,
    };
    return finish(
      3,
      params,
      `Фигура составлена из двух прямоугольников ${a}×${b} см и ${c}×${d} см без наложений. Найди площадь (в см²).`,
      `S = ${a}×${b} + ${c}×${d} = ${area}.`,
      [a * b, c * d, (a + c) * (b + d), 2 * (a + b + c + d)],
      rng,
    );
  }
  const W = randomInt(rng, 6, 12);
  const H = randomInt(rng, 5, 10);
  const w = randomInt(rng, 2, W - 2);
  const h = randomInt(rng, 2, H - 2);
  const area = W * H - w * h;
  const params: M20GeneratorParams = {
    subtype: 'composite_or_cells',
    features: ['composite_diff'],
    dims: [W, H, w, h],
    area,
    seed,
  };
  return finish(
    3,
    params,
    `Из прямоугольника ${W}×${H} см вырезали прямоугольник ${w}×${h} см. Найди площадь оставшейся фигуры (в см²).`,
    `S = ${W}×${H} − ${w}×${h} = ${area}.`,
    [W * H, w * h, W * H + w * h, 2 * (W + H)],
    rng,
  );
}

export function generateM20Task(options: M20GenerateOptions): Task {
  rejectAdvancedLevels('M20', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if (subtype === 'rect_or_square') return buildL1(rng, options.seed);
      if (subtype === 'typical_area') return buildL2(rng, options.seed);
      return buildL3(rng, options.seed);
    } catch {
      // retry
    }
  }
  throw new Error(`M20: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM20Series(options: M20SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed }) => generateM20Task({ difficulty, seed }),
    (task) => areaFingerprint(task.generatorParams as M20GeneratorParams),
    'M20',
  );
}
