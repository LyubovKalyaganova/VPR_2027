/**
 * Генератор M22: чтение таблицы (без вычислений).
 * Контракт: M22_GENERATOR_SPEC.md
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
  shuffleSeeded,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';

export const M22_SKILL_ID = 'math.data.tables.read' as const;
export const M22_TOPIC_ID = 'math.data.tables' as const;
export const M22_GENERATOR_ID = 'gen.math.data.tables.read' as const;

export type TablesReadSubtype = 'direct_2x2' | 'typical_table' | 'indirect_extra_rows';
export type TablesReadFeature = 'direct_cell' | 'max' | 'min' | 'who' | 'indirect_wording' | 'extra_rows';

export type M22GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: TablesReadSubtype;
};

export type M22SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M22GeneratorParams = {
  subtype: TablesReadSubtype;
  features: TablesReadFeature[];
  rowCount: number;
  colCount: number;
  tableText: string;
  answer: string | number;
  seed: number;
};

const SUBTYPE_TITLES: Record<TablesReadSubtype, string> = {
  direct_2x2: 'Прямое чтение 2×2',
  typical_table: 'Типовая школьная таблица',
  indirect_extra_rows: 'Лишние строки, небуквальный вопрос',
};

const NAMES = ['Аня', 'Боря', 'Вера', 'Дима', 'Егор', 'Зоя', 'Ира', 'Кира'];
const DAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница'];

function allowed(difficulty: Level): TablesReadSubtype[] {
  if (difficulty === 1) return ['direct_2x2'];
  if (difficulty === 2) return ['typical_table'];
  return ['indirect_extra_rows'];
}

export function isValidM22Level(
  params: Pick<M22GeneratorParams, 'subtype' | 'rowCount' | 'colCount' | 'features'>,
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    return params.subtype === 'direct_2x2' && params.rowCount === 2 && params.colCount === 2;
  }
  if (difficulty === 2) {
    return params.subtype === 'typical_table' && params.rowCount >= 3 && params.colCount >= 2;
  }
  return (
    params.subtype === 'indirect_extra_rows' &&
    params.rowCount >= 4 &&
    params.features.includes('indirect_wording') &&
    params.features.includes('extra_rows')
  );
}

export function tablesReadFingerprint(params: M22GeneratorParams): string {
  return [params.subtype, params.tableText, String(params.answer)].join('|');
}

function resolveSubtype(difficulty: Level, requested: TablesReadSubtype | undefined, rng: SeededRng): TablesReadSubtype {
  const list = allowed(difficulty);
  if (requested && list.includes(requested)) return requested;
  return pickOne(rng, list);
}

function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (cells: string[]) =>
    cells.map((cell, i) => cell.padEnd(widths[i] ?? 0, ' ')).join(' | ');
  const sep = widths.map((w) => '-'.repeat(w)).join('-+-');
  return [line(headers), sep, ...rows.map(line)].join('\n');
}

function uniqueInts(rng: SeededRng, count: number, min: number, max: number): number[] {
  const set = new Set<number>();
  let guard = 0;
  while (set.size < count && guard < 200) {
    guard += 1;
    set.add(randomInt(rng, min, max));
  }
  if (set.size < count) throw new Error('M22: не удалось набрать уникальные числа');
  return shuffleSeeded([...set], rng);
}

function finish(
  difficulty: Level,
  params: M22GeneratorParams,
  question: string,
  explanation: string,
  distractorModels: Array<string | number>,
  rng: SeededRng,
  preferNumber = false,
): Task {
  if (!isValidM22Level(params, difficulty)) throw new Error(`M22 L${difficulty} invalid`);
  const answer = params.answer;
  const numeric = typeof answer === 'number' || (typeof answer === 'string' && /^\d+$/.test(answer));
  const taskType = preferNumber && numeric && difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  let answers: string[] | undefined;
  let correctAnswer: string | number = answer;
  if (taskType === 'singleChoice') {
    const distractors = uniqueDistractorsFromModels(answer, distractorModels, rng);
    if (distractors.length < 3) throw new Error('M22: мало дистракторов');
    answers = buildChoiceAnswers(answer, distractors.slice(0, 3), rng);
    correctAnswer = String(answer);
  } else if (typeof answer === 'string' && /^\d+$/.test(answer)) {
    correctAnswer = Number(answer);
  }
  return baseTask({
    id: `generated-m22-${difficulty}-${params.subtype}-${params.rowCount}x${params.colCount}-${String(answer)}`,
    section: 'Таблицы и диаграммы',
    topic: 'Таблицы',
    skill: SUBTYPE_TITLES[params.subtype],
    topicId: M22_TOPIC_ID,
    skillId: M22_SKILL_ID,
    difficulty,
    taskType,
    question,
    correctAnswer,
    answers,
    explanation,
    generatorId: M22_GENERATOR_ID,
    generatorParams: params,
    hint1: 'Найди нужную строку и столбец.',
    hint2: 'Не бери соседнюю ячейку и не складывай числа.',
    hint3: `Ответ: ${answer}.`,
  });
}

function buildL1(rng: SeededRng, seed: number): Task {
  const names = shuffleSeeded(NAMES, rng).slice(0, 2);
  const fruits = pickOne(rng, [
    ['яблоки', 'груши'],
    ['марки', 'наклейки'],
    ['балл', 'ошибки'],
  ]);
  const values = uniqueInts(rng, 4, 2, 12);
  const grid = [
    [String(values[0]), String(values[1])],
    [String(values[2]), String(values[3])],
  ];
  const tableText = formatTable(['Имя', fruits[0]!, fruits[1]!], [
    [names[0]!, grid[0]![0]!, grid[0]![1]!],
    [names[1]!, grid[1]![0]!, grid[1]![1]!],
  ]);
  const mode = pickOne(rng, ['cell', 'who'] as const);
  if (mode === 'cell') {
    const answer = Number(grid[0]![0]);
    const params: M22GeneratorParams = {
      subtype: 'direct_2x2',
      features: ['direct_cell'],
      rowCount: 2,
      colCount: 2,
      tableText,
      answer,
      seed,
    };
    return finish(
      1,
      params,
      `Таблица:\n${tableText}\n\nСколько «${fruits[0]}» у ${names[0]}?`,
      `В строке «${names[0]}» и столбце «${fruits[0]}» стоит ${answer}.`,
      [grid[0]![1]!, grid[1]![0]!, grid[1]![1]!, names[0]!, fruits[0]!],
      rng,
    );
  }
  const target = Number(grid[1]![1]);
  const params: M22GeneratorParams = {
    subtype: 'direct_2x2',
    features: ['who'],
    rowCount: 2,
    colCount: 2,
    tableText,
    answer: names[1]!,
    seed,
  };
  return finish(
    1,
    params,
    `Таблица:\n${tableText}\n\nУ кого ${target} «${fruits[1]}»?`,
    `Число ${target} в столбце «${fruits[1]}» стоит у ${names[1]}.`,
    [names[0]!, fruits[1]!, String(target), grid[0]![1]!],
    rng,
  );
}

function buildL2(rng: SeededRng, seed: number): Task {
  const nRows = 3;
  const names = shuffleSeeded(NAMES, rng).slice(0, nRows);
  const col = pickOne(rng, ['очки', 'минуты', 'страницы']);
  const col2 = col === 'очки' ? 'попытки' : 'очки';
  const values = uniqueInts(rng, nRows, 5, 30);
  const values2 = uniqueInts(rng, nRows, 1, 15);
  const tableText = formatTable(
    ['Ученик', col, col2],
    names.map((name, i) => [name, String(values[i]), String(values2[i])]),
  );
  const mode = pickOne(rng, ['direct', 'max', 'min'] as const);
  if (mode === 'direct') {
    const idx = randomInt(rng, 0, nRows - 1);
    const useSecond = pickOne(rng, [false, true]);
    const answer = useSecond ? values2[idx]! : values[idx]!;
    const label = useSecond ? col2 : col;
    const params: M22GeneratorParams = {
      subtype: 'typical_table',
      features: ['direct_cell'],
      rowCount: nRows,
      colCount: 2,
      tableText,
      answer,
      seed,
    };
    return finish(
      2,
      params,
      `Таблица:\n${tableText}\n\nСколько «${label}» у ${names[idx]}?`,
      `В строке «${names[idx]}» в столбце «${label}» указано ${answer}.`,
      [
        ...[...values, ...values2].filter((v) => v !== answer).map(String),
        names[(idx + 1) % nRows]!,
      ],
      rng,
    );
  }
  if (mode === 'max') {
    let best = 0;
    for (let i = 1; i < values.length; i += 1) {
      if (values[i]! > values[best]!) best = i;
    }
    const answer = names[best]!;
    const params: M22GeneratorParams = {
      subtype: 'typical_table',
      features: ['max'],
      rowCount: nRows,
      colCount: 2,
      tableText,
      answer,
      seed,
    };
    return finish(
      2,
      params,
      `Таблица:\n${tableText}\n\nУ кого больше всего «${col}»?`,
      `Наибольшее значение ${values[best]} у ${answer}.`,
      names.filter((n) => n !== answer).concat(String(values[best]!)),
      rng,
    );
  }
  let worst = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i]! < values[worst]!) worst = i;
  }
  const answer = names[worst]!;
  const params: M22GeneratorParams = {
    subtype: 'typical_table',
    features: ['min'],
    rowCount: nRows,
    colCount: 2,
    tableText,
    answer,
    seed,
  };
  return finish(
    2,
    params,
    `Таблица:\n${tableText}\n\nУ кого меньше всего «${col}»?`,
    `Наименьшее значение ${values[worst]} у ${answer}.`,
    names.filter((n) => n !== answer).concat(String(values[worst]!)),
    rng,
  );
}

function buildL3(rng: SeededRng, seed: number): Task {
  const nRows = randomInt(rng, 4, 5);
  const days = shuffleSeeded(DAYS, rng).slice(0, nRows);
  const rain = uniqueInts(rng, nRows, 0, 20);
  const temp = uniqueInts(rng, nRows, 5, 25);
  const tableText = formatTable(
    ['День', 'осадки, мм', 'температура, °C'],
    days.map((day, i) => [day, String(rain[i]), String(temp[i])]),
  );
  const mode = pickOne(rng, ['coldest', 'driest', 'rain_of'] as const);
  if (mode === 'coldest') {
    let idx = 0;
    for (let i = 1; i < temp.length; i += 1) {
      if (temp[i]! < temp[idx]!) idx = i;
    }
    const answer = days[idx]!;
    const params: M22GeneratorParams = {
      subtype: 'indirect_extra_rows',
      features: ['min', 'indirect_wording', 'extra_rows'],
      rowCount: nRows,
      colCount: 2,
      tableText,
      answer,
      seed,
    };
    return finish(
      3,
      params,
      `Таблица:\n${tableText}\n\nВ какой день было холоднее всего?`,
      `Самая низкая температура ${temp[idx]} °C — в ${answer}.`,
      days.filter((d) => d !== answer).concat(String(temp[idx]!)),
      rng,
    );
  }
  if (mode === 'driest') {
    let idx = 0;
    for (let i = 1; i < rain.length; i += 1) {
      if (rain[i]! < rain[idx]!) idx = i;
    }
    const answer = days[idx]!;
    const params: M22GeneratorParams = {
      subtype: 'indirect_extra_rows',
      features: ['min', 'indirect_wording', 'extra_rows'],
      rowCount: nRows,
      colCount: 2,
      tableText,
      answer,
      seed,
    };
    return finish(
      3,
      params,
      `Таблица:\n${tableText}\n\nКогда выпало меньше всего осадков?`,
      `Минимум осадков ${rain[idx]} мм — в ${answer}.`,
      days.filter((d) => d !== answer).concat(String(rain[idx]!)),
      rng,
    );
  }
  const idx = randomInt(rng, 0, nRows - 1);
  const answer = rain[idx]!;
  const params: M22GeneratorParams = {
    subtype: 'indirect_extra_rows',
    features: ['direct_cell', 'indirect_wording', 'extra_rows'],
    rowCount: nRows,
    colCount: 2,
    tableText,
    answer,
    seed,
  };
  return finish(
    3,
    params,
    `Таблица:\n${tableText}\n\nСколько миллиметров дождя отмечено в день «${days[idx]}»?`,
    `В строке «${days[idx]}» в столбце осадков стоит ${answer}.`,
    [...rain.filter((v) => v !== answer), temp[idx]!, days[(idx + 1) % nRows]!],
    rng,
    true,
  );
}

export function generateM22Task(options: M22GenerateOptions): Task {
  rejectAdvancedLevels('M22', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if (subtype === 'direct_2x2') return buildL1(rng, options.seed);
      if (subtype === 'typical_table') return buildL2(rng, options.seed);
      return buildL3(rng, options.seed);
    } catch {
      // retry
    }
  }
  throw new Error(`M22: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM22Series(options: M22SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed }) => generateM22Task({ difficulty, seed }),
    (task) => tablesReadFingerprint(task.generatorParams as M22GeneratorParams),
    'M22',
  );
}
