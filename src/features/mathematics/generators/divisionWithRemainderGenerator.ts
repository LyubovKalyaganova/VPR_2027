/**
 * Генератор M07: деление с остатком.
 * Контракт: M07_GENERATOR_SPEC.md
 * Педагогические границы: CONTENT_MATRIX_MATH.md, карточка M07.
 */
import type { Difficulty, Task } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export const M07_SKILL_ID = 'math.calculation.mul_div.division_remainder' as const;
export const M07_TOPIC_ID = 'math.calculation.mul_div' as const;
export const M07_GENERATOR_ID = 'gen.math.mul_div.division_remainder' as const;

export type DivisionRemainderSubtype =
  | 'small_obvious'
  | 'typical_written'
  | 'with_zero_in_dividend'
  | 'near_divisor'
  | 'largest_with_remainder';

export type DivisionRemainderFeature =
  | DivisionRemainderSubtype
  | 'near_remainder'
  | 'obvious_remainder'
  | 'multi_step'
  | 'zero_inside_dividend'
  | 'intermediate_remainder'
  | 'mixed_digits'
  | 'remainder_one'
  | 'remainder_max';

export type M07GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: DivisionRemainderSubtype;
};

export type M07SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M07GeneratorParams = {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  digitCounts: number[];
  hasZeros: boolean;
  hasIntermediateRemainder: boolean;
  intermediateRemainderCount: number;
  subtype: DivisionRemainderSubtype;
  features: DivisionRemainderFeature[];
  seed: number;
};

const SUBTYPE_TITLES: Record<DivisionRemainderSubtype, string> = {
  small_obvious: 'Малые числа, остаток очевиден',
  typical_written: 'Типовое деление с остатком',
  with_zero_in_dividend: 'Деление с остатком, нуль в делимом',
  near_divisor: 'Остаток рядом с делителем',
  largest_with_remainder: 'Наибольшее делимое с данным остатком',
};

const L1_SUBTYPES: DivisionRemainderSubtype[] = ['small_obvious'];
const L2_SUBTYPES: DivisionRemainderSubtype[] = ['typical_written', 'with_zero_in_dividend'];
const L3_SUBTYPES: DivisionRemainderSubtype[] = ['near_divisor', 'largest_with_remainder'];

const MAX_ATTEMPTS = 120;

function digitCount(value: number): number {
  return String(Math.abs(value)).length;
}

function hasZeroDigit(value: number): boolean {
  return String(Math.abs(value)).includes('0');
}

export function formatQuotientRemainder(quotient: number, remainder: number): string {
  return `частное ${quotient}, остаток ${remainder}`;
}

export function divisionRemainderFingerprint(dividend: number, divisor: number): string {
  return `${dividend}r${divisor}`;
}

/** Итоговый остаток «рядом» с делителем (ловушка L3). */
export function isNearRemainder(remainder: number, divisor: number): boolean {
  if (remainder <= 0 || remainder >= divisor) {
    return false;
  }
  if (remainder === divisor - 1) {
    return true;
  }
  return divisor >= 5 && remainder === divisor - 2;
}

/** Остаток «очевиден» для L1. */
export function isObviousRemainder(remainder: number, divisor: number): boolean {
  if (remainder <= 0 || remainder >= divisor) {
    return false;
  }
  if (isNearRemainder(remainder, divisor)) {
    return false;
  }
  return remainder <= Math.floor((divisor - 1) / 2);
}

export function decomposeDivision(dividend: number, divisor: number): {
  quotient: number;
  remainder: number;
} {
  return {
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  };
}

export function verifyDivisionIdentity(
  dividend: number,
  divisor: number,
  quotient: number,
  remainder: number,
): boolean {
  return (
    divisor >= 2 &&
    dividend > divisor &&
    remainder > 0 &&
    remainder < divisor &&
    dividend === divisor * quotient + remainder &&
    dividend % divisor === remainder &&
    Math.floor(dividend / divisor) === quotient
  );
}

/** Подсчёт промежуточных остатков письменного деления (не итоговый remainder). */
export function countIntermediateRemainders(dividend: number, divisor: number): number {
  const digits = String(Math.abs(dividend))
    .split('')
    .map((char) => Number(char));
  let current = 0;
  let started = false;
  let count = 0;
  for (let index = 0; index < digits.length; index += 1) {
    current = current * 10 + (digits[index] as number);
    if (!started) {
      if (current < divisor && index < digits.length - 1) {
        continue;
      }
      started = true;
    }
    const qDigit = Math.floor(current / divisor);
    current -= qDigit * divisor;
    if (index < digits.length - 1 && current > 0) {
      count += 1;
    }
  }
  return count;
}

