/**
 * Генератор M34: истинные и ложные утверждения.
 * Контракт: M34_GENERATOR_SPEC.md
 * PROJECT_DECISION: seeded-генератор (матрица: «обычно статика»); generatorId = gen.math.logic.statements.
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

export const M34_SKILL_ID = 'math.logic.problems.statements' as const;
export const M34_TOPIC_ID = 'math.logic.problems' as const;
export const M34_GENERATOR_ID = 'gen.math.logic.statements' as const;

export type M34Subtype = 'one_cell' | 'compare_two' | 'and_or';
export type M34Feature = 'single_fact' | 'two_values' | 'and_condition' | 'or_condition';

export type M34GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: M34Subtype };
export type M34SeriesOptions = { seed: number; countPerLevel?: number };

export type M34GeneratorParams = {
  subtype: M34Subtype;
  features: M34Feature[];
  dataText: string;
  trueStatement: string;
  falseStatements: string[];
  seed: number;
  names: string[];
  values: number[];
};

type Built = {
  subtype: M34Subtype;
  features: M34Feature[];
  dataText: string;
  trueStatement: string;
  falseStatements: string[];
  names: string[];
  values: number[];
  question: string;
  explanation: string;
};

const NAMES = ['Аня', 'Боря', 'Витя', 'Галя', 'Дима'] as const;
const MAX_ATTEMPTS = 120;

function allowedSubtypes(difficulty: Level): M34Subtype[] {
  if (difficulty === 1) return ['one_cell'];
  if (difficulty === 2) return ['compare_two'];
  return ['and_or'];
}

function resolveSubtype(difficulty: Level, requested: M34Subtype | undefined, rng: SeededRng): M34Subtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function isValidM34Level(
  params: { subtype: M34Subtype; features: readonly M34Feature[] },
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    return params.subtype === 'one_cell' && params.features.includes('single_fact');
  }
  if (difficulty === 2) {
    return params.subtype === 'compare_two' && params.features.includes('two_values');
  }
  return (
    params.subtype === 'and_or' &&
    (params.features.includes('and_condition') || params.features.includes('or_condition'))
  );
}

function twoDistinctNames(rng: SeededRng): [string, string] {
  const a = pickOne(rng, NAMES);
  const rest = NAMES.filter((n) => n !== a);
  const b = pickOne(rng, rest);
  return [a, b];
}

function buildL1(rng: SeededRng): Built | null {
  const name = pickOne(rng, NAMES);
  const value = randomInt(rng, 5, 40);
  const wrongValue = value + pickOne(rng, [1, 2, 3, 5, 10]);
  const other = pickOne(
    rng,
    NAMES.filter((n) => n !== name),
  );
  const dataText = `В таблице результатов: ${name} — ${value} баллов.`;
  const trueStatement = `У ученика ${name} — ${value} баллов.`;
  const falseStatements = [
    `У ученика ${name} — ${wrongValue} баллов.`,
    `У ученика ${other} — ${value} баллов.`,
    `У ученика ${name} меньше ${Math.max(1, value - 5)} баллов.`,
  ];
  return {
    subtype: 'one_cell',
    features: ['single_fact'],
    dataText,
    trueStatement,
    falseStatements,
    names: [name],
    values: [value],
    question: `${dataText}\nКакое утверждение верно?`,
    explanation: `По данным таблицы у ${name} ровно ${value} баллов. Верно: «${trueStatement}».`,
  };
}

function buildL2(rng: SeededRng): Built | null {
  const [a, b] = twoDistinctNames(rng);
  let va = randomInt(rng, 10, 50);
  let vb = randomInt(rng, 10, 50);
  if (va === vb) vb += 3;
  const dataText = `Результаты: ${a} — ${va}, ${b} — ${vb}.`;
  const aBigger = va > vb;
  const trueStatement = aBigger ? `${a} набрала больше, чем ${b}.` : `${b} набрал(а) больше, чем ${a}.`;
  const falseStatements = [
    aBigger ? `${b} набрал(а) больше, чем ${a}.` : `${a} набрала больше, чем ${b}.`,
    `${a} и ${b} набрали поровну.`,
    `${a} набрала ${vb} баллов.`,
  ];
  return {
    subtype: 'compare_two',
    features: ['two_values'],
    dataText,
    trueStatement,
    falseStatements,
    names: [a, b],
    values: [va, vb],
    question: `${dataText}\nКакое утверждение верно?`,
    explanation: `Сравниваем ${va} и ${vb}. Верно: «${trueStatement}».`,
  };
}

function buildL3(rng: SeededRng): Built | null {
  const name = pickOne(rng, NAMES);
  const value = pickOne(rng, [8, 12, 15, 16, 18, 21, 24, 27, 30, 35]);
  const useAnd = pickOne(rng, [true, false]);
  const even = value % 2 === 0;
  const greater10 = value > 10;
  const dataText = `Дано число: ${value}.`;

  if (useAnd) {
    const trueOk = even && greater10;
    // подбираем число, где оба условия истинны, иначе перегенерируем
    if (!trueOk) return null;
    const trueStatement = `Число ${value} чётное и больше 10.`;
    const falseStatements = [
      `Число ${value} нечётное и больше 10.`,
      `Число ${value} чётное и меньше 10.`,
      `Число ${value} меньше 5 и чётное.`,
    ];
    return {
      subtype: 'and_or',
      features: ['and_condition'],
      dataText,
      trueStatement,
      falseStatements,
      names: [name],
      values: [value],
      question: `${dataText}\nКакое утверждение верно?`,
      explanation: `${value} чётное (${even}) и больше 10 (${greater10}). Верно: «${trueStatement}».`,
    };
  }

  // или: верно, если хотя бы одно
  const trueStatement = `Число ${value} чётное или больше 20.`;
  const evenOrBig = even || value > 20;
  if (!evenOrBig) return null;
  const falseStatements = [
    `Число ${value} нечётное и меньше 5.`,
    `Число ${value} равно 0.`,
    `Число ${value} отрицательное.`,
  ];
  return {
    subtype: 'and_or',
    features: ['or_condition'],
    dataText,
    trueStatement,
    falseStatements,
    names: [name],
    values: [value],
    question: `${dataText}\nКакое утверждение верно?`,
    explanation: `Проверяем «или»: чётность=${even}, >20=${value > 20}. Верно: «${trueStatement}».`,
  };
}

function buildCase(rng: SeededRng, difficulty: Level, _subtype: M34Subtype): Built | null {
  if (difficulty === 1) return buildL1(rng);
  if (difficulty === 2) return buildL2(rng);
  return buildL3(rng);
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  if (!isValidM34Level({ subtype: built.subtype, features: built.features }, difficulty)) {
    throw new Error(`M34: невалидный L${difficulty}`);
  }
  if (built.falseStatements.length < 3) {
    throw new Error('M34: мало ложных утверждений');
  }
  const distractors = uniqueDistractorsFromModels(
    built.trueStatement,
    built.falseStatements,
    rng,
    3,
  );
  if (distractors.length !== 3) {
    throw new Error('M34: дистракторы');
  }
  // M34 всегда singleChoice по PROJECT_DECISION
  return baseTask({
    id: `generated-m34-${difficulty}-${built.subtype}-${built.values.join('-')}-${seed}`,
    section: 'Логические задачи',
    topic: 'Логические задачи',
    skill: 'Истинные и ложные утверждения',
    topicId: M34_TOPIC_ID,
    skillId: M34_SKILL_ID,
    difficulty,
    taskType: 'singleChoice',
    question: built.question,
    correctAnswer: built.trueStatement,
    answers: buildChoiceAnswers(built.trueStatement, distractors, rng),
    explanation: built.explanation,
    generatorId: M34_GENERATOR_ID,
    generatorParams: {
      subtype: built.subtype,
      features: built.features,
      dataText: built.dataText,
      trueStatement: built.trueStatement,
      falseStatements: built.falseStatements,
      seed,
      names: built.names,
      values: built.values,
    } satisfies M34GeneratorParams,
    hint1: 'Сверь каждое утверждение с данными.',
    hint2: 'Для «и» нужны оба условия; для «или» — хотя бы одно.',
    hint3: `Верно: ${built.trueStatement}`,
  });
}

export function fingerprintM34(task: Task): string {
  const p = task.generatorParams as M34GeneratorParams;
  return `${p.subtype}|${p.dataText}|${p.trueStatement}`;
}

export function generateM34Task(options: M34GenerateOptions): Task {
  rejectAdvancedLevels('M34', options.difficulty);
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
  throw new Error(`M34: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM34Series(options: M34SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM34Task({ difficulty, seed, subtype: subtypes[index % subtypes.length] });
    },
    fingerprintM34,
    'M34',
  );
}
