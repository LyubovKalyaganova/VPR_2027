/**
 * Генератор M18: чтение сетки (SVG).
 * Контракт: M18_GENERATOR_SPEC.md (P0: без echo «12 клеток → 12»).
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  randomInt,
  rejectAdvancedLevels,
  svgToDataUri,
  uniqueDistractorsFromModels,
  type Level,
} from './generatorScaffold';
import { svgGridLShape, svgGridRectangle, svgGridSegment } from './visualSvg';

export const M18_SKILL_ID = 'math.geometry.grid.read' as const;
export const M18_TOPIC_ID = 'math.geometry.grid' as const;
export const M18_GENERATOR_ID = 'gen.math.geometry.grid' as const;

export type GridSubtype = 'horizontal_segment' | 'rectangle_cells' | 'composite_cells';
export type GridFeature = 'length_in_cells' | 'scale_1cm' | 'count_cells' | 'composite' | 'has_svg';

export type M18GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: GridSubtype };
export type M18SeriesOptions = { seed: number; countPerLevel?: number };

export type M18GeneratorParams = {
  subtype: GridSubtype;
  features: GridFeature[];
  width: number;
  height: number;
  cutW?: number;
  cutH?: number;
  cellCount: number;
  answer: number;
  seed: number;
  hasVisual: true;
};

export function isValidM18Level(
  params: Pick<M18GeneratorParams, 'subtype' | 'width' | 'height' | 'cellCount' | 'features' | 'answer'>,
  difficulty: Level,
): boolean {
  if (!params.features.includes('has_svg')) return false;
  if (difficulty === 1) {
    return params.subtype === 'horizontal_segment' && params.answer === params.width && params.width >= 3;
  }
  if (difficulty === 2) {
    return (
      params.subtype === 'rectangle_cells' &&
      params.width >= 2 &&
      params.height >= 2 &&
      params.cellCount === params.width * params.height &&
      params.answer === params.cellCount
    );
  }
  return params.subtype === 'composite_cells' && params.features.includes('composite') && params.answer === params.cellCount;
}

/** Запрет echo: в вопросе не должно быть числа-ответа. */
export function questionLeaksAnswer(question: string, answer: number): boolean {
  return new RegExp(`(^|\\D)${answer}(\\D|$)`).test(question);
}

export function gridFingerprint(params: M18GeneratorParams): string {
  return [params.subtype, params.width, params.height, params.cutW, params.cutH, params.answer].join('|');
}

export function generateM18Task(options: M18GenerateOptions): Task {
  rejectAdvancedLevels('M18', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (difficulty === 1) {
      const width = randomInt(rng, 3, 12);
      const vertical = rng() < 0.35;
      const answer = width;
      const question = vertical
        ? 'Сколько клеток составляет длина отмеченного отрезка?'
        : 'Сколько клеток составляет длина отмеченного отрезка?';
      if (questionLeaksAnswer(question, answer)) continue;
      const params: M18GeneratorParams = {
        subtype: 'horizontal_segment',
        features: ['length_in_cells', 'has_svg'],
        width,
        height: 0,
        cellCount: width,
        answer,
        seed: options.seed,
        hasVisual: true,
      };
      if (!isValidM18Level(params, 1)) continue;
      const distractors = uniqueDistractorsFromModels(answer, [answer - 1, answer + 1, answer * 2, answer - 2, width + 2], rng, 3);
      if (distractors.length !== 3) continue;
      return baseTask({
        id: `generated-m18-1-seg-${width}-${vertical ? 'v' : 'h'}`,
        section: 'Геометрия',
        topic: 'Фигуры на клетчатой бумаге',
        skill: 'Длина отрезка по клеткам',
        topicId: M18_TOPIC_ID,
        skillId: M18_SKILL_ID,
        difficulty: 1,
        taskType: 'imageTask',
        question,
        correctAnswer: String(answer),
        answers: buildChoiceAnswers(answer, distractors, rng),
        explanation: `Отрезок покрывает ${answer} клеток.`,
        generatorId: M18_GENERATOR_ID,
        generatorParams: params,
        image: svgToDataUri(svgGridSegment(width, vertical)),
      });
    }

    if (difficulty === 2) {
      const width = randomInt(rng, 3, 8);
      const height = randomInt(rng, 2, 6);
      const answer = width * height;
      const question = 'Сколько клеток занимает закрашенный прямоугольник?';
      if (questionLeaksAnswer(question, answer)) continue;
      const params: M18GeneratorParams = {
        subtype: 'rectangle_cells',
        features: ['count_cells', 'has_svg'],
        width,
        height,
        cellCount: answer,
        answer,
        seed: options.seed,
        hasVisual: true,
      };
      if (!isValidM18Level(params, 2)) continue;
      const distractors = uniqueDistractorsFromModels(
        answer,
        [width + height, 2 * (width + height), width * height - 1, width * (height - 1), (width - 1) * height],
        rng,
        3,
      );
      if (distractors.length !== 3) continue;
      return baseTask({
        id: `generated-m18-2-rect-${width}x${height}`,
        section: 'Геометрия',
        topic: 'Фигуры на клетчатой бумаге',
        skill: 'Прямоугольник на сетке',
        topicId: M18_TOPIC_ID,
        skillId: M18_SKILL_ID,
        difficulty: 2,
        taskType: 'imageTask',
        question,
        correctAnswer: String(answer),
        answers: buildChoiceAnswers(answer, distractors, rng),
        explanation: `${width} × ${height} = ${answer} клеток.`,
        generatorId: M18_GENERATOR_ID,
        generatorParams: params,
        image: svgToDataUri(svgGridRectangle(width, height, 'fill')),
      });
    }

    const bigW = randomInt(rng, 4, 7);
    const bigH = randomInt(rng, 4, 7);
    const cutW = randomInt(rng, 1, Math.min(3, bigW - 1));
    const cutH = randomInt(rng, 1, Math.min(3, bigH - 1));
    const answer = bigW * bigH - cutW * cutH;
    const question = 'Сколько закрашенных клеток у фигуры на рисунке?';
    if (questionLeaksAnswer(question, answer)) continue;
    const params: M18GeneratorParams = {
      subtype: 'composite_cells',
      features: ['count_cells', 'composite', 'has_svg'],
      width: bigW,
      height: bigH,
      cutW,
      cutH,
      cellCount: answer,
      answer,
      seed: options.seed,
      hasVisual: true,
    };
    if (!isValidM18Level(params, 3)) continue;
    return baseTask({
      id: `generated-m18-3-L-${bigW}x${bigH}-${cutW}x${cutH}`,
      section: 'Геометрия',
      topic: 'Фигуры на клетчатой бумаге',
      skill: 'Составной контур',
      topicId: M18_TOPIC_ID,
      skillId: M18_SKILL_ID,
      difficulty: 3,
      taskType: 'imageTask',
      question,
      correctAnswer: answer,
      explanation: `Большой прямоугольник ${bigW}×${bigH} минус вырез ${cutW}×${cutH}: ${answer}.`,
      generatorId: M18_GENERATOR_ID,
      generatorParams: params,
      image: svgToDataUri(svgGridLShape(bigW, bigH, cutW, cutH)),
    });
  }
  throw new Error(`M18: не удалось сгенерировать L${difficulty}`);
}

export function generateM18Series(options: M18SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed }) => generateM18Task({ difficulty, seed }),
    (task) => gridFingerprint(task.generatorParams as M18GeneratorParams),
    'M18',
  );
}
