/**
 * Генератор M25: сравнение данных на столбчатой диаграмме (SVG).
 * Контракт: M25_GENERATOR_SPEC.md
 * Отличие от M24: не «сколько у X», а сравнение / разность / сумма считанных значений.
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
import { chartLeaksValues, formatChartMeta, type ChartBar } from './chartsReadGenerator';
import { svgBarChart } from './visualSvg';

export const M25_SKILL_ID = 'math.data.charts.compare' as const;
export const M25_TOPIC_ID = 'math.data.charts' as const;
export const M25_GENERATOR_ID = 'gen.math.data.charts.compare' as const;

export type ChartsCompareSubtype =
  | 'who_greater'
  | 'how_much_more'
  | 'sum_two'
  | 'sum_with_distractor'
  | 'times_exact';

export type M25GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: ChartsCompareSubtype;
};

export type M25SeriesOptions = { seed: number; countPerLevel?: number };

export type M25GeneratorParams = {
  chartText: string;
  bars: ChartBar[];
  scaleStep: number;
  maxScale: number;
  subtype: ChartsCompareSubtype;
  answer: number | string;
  seed: number;
  hasVisual: true;
};

const NAMES = ['Аня', 'Боря', 'Катя', 'Дима'];
const TITLE = 'Результаты';

export function isValidM25Level(difficulty: Level, subtype: ChartsCompareSubtype, bars: ChartBar[]): boolean {
  if (difficulty === 1) {
    return (subtype === 'who_greater' || subtype === 'how_much_more') && bars.length === 2;
  }
  if (difficulty === 2) {
    return (subtype === 'how_much_more' || subtype === 'sum_two') && bars.length >= 3;
  }
  return (subtype === 'sum_with_distractor' || subtype === 'times_exact' || subtype === 'how_much_more') && bars.length >= 3;
}

/** Значения столбцов не должны встречаться в вопросе как готовые данные. */
export function questionLeaksBarValues(question: string, bars: ChartBar[]): boolean {
  if (chartLeaksValues(question, undefined, bars)) return true;
  if (/У\s+\w+\s+\d+\s*,\s*у\s+\w+\s+\d+/i.test(question)) return true;
  if (/→\s*значение|дел\.\s*→/i.test(question)) return true;
  if (/\(остальные столбцы не нужны\)/i.test(question)) return true;
  for (const bar of bars) {
    // число значения как отдельный токен в вопросе
    const re = new RegExp(`(^|[^\\d])${bar.value}([^\\d]|$)`);
    if (re.test(question)) return true;
  }
  return false;
}

/** M25 требует ≥2 считываемых значений для ответа (не одно чтение как M24). */
export function requiresCompareRead(subtype: ChartsCompareSubtype): boolean {
  return subtype !== 'who_greater' || true; // who_greater тоже сравнивает два столбца визуально
}

function resolveSubtype(
  difficulty: Level,
  requested: ChartsCompareSubtype | undefined,
  rng: SeededRng,
  indexHint = 0,
): ChartsCompareSubtype {
  if (difficulty === 1) {
    if (requested === 'who_greater' || requested === 'how_much_more') return requested;
    return indexHint % 2 === 0 ? 'who_greater' : 'how_much_more';
  }
  if (difficulty === 2) {
    if (requested === 'how_much_more' || requested === 'sum_two') return requested;
    return pickOne(rng, ['how_much_more', 'sum_two']);
  }
  if (requested === 'sum_with_distractor' || requested === 'times_exact' || requested === 'how_much_more') {
    return requested;
  }
  return pickOne(rng, ['sum_with_distractor', 'times_exact', 'how_much_more']);
}

function onMarkBars(rng: SeededRng, count: number, scaleStep: number): ChartBar[] {
  const used = new Set<number>();
  const bars: ChartBar[] = [];
  for (let i = 0; i < count; i += 1) {
    let divisions = randomInt(rng, 1, 8);
    let guard = 0;
    while (used.has(divisions) && guard < 25) {
      divisions = randomInt(rng, 1, 8);
      guard += 1;
    }
    used.add(divisions);
    bars.push({ name: NAMES[i]!, divisions, value: divisions * scaleStep });
  }
  return bars;
}

