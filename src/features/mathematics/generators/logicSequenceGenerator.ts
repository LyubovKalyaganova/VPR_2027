/**
 * Генератор M33: закономерности и последовательности.
 * Контракт: M33_GENERATOR_SPEC.md
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

export const M33_SKILL_ID = 'math.logic.problems.sequence' as const;
export const M33_TOPIC_ID = 'math.logic.problems' as const;
export const M33_GENERATOR_ID = 'gen.math.logic.sequence' as const;

export type M33Subtype =
  | 'add_const'
  | 'mul_const'
  | 'add_large'
  | 'two_rule_alternate'
  | 'odd_one_out';

export type M33Feature = 'constant_diff' | 'constant_mul' | 'two_rules' | 'odd_one';

export type M33GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: M33Subtype };
export type M33SeriesOptions = { seed: number; countPerLevel?: number };

export type M33GeneratorParams = {
  sequence: number[];
  nextValue: number;
  rule: string;
  subtype: M33Subtype;
  features: M33Feature[];
  seed: number;
  oddIndex?: number;
};

type Built = {
  sequence: number[];
  nextValue: number;
  answer: number;
  rule: string;
  subtype: M33Subtype;
  features: M33Feature[];
  question: string;
  explanation: string;
  oddIndex?: number;
};

const MAX_ATTEMPTS = 140;

function allowedSubtypes(difficulty: Level): M33Subtype[] {
  if (difficulty === 1) return ['add_const'];
  if (difficulty === 2) return ['mul_const', 'add_large'];
  return ['two_rule_alternate', 'odd_one_out'];
}

function resolveSubtype(difficulty: Level, requested: M33Subtype | undefined, rng: SeededRng): M33Subtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function isValidM33Level(
  params: { subtype: M33Subtype; features: readonly M33Feature[] },
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    return params.subtype === 'add_const' && params.features.includes('constant_diff');
  }
  if (difficulty === 2) {
    return (
      (params.subtype === 'mul_const' && params.features.includes('constant_mul')) ||
      (params.subtype === 'add_large' && params.features.includes('constant_diff'))
    );
  }
  return (
    (params.subtype === 'two_rule_alternate' && params.features.includes('two_rules')) ||
    (params.subtype === 'odd_one_out' && params.features.includes('odd_one'))
  );
}

function buildL1(rng: SeededRng): Built | null {
  const step = pickOne(rng, [2, 3, 5, 10]);
  const start = randomInt(rng, 1, 20);
  const sequence = [start, start + step, start + 2 * step, start + 3 * step];
  const nextValue = sequence[sequence.length - 1]! + step;
  return {
    sequence,
    nextValue,
    answer: nextValue,
    rule: `+${step}`,
    subtype: 'add_const',
    features: ['constant_diff'],
    question: `Продолжи ряд чисел: ${sequence.join(', ')}, … Какое число следующее?`,
    explanation: `Каждое следующее число больше предыдущего на ${step}. Следующее: ${nextValue}.`,
  };
}

function buildL2(rng: SeededRng, subtype: M33Subtype): Built | null {
  if (subtype === 'mul_const') {
    const mul = pickOne(rng, [2, 3]);
    const start = pickOne(rng, [2, 3, 4, 5]);
    const sequence = [start, start * mul, start * mul * mul, start * mul * mul * mul];
    if (sequence.some((n) => n > 500)) return null;
    const nextValue = sequence[sequence.length - 1]! * mul;
    if (nextValue > 2000) return null;
    return {
      sequence,
      nextValue,
      answer: nextValue,
      rule: `×${mul}`,
      subtype: 'mul_const',
      features: ['constant_mul'],
      question: `Продолжи ряд: ${sequence.join(', ')}, … Какое число следующее?`,
      explanation: `Каждое число умножается на ${mul}. Следующее: ${nextValue}.`,
    };
  }
  const step = pickOne(rng, [7, 8, 9, 11, 12, 15]);
  const start = randomInt(rng, 5, 40);
  const sequence = [start, start + step, start + 2 * step, start + 3 * step, start + 4 * step];
  const nextValue = sequence[sequence.length - 1]! + step;
  return {
    sequence,
    nextValue,
    answer: nextValue,
    rule: `+${step}`,
    subtype: 'add_large',
    features: ['constant_diff'],
    question: `Продолжи ряд: ${sequence.join(', ')}, … Какое число следующее?`,
    explanation: `Разность постоянна и равна ${step}. Следующее: ${nextValue}.`,
  };
}

function buildL3(rng: SeededRng, subtype: M33Subtype): Built | null {
  if (subtype === 'odd_one_out') {
    const step = pickOne(rng, [2, 3, 4, 5]);
    const start = randomInt(rng, 2, 15);
    const good = [start, start + step, start + 2 * step, start + 3 * step, start + 4 * step];
    const oddIndex = pickOne(rng, [1, 2, 3]);
    const oddValue = good[oddIndex]! + pickOne(rng, [1, 2, step + 1]);
    const sequence = [...good];
    sequence[oddIndex] = oddValue;
    return {
      sequence,
      nextValue: oddValue,
      answer: oddValue,
      oddIndex,
      rule: `diff=${step}; odd@${oddIndex}`,
      subtype: 'odd_one_out',
      features: ['odd_one'],
      question: `В ряду чисел одно лишнее (не подходит под общее правило). Найди лишнее число: ${sequence.join(', ')}.`,
      explanation: `Правильный ряд шёл бы с шагом ${step}. Лишнее число: ${oddValue}.`,
    };
  }

  const mode = pickOne(rng, ['add_add', 'mul_add'] as const);
  if (mode === 'add_add') {
    const a = pickOne(rng, [2, 3, 4]);
    const b = pickOne(rng, [5, 6, 7, 8]);
    if (a === b) return null;
    const start = randomInt(rng, 2, 12);
    const shown: number[] = [start];
    let cur = start;
    for (let i = 0; i < 4; i += 1) {
      cur = i % 2 === 0 ? cur + a : cur + b;
      shown.push(cur);
    }
    // после 5 членов (индексы 0..4) следующий шаг — индекс перехода 4 → чётный → +a
    const answer = shown[4]! + a;
    return {
      sequence: shown,
      nextValue: answer,
      answer,
      rule: `+${a}/+${b}`,
      subtype: 'two_rule_alternate',
      features: ['two_rules'],
      question: `Продолжи ряд: ${shown.join(', ')}, … Какое число следующее?`,
      explanation: `Чередуются +${a} и +${b}. Следующее число: ${answer}.`,
    };
  }

  const mul = 2;
  const add = pickOne(rng, [2, 3, 4]);
  const start = pickOne(rng, [2, 3, 4, 5]);
  const shown: number[] = [start];
  let cur = start;
  for (let i = 0; i < 4; i += 1) {
    cur = i % 2 === 0 ? cur * mul : cur + add;
    shown.push(cur);
  }
  const answer = shown[4]! * mul;
  if (answer > 5000) return null;
  return {
    sequence: shown,
    nextValue: answer,
    answer,
    rule: `×${mul}/+${add}`,
    subtype: 'two_rule_alternate',
    features: ['two_rules'],
    question: `Продолжи ряд: ${shown.join(', ')}, … Какое число следующее?`,
    explanation: `Чередуются ×${mul} и +${add}. После последнего числа снова ×${mul}. Ответ: ${answer}.`,
  };
}

/** Условие не должно раскрывать правило ряда. */
export function hasExplicitRuleLeak(question: string): boolean {
  return /чередуются|умножение на\s*\d|прибавление\s*\d|сначала умножаем|правило ряда|каждый второй|шаг равен/i.test(
    question,
  );
}

