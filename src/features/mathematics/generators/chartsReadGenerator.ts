/**
 * Генератор M24: чтение диаграммы (SVG, без утечки значений).
 * Контракт: M24_GENERATOR_SPEC.md (P0 CRITICAL fix).
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
  svgToDataUri,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';
import { svgBarChart } from './visualSvg';

export const M24_SKILL_ID = 'math.data.charts.read' as const;
export const M24_TOPIC_ID = 'math.data.charts' as const;
export const M24_GENERATOR_ID = 'gen.math.data.charts.read' as const;

export type ChartsReadSubtype = 'read_bar' | 'who_more' | 'scale_step' | 'between_marks';

export type M24GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: ChartsReadSubtype;
};

export type M24SeriesOptions = { seed: number; countPerLevel?: number };

export type ChartBar = { name: string; value: number; divisions: number };

export type M24GeneratorParams = {
  bars: ChartBar[];
  scaleStep: number;
  maxScale: number;
  subtype: ChartsReadSubtype;
  answer: number | string;
  seed: number;
  hasVisual: true;
  /** Для совместимости fingerprint; не содержит значений столбцов. */
  chartText: string;
};

const NAMES = ['Аня', 'Боря', 'Катя', 'Дима', 'Ева'];
const TITLE = 'Книги';

export function chartLeaksValues(question: string, image: string | undefined, bars: ChartBar[]): boolean {
  const blob = `${question}\n${image ?? ''}`;
  for (const bar of bars) {
    // значение не должно быть подписано у столбца / в вопросе как готовый ответ
    if (blob.includes(`значение ${bar.value}`) || blob.includes(`→ ${bar.value}`) || blob.includes(`(${bar.value})`)) {
      return true;
    }
  }
  return false;
}

export function isValidM24Level(
  difficulty: Level,
  subtype: ChartsReadSubtype,
  bars: ChartBar[],
  scaleStep: number,
): boolean {
  if (bars.length < 2 || scaleStep < 1) return false;
  const onMark = bars.every((b) => b.value % scaleStep === 0);
  if (difficulty === 1) {
    return (subtype === 'read_bar' || subtype === 'who_more') && onMark && scaleStep <= 5;
  }
  if (difficulty === 2) {
    return (subtype === 'read_bar' || subtype === 'scale_step') && onMark && bars.length >= 3;
  }
  return subtype === 'between_marks' && bars.some((b) => b.value % scaleStep !== 0);
}

function resolveSubtype(difficulty: Level, requested: ChartsReadSubtype | undefined, rng: SeededRng): ChartsReadSubtype {
  if (difficulty === 1) {
    if (requested === 'read_bar' || requested === 'who_more') return requested;
    return pickOne(rng, ['read_bar', 'who_more']);
  }
  if (difficulty === 2) {
    if (requested === 'read_bar' || requested === 'scale_step') return requested;
    return pickOne(rng, ['read_bar', 'scale_step']);
  }
  return 'between_marks';
}

function makeOnMarkBars(rng: SeededRng, count: number, scaleStep: number, maxDiv: number): ChartBar[] {
  const used = new Set<number>();
  const bars: ChartBar[] = [];
  for (let i = 0; i < count; i += 1) {
    let divisions = randomInt(rng, 1, maxDiv);
    let guard = 0;
    while (used.has(divisions) && guard < 30) {
      divisions = randomInt(rng, 1, maxDiv);
      guard += 1;
    }
    used.add(divisions);
    bars.push({ name: NAMES[i]!, divisions, value: divisions * scaleStep });
  }
  return bars;
}

function makeBetweenBars(rng: SeededRng, count: number, majorStep: number): ChartBar[] {
  const bars: ChartBar[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    const major = randomInt(rng, 1, 4) * majorStep;
    const value = major - majorStep / 2; // середина между (major-step) и major
    if (used.has(value)) {
      i -= 1;
      continue;
    }
    used.add(value);
    bars.push({
      name: NAMES[i]!,
      value,
      divisions: value / (majorStep / 2),
    });
  }
  return bars;
}

/** Экспорт для M25: текст без значений. */
export function formatChartMeta(title: string, names: string[], scaleStep: number): string {
  return `Диаграмма «${title}»; шкала шаг ${scaleStep}; категории: ${names.join(', ')}`;
}