function obviousRemainders(divisor: number): number[] {
  const list: number[] = [];
  for (let rem = 1; rem < divisor; rem += 1) {
    if (isObviousRemainder(rem, divisor)) {
      list.push(rem);
    }
  }
  return list;
}

function notNearRemainders(divisor: number): number[] {
  const list: number[] = [];
  for (let rem = 1; rem < divisor; rem += 1) {
    if (!isNearRemainder(rem, divisor)) {
      list.push(rem);
    }
  }
  return list;
}

function nearRemainders(divisor: number): number[] {
  const list: number[] = [];
  for (let rem = 1; rem < divisor; rem += 1) {
    if (isNearRemainder(rem, divisor)) {
      list.push(rem);
    }
  }
  return list;
}

function allowedSubtypes(difficulty: 1 | 2 | 3): DivisionRemainderSubtype[] {
  if (difficulty === 1) {
    return L1_SUBTYPES;
  }
  if (difficulty === 2) {
    return L2_SUBTYPES;
  }
  return L3_SUBTYPES;
}

function resolveSubtype(
  difficulty: 1 | 2 | 3,
  requested: DivisionRemainderSubtype | undefined,
  rng: SeededRng,
): DivisionRemainderSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  if (difficulty === 1) {
    return 'small_obvious';
  }
  if (difficulty === 2) {
    return pickOne(rng, ['typical_written', 'typical_written', 'with_zero_in_dividend']);
  }
  return pickOne(rng, ['near_divisor', 'near_divisor', 'largest_with_remainder']);
}

function buildFromParts(divisor: number, quotient: number, remainder: number): [number, number] {
  return [divisor * quotient + remainder, divisor];
}

function buildL1(rng: SeededRng): [number, number] | null {
  // Делитель почти всегда 5–9: у 3–4 единственный obvious-остаток — 1.
  const divisor = pickOne(rng, [5, 6, 7, 8, 9, 5, 6, 7, 8, 9, 6, 7, 8, 9]);
  const rems = obviousRemainders(divisor);
  if (rems.length === 0) {
    return null;
  }
  // Не допускать постоянного шаблона remainder = 1: чаще брать 2…floor((d-1)/2).
  const nonOne = rems.filter((value) => value !== 1);
  const remPool =
    nonOne.length > 0
      ? randomInt(rng, 1, 100) <= 80
        ? nonOne
        : rems
      : rems;
  const remainder = pickOne(rng, remPool);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const quotient = randomInt(rng, 1, 9);
    const dividend = divisor * quotient + remainder;
    if (digitCount(dividend) === 2 && dividend > divisor) {
      return [dividend, divisor];
    }
  }
  return null;
}

function buildL2(rng: SeededRng, requireZero: boolean): [number, number] | null {
  const divisor = randomInt(rng, 2, 9);
  const rems = notNearRemainders(divisor);
  if (rems.length === 0) {
    return null;
  }
  const remainder = pickOne(rng, rems);
  const width = pickOne(rng, [3, 3, 4] as Array<3 | 4>);
  const minQ = width === 3 ? Math.max(10, Math.ceil((100 - remainder) / divisor)) : Math.max(10, Math.ceil((1000 - remainder) / divisor));
  const maxQ = width === 3 ? Math.floor((999 - remainder) / divisor) : Math.floor((9999 - remainder) / divisor);
  if (minQ > maxQ) {
    return null;
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const quotient = randomInt(rng, minQ, maxQ);
    const dividend = divisor * quotient + remainder;
    if (digitCount(dividend) !== width || dividend <= divisor) {
      continue;
    }
    const hasZero = hasZeroDigit(dividend);
    if (requireZero && !hasZero) {
      continue;
    }
    if (!requireZero && hasZero) {
      continue;
    }
    return [dividend, divisor];
  }
  return null;
}

function largestWithRemainder(width: 2 | 3 | 4, divisor: number, remainder: number): number | null {
  const maxNum = width === 2 ? 99 : width === 3 ? 999 : 9999;
  const minNum = width === 2 ? 10 : width === 3 ? 100 : 1000;
  let candidate = maxNum - ((maxNum - remainder) % divisor);
  if (candidate > maxNum) {
    candidate -= divisor;
  }
  while (candidate >= minNum) {
    if (candidate % divisor === remainder && candidate > divisor) {
      return candidate;
    }
    candidate -= divisor;
  }
  return null;
}

