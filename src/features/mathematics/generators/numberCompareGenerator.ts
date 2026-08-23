/**
 * Генератор M02: сравнение многозначных чисел.
 * Контракт: карточка M02 в CONTENT_MATRIX_MATH.md (L1–L3).
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

export const M02_SKILL_ID = 'math.calculation.numbers.compare' as const;
export const M02_TOPIC_ID = 'math.calculation.numbers' as const;
export const M02_GENERATOR_ID = 'gen.math.numbers.compare' as const;

export type CompareSubtype = 'insert_sign' | 'choose_extreme' | 'order_three' | 'diff_digits';

export type M02GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: CompareSubtype };
export type M02SeriesOptions = { seed: number; countPerLevel?: number };

export type M02GeneratorParams = {
  subtype: CompareSubtype;
  numbers: number[];
  answer: string;
  seed: number;
};

const MAX_ATTEMPTS = 100;

function allowedSubtypes(difficulty: Level): CompareSubtype[] {
  if (difficulty === 1) return ['insert_sign'];
  if (difficulty === 2) return ['choose_extreme', 'insert_sign'];
  return ['diff_digits', 'order_three'];
}

function resolveSubtype(
  difficulty: Level,
  requested: CompareSubtype | undefined,
  rng: SeededRng,
): CompareSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function isValidM02Level(
  params: Pick<M02GeneratorParams, 'subtype' | 'numbers'>,
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    return (
      params.subtype === 'insert_sign' &&
      params.numbers.length === 2 &&
      String(params.numbers[0]).length === String(params.numbers[1]).length
    );
  }
  if (difficulty === 2) {
    return (
      (params.subtype === 'choose_extreme' || params.subtype === 'insert_sign') &&
      params.numbers.every((n) => String(n).length === 4)
    );
  }
  return params.subtype === 'diff_digits' || params.subtype === 'order_three';
}

function signOf(a: number, b: number): '>' | '<' | '=' {
  if (a > b) return '>';
  if (a < b) return '<';
  return '=';
}

type Built = {
  subtype: CompareSubtype;
  numbers: number[];
  answer: string;
  question: string;
  explanation: string;
  distractors: string[];
};

function buildInsertSign(rng: SeededRng, difficulty: Level): Built | null {
  let a: number;
  let b: number;
  if (difficulty === 1) {
    const base = randomInt(rng, 120, 890);
    const delta = pickOne(rng, [1, 2, 3, 5, 10, 20, 100]);
    const flip = pickOne(rng, [true, false] as const);
    a = flip ? base : base + delta;
    b = flip ? base + delta : base;
    if (String(a).length !== String(b).length) return null;
  } else {
    a = randomInt(rng, 1023, 9876);
    b = randomInt(rng, 1023, 9876);
    if (a === b) b = a + pickOne(rng, [1, 10, 100, -1, -10]);
  }
  const sign = signOf(a, b);
  const answer = `${a} ${sign} ${b}`;
  const distractors = (['>', '<', '='] as const)
    .filter((s) => s !== sign)
    .map((s) => `${a} ${s} ${b}`);
  distractors.push(`${b} ${sign} ${a}`);
  return {
    subtype: 'insert_sign',
    numbers: [a, b],
    answer,
    question: `Выбери верное сравнение:`,
    explanation: `Верно: ${answer}.`,
    distractors: distractors.slice(0, 3),
  };
}

function buildChooseExtreme(rng: SeededRng): Built | null {
  const nums = new Set<number>();
  while (nums.size < 4) {
    nums.add(randomInt(rng, 1023, 9876));
  }
  const list = [...nums];
  const wantMax = pickOne(rng, [true, false] as const);
  const answer = String(wantMax ? Math.max(...list) : Math.min(...list));
  const distractors = uniqueDistractorsFromModels(
    answer,
    list.map(String),
    rng,
    3,
  );
  return {
    subtype: 'choose_extreme',
    numbers: list,
    answer,
    question: wantMax
      ? `Какое число наибольшее: ${list.join(', ')}?`
      : `Какое число наименьшее: ${list.join(', ')}?`,
    explanation: wantMax
      ? `Наибольшее из чисел — ${answer}.`
      : `Наименьшее из чисел — ${answer}.`,
    distractors,
  };
}

function buildOrderThree(rng: SeededRng): Built | null {
  const nums = new Set<number>();
  while (nums.size < 3) {
    // разная разрядность: 3- и 4-значные
    if (nums.size === 0) nums.add(randomInt(rng, 100, 999));
    else if (nums.size === 1) nums.add(randomInt(rng, 1000, 9999));
    else nums.add(randomInt(rng, 100, 9999));
  }
  const list = [...nums];
  const asc = [...list].sort((x, y) => x - y);
  const desc = [...asc].reverse();
  const wantAsc = pickOne(rng, [true, false] as const);
  const answer = (wantAsc ? asc : desc).join(', ');
  const wrong1 = (wantAsc ? desc : asc).join(', ');
  const wrong2 = [list[0], list[2], list[1]].join(', ');
  const wrong3 = [list[1], list[0], list[2]].join(', ');
  return {
    subtype: 'order_three',
    numbers: list,
    answer,
    question: wantAsc
      ? `Расположи числа по возрастанию: ${list.join(', ')}`
      : `Расположи числа по убыванию: ${list.join(', ')}`,
    explanation: `Верный порядок: ${answer}.`,
    distractors: [wrong1, wrong2, wrong3].filter((x, i, arr) => x !== answer && arr.indexOf(x) === i).slice(0, 3),
  };
}

function buildDiffDigits(rng: SeededRng): Built | null {
  // «похоже записанные» / разная разрядность — типичная ошибка 999 > 1000
  const mode = pickOne(rng, ['trap_999', 'lookalike', 'zeros'] as const);
  let a: number;
  let b: number;
  if (mode === 'trap_999') {
    a = 999;
    b = 1000;
  } else if (mode === 'lookalike') {
    const stem = randomInt(rng, 12, 89);
    a = stem * 10 + randomInt(rng, 0, 9);
    b = stem * 100 + randomInt(rng, 10, 99);
  } else {
    a = randomInt(rng, 1, 9) * 1000 + randomInt(rng, 1, 9);
    b = randomInt(rng, 100, 999);
  }
  if (a === b) return null;
  const sign = signOf(a, b);
  const answer = `${a} ${sign} ${b}`;
  const distractors = (['>', '<', '='] as const)
    .filter((s) => s !== sign)
    .map((s) => `${a} ${s} ${b}`);
  distractors.push(`${b} ${signOf(b, a)} ${a}`);
  return {
    subtype: 'diff_digits',
    numbers: [a, b],
    answer,
    question: `Какое сравнение верно?`,
    explanation: `Верно: ${answer}.`,
    distractors: distractors.slice(0, 3),
  };
}

function buildCase(rng: SeededRng, difficulty: Level, subtype: CompareSubtype): Built | null {
  if (subtype === 'insert_sign') return buildInsertSign(rng, difficulty);
  if (subtype === 'choose_extreme') return buildChooseExtreme(rng);
  if (subtype === 'order_three') return buildOrderThree(rng);
  return buildDiffDigits(rng);
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  if (!isValidM02Level({ subtype: built.subtype, numbers: built.numbers }, difficulty)) {
    throw new Error(`M02: невалидный L${difficulty}`);
  }
  let distractors = built.distractors;
  if (distractors.length < 3) {
    // для знаков нужно 3 варианта — дополним нейтральными
    const pool = ['>', '<', '=', '≥', '≤'].filter((x) => x !== built.answer && !distractors.includes(x));
    distractors = [...distractors, ...pool].slice(0, 3);
  }
  const answers = buildChoiceAnswers(built.answer, distractors.slice(0, 3), rng);
  if (answers.length !== 4) throw new Error('M02: options');
  return baseTask({
    id: `generated-m02-${difficulty}-${built.subtype}-${built.numbers.join('-')}-${seed}`,
    section: 'Вычисления',
    topic: 'Числа и разряды',
    skill: 'Сравнение многозначных чисел',
    topicId: M02_TOPIC_ID,
    skillId: M02_SKILL_ID,
    difficulty,
    taskType: 'singleChoice',
    question: built.question,
    correctAnswer: built.answer,
    answers,
    explanation: built.explanation,
    generatorId: M02_GENERATOR_ID,
    generatorParams: {
      subtype: built.subtype,
      numbers: built.numbers,
      answer: built.answer,
      seed,
    } satisfies M02GeneratorParams,
  });
}

export function fingerprintM02(task: Task): string {
  const p = task.generatorParams as M02GeneratorParams;
  return `${p.subtype}|${p.numbers.join(',')}|${p.answer}`;
}

export function generateM02Task(options: M02GenerateOptions): Task {
  rejectAdvancedLevels('M02', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    const built = buildCase(rng, difficulty, subtype);
    if (!built) continue;
    try {
      return toTask(built, difficulty, options.seed, rng);
    } catch {
      // retry
    }
  }
  throw new Error(`M02: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM02Series(options: M02SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM02Task({ difficulty, seed, subtype: subtypes[index % subtypes.length] });
    },
    fingerprintM02,
    'M02',
  );
}
