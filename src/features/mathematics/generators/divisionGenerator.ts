/**
 * Генератор M06: деление нацело.
 * Контракт: M06_GENERATOR_SPEC.md
 * Педагогические границы: CONTENT_MATRIX_MATH.md, карточка M06.
 */
import type { Difficulty, Task } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export const M06_SKILL_ID = 'math.calculation.mul_div.division' as const;
export const M06_TOPIC_ID = 'math.calculation.mul_div' as const;
export const M06_GENERATOR_ID = 'gen.math.mul_div.division' as const;

export type DivisionSubtype =
  | 'table'
  | 'divide_by_10'
  | 'divide_by_100'
  | 'simple_exact'
  | 'written_one_digit'
  | 'with_zero_in_dividend'
  | 'zero_in_quotient'
  | 'two_digit_divisor';

export type DivisionFeature =
  | DivisionSubtype
  | 'intermediate_remainder'
  | 'multi_step'
  | 'first_step_wide'
  | 'zero_inside_dividend'
  | 'zero_in_quotient'
  | 'mixed_digits'
  | 'place_unit';

export type M06GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: DivisionSubtype;
};

export type M06SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M06GeneratorParams = {
  dividend: number;
  divisor: number;
  quotient: number;
  /** Итоговый остаток всего деления. Для M06 всегда 0. */
  remainder: number;
  digitCounts: number[];
  hasZeros: boolean;
  hasZeroInQuotient: boolean;
  /** Есть ли хотя бы один промежуточный остаток > 0 на шаге письменного деления. */
  hasIntermediateRemainder: boolean;
  /** Сколько раз на непоследнем шаге остался промежуточный остаток > 0. */
  intermediateRemainderCount: number;
  firstStepWidth: number;
  subtype: DivisionSubtype;
  features: DivisionFeature[];
  seed: number;
};

export type WrittenDivisionAnalysis = {
  quotient: number;
  /** Итоговый остаток: dividend % divisor. Для M06 должен быть 0. */
  remainder: number;
  dividendDigits: number;
  divisorDigits: number;
  quotientDigits: number;
  firstStepWidth: number;
  /** Число шагов, где после вычитания остался промежуточный остаток > 0. */
  intermediateRemainderCount: number;
  hasIntermediateRemainder: boolean;
  stepCount: number;
  hasZeroInQuotient: boolean;
  hasInternalZeroInQuotient: boolean;
  hasZeroInDividend: boolean;
  exact: boolean;
};

const SUBTYPE_TITLES: Record<DivisionSubtype, string> = {
  table: 'Табличное деление',
  divide_by_10: 'Деление на 10',
  divide_by_100: 'Деление на 100',
  simple_exact: 'Простое деление нацело',
  written_one_digit: 'Письменное деление на однозначное',
  with_zero_in_dividend: 'Деление с нулём в делимом',
  zero_in_quotient: 'Нуль в частном',
  two_digit_divisor: 'Письменное деление на двузначное',
};

const L1_SUBTYPES: DivisionSubtype[] = ['table', 'divide_by_10', 'divide_by_100', 'simple_exact'];
const L2_SUBTYPES: DivisionSubtype[] = ['written_one_digit', 'with_zero_in_dividend'];
const L3_SUBTYPES: DivisionSubtype[] = ['zero_in_quotient', 'two_digit_divisor'];

const TWO_DIGIT_DIVISORS = [12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 25, 26, 27, 28, 29] as const;
const MAX_ATTEMPTS = 120;

function digitCount(value: number): number {
  return String(Math.abs(value)).length;
}

function hasZeroDigit(value: number): boolean {
  return String(Math.abs(value)).includes('0');
}

function isPlaceUnit(value: number): boolean {
  return value === 10 || value === 100;
}

export function divisionFingerprint(dividend: number, divisor: number): string {
  return `${dividend}d${divisor}`;
}

export function divideExact(dividend: number, divisor: number): number {
  if (divisor === 0 || dividend % divisor !== 0) {
    throw new Error(`M06: ${dividend} не делится нацело на ${divisor}`);
  }
  return dividend / divisor;
}