export function generateM24Task(options: M24GenerateOptions): Task {
  rejectAdvancedLevels('M24', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    let bars: ChartBar[];
    let scaleStep: number;
    let maxScale: number;
    let question: string;
    let answer: number | string;
    let models: Array<number | string> = [];

    if (difficulty === 3) {
      scaleStep = pickOne(rng, [10, 20]);
      bars = makeBetweenBars(rng, 3, scaleStep);
      maxScale = Math.max(...bars.map((b) => Math.ceil(b.value / scaleStep) * scaleStep + scaleStep));
      const target = pickOne(rng, bars);
      answer = target.value;
      question = `Сколько показывает столбец «${target.name}»?`;
      const low = Math.floor(target.value / scaleStep) * scaleStep;
      const high = low + scaleStep;
      models = [low, high, low + scaleStep / 2 + scaleStep, bars.find((b) => b.name !== target.name)?.value ?? low];
    } else {
      scaleStep = difficulty === 1 ? pickOne(rng, [1, 2, 5]) : pickOne(rng, [2, 5, 10]);
      const count = difficulty === 1 ? 2 : randomInt(rng, 3, 4);
      bars = makeOnMarkBars(rng, count, scaleStep, difficulty === 1 ? 6 : 8);
      maxScale = Math.max(...bars.map((b) => b.value));
      if (maxScale % scaleStep !== 0) maxScale += scaleStep;

      if (subtype === 'who_more') {
        const best = bars.reduce((a, b) => (b.value > a.value ? b : a));
        answer = best.name;
        question = 'У кого значение столбца больше?';
        models = bars.filter((b) => b.name !== best.name).map((b) => b.name);
        models.push('все равны');
      } else if (subtype === 'scale_step') {
        answer = scaleStep;
        question = 'Чему равна цена одного деления шкалы?';
        models = [scaleStep * 2, scaleStep + 1, 1, 5, 10].filter((x) => x !== scaleStep);
      } else {
        const target = pickOne(rng, bars);
        answer = target.value;
        question = `Сколько показывает столбец «${target.name}»?`;
        const other = bars.find((b) => b.name !== target.name)?.value;
        models = [target.divisions, target.value + scaleStep, target.value - scaleStep];
        if (other !== undefined) models.push(other);
      }
    }

    if (!isValidM24Level(difficulty, subtype, bars, scaleStep)) continue;

    const image = svgToDataUri(
      svgBarChart(
        TITLE,
        bars.map((b) => ({ name: b.name, value: b.value })),
        scaleStep,
        maxScale,
      ),
    );
    const chartText = formatChartMeta(TITLE, bars.map((b) => b.name), scaleStep);
    if (chartLeaksValues(question, image, bars)) continue;
    // Также: число ответа не должно быть единственной подписью в вопросе как «равно N»
    if (typeof answer === 'number' && question.includes(String(answer))) continue;

    const params: M24GeneratorParams = {
      bars,
      scaleStep,
      maxScale,
      subtype,
      answer,
      seed: options.seed,
      hasVisual: true,
      chartText,
    };

    if (difficulty === 3) {
      return baseTask({
        id: `generated-m24-3-${subtype}-${bars.map((b) => b.value).join('-')}`,
        section: 'Таблицы и диаграммы',
        topic: 'Диаграммы',
        skill: 'Чтение диаграммы',
        topicId: M24_TOPIC_ID,
        skillId: M24_SKILL_ID,
        difficulty: 3,
        taskType: 'imageTask',
        question,
        correctAnswer: Number(answer),
        explanation: `По шкале столбец находится между делениями; значение ${answer}.`,
        generatorId: M24_GENERATOR_ID,
        generatorParams: params,
        image,
        hint2: 'Найди деления шкалы и оцени высоту столбца.',
      });
    }

    const distractors = uniqueDistractorsFromModels(answer, models, rng, 3);
    if (distractors.length !== 3) continue;
    return baseTask({
      id: `generated-m24-${difficulty}-${subtype}-${String(answer)}-${bars.length}`,
      section: 'Таблицы и диаграммы',
      topic: 'Диаграммы',
      skill: 'Чтение диаграммы',
      topicId: M24_TOPIC_ID,
      skillId: M24_SKILL_ID,
      difficulty,
      taskType: 'imageTask',
      question,
      correctAnswer: String(answer),
      answers: buildChoiceAnswers(answer, distractors, rng),
      explanation: `По диаграмме ответ: ${answer}.`,
      generatorId: M24_GENERATOR_ID,
      generatorParams: params,
      image,
      hint2: 'Считай по шкале слева, не по числу делений «на глаз» без цены деления.',
    });
  }
  throw new Error(`M24: не удалось сгенерировать L${difficulty}`);
}

export function generateM24Series(options: M24SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed }) => generateM24Task({ difficulty, seed }),
    (task) => {
      const p = task.generatorParams as M24GeneratorParams;
      return `${p.subtype}|${p.scaleStep}|${p.bars.map((b) => `${b.name}:${b.value}`).join(',')}`;
    },
    'M24',
  );
}