function buildL3(rng: SeededRng, subtype: DivisionRemainderSubtype): [number, number] | null {
  const divisor = randomInt(rng, 3, 9);
  const rems = nearRemainders(divisor);
  if (rems.length === 0) {
    return null;
  }
  const remainder = pickOne(rng, rems);

  if (subtype === 'largest_with_remainder') {
    const width = pickOne(rng, [2, 3, 3, 4] as Array<2 | 3 | 4>);
    const dividend = largestWithRemainder(width, divisor, remainder);
    if (dividend === null) {
      return null;
    }
    return [dividend, divisor];
  }

  const width = pickOne(rng, [2, 3, 3, 4] as Array<2 | 3 | 4>);
  const minQ = Math.max(2, Math.ceil(((width === 2 ? 10 : width === 3 ? 100 : 1000) - remainder) / divisor));
  const maxQ = Math.floor(((width === 2 ? 99 : width === 3 ? 999 : 9999) - remainder) / divisor);
  if (minQ > maxQ) {
    return null;
  }
  const quotient = randomInt(rng, minQ, maxQ);
  const [dividend] = buildFromParts(divisor, quotient, remainder);
  if (digitCount(dividend) !== width || dividend <= divisor) {
    return null;
  }
  return [dividend, divisor];
}

function buildPair(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: DivisionRemainderSubtype,
): [number, number] | null {
  if (difficulty === 1) {
    return buildL1(rng);
  }
  if (difficulty === 2) {
    return buildL2(rng, subtype === 'with_zero_in_dividend');
  }
  return buildL3(rng, subtype);
}

export function isValidM07Level(dividend: number, divisor: number, difficulty: 1 | 2 | 3): boolean {
  if (!Number.isInteger(dividend) || !Number.isInteger(divisor) || divisor < 2 || dividend <= divisor) {
    return false;
  }
  const { quotient, remainder } = decomposeDivision(dividend, divisor);
  if (!verifyDivisionIdentity(dividend, divisor, quotient, remainder)) {
    return false;
  }

  if (difficulty === 1) {
    return (
      digitCount(dividend) === 2 &&
      divisor >= 2 &&
      divisor <= 9 &&
      quotient >= 1 &&
      quotient <= 9 &&
      isObviousRemainder(remainder, divisor)
    );
  }

  if (difficulty === 2) {
    const digits = digitCount(dividend);
    return (
      digits >= 3 &&
      digits <= 4 &&
      divisor >= 2 &&
      divisor <= 9 &&
      quotient >= 10 &&
      !isNearRemainder(remainder, divisor)
    );
  }

  return divisor >= 3 && divisor <= 9 && isNearRemainder(remainder, divisor) && quotient >= 2;
}

function isTooEasyForLevel(dividend: number, divisor: number, difficulty: 1 | 2 | 3): boolean {
  if (difficulty === 2) {
    return isValidM07Level(dividend, divisor, 1);
  }
  if (difficulty === 3) {
    return isValidM07Level(dividend, divisor, 1) || isValidM07Level(dividend, divisor, 2);
  }
  return false;
}

function subtypeFits(subtype: DivisionRemainderSubtype, dividend: number, divisor: number): boolean {
  const { remainder } = decomposeDivision(dividend, divisor);
  switch (subtype) {
    case 'small_obvious':
      return digitCount(dividend) === 2 && isObviousRemainder(remainder, divisor);
    case 'typical_written':
      return digitCount(dividend) >= 3 && !hasZeroDigit(dividend) && !isNearRemainder(remainder, divisor);
    case 'with_zero_in_dividend':
      return hasZeroDigit(dividend) && digitCount(dividend) >= 3 && !isNearRemainder(remainder, divisor);
    case 'near_divisor':
      return isNearRemainder(remainder, divisor);
    case 'largest_with_remainder': {
      if (!isNearRemainder(remainder, divisor)) {
        return false;
      }
      const width = digitCount(dividend) as 2 | 3 | 4;
      if (width < 2 || width > 4) {
        return false;
      }
      return largestWithRemainder(width, divisor, remainder) === dividend;
    }
  }
}

