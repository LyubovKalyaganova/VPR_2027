/**
 * Генератор M21: симметрия (SVG).
 * Контракт: M21_GENERATOR_SPEC.md
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  svgToDataUri,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';
import { svgSymmetry, type SymmetryKind } from './visualSvg';

export const M21_SKILL_ID = 'math.geometry.symmetry.identify' as const;
export const M21_TOPIC_ID = 'math.geometry.symmetry' as const;
export const M21_GENERATOR_ID = 'gen.math.geometry.symmetry' as const;

export type SymmetrySubtype = 'vertical_axis' | 'choose_symmetric' | 'horizontal_or_near';
export type SymmetryFeature = 'vertical' | 'horizontal' | 'has_axis' | 'no_axis' | 'near_miss' | 'has_svg';

export type M21GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: SymmetrySubtype; seriesIndex?: number };
export type M21SeriesOptions = { seed: number; countPerLevel?: number };

export type M21GeneratorParams = {
  subtype: SymmetrySubtype;
  features: SymmetryFeature[];
  figureKey: string;
  correctLabel: string;
  promptKey: string;
  seed: number;
  hasVisual: true;
  yesNo?: 'yes' | 'no';
};

type Case = {
  kind: SymmetryKind;
  axis: 'none' | 'vertical' | 'horizontal' | 'diagonal';
  correct: string;
  wrong: string[];
  features: SymmetryFeature[];
  question: string;
  promptKey: string;
  yesNo?: 'yes' | 'no';
};

function casesFor(difficulty: Level, rng: SeededRng, indexHint = 0): Case {
  if (difficulty === 1) {
    // Баланс YES/NO: чередуем по indexHint + rng
    const wantYes = (indexHint + Math.floor(rng() * 2)) % 2 === 0;
    if (wantYes) {
      const kind = pickOne(rng, ['butterfly', 'isos_triangle', 'rectangle'] as SymmetryKind[]);
      const prompt = pickOne(rng, [
        { key: 'vert_q', q: 'Есть ли у фигуры на рисунке вертикальная ось симметрии?' },
        { key: 'vert_has', q: 'Можно ли провести вертикальную ось симметрии у фигуры на рисунке?' },
        { key: 'vert_line', q: 'Подходит ли вертикальная линия как ось симметрии фигуры на рисунке?' },
        { key: 'vert_yesno', q: 'Верно ли, что у фигуры на рисунке есть вертикальная ось симметрии?' },
      ]);
      return {
        kind,
        axis: 'none',
        correct: 'да',
        wrong: ['нет', 'только горизонтальная', 'осей бесконечно много'],
        features: ['vertical', 'has_axis', 'has_svg'],
        question: prompt.q,
        promptKey: prompt.key,
        yesNo: 'yes',
      };
    }
    const kind = pickOne(rng, ['arrow_right', 'scalene'] as SymmetryKind[]);
    const prompt = pickOne(rng, [
      { key: 'vert_q_no', q: 'Есть ли у фигуры на рисунке вертикальная ось симметрии?' },
      { key: 'vert_has_no', q: 'Можно ли провести вертикальную ось симметрии у фигуры на рисунке?' },
      { key: 'vert_line_no', q: 'Подходит ли вертикальная линия как ось симметрии фигуры на рисунке?' },
      { key: 'vert_yesno_no', q: 'Верно ли, что у фигуры на рисунке есть вертикальная ось симметрии?' },
    ]);
    return {
      kind,
      axis: 'none',
      correct: 'нет',
      wrong: ['да', 'только горизонтальная', 'осей бесконечно много'],
      features: ['no_axis', 'has_svg'],
      question: prompt.q,
      promptKey: prompt.key,
      yesNo: 'no',
    };
  }

  if (difficulty === 2) {
    const mode = pickOne(rng, ['yes', 'no', 'which_axis'] as const);
    if (mode === 'which_axis') {
      const kind = pickOne(rng, ['butterfly', 'isos_triangle', 'rectangle'] as SymmetryKind[]);
      return {
        kind,
        axis: 'none',
        correct: 'вертикальная',
        wrong: ['горизонтальная', 'оси нет', 'диагональная'],
        features: ['vertical', 'has_axis', 'has_svg'],
        question: pickOne(rng, [
          'Какая ось симметрии подходит к фигуре на рисунке?',
          'Какая линия может быть осью симметрии фигуры на рисунке?',
        ]),
        promptKey: 'which_v',
        yesNo: 'yes',
      };
    }
    if (mode === 'yes') {
      const kind = pickOne(rng, ['butterfly', 'isos_triangle', 'circle', 'rectangle'] as SymmetryKind[]);
      const prompt = pickOne(rng, [
        { key: 'has_axis', q: 'Верно ли, что фигура на рисунке имеет ось симметрии?' },
        { key: 'sym', q: 'Является ли фигура на рисунке симметричной?' },
        { key: 'axis_any', q: 'Есть ли у фигуры на рисунке хотя бы одна ось симметрии?' },
      ]);
      return {
        kind,
        axis: 'none',
        correct: 'да',
        wrong: ['нет', 'осей нет', 'только одна сторона равна'],
        features: ['has_axis', 'has_svg'],
        question: prompt.q,
        promptKey: prompt.key,
        yesNo: 'yes',
      };
    }
    const kind = pickOne(rng, ['arrow_right', 'scalene'] as SymmetryKind[]);
    const prompt = pickOne(rng, [
      { key: 'has_axis_no', q: 'Верно ли, что фигура на рисунке имеет ось симметрии?' },
      { key: 'sym_no', q: 'Является ли фигура на рисунке симметричной?' },
      { key: 'axis_any_no', q: 'Есть ли у фигуры на рисунке хотя бы одна ось симметрии?' },
    ]);
    return {
      kind,
      axis: 'none',
      correct: 'нет',
      wrong: ['да', 'есть вертикальная ось', 'осей бесконечно много'],
      features: ['no_axis', 'has_svg'],
      question: prompt.q,
      promptKey: prompt.key,
      yesNo: 'no',
    };
  }

  const mode = pickOne(rng, ['horizontal', 'near', 'many_axes', 'count_rect'] as const);
  if (mode === 'horizontal') {
    return {
      kind: 'letter_e',
      axis: 'none',
      correct: 'горизонтальная',
      wrong: ['вертикальная', 'оси нет', 'диагональная'],
      features: ['horizontal', 'has_axis', 'has_svg'],
      question: pickOne(rng, [
        'Какая ось симметрии есть у фигуры на рисунке?',
        'Какая линия может быть осью симметрии фигуры?',
        'Какую ось симметрии можно провести у фигуры на рисунке?',
      ]),
      promptKey: pickOne(rng, ['horiz', 'horiz2', 'horiz3']),
    };
  }
  if (mode === 'many_axes') {
    return {
      kind: 'circle',
      axis: 'none',
      correct: 'бесконечно много',
      wrong: ['одна', 'две', 'ни одной'],
      features: ['has_axis', 'has_svg'],
      question: pickOne(rng, [
        'Сколько осей симметрии у фигуры на рисунке?',
        'Сколько осей симметрии можно провести у фигуры?',
        'Какое число осей симметрии у фигуры на рисунке?',
      ]),
      promptKey: pickOne(rng, ['many', 'many2', 'many3']),
    };
  }
  if (mode === 'count_rect') {
    return {
      kind: 'rectangle',
      axis: 'none',
      correct: 'две',
      wrong: ['одна', 'ни одной', 'бесконечно много'],
      features: ['has_axis', 'has_svg'],
      question: pickOne(rng, [
        'Сколько осей симметрии у фигуры на рисунке?',
        'Сколько осей симметрии можно провести у фигуры?',
      ]),
      promptKey: pickOne(rng, ['count_r', 'count_r2']),
    };
  }
  return {
    kind: 'scalene',
    axis: 'none',
    correct: 'нет',
    wrong: ['да', 'вертикальная', 'горизонтальная'],
    features: ['no_axis', 'near_miss', 'has_svg'],
    question: pickOne(rng, [
      'Есть ли ось симметрии у фигуры на рисунке?',
      'Можно ли провести ось симметрии у фигуры на рисунке?',
      'Верно ли, что у фигуры на рисунке есть ось симметрии?',
    ]),
    promptKey: pickOne(rng, ['near', 'near2', 'near3']),
    yesNo: 'no',
  };
}

export function isValidM21Level(params: Pick<M21GeneratorParams, 'subtype' | 'features'>, difficulty: Level): boolean {
  if (!params.features.includes('has_svg')) return false;
  if (difficulty === 1) {
    return (
      params.subtype === 'vertical_axis' &&
      (params.features.includes('vertical') || params.features.includes('no_axis'))
    );
  }
  if (difficulty === 2) return params.subtype === 'choose_symmetric';
  return params.subtype === 'horizontal_or_near';
}

export function generateM21Task(options: M21GenerateOptions): Task {
  rejectAdvancedLevels('M21', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype: SymmetrySubtype =
    difficulty === 1 ? 'vertical_axis' : difficulty === 2 ? 'choose_symmetric' : 'horizontal_or_near';

  for (let i = 0; i < 80; i += 1) {
    const c = casesFor(difficulty, rng, (options.seriesIndex ?? 0) + i);
    const drawKind = c.kind;

    const params: M21GeneratorParams = {
      subtype,
      features: c.features,
      figureKey: drawKind,
      correctLabel: c.correct,
      promptKey: c.promptKey,
      seed: options.seed,
      hasVisual: true,
      yesNo: c.yesNo,
    };
    if (!isValidM21Level(params, difficulty)) continue;
    const distractors = uniqueDistractorsFromModels(c.correct, c.wrong, rng, 3);
    if (distractors.length !== 3) continue;

    return baseTask({
      id: `generated-m21-${difficulty}-${drawKind}-${c.promptKey}-${c.correct}-${options.seed}`,
      section: 'Геометрия',
      topic: 'Симметрия',
      skill: 'Распознавание симметрии',
      topicId: M21_TOPIC_ID,
      skillId: M21_SKILL_ID,
      difficulty,
      taskType: 'imageTask',
      question: c.question,
      correctAnswer: c.correct,
      answers: buildChoiceAnswers(c.correct, distractors, rng),
      explanation: `По рисунку: ${c.correct}.`,
      generatorId: M21_GENERATOR_ID,
      generatorParams: params,
      image: svgToDataUri(svgSymmetry(drawKind, c.axis)),
    });
  }
  throw new Error(`M21: не удалось сгенерировать L${difficulty}`);
}

export function generateM21Series(options: M21SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => generateM21Task({ difficulty, seed, seriesIndex: index }),
    (task) => {
      const p = task.generatorParams as M21GeneratorParams;
      return `${p.subtype}|${p.figureKey}|${p.correctLabel}|${p.promptKey}|${p.seed}`;
    },
    'M21',
  );
}