function buildCase(rng: SeededRng, difficulty: Level, subtype: M33Subtype): Built | null {
  if (difficulty === 1) return buildL1(rng);
  if (difficulty === 2) return buildL2(rng, subtype);
  return buildL3(rng, subtype);
}

function distractorsFor(built: Built, rng: SeededRng): string[] {
  const last = built.sequence[built.sequence.length - 1]!;
  const prev = built.sequence[built.sequence.length - 2]!;
  const lastStep = last - prev;
  return uniqueDistractorsFromModels(
    built.answer,
    [
      last + lastStep,
      last * 2,
      last + prev,
      built.answer + lastStep,
      built.answer > 2 ? built.answer - 1 : null,
      built.answer + 1,
      built.sequence[0],
    ],
    rng,
    3,
  );
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  if (!isValidM33Level({ subtype: built.subtype, features: built.features }, difficulty)) {
    throw new Error(`M33: невалидный L${difficulty}`);
  }
  if (hasExplicitRuleLeak(built.question)) {
    throw new Error('M33: rule leak in question');
  }
  const distractors = distractorsFor(built, rng);
  if (distractors.length !== 3) throw new Error('M33: дистракторы');

  return baseTask({
    id: `generated-m33-${difficulty}-${built.subtype}-${built.sequence.join('-')}-${built.answer}`,
    section: 'Логические задачи',
    topic: 'Логические задачи',
    skill: 'Закономерности и последовательности',
    topicId: M33_TOPIC_ID,
    skillId: M33_SKILL_ID,
    difficulty,
    taskType: 'singleChoice',
    question: built.question,
    correctAnswer: String(built.answer),
    answers: buildChoiceAnswers(built.answer, distractors, rng),
    explanation: built.explanation,
    generatorId: M33_GENERATOR_ID,
    generatorParams: {
      sequence: built.sequence,
      nextValue: built.nextValue,
      rule: built.rule,
      subtype: built.subtype,
      features: built.features,
      seed,
      oddIndex: built.oddIndex,
    } satisfies M33GeneratorParams,
    hint1: 'Найди правило, по которому меняются числа.',
    hint2: 'Проверь правило на всём ряду, не только на последних двух числах.',
    hint3: `Ответ: ${built.answer}.`,
  });
}

export function fingerprintM33(task: Task): string {
  const p = task.generatorParams as M33GeneratorParams;
  return `${p.subtype}|${p.sequence.join(',')}|${p.nextValue}|${p.oddIndex ?? ''}`;
}

export function generateM33Task(options: M33GenerateOptions): Task {
  rejectAdvancedLevels('M33', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const built = buildCase(rng, difficulty, subtype);
    if (!built) continue;
    try {
      return toTask(built, difficulty, options.seed, rng);
    } catch {
      // retry
    }
  }
  throw new Error(`M33: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM33Series(options: M33SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM33Task({ difficulty, seed, subtype: subtypes[index % subtypes.length] });
    },
    fingerprintM33,
    'M33',
  );
}