export function analyzeWrittenDivision(dividend: number, divisor: number): WrittenDivisionAnalysis {
  const remainder = dividend % divisor;
  const quotient = Math.trunc(dividend / divisor);
  const digits = String(Math.abs(dividend))
    .split('')
    .map((char) => Number(char));
  let current = 0;
  let started = false;
  let firstStepWidth = digits.length;
  let intermediateRemainderCount = 0;
  const produced: number[] = [];

  for (let index = 0; index < digits.length; index += 1) {
    current = current * 10 + (digits[index] as number);
    if (!started) {
      if (current < divisor && index < digits.length - 1) {
        continue;
      }
      started = true;
      firstStepWidth = index + 1;
    }
    const qDigit = Math.floor(current / divisor);
    produced.push(qDigit);
    current -= qDigit * divisor;
    // Промежуточный остаток шага (не итоговый remainder).
    if (index < digits.length - 1 && current > 0) {
      intermediateRemainderCount += 1;
    }
  }

  const quotientText = String(Math.abs(quotient));
  return {
    quotient,
    remainder,
    dividendDigits: digitCount(dividend),
    divisorDigits: digitCount(divisor),
    quotientDigits: digitCount(quotient),
    firstStepWidth,
    intermediateRemainderCount,
    hasIntermediateRemainder: intermediateRemainderCount >= 1,
    stepCount: produced.length,
    hasZeroInQuotient: quotientText.includes('0'),
    hasInternalZeroInQuotient: quotientText.slice(0, -1).includes('0'),
    hasZeroInDividend: hasZeroDigit(dividend),
    exact: remainder === 0,
  };
}

function allowedSubtypes(difficulty: 1 | 2 | 3): DivisionSubtype[] {
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
  requested: DivisionSubtype | undefined,
  rng: SeededRng,
): DivisionSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  if (difficulty === 1) {
    return pickOne(rng, ['table', 'table', 'divide_by_10', 'simple_exact', 'simple_exact']);
  }
  if (difficulty === 2) {
    return pickOne(rng, ['written_one_digit', 'written_one_digit', 'with_zero_in_dividend']);
  }
  return pickOne(rng, ['zero_in_quotient', 'two_digit_divisor']);
}

function noZeroTwoDigit(rng: SeededRng, min: number, max: number): number {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const tens = randomInt(rng, Math.max(1, Math.floor(min / 10)), Math.min(9, Math.floor(max / 10)));
    const ones = randomInt(rng, 1, 9);
    const value = tens * 10 + ones;
    if (value >= min && value <= max && !hasZeroDigit(value)) {
      return value;
    }
  }
  return 24;
}

function buildTable(rng: SeededRng): [number, number] {
  const divisor = randomInt(rng, 2, 9);
  const quotient = randomInt(rng, 2, 9);
  const dividend = divisor * quotient;
  if (digitCount(dividend) !== 2) {
    return [56, 7];
  }
  return [dividend, divisor];
}

function buildSimpleExact(rng: SeededRng): [number, number] | null {
  if (pickOne(rng, [true, false, true])) {
    const divisor = randomInt(rng, 3, 9);
    const q1Max = Math.floor(9 / divisor);
    const q2Max = Math.floor(9 / divisor);
    if (q1Max >= 1 && q2Max >= 1) {
      const q1 = randomInt(rng, 1, q1Max);
      const q2 = randomInt(rng, 1, q2Max);
      const dividend = q1 * divisor * 10 + q2 * divisor;
      if (dividend >= 66 && digitCount(dividend) === 2) {
        return [dividend, divisor];
      }
    }
  }

  const divisor = randomInt(rng, 2, 9);
  const q1Min = Math.ceil(10 / divisor);
  const q1Max = Math.min(9, Math.floor(99 / divisor));
  const q2Max = Math.floor(9 / divisor);
  if (q1Min > q1Max || q2Max < 1) {
    return null;
  }
  const q1 = randomInt(rng, q1Min, q1Max);
  const q2 = randomInt(rng, 1, q2Max);
  const head = q1 * divisor;
  const tail = q2 * divisor;
  if (digitCount(head) !== 2 || digitCount(tail) !== 1) {
    return null;
  }
  return [head * 10 + tail, divisor];
}

function buildByPlace(rng: SeededRng, place: 10 | 100): [number, number] {
  if (place === 10) {
    const quotient = randomInt(rng, 2, 99);
    return [quotient * 10, 10];
  }
  const quotient = randomInt(rng, 2, 20);
  return [quotient * 100, 100];
}