export function collectFeatures(
  dividend: number,
  divisor: number,
  subtype: DivisionRemainderSubtype,
): DivisionRemainderFeature[] {
  const { quotient, remainder } = decomposeDivision(dividend, divisor);
  const intermediateCount = countIntermediateRemainders(dividend, divisor);
  const features: DivisionRemainderFeature[] = [];
  if (isNearRemainder(remainder, divisor)) {
    features.push('near_remainder');
  }
  if (isObviousRemainder(remainder, divisor)) {
    features.push('obvious_remainder');
  }
  if (quotient >= 10) {
    features.push('multi_step');
  }
  if (hasZeroDigit(dividend)) {
    features.push('zero_inside_dividend');
  }
  if (intermediateCount >= 1) {
    features.push('intermediate_remainder');
  }
  if (digitCount(dividend) !== digitCount(divisor)) {
    features.push('mixed_digits');
  }
  if (remainder === 1) {
    features.push('remainder_one');
  }
  if (remainder === divisor - 1) {
    features.push('remainder_max');
  }
  return features.filter((feature) => feature !== subtype);
}

function uniqueDistractors(
  dividend: number,
  divisor: number,
  quotient: number,
  remainder: number,
  rng: SeededRng,
): string[] {
  const correct = formatQuotientRemainder(quotient, remainder);
  const byKind: Record<string, string[]> = {
    forgot_remainder: [],
    swapped: [],
    wrong_quotient: [],
    wrong_remainder: [],
    illegal_remainder: [],
    check_fail: [],
  };

  const add = (kind: keyof typeof byKind, q: number, r: number) => {
    if (!Number.isInteger(q) || !Number.isInteger(r) || q < 0 || r < 0) {
      return;
    }
    const text = formatQuotientRemainder(q, r);
    if (text === correct || byKind[kind].includes(text)) {
      return;
    }
    byKind[kind].push(text);
  };

  add('forgot_remainder', quotient, 0);
  add('swapped', remainder, quotient);
  add('wrong_quotient', quotient + 1, remainder);
  if (quotient > 1) {
    add('wrong_quotient', quotient - 1, remainder);
  }
  add('wrong_quotient', quotient + 1, 0);
  add('wrong_remainder', quotient, remainder + 1);
  if (remainder > 1) {
    add('wrong_remainder', quotient, remainder - 1);
  }
  add('illegal_remainder', quotient, divisor);
  add('illegal_remainder', quotient, divisor + 1);
  add('illegal_remainder', quotient - 1, remainder + divisor);
  add('check_fail', Math.floor((dividend - 1) / divisor), (dividend - 1) % divisor || remainder);
  add('check_fail', quotient, divisor - 1 === remainder ? 1 : divisor - 1);

  const unique: string[] = [];
  const kindOrder = [
    'forgot_remainder',
    'swapped',
    'wrong_quotient',
    'wrong_remainder',
    'illegal_remainder',
    'check_fail',
  ];
  for (const kind of kindOrder) {
    const pool = shuffleSeeded(byKind[kind] ?? [], rng);
    const chosen = pool.find((value) => !unique.includes(value));
    if (chosen !== undefined) {
      unique.push(chosen);
    }
    if (unique.length === 3) {
      break;
    }
  }
  for (const value of shuffleSeeded(Object.values(byKind).flat(), rng)) {
    if (unique.length === 3) {
      break;
    }
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique.slice(0, 3);
}

function buildExplanation(dividend: number, divisor: number, quotient: number, remainder: number): string {
  return (
    `${dividend} = ${divisor} × ${quotient} + ${remainder}. ` +
    `Неполное частное ${quotient}, остаток ${remainder} ` +
    `(остаток меньше делителя: ${remainder} < ${divisor}).`
  );
}

function buildHints(
  _dividend: number,
  divisor: number,
  quotient: number,
  remainder: number,
): Pick<Task, 'hint1' | 'hint2' | 'hint3'> {
  return {
    hint1: 'Найди наибольшее целое число раз, сколько делитель «помещается» в делимое.',
    hint2: `Проверь: делитель × частное + остаток = делимое, и остаток меньше ${divisor}.`,
    hint3: formatQuotientRemainder(quotient, remainder) + `.`,
  };
}

function assertGeneratedM07(
  task: Task,
  expectedDifficulty: 1 | 2 | 3,
  requested: DivisionRemainderSubtype,
): void {
  const params = task.generatorParams as M07GeneratorParams | undefined;
  if (!params) {
    throw new Error('M07: нет generatorParams');
  }
  const { dividend, divisor, quotient, remainder } = params;
  if (remainder === 0) {
    throw new Error('M07: remainder === 0 недопустим');
  }
  if (!verifyDivisionIdentity(dividend, divisor, quotient, remainder)) {
    throw new Error(`M07: тождество не выполняется для ${dividend}÷${divisor}`);
  }
  const computed = decomposeDivision(dividend, divisor);
  if (computed.quotient !== quotient || computed.remainder !== remainder) {
    throw new Error('M07: quotient/remainder не совпадают с независимым пересчётом');
  }
  const expectedAnswer = formatQuotientRemainder(computed.quotient, computed.remainder);
  const recorded = String(task.correctAnswer);
  if (recorded !== expectedAnswer) {
    throw new Error(`M07: ответ «${recorded}» ≠ «${expectedAnswer}»`);
  }
  if (task.skillId !== M07_SKILL_ID) {
    throw new Error(`M07: неверный skillId ${task.skillId}`);
  }
  if (task.difficulty !== expectedDifficulty) {
    throw new Error('M07: неверный difficulty');
  }
  if (
    !isValidM07Level(dividend, divisor, expectedDifficulty) ||
    isTooEasyForLevel(dividend, divisor, expectedDifficulty)
  ) {
    throw new Error(`M07: ${dividend}÷${divisor} не соответствует уровню ${expectedDifficulty}`);
  }
  if (!subtypeFits(requested, dividend, divisor)) {
    throw new Error(`M07: подтип ${requested} не соответствует ${dividend}÷${divisor}`);
  }
  if (task.taskType === 'singleChoice') {
    const answers = task.answers ?? [];
    if (answers.length !== 4 || new Set(answers).size !== 4) {
      throw new Error('M07: нужны 4 уникальных варианта');
    }
    if (answers.filter((item) => item === expectedAnswer).length !== 1) {
      throw new Error('M07: должен быть ровно один правильный вариант');
    }
  }
}

function toTask(
  pair: [number, number],
  difficulty: 1 | 2 | 3,
  seed: number,
  rng: SeededRng,
  requested: DivisionRemainderSubtype,
): Task {
  const [dividend, divisor] = pair;
  const { quotient, remainder } = decomposeDivision(dividend, divisor);
  const intermediateRemainderCount = countIntermediateRemainders(dividend, divisor);
  const answerText = formatQuotientRemainder(quotient, remainder);
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const width = digitCount(dividend);
  const question =
    requested === 'largest_with_remainder'
      ? `Число ${dividend} — наибольшее ${width}-значное, которое при делении на ${divisor} даёт остаток ${remainder}. Раздели с остатком: ${dividend} ÷ ${divisor}. Найди неполное частное и остаток.`
      : `Раздели с остатком: ${dividend} ÷ ${divisor}. Найди неполное частное и остаток.`;
  const distractors = taskType === 'singleChoice' ? uniqueDistractors(dividend, divisor, quotient, remainder, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error(`M07: не удалось собрать дистракторы для ${dividend}÷${divisor}`);
  }
  const answers =
    taskType === 'singleChoice' ? shuffleSeeded([answerText, ...distractors], rng) : undefined;

  const task: Task = {
    id: `generated-m07-${difficulty}-${divisionRemainderFingerprint(dividend, divisor)}`,
    subject: 'mathematics',
    section: 'Вычисления',
    topic: 'Умножение и деление',
    skill: SUBTYPE_TITLES[requested],
    topicId: M07_TOPIC_ID,
    skillId: M07_SKILL_ID,
    difficulty,
    vprVersion: 2027,
    taskType,
    question,
    answers,
    correctAnswer: answerText,
    explanation: buildExplanation(dividend, divisor, quotient, remainder),
    ...buildHints(dividend, divisor, quotient, remainder),
    sourceType: 'generated',
    generatorId: M07_GENERATOR_ID,
    generatorParams: {
      dividend,
      divisor,
      quotient,
      remainder,
      digitCounts: [digitCount(dividend), digitCount(divisor)],
      hasZeros: hasZeroDigit(dividend) || hasZeroDigit(divisor),
      hasIntermediateRemainder: intermediateRemainderCount >= 1,
      intermediateRemainderCount,
      subtype: requested,
      features: collectFeatures(dividend, divisor, requested),
      seed,
    } satisfies M07GeneratorParams,
  };

  assertGeneratedM07(task, difficulty, requested);
  return task;
}

function tryBuild(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: DivisionRemainderSubtype,
): [number, number] | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pair = buildPair(rng, difficulty, subtype);
    if (!pair) {
      continue;
    }
    const [dividend, divisor] = pair;
    const { quotient, remainder } = decomposeDivision(dividend, divisor);
    if (remainder === 0) {
      continue;
    }
    if (!verifyDivisionIdentity(dividend, divisor, quotient, remainder)) {
      continue;
    }
    if (!isValidM07Level(dividend, divisor, difficulty) || isTooEasyForLevel(dividend, divisor, difficulty)) {
      continue;
    }
    if (!subtypeFits(subtype, dividend, divisor)) {
      continue;
    }
    return pair;
  }
  return null;
}

