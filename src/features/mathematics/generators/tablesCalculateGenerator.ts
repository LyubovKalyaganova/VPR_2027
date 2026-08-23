/**
 * Генератор M23: вычисления по таблице.
 * Контракт: M23_GENERATOR_SPEC.md
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  makeSeries,
  pickOne,
  randomInt,
  rejectAdvancedLevels,
  uniqueDistractorsFromModels,
  createSeededRng,
  type Level,
  type SeededRng,
} from './generatorScaffold';

export const M23_SKILL_ID = 'math.data.tables.calculate' as const;
export const M23_TOPIC_ID = 'math.data.tables' as const;
export const M23_GENERATOR_ID = 'gen.math.data.tables.calculate' as const;

export type TablesCalculateSubtype =
  | 'sum_two_cells'
  | 'row_or_col_sum'
  | 'how_much_more'
  | 'multi_step'
  | 'fill_blank_sum';

export type M23GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: TablesCalculateSubtype;
};

export type M23SeriesOptions = { seed: number; countPerLevel?: number };

export type M23GeneratorParams = {
  tableText: string;
  rows: string[];
  cols: string[];
  values: number[][];
  subtype: TablesCalculateSubtype;
  answer: number;
  seed: number;
  extraLabel?: string;
};

const ROW_NAMES = ['Маша', 'Петя', 'Аня', 'Боря', 'Катя'];
const COL_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

function formatTable(rows: string[], cols: string[], values: number[][]): string {
  const header = ['', ...cols].join(' | ');
  const lines = values.map((row, i) => [rows[i], ...row.map(String)].join(' | '));
  return [header, ...lines].join('\n');
}

function flatten(values: number[][]): number[] {
  return values.flat();
}

export function isValidM23Level(
  difficulty: Level,
  subtype: TablesCalculateSubtype,
  values: number[][],
): boolean {
  const cells = flatten(values);
  if (cells.some((n) => !Number.isInteger(n) || n < 0)) {
    return false;
  }
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  if (difficulty === 1) {
    return subtype === 'sum_two_cells' && rows >= 2 && cols >= 2 && cells.every((n) => n <= 20);
  }
  if (difficulty === 2) {
    return (
      (subtype === 'row_or_col_sum' || subtype === 'how_much_more') &&
      rows >= 2 &&
      cols >= 2 &&
      cells.every((n) => n <= 50)
    );
  }
  return (
    (subtype === 'multi_step' || subtype === 'fill_blank_sum') &&
    rows >= 3 &&
    cols >= 3 &&
    cells.every((n) => n <= 80)
  );
}

function resolveSubtype(difficulty: Level, requested: TablesCalculateSubtype | undefined, rng: SeededRng): TablesCalculateSubtype {
  if (difficulty === 1) {
    return 'sum_two_cells';
  }
  if (difficulty === 2) {
    if (requested === 'row_or_col_sum' || requested === 'how_much_more') {
      return requested;
    }
    return pickOne(rng, ['row_or_col_sum', 'how_much_more']);
  }
  if (requested === 'multi_step' || requested === 'fill_blank_sum') {
    return requested;
  }
  return pickOne(rng, ['multi_step', 'fill_blank_sum']);
}

function buildMatrix(rng: SeededRng, rows: number, cols: number, max: number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randomInt(rng, 1, max)),
  );
}

function buildL1(rng: SeededRng): {
  rows: string[];
  cols: string[];
  values: number[][];
  questionTail: string;
  answer: number;
  models: number[];
} {
  const rowCount = pickOne(rng, [2, 2, 3]);
  const colCount = 2;
  const rows = ROW_NAMES.slice(0, rowCount);
  const cols = COL_NAMES.slice(0, colCount);
  const values = buildMatrix(rng, rowCount, colCount, 20);
  const r1 = 0;
  const c1 = 0;
  const r2 = pickOne(rng, [0, rowCount - 1]);
  const c2 = r2 === r1 ? 1 : pickOne(rng, [0, 1]);
  const a = values[r1]![c1]!;
  const b = values[r2]![c2]!;
  const answer = a + b;
  const questionTail =
    r1 === r2
      ? `Сколько всего у ${rows[r1]} за ${cols[c1]} и ${cols[c2]} вместе?`
      : c1 === c2
        ? `Сколько всего у ${rows[r1]} и ${rows[r2]} в ${cols[c1]} вместе?`
        : `Чему равна сумма чисел в ячейках «${rows[r1]}, ${cols[c1]}» и «${rows[r2]}, ${cols[c2]}»?`;
  return {
    rows,
    cols,
    values,
    questionTail,
    answer,
    models: [a, b, Math.abs(a - b), a + b + 1, a + b - 1, values[0]![1]!, answer + 2],
  };
}

function buildL2(rng: SeededRng, subtype: TablesCalculateSubtype): {
  rows: string[];
  cols: string[];
  values: number[][];
  questionTail: string;
  answer: number;
  models: number[];
} {
  const rowCount = 3;
  const colCount = pickOne(rng, [2, 3]);
  const rows = ROW_NAMES.slice(0, rowCount);
  const cols = COL_NAMES.slice(0, colCount);
  const values = buildMatrix(rng, rowCount, colCount, 40);

  if (subtype === 'how_much_more') {
    const r = randomInt(rng, 0, rowCount - 1);
    let cBig = 0;
    let cSmall = 1 % colCount;
    if (values[r]![cBig]! < values[r]![cSmall]!) {
      [cBig, cSmall] = [cSmall, cBig];
    }
    if (values[r]![cBig]! === values[r]![cSmall]!) {
      values[r]![cBig] = values[r]![cSmall]! + randomInt(rng, 2, 12);
    }
    const big = values[r]![cBig]!;
    const small = values[r]![cSmall]!;
    const answer = big - small;
    return {
      rows,
      cols,
      values,
      questionTail: `На сколько у ${rows[r]} в ${cols[cBig]} больше, чем в ${cols[cSmall]}?`,
      answer,
      models: [big, small, big + small, answer + 1, answer - 1, Math.abs(answer - 2)],
    };
  }

  const mode = pickOne(rng, ['row', 'col'] as const);
  if (mode === 'row') {
    const r = randomInt(rng, 0, rowCount - 1);
    const answer = values[r]!.reduce((s, n) => s + n, 0);
    return {
      rows,
      cols,
      values,
      questionTail: `Сколько всего у ${rows[r]} за все дни?`,
      answer,
      models: [
        values[r]![0]!,
        values[r]![1]!,
        answer + 1,
        answer - 1,
        values[(r + 1) % rowCount]!.reduce((s, n) => s + n, 0),
      ],
    };
  }
  const c = randomInt(rng, 0, colCount - 1);
  const answer = values.reduce((s, row) => s + row[c]!, 0);
  return {
    rows,
    cols,
    values,
    questionTail: `Сколько всего у всех в ${cols[c]}?`,
    answer,
    models: [
      values[0]![c]!,
      values[1]![c]!,
      answer + 2,
      answer - 2,
      values.reduce((s, row) => s + row[0]!, 0),
    ],
  };
}

function buildL3(rng: SeededRng, subtype: TablesCalculateSubtype): {
  rows: string[];
  cols: string[];
  values: number[][];
  questionTail: string;
  answer: number;
  models: number[];
  blankDisplay?: number[][];
} {
  const rowCount = 3;
  const colCount = 3;
  const rows = ROW_NAMES.slice(0, rowCount);
  const cols = COL_NAMES.slice(0, colCount);
  const values = buildMatrix(rng, rowCount, colCount, 40);

  if (subtype === 'fill_blank_sum') {
    const r = randomInt(rng, 0, rowCount - 1);
    const cBlank = randomInt(rng, 0, colCount - 1);
    const known = values[r]!.filter((_, i) => i !== cBlank);
    const blank = values[r]![cBlank]!;
    const rowSum = known.reduce((s, n) => s + n, 0) + blank;
    const display = values.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === cBlank ? -1 : cell)),
    );
    return {
      rows,
      cols,
      values,
      blankDisplay: display,
      questionTail: `В строке «${rows[r]}» сумма всех дней равна ${rowSum}. В ${cols[cBlank]} стоит пропуск. Чему равен пропуск?`,
      answer: blank,
      models: [rowSum, known[0]!, known[1] ?? known[0]!, blank + 1, blank - 1, rowSum - blank],
    };
  }

  // multi_step: sum of two needed cells minus third; ignore extra column conceptually by asking specific
  const a = values[0]![0]!;
  const b = values[0]![1]!;
  const c = values[1]![0]!;
  const answer = a + b - c;
  if (answer <= 0) {
    values[0]![0] = c + randomInt(rng, 5, 15);
    values[0]![1] = randomInt(rng, 5, 20);
  }
  const a2 = values[0]![0]!;
  const b2 = values[0]![1]!;
  const c2 = values[1]![0]!;
  const ans = a2 + b2 - c2;
  return {
    rows,
    cols,
    values,
    questionTail: `Сложи показатели ${rows[0]} за ${cols[0]} и ${cols[1]}, затем вычти показатель ${rows[1]} за ${cols[0]}. Чему равен результат? (столбец ${cols[2]} не используй.)`,
    answer: ans,
    models: [a2 + b2, a2 - c2, b2 - c2, ans + 1, ans - 1, a2 + b2 + c2, values[2]![2]!],
  };
}

function tableTextFrom(
  rows: string[],
  cols: string[],
  values: number[][],
  blankDisplay?: number[][],
): string {
  if (!blankDisplay) {
    return formatTable(rows, cols, values);
  }
  const header = ['', ...cols].join(' | ');
  const lines = blankDisplay.map((row, i) =>
    [rows[i], ...row.map((cell) => (cell < 0 ? '?' : String(cell)))].join(' | '),
  );
  return [header, ...lines].join('\n');
}

export function generateM23Task(options: M23GenerateOptions): Task {
  rejectAdvancedLevels('M23', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const built =
      difficulty === 1
        ? { ...buildL1(rng), blankDisplay: undefined as number[][] | undefined }
        : difficulty === 2
          ? { ...buildL2(rng, subtype), blankDisplay: undefined as number[][] | undefined }
          : buildL3(rng, subtype);

    if (!isValidM23Level(difficulty, subtype, built.values)) {
      continue;
    }
    if (!Number.isInteger(built.answer) || built.answer < 0) {
      continue;
    }

    const tableText = tableTextFrom(built.rows, built.cols, built.values, built.blankDisplay);
    const question = `Дана таблица:\n${tableText}\n\n${built.questionTail}`;
    const distractors = uniqueDistractorsFromModels(built.answer, built.models, rng, 3);
    if (distractors.length < 3 && difficulty !== 3) {
      continue;
    }
    const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
    const answers =
      taskType === 'singleChoice' ? buildChoiceAnswers(built.answer, distractors, rng) : undefined;

    return baseTask({
      id: `generated-m23-${difficulty}-${options.seed}-${attempt}`,
      section: 'Таблицы и диаграммы',
      topic: 'Таблицы',
      skill: 'Вычисления по таблице',
      topicId: M23_TOPIC_ID,
      skillId: M23_SKILL_ID,
      difficulty,
      taskType,
      question,
      correctAnswer: built.answer,
      answers,
      explanation: `Нужно выполнить вычисление по данным таблицы. Ответ: ${built.answer}.`,
      generatorId: M23_GENERATOR_ID,
      generatorParams: {
        tableText,
        rows: built.rows,
        cols: built.cols,
        values: built.values,
        subtype,
        answer: built.answer,
        seed: options.seed,
      } satisfies M23GeneratorParams,
      hint1: 'Найди нужные ячейки в таблице.',
      hint2: 'Выполни сложение или вычитание — не ограничивайся чтением одной ячейки.',
      hint3: `Ответ: ${built.answer}.`,
    });
  }

  throw new Error(`Генератор M23: не удалось собрать задание L${difficulty} (seed ${options.seed})`);
}

export function m23Fingerprint(task: Task): string {
  const p = task.generatorParams as M23GeneratorParams;
  return `${p.subtype}|${JSON.stringify(p.values)}|${p.answer}|${task.question.slice(0, 80)}`;
}

export function generateM23Series(options: M23SeriesOptions): Task[] {
  return makeSeries(options, ({ difficulty, seed }) => generateM23Task({ difficulty, seed }), m23Fingerprint, 'M23');
}