function candidatesWithLastDigit(
  prefix: number,
  divisor: number,
  width: number,
): number[] {
  const found: number[] = [];
  for (let last = 0; last <= 9; last += 1) {
    const dividend = prefix * 10 + last;
    if (digitCount(dividend) !== width || dividend % divisor !== 0) {
      continue;
    }
    found.push(dividend);
  }
  return found;
}

function buildWrittenOneDigit(
  rng: SeededRng,
  width: 3 | 4,
  requireZeroInDividend: boolean,
): [number, number] | null {
  const divisor = randomInt(rng, 2, 9);
  const digits: number[] = [randomInt(rng, 1, 9)];
  while (digits.length < width - 1) {
    if (requireZeroInDividend && !digits.includes(0) && digits.length === 1) {
      digits.push(0);
    } else {
      digits.push(randomInt(rng, requireZeroInDividend ? 0 : 1, 9));
    }
  }
  const prefix = Number(digits.join(''));
  const matches = candidatesWithLastDigit(prefix, divisor, width).filter((dividend) => {
    const analysis = analyzeWrittenDivision(dividend, divisor);
    if (!analysis.exact || analysis.intermediateRemainderCount < 1 || analysis.hasZeroInQuotient) {
      return false;
    }
    if (width === 3 && (analysis.quotient < 40 || analysis.intermediateRemainderCount < 2)) {
      return false;
    }
    if (width === 4 && analysis.quotient < 25) {
      return false;
    }
    if (requireZeroInDividend) {
      return analysis.hasZeroInDividend;
    }
    return !analysis.hasZeroInDividend;
  });
  if (matches.length === 0) {
    return null;
  }
  return [pickOne(rng, matches), divisor];
}

function buildZeroInQuotient(rng: SeededRng): [number, number] | null {
  const divisor = randomInt(rng, 2, 9);
  const qMin = Math.max(101, Math.ceil(1000 / divisor));
  const qMax = Math.min(909, Math.floor(9999 / divisor));
  const options: number[] = [];
  for (let leading = 1; leading <= 9; leading += 1) {
    for (let ones = 1; ones <= 9; ones += 1) {
      const quotient = leading * 100 + ones;
      if (quotient >= qMin && quotient <= qMax) {
        options.push(quotient);
      }
    }
  }
  if (options.length === 0) {
    return null;
  }
  const quotient = pickOne(rng, options);
  return [divisor * quotient, divisor];
}

function buildTwoDigitDivisor(rng: SeededRng): [number, number] | null {
  const divisor = pickOne(rng, TWO_DIGIT_DIVISORS);
  const width = pickOne(rng, [3, 4, 4] as Array<3 | 4>);
  const qMin = width === 3 ? Math.max(40, Math.ceil(100 / divisor)) : Math.max(40, Math.ceil(1000 / divisor));
  const qMax = width === 3 ? Math.min(99, Math.floor(999 / divisor)) : Math.min(400, Math.floor(9999 / divisor));
  if (qMin > qMax) {
    return null;
  }
  const quotient = noZeroTwoDigit(rng, qMin, Math.min(qMax, width === 3 ? 99 : 250));
  if (quotient < qMin || quotient > qMax) {
    return null;
  }
  const dividend = divisor * quotient;
  if (digitCount(dividend) !== width) {
    return null;
  }
  return [dividend, divisor];
}

function buildPair(rng: SeededRng, difficulty: 1 | 2 | 3, subtype: DivisionSubtype): [number, number] | null {
  if (difficulty === 1) {
    if (subtype === 'divide_by_10') {
      return buildByPlace(rng, 10);
    }
    if (subtype === 'divide_by_100') {
      return buildByPlace(rng, 100);
    }
    if (subtype === 'simple_exact') {
      return buildSimpleExact(rng);
    }
    return buildTable(rng);
  }

  if (difficulty === 2) {
    const width = pickOne(rng, [3, 4, 4, 4] as Array<3 | 4>);
    return buildWrittenOneDigit(rng, width, subtype === 'with_zero_in_dividend');
  }

  if (subtype === 'two_digit_divisor') {
    return buildTwoDigitDivisor(rng);
  }
  return buildZeroInQuotient(rng);
}