export function generateM07Task(options: M07GenerateOptions): Task {
  if (options.difficulty === 4 || options.difficulty === 5) {
    throw new Error(
      'Генератор M07 пока не создаёт уровни 4–5: L4 — формат ВПР, L5 — два вопроса (частное и остаток) плюс проверка.',
    );
  }
  if (options.difficulty !== 1 && options.difficulty !== 2 && options.difficulty !== 3) {
    throw new Error(`Генератор M07: неподдерживаемый уровень ${options.difficulty}`);
  }

  const rng = createSeededRng(options.seed >>> 0);
  const difficulty = options.difficulty;
  const requested = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const pair = tryBuild(rng, difficulty, requested);
    if (!pair) {
      continue;
    }
    try {
      return toTask(pair, difficulty, options.seed, rng, requested);
    } catch {
      continue;
    }
  }

  throw new Error(`Генератор M07: не удалось собрать задание уровня ${difficulty} (seed ${options.seed})`);
}

export function generateM07Series(options: M07SeriesOptions): Task[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const plan: Array<{ difficulty: 1 | 2 | 3; subtype: DivisionRemainderSubtype }> = [];

  const level1: DivisionRemainderSubtype[] = Array.from({ length: 10 }, () => 'small_obvious');
  const level2: DivisionRemainderSubtype[] = [
    'typical_written',
    'typical_written',
    'typical_written',
    'typical_written',
    'typical_written',
    'typical_written',
    'typical_written',
    'with_zero_in_dividend',
    'with_zero_in_dividend',
    'with_zero_in_dividend',
  ];
  const level3: DivisionRemainderSubtype[] = [
    'near_divisor',
    'near_divisor',
    'near_divisor',
    'near_divisor',
    'near_divisor',
    'near_divisor',
    'largest_with_remainder',
    'largest_with_remainder',
    'largest_with_remainder',
    'largest_with_remainder',
  ];

  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 1, subtype: level1[index % level1.length] as DivisionRemainderSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 2, subtype: level2[index % level2.length] as DivisionRemainderSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 3, subtype: level3[index % level3.length] as DivisionRemainderSubtype });
  }

  for (let index = 0; index < plan.length; index += 1) {
    const item = plan[index];
    if (!item) {
      continue;
    }
    let created: Task | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seed = (options.seed + (index + 1) * 997 + attempt * 7919) >>> 0;
      const task = generateM07Task({
        difficulty: item.difficulty,
        subtype: item.subtype,
        seed,
      });
      const params = task.generatorParams as M07GeneratorParams;
      const fingerprint = divisionRemainderFingerprint(params.dividend, params.divisor);
      if (seen.has(fingerprint)) {
        continue;
      }
      if (
        item.difficulty === 1 &&
        (isValidM07Level(params.dividend, params.divisor, 2) || isValidM07Level(params.dividend, params.divisor, 3))
      ) {
        continue;
      }
      if (
        item.difficulty === 2 &&
        (isValidM07Level(params.dividend, params.divisor, 1) || isValidM07Level(params.dividend, params.divisor, 3))
      ) {
        continue;
      }
      if (
        item.difficulty === 3 &&
        (isValidM07Level(params.dividend, params.divisor, 1) || isValidM07Level(params.dividend, params.divisor, 2))
      ) {
        continue;
      }
      seen.add(fingerprint);
      created = task;
      break;
    }
    if (!created) {
      throw new Error(`Генератор M07: не удалось получить уникальное задание №${index + 1}`);
    }
    tasks.push(created);
  }

  return tasks;
}