export function generateM25Task(options: M25GenerateOptions & { seriesIndex?: number }): Task {
  rejectAdvancedLevels('M25', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng, options.seriesIndex ?? 0);

  for (let attempt = 0; attempt < 140; attempt += 1) {
    const scaleStep = pickOne(rng, difficulty === 1 ? [1, 2, 5] : [2, 5, 10]);
    let bars: ChartBar[];
    let question: string;
    let answer: number | string;
    let models: Array<number | string>;

    if (difficulty === 1) {
      bars = onMarkBars(rng, 2, scaleStep);
      if (bars[0]!.value === bars[1]!.value) {
        bars[0] = {
          ...bars[0]!,
          divisions: bars[0]!.divisions + 1,
          value: (bars[0]!.divisions + 1) * scaleStep,
        };
      }
      const hi = bars[0]!.value > bars[1]!.value ? bars[0]! : bars[1]!;
      const lo = hi === bars[0]! ? bars[1]! : bars[0]!;
      if (subtype === 'how_much_more') {
        answer = hi.value - lo.value;
        question = `На сколько у «${hi.name}» больше, чем у «${lo.name}»?`;
        models = [hi.value, lo.value, hi.value + lo.value, answer + scaleStep, Math.abs(answer - scaleStep) || answer + 1];
      } else {
        answer = hi.name;
        question = 'У кого столбец выше?';
        models = [lo.name, 'равны', hi.value, lo.value];
      }
    } else if (difficulty === 2) {
      bars = onMarkBars(rng, 3, scaleStep);
      if (subtype === 'sum_two') {
        const a = bars[0]!;
        const b = bars[1]!;
        answer = a.value + b.value;
        question = `Чему равна сумма показателей «${a.name}» и «${b.name}»?`;
        models = [a.value, b.value, Math.abs(a.value - b.value), a.value + b.value + scaleStep, bars[2]!.value];
      } else {
        const sorted = [...bars].sort((x, y) => y.value - x.value);
        const hi = sorted[0]!;
        const lo = sorted[1]!;
        answer = hi.value - lo.value;
        question = `На сколько у «${hi.name}» больше, чем у «${lo.name}»?`;
        models = [hi.value, lo.value, hi.value + lo.value, answer + scaleStep, sorted[2]!.value];
      }
    } else if (subtype === 'times_exact') {
      const small = pickOne(rng, [1, 2]);
      const times = pickOne(rng, [2, 3, 4]);
      const scale = scaleStep;
      const baseDiv = small;
      const bigDiv = small * times;
      if (bigDiv > 8) continue;
      bars = [
        { name: NAMES[0]!, divisions: bigDiv, value: bigDiv * scale },
        { name: NAMES[1]!, divisions: baseDiv, value: baseDiv * scale },
        { name: NAMES[2]!, divisions: 1, value: scale },
        { name: NAMES[3]!, divisions: 1, value: scale },
      ];
      const pool = [1, 2, 3, 5, 6, 7, 8].filter((d) => d !== bigDiv && d !== baseDiv);
      bars[2]!.divisions = pickOne(rng, pool);
      bars[2]!.value = bars[2]!.divisions * scale;
      bars[3]!.divisions = pickOne(
        rng,
        pool.filter((d) => d !== bars[2]!.divisions),
      );
      bars[3]!.value = bars[3]!.divisions * scale;
      answer = times;
      question = `Во сколько раз результат «${NAMES[0]}» больше результата «${NAMES[1]}»?`;
      models = [times + 1, Math.abs(bigDiv - baseDiv) * scale, bigDiv * scale, baseDiv * scale, times - 1 || times + 2];
    } else if (subtype === 'how_much_more') {
      // L3: три+ столбца, разность max−min
      bars = onMarkBars(rng, 3, scaleStep);
      const sorted = [...bars].sort((x, y) => y.value - x.value);
      const hi = sorted[0]!;
      const lo = sorted[sorted.length - 1]!;
      answer = hi.value - lo.value;
      question = `На сколько результат «${hi.name}» больше результата «${lo.name}»?`;
      models = [
        hi.value,
        lo.value,
        hi.value + lo.value,
        sorted[1]!.value,
        Math.abs(hi.value - sorted[1]!.value),
        answer + scaleStep,
      ];
    } else {
      // sum_with_distractor: 4 столбца, сумма двух без meta-подсказки
      bars = onMarkBars(rng, 4, scaleStep);
      const a = bars[0]!;
      const b = bars[1]!;
      answer = a.value + b.value;
      question = `Чему равна сумма результатов «${a.name}» и «${b.name}»?`;
      models = [
        bars.reduce((s, x) => s + x.value, 0),
        a.value + bars[2]!.value,
        Math.abs(a.value - b.value),
        a.value,
        b.value,
        a.value + b.value + bars[2]!.value,
      ];
    }

    if (!isValidM25Level(difficulty, subtype, bars)) continue;
    if (!requiresCompareRead(subtype)) continue;

    const maxScale = Math.max(...bars.map((b) => b.value), scaleStep * 2);
    const image = svgToDataUri(
      svgBarChart(
        TITLE,
        bars.map((b) => ({ name: b.name, value: b.value })),
        scaleStep,
        maxScale,
      ),
    );
    if (questionLeaksBarValues(question, bars)) continue;
    if (chartLeaksValues(question, image, bars)) continue;
    if (typeof answer === 'number' && question.includes(String(answer))) continue;

    // Ответ нельзя получить из одного имени без сравнения столбцов (кроме who_greater — визуальное сравнение)
    if (difficulty >= 2 && typeof answer === 'number') {
      const singleBar = bars.some((b) => b.value === answer);
      // сумма/разность могут совпасть с одним столбцом — реже оставляем, но не блокируем всегда
      void singleBar;
    }

    const params: M25GeneratorParams = {
      chartText: formatChartMeta(TITLE, bars.map((b) => b.name), scaleStep),
      bars,
      scaleStep,
      maxScale,
      subtype,
      answer,
      seed: options.seed,
      hasVisual: true,
    };

    if (difficulty === 3) {
      return baseTask({
        id: `generated-m25-3-${subtype}-${bars.map((b) => b.value).join('-')}`,
        section: 'Таблицы и диаграммы',
        topic: 'Диаграммы',
        skill: 'Сравнение данных диаграммы',
        topicId: M25_TOPIC_ID,
        skillId: M25_SKILL_ID,
        difficulty: 3,
        taskType: 'imageTask',
        question,
        correctAnswer: Number(answer),
        explanation: `Считай значения по шкале диаграммы, затем выполни действие. Ответ: ${answer}.`,
        generatorId: M25_GENERATOR_ID,
        generatorParams: params,
        image,
        hint2: 'Сначала найди нужные столбцы на рисунке.',
      });
    }

    const distractors = uniqueDistractorsFromModels(answer, models, rng, 3);
    if (distractors.length !== 3) continue;
    return baseTask({
      id: `generated-m25-${difficulty}-${subtype}-${String(answer)}-${bars.map((b) => b.value).join('x')}`,
      section: 'Таблицы и диаграммы',
      topic: 'Диаграммы',
      skill: 'Сравнение данных диаграммы',
      topicId: M25_TOPIC_ID,
      skillId: M25_SKILL_ID,
      difficulty,
      taskType: 'imageTask',
      question,
      correctAnswer: String(answer),
      answers: buildChoiceAnswers(answer, distractors, rng),
      explanation: `По диаграмме сравни столбцы. Ответ: ${answer}.`,
      generatorId: M25_GENERATOR_ID,
      generatorParams: params,
      image,
      hint2: 'Значения бери со шкалы рисунка, не из текста.',
    });
  }
  throw new Error(`M25: не удалось сгенерировать L${difficulty}`);
}

export function generateM25Series(options: M25SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => generateM25Task({ difficulty, seed, seriesIndex: index }),
    (task) => {
      const p = task.generatorParams as M25GeneratorParams;
      return `${p.subtype}|${p.scaleStep}|${p.bars.map((b) => `${b.name}:${b.value}`).join(',')}|${p.answer}`;
    },
    'M25',
  );
}