export function isValidM06Level(dividend: number, divisor: number, difficulty: 1 | 2 | 3): boolean {
  if (!Number.isInteger(dividend) || !Number.isInteger(divisor) || dividend <= 0 || divisor < 2) {
    return false;
  }
  if (dividend % divisor !== 0) {
    return false;
  }

  const analysis = analyzeWrittenDivision(dividend, divisor);
  const quotient = analysis.quotient;

  if (difficulty === 1) {
    const table = divisor >= 2 && divisor <= 9 && quotient >= 2 && quotient <= 9 && analysis.dividendDigits === 2;
    const by10 = divisor === 10 && dividend >= 20 && dividend <= 990 && dividend % 10 === 0;
    const by100 = divisor === 100 && quotient >= 2 && quotient <= 20;
    const simple =
      divisor >= 2 &&
      divisor <= 9 &&
      analysis.dividendDigits >= 2 &&
      analysis.dividendDigits <= 3 &&
      analysis.quotientDigits === 2 &&
      analysis.intermediateRemainderCount === 0 &&
      !analysis.hasZeroInQuotient &&
      !analysis.hasZeroInDividend &&
      (analysis.dividendDigits === 3 || dividend >= 66);
    return table || by10 || by100 || simple;
  }

  if (difficulty === 2) {
    if (divisor < 2 || divisor > 9) {
      return false;
    }
    if (analysis.dividendDigits < 3 || analysis.dividendDigits > 4) {
      return false;
    }
    if (analysis.hasZeroInQuotient || !analysis.hasIntermediateRemainder) {
      return false;
    }
    if (analysis.dividendDigits === 3) {
      return analysis.quotient >= 40 && analysis.intermediateRemainderCount >= 2;
    }
    return analysis.quotient >= 25;
  }

  const zeroInQuotient =
    divisor >= 2 &&
    divisor <= 9 &&
    analysis.dividendDigits === 4 &&
    analysis.hasZeroInQuotient;
  const twoDigit =
    digitCount(divisor) === 2 &&
    divisor >= 12 &&
    divisor <= 29 &&
    !hasZeroDigit(divisor) &&
    analysis.dividendDigits >= 3 &&
    analysis.dividendDigits <= 4 &&
    analysis.quotient >= 40;
  return zeroInQuotient || twoDigit;
}

function isTooEasyForLevel(dividend: number, divisor: number, difficulty: 1 | 2 | 3): boolean {
  if (difficulty === 2) {
    return isValidM06Level(dividend, divisor, 1);
  }
  if (difficulty === 3) {
    return isValidM06Level(dividend, divisor, 1) || isValidM06Level(dividend, divisor, 2);
  }
  return false;
}

function subtypeFits(subtype: DivisionSubtype, dividend: number, divisor: number): boolean {
  const analysis = analyzeWrittenDivision(dividend, divisor);
  switch (subtype) {
    case 'table':
      return divisor >= 2 && divisor <= 9 && analysis.quotient >= 2 && analysis.quotient <= 9 && analysis.dividendDigits === 2;
    case 'divide_by_10':
      return divisor === 10;
    case 'divide_by_100':
      return divisor === 100;
    case 'simple_exact':
      return (
        divisor >= 2 &&
        divisor <= 9 &&
        analysis.quotientDigits === 2 &&
        analysis.intermediateRemainderCount === 0 &&
        analysis.dividendDigits >= 2 &&
        analysis.dividendDigits <= 3
      );
    case 'written_one_digit':
      return (
        divisor >= 2 &&
        divisor <= 9 &&
        analysis.hasIntermediateRemainder &&
        !analysis.hasZeroInDividend &&
        !analysis.hasZeroInQuotient &&
        isValidM06Level(dividend, divisor, 2)
      );
    case 'with_zero_in_dividend':
      return (
        analysis.hasZeroInDividend &&
        analysis.hasIntermediateRemainder &&
        !analysis.hasZeroInQuotient &&
        divisor <= 9 &&
        isValidM06Level(dividend, divisor, 2)
      );
    case 'zero_in_quotient':
      return analysis.hasZeroInQuotient && divisor >= 2 && divisor <= 9 && analysis.dividendDigits === 4;
    case 'two_digit_divisor':
      return digitCount(divisor) === 2 && divisor >= 12 && analysis.quotient >= 40;
  }
}

export function collectFeatures(
  dividend: number,
  divisor: number,
  subtype: DivisionSubtype,
): DivisionFeature[] {
  const analysis = analyzeWrittenDivision(dividend, divisor);
  const features: DivisionFeature[] = [];
  if (analysis.hasIntermediateRemainder) {
    features.push('intermediate_remainder');
  }
  if (analysis.quotientDigits >= 2) {
    features.push('multi_step');
  }
  if (analysis.firstStepWidth >= 2) {
    features.push('first_step_wide');
  }
  if (analysis.hasZeroInDividend) {
    features.push('zero_inside_dividend');
  }
  if (analysis.hasZeroInQuotient) {
    features.push('zero_in_quotient');
  }
  if (analysis.dividendDigits !== analysis.divisorDigits) {
    features.push('mixed_digits');
  }
  if (isPlaceUnit(divisor)) {
    features.push('place_unit');
  }
  return features.filter((feature) => feature !== subtype);
}

function uniqueDistractors(dividend: number, divisor: number, rng: SeededRng): string[] {
  const quotient = divideExact(dividend, divisor);
  const analysis = analyzeWrittenDivision(dividend, divisor);
  const byKind: Record<string, number[]> = {
    digit_slip: [],
    wrong_step: [],
    forgot_bring_down: [],
    skipped_zero: [],
    place_error: [],
    neighbor: [],
  };

  const plausible = (value: number): boolean => {
    if (!Number.isInteger(value) || value <= 0 || value === quotient) {
      return false;
    }
    if (quotient >= 10) {
      if (value < Math.max(10, Math.floor(quotient / 5))) {
        return false;
      }
      if (digitCount(value) < digitCount(quotient) - 1) {
        return false;
      }
    }
    return true;
  };

  const add = (kind: keyof typeof byKind, value: number | null | undefined) => {
    if (value === null || value === undefined || !plausible(value)) {
      return;
    }
    if (!byKind[kind].includes(value)) {
      byKind[kind].push(value);
    }
  };

  const text = String(quotient);
  for (let index = 0; index < text.length; index += 1) {
    const current = Number(text[index]);
    for (const delta of [-1, 1]) {
      const digit = current + delta;
      if (digit < 0 || digit > 9 || (index === 0 && digit === 0)) {
        continue;
      }
      const chars = text.split('');
      chars[index] = String(digit);
      add('digit_slip', Number(chars.join('')));
    }
  }

  add('wrong_step', quotient + 1);
  add('wrong_step', quotient > 1 ? quotient - 1 : null);
  add('wrong_step', Math.trunc(dividend / Math.max(2, divisor + 1)));
  add('wrong_step', divisor > 2 ? Math.trunc(dividend / (divisor - 1)) : null);

  const prefix = Number(String(dividend).slice(0, analysis.firstStepWidth));
  add('forgot_bring_down', Math.floor(prefix / divisor));
  if (quotient >= 10) {
    add('forgot_bring_down', Math.floor(quotient / 10) >= 10 ? Math.floor(quotient / 10) : null);
    add('forgot_bring_down', quotient * 10 + (dividend % 10));
  }
  const droppedLast = Number(String(dividend).slice(0, -1));
  if (droppedLast >= divisor) {
    const truncated = Math.floor(droppedLast / divisor);
    if (digitCount(truncated) >= digitCount(quotient) - 1) {
      add('forgot_bring_down', truncated);
    }
  }

  if (analysis.hasZeroInQuotient) {
    const skipped = Number(text.split('0').join(''));
    add('skipped_zero', skipped);
    add('skipped_zero', Number(text.replace('0', '')));
    add('skipped_zero', quotient * 10);
  }

  add('place_error', quotient * 10);
  if (quotient % 10 === 0 && quotient / 10 >= 10) {
    add('place_error', quotient / 10);
  }
  if (text.length >= 2) {
    add('place_error', Number(`${text.slice(0, -1)}0${text.slice(-1)}`));
  }

  if (analysis.quotientDigits === 1) {
    add('neighbor', quotient + 1);
    add('neighbor', Math.max(1, quotient - 1));
  }

  const unique: number[] = [];
  const kindOrder = [
    'digit_slip',
    'wrong_step',
    'forgot_bring_down',
    'skipped_zero',
    'place_error',
    'neighbor',
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
  return unique.slice(0, 3).map(String);
}

function buildExplanation(dividend: number, divisor: number, quotient: number): string {
  if (divisor === 10 || divisor === 100) {
    return `При делении на ${divisor} отбрасывают нули в конце. ${dividend} ÷ ${divisor} = ${quotient}.`;
  }
  if (divisor >= 2 && divisor <= 9 && quotient >= 2 && quotient <= 9 && digitCount(dividend) === 2) {
    return `По таблице умножения ${divisor} × ${quotient} = ${dividend}, поэтому ${dividend} ÷ ${divisor} = ${quotient}.`;
  }
  if (digitCount(divisor) === 2) {
    return `Делим ${dividend} на ${divisor} письменно. Проверка: ${divisor} × ${quotient} = ${dividend}.`;
  }
  return `Делим ${dividend} на ${divisor} письменно, на каждом шаге подбирая цифру частного. Получается ${quotient}. Проверка: ${divisor} × ${quotient} = ${dividend}.`;
}

function buildHints(dividend: number, divisor: number, quotient: number): Pick<Task, 'hint1' | 'hint2' | 'hint3'> {
  return {
    hint1: 'Это деление нацело: остатка быть не должно.',
    hint2: `Проверь умножением: делитель × частное должно дать ${dividend}.`,
    hint3: `${dividend} ÷ ${divisor} = ${quotient}.`,
  };
}

function assertGeneratedM06(task: Task, expectedDifficulty: 1 | 2 | 3, requested: DivisionSubtype): void {
  const params = task.generatorParams as M06GeneratorParams | undefined;
  if (!params) {
    throw new Error('M06: нет generatorParams');
  }
  const { dividend, divisor, remainder } = params;
  if (dividend % divisor !== 0) {
    throw new Error(`M06: ${dividend} не делится нацело на ${divisor}`);
  }
  const computed = divideExact(dividend, divisor);
  const recorded =
    typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
  if (recorded !== computed || params.quotient !== computed || remainder !== 0) {
    throw new Error(`M06: ответ ${recorded} не равен частному ${computed}`);
  }
  if (task.skillId !== M06_SKILL_ID) {
    throw new Error(`M06: неверный skillId ${task.skillId}`);
  }
  if (task.difficulty !== expectedDifficulty) {
    throw new Error('M06: неверный difficulty');
  }
  if (!isValidM06Level(dividend, divisor, expectedDifficulty) || isTooEasyForLevel(dividend, divisor, expectedDifficulty)) {
    throw new Error(`M06: ${dividend}÷${divisor} не соответствует уровню ${expectedDifficulty}`);
  }
  if (!subtypeFits(requested, dividend, divisor)) {
    throw new Error(`M06: подтип ${requested} не соответствует ${dividend}÷${divisor}`);
  }
  if (task.taskType === 'singleChoice') {
    const answers = task.answers ?? [];
    if (answers.length !== 4 || new Set(answers).size !== 4) {
      throw new Error('M06: нужны 4 уникальных варианта');
    }
    if (answers.filter((item) => item === String(computed)).length !== 1) {
      throw new Error('M06: должен быть ровно один правильный вариант');
    }
  }
}

function toTask(
  pair: [number, number],
  difficulty: 1 | 2 | 3,
  seed: number,
  rng: SeededRng,
  requested: DivisionSubtype,
): Task {
  const [dividend, divisor] = pair;
  const analysis = analyzeWrittenDivision(dividend, divisor);
  const quotient = divideExact(dividend, divisor);
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const question = `Найди частное: ${dividend} ÷ ${divisor}.`;
  const distractors = taskType === 'singleChoice' ? uniqueDistractors(dividend, divisor, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error(`M06: не удалось собрать дистракторы для ${dividend}÷${divisor}`);
  }
  const answers =
    taskType === 'singleChoice' ? shuffleSeeded([String(quotient), ...distractors], rng) : undefined;

  const task: Task = {
    id: `generated-m06-${difficulty}-${divisionFingerprint(dividend, divisor)}`,
    subject: 'mathematics',
    section: 'Вычисления',
    topic: 'Умножение и деление',
    skill: SUBTYPE_TITLES[requested],
    topicId: M06_TOPIC_ID,
    skillId: M06_SKILL_ID,
    difficulty,
    vprVersion: 2027,
    taskType,
    question,
    answers,
    correctAnswer: taskType === 'numberAnswer' ? quotient : String(quotient),
    explanation: buildExplanation(dividend, divisor, quotient),
    ...buildHints(dividend, divisor, quotient),
    sourceType: 'generated',
    generatorId: M06_GENERATOR_ID,
    generatorParams: {
      dividend,
      divisor,
      quotient,
      remainder: 0,
      digitCounts: [digitCount(dividend), digitCount(divisor)],
      hasZeros: hasZeroDigit(dividend) || hasZeroDigit(divisor),
      hasZeroInQuotient: analysis.hasZeroInQuotient,
      hasIntermediateRemainder: analysis.hasIntermediateRemainder,
      intermediateRemainderCount: analysis.intermediateRemainderCount,
      firstStepWidth: analysis.firstStepWidth,
      subtype: requested,
      features: collectFeatures(dividend, divisor, requested),
      seed,
    } satisfies M06GeneratorParams,
  };

  assertGeneratedM06(task, difficulty, requested);
  return task;
}

function tryBuild(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: DivisionSubtype,
): [number, number] | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pair = buildPair(rng, difficulty, subtype);
    if (!pair) {
      continue;
    }
    const [dividend, divisor] = pair;
    if (dividend % divisor !== 0) {
      continue;
    }
    if (!isValidM06Level(dividend, divisor, difficulty) || isTooEasyForLevel(dividend, divisor, difficulty)) {
      continue;
    }
    if (!subtypeFits(subtype, dividend, divisor)) {
      continue;
    }
    return pair;
  }
  return null;
}

export function generateM06Task(options: M06GenerateOptions): Task {
  if (options.difficulty === 4 || options.difficulty === 5) {
    throw new Error(
      'Генератор M06 пока не создаёт уровни 4–5: L4 — формат ВПР, L5 — выбор верного частного / поиск ошибки в записи.',
    );
  }
  if (options.difficulty !== 1 && options.difficulty !== 2 && options.difficulty !== 3) {
    throw new Error(`Генератор M06: неподдерживаемый уровень ${options.difficulty}`);
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

  throw new Error(`Генератор M06: не удалось собрать задание уровня ${difficulty} (seed ${options.seed})`);
}

export function generateM06Series(options: M06SeriesOptions): Task[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const plan: Array<{ difficulty: 1 | 2 | 3; subtype: DivisionSubtype }> = [];

  const level1: DivisionSubtype[] = [
    'table',
    'table',
    'table',
    'divide_by_10',
    'divide_by_10',
    'divide_by_10',
    'simple_exact',
    'simple_exact',
    'simple_exact',
    'simple_exact',
  ];
  const level2: DivisionSubtype[] = [
    'written_one_digit',
    'written_one_digit',
    'written_one_digit',
    'written_one_digit',
    'written_one_digit',
    'written_one_digit',
    'written_one_digit',
    'with_zero_in_dividend',
    'with_zero_in_dividend',
    'with_zero_in_dividend',
  ];
  const level3: DivisionSubtype[] = [
    'zero_in_quotient',
    'zero_in_quotient',
    'zero_in_quotient',
    'zero_in_quotient',
    'zero_in_quotient',
    'two_digit_divisor',
    'two_digit_divisor',
    'two_digit_divisor',
    'two_digit_divisor',
    'two_digit_divisor',
  ];

  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 1, subtype: level1[index % level1.length] as DivisionSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 2, subtype: level2[index % level2.length] as DivisionSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 3, subtype: level3[index % level3.length] as DivisionSubtype });
  }

  for (let index = 0; index < plan.length; index += 1) {
    const item = plan[index];
    if (!item) {
      continue;
    }
    let created: Task | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seed = (options.seed + (index + 1) * 997 + attempt * 7919) >>> 0;
      const task = generateM06Task({
        difficulty: item.difficulty,
        subtype: item.subtype,
        seed,
      });
      const params = task.generatorParams as M06GeneratorParams;
      const fingerprint = divisionFingerprint(params.dividend, params.divisor);
      if (seen.has(fingerprint)) {
        continue;
      }
      if (
        item.difficulty === 1 &&
        (isValidM06Level(params.dividend, params.divisor, 2) || isValidM06Level(params.dividend, params.divisor, 3))
      ) {
        continue;
      }
      if (
        item.difficulty === 2 &&
        (isValidM06Level(params.dividend, params.divisor, 1) || isValidM06Level(params.dividend, params.divisor, 3))
      ) {
        continue;
      }
      if (
        item.difficulty === 3 &&
        (isValidM06Level(params.dividend, params.divisor, 1) || isValidM06Level(params.dividend, params.divisor, 2))
      ) {
        continue;
      }
      seen.add(fingerprint);
      created = task;
      break;
    }
    if (!created) {
      throw new Error(`Генератор M06: не удалось получить уникальное задание №${index + 1}`);
    }
    tasks.push(created);
  }

  return tasks;
}
