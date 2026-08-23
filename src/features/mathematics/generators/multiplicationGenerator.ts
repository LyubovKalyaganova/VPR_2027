/**
 * Генератор M05: умножение.
 * Контракт: M05_GENERATOR_SPEC.md
 * Педагогические границы: CONTENT_MATRIX_MATH.md, карточка M05.
 */
import type { Difficulty, Task } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export const M05_SKILL_ID = 'math.calculation.mul_div.multiplication' as const;
export const M05_TOPIC_ID = 'math.calculation.mul_div' as const;
export const M05_GENERATOR_ID = 'gen.math.mul_div.multiplication' as const;

export type MultiplicationSubtype =
  | 'table'
  | 'multiply_by_10'
  | 'multiply_by_100'
  | 'multiply_by_1000'
  | 'one_digit_multiplier'
  | 'two_digit_multiplier'
  | 'with_zeros';

export type MultiplicationFeature =
  | MultiplicationSubtype
  | 'with_carry'
  | 'carry_many'
  | 'zero_inside_factor'
  | 'mixed_digits'
  | 'place_unit';

export type M05GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: MultiplicationSubtype;
};

export type M05SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M05GeneratorParams = {
  factors: [number, number];
  product: number;
  digitCounts: number[];
  carryCount: number;
  hasZeros: boolean;
  subtype: MultiplicationSubtype;
  features: MultiplicationFeature[];
  seed: number;
};

const SUBTYPE_TITLES: Record<MultiplicationSubtype, string> = {
  table: 'Табличное умножение',
  multiply_by_10: 'Умножение на 10',
  multiply_by_100: 'Умножение на 100',
  multiply_by_1000: 'Умножение на 1000',
  one_digit_multiplier: 'Письменное умножение на однозначное',
  two_digit_multiplier: 'Письменное умножение на двузначное',
  with_zeros: 'Умножение с нулём в множителе',
};

const L1_SUBTYPES: MultiplicationSubtype[] = ['table', 'multiply_by_10', 'multiply_by_100', 'multiply_by_1000'];
const L2_SUBTYPES: MultiplicationSubtype[] = ['one_digit_multiplier'];
const L3_SUBTYPES: MultiplicationSubtype[] = ['two_digit_multiplier', 'with_zeros'];

const PLACE_UNITS = [10, 100, 1000] as const;
const MAX_ATTEMPTS = 120;

function digitCount(value: number): number {
  return String(Math.abs(value)).length;
}

function hasZeroDigit(value: number): boolean {
  return String(Math.abs(value)).includes('0');
}

function isPlaceUnit(value: number): boolean {
  return (PLACE_UNITS as readonly number[]).includes(value);
}

export function multiplicationFingerprint(a: number, b: number): string {
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

export function multiplyFactors(a: number, b: number): number {
  return a * b;
}

export function countOneDigitCarries(multiplicand: number, digit: number): number {
  if (digit < 0 || digit > 9) {
    return 0;
  }
  let carry = 0;
  let carryCount = 0;
  let rest = Math.abs(multiplicand);
  if (rest === 0) {
    return 0;
  }
  while (rest > 0) {
    const column = (rest % 10) * digit + carry;
    const nextCarry = Math.floor(column / 10);
    if (nextCarry > 0) {
      carryCount += 1;
    }
    carry = nextCarry;
    rest = Math.floor(rest / 10);
  }
  return carryCount;
}

export function countWrittenCarries(a: number, b: number): number {
  const [oneDigit, multi] = digitCount(a) === 1 && a >= 2 && a <= 9 ? [a, b] : digitCount(b) === 1 && b >= 2 && b <= 9 ? [b, a] : [null, null];
  if (oneDigit !== null && multi !== null) {
    return countOneDigitCarries(multi, oneDigit);
  }
  const tens = Math.max(a, b);
  const other = Math.min(a, b);
  if (digitCount(other) === 2 || digitCount(tens) === 2) {
    const twoDigit = digitCount(a) === 2 ? a : b;
    const multiplicand = twoDigit === a ? b : a;
    const ones = twoDigit % 10;
    const tensDigit = Math.floor(twoDigit / 10);
    return countOneDigitCarries(multiplicand, ones) + countOneDigitCarries(multiplicand, tensDigit);
  }
  return 0;
}

function forgottenCarryProduct(multiplicand: number, digit: number): number | null {
  if (digit < 2 || digit > 9) {
    return null;
  }
  const parts: number[] = [];
  let rest = multiplicand;
  let place = 0;
  while (rest > 0) {
    parts.push(((rest % 10) * digit) % 10 * 10 ** place);
    rest = Math.floor(rest / 10);
    place += 1;
  }
  const value = parts.reduce((sum, part) => sum + part, 0);
  const actual = multiplicand * digit;
  return value > 0 && value !== actual ? value : null;
}

function noZeroNumber(rng: SeededRng, digits: 2 | 3 | 4, onesMinProduct: number): number {
  const onesOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => digit * onesMinProduct >= 10 || onesMinProduct === 0);
  const ones = pickOne(rng, onesOptions.length > 0 ? onesOptions : [5, 6, 7, 8, 9]);
  const leading = randomInt(rng, 1, 9);
  if (digits === 2) {
    return leading * 10 + ones;
  }
  const tens = randomInt(rng, 1, 9);
  if (digits === 3) {
    return leading * 100 + tens * 10 + ones;
  }
  const hundreds = randomInt(rng, 1, 9);
  return leading * 1000 + hundreds * 100 + tens * 10 + ones;
}

function numberWithInternalZero(rng: SeededRng, digits: 3 | 4): number {
  const leading = randomInt(rng, 1, 9);
  const ones = randomInt(rng, 1, 9);
  if (digits === 3) {
    return leading * 100 + ones;
  }
  const pattern = pickOne(rng, [0, 1, 2] as Array<0 | 1 | 2>);
  if (pattern === 0) {
    return leading * 1000 + randomInt(rng, 1, 9) * 10 + ones;
  }
  if (pattern === 1) {
    return leading * 1000 + randomInt(rng, 1, 9) * 100 + ones;
  }
  return leading * 1000 + randomInt(rng, 1, 9) * 100 + randomInt(rng, 1, 9) * 10;
}

function twoDigitNoZero(rng: SeededRng, min: number, max: number): number {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const tens = randomInt(rng, Math.max(1, Math.floor(min / 10)), Math.min(9, Math.floor(max / 10)));
    const ones = randomInt(rng, 2, 9);
    const value = tens * 10 + ones;
    if (value >= min && value <= max && !hasZeroDigit(value)) {
      return value;
    }
  }
  return 24;
}

/** Содержательный двузначный множитель: 3–4-значное × двузначное без нулей. */
export function isSubstantialTwoDigitCase(a: number, b: number): boolean {
  const twoDigit = [a, b].find((value) => digitCount(value) === 2 && value >= 14 && value <= 99 && !hasZeroDigit(value) && value % 10 >= 2);
  if (twoDigit === undefined) {
    return false;
  }
  const partner = twoDigit === a ? b : a;
  if (digitCount(partner) < 3 || digitCount(partner) > 4 || hasZeroDigit(partner)) {
    return false;
  }
  const ones = twoDigit % 10;
  const tensDigit = Math.floor(twoDigit / 10);
  const carries = countOneDigitCarries(partner, ones) + countOneDigitCarries(partner, tensDigit);
  // 3-значное × 2-значное: минимум 3 переноса (иначе легче сильного L2).
  if (digitCount(partner) === 3) {
    return carries >= 3;
  }
  // 4-значное × 2-значное: достаточная нагрузка — ≥2 переноса + два частичных произведения.
  return carries >= 2;
}

/** Содержательный with_zeros: нуль + реальная нагрузка (не 206×2 / 21×40). */
export function isSubstantialZeroCase(a: number, b: number): boolean {
  if (isPlaceUnit(a) || isPlaceUnit(b)) {
    return false;
  }
  if (!hasZeroDigit(a) && !hasZeroDigit(b)) {
    return false;
  }

  const oneDigit = [a, b].find((value) => value >= 3 && value <= 9);
  const multi = oneDigit === a ? b : oneDigit === b ? a : null;
  if (oneDigit !== undefined && multi !== null && hasZeroDigit(multi)) {
    const width = digitCount(multi);
    const carries = countOneDigitCarries(multi, oneDigit);
    // Нуль сам по себе не повышает уровень: 3–4 знака × однозначное только при ≥3 переносах.
    if ((width === 3 || width === 4) && carries >= 3) {
      return true;
    }
  }

  const trailing = [a, b].find((value) => digitCount(value) === 2 && value % 10 === 0 && value >= 20 && value <= 90);
  const other = trailing === a ? b : trailing === b ? a : null;
  if (trailing !== undefined && other !== null && digitCount(other) >= 3 && digitCount(other) <= 4) {
    const digit = trailing / 10;
    return countOneDigitCarries(other, digit) >= 2;
  }

  return false;
}

function allowedSubtypes(difficulty: 1 | 2 | 3): MultiplicationSubtype[] {
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
  requested: MultiplicationSubtype | undefined,
  rng: SeededRng,
): MultiplicationSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  if (difficulty === 1) {
    return pickOne(rng, ['table', 'table', 'table', 'multiply_by_10']);
  }
  if (difficulty === 2) {
    return 'one_digit_multiplier';
  }
  return pickOne(rng, ['two_digit_multiplier', 'two_digit_multiplier', 'with_zeros']);
}

function buildZeroMultiplicand(rng: SeededRng, digit: number, width: 3 | 4): number | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = numberWithInternalZero(rng, width);
    if (!hasZeroDigit(candidate)) {
      continue;
    }
    if (countOneDigitCarries(candidate, digit) >= 3) {
      return candidate;
    }
  }
  return null;
}

function buildFactors(rng: SeededRng, difficulty: 1 | 2 | 3, subtype: MultiplicationSubtype): [number, number] | null {
  if (difficulty === 1) {
    if (subtype === 'multiply_by_10') {
      const other = randomInt(rng, 2, 99);
      return other === 10 ? [14, 10] : [other, 10];
    }
    if (subtype === 'multiply_by_100') {
      return [randomInt(rng, 2, 20), 100];
    }
    if (subtype === 'multiply_by_1000') {
      return [randomInt(rng, 2, 9), 1000];
    }
    return [randomInt(rng, 2, 9), randomInt(rng, 2, 9)];
  }

  if (difficulty === 2) {
    const digit = randomInt(rng, 2, 9);
    const width = pickOne(rng, [3, 3, 4] as Array<3 | 4>);
    const multiplicand = noZeroNumber(rng, width, digit);
    return [multiplicand, digit];
  }

  if (subtype === 'with_zeros') {
    if (pickOne(rng, [true, true, false])) {
      const digit = randomInt(rng, 3, 9);
      const width = pickOne(rng, [3, 4, 4] as Array<3 | 4>);
      const multiplicand = buildZeroMultiplicand(rng, digit, width);
      if (multiplicand === null) {
        return null;
      }
      return [multiplicand, digit];
    }
    const tens = pickOne(rng, [2, 3, 4, 5, 6, 7, 8, 9]);
    const width = pickOne(rng, [3, 3, 4] as Array<3 | 4>);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const multiplicand = noZeroNumber(rng, width, tens);
      if (countOneDigitCarries(multiplicand, tens) >= 2) {
        return [multiplicand, tens * 10];
      }
    }
    return null;
  }

  // Чаще 4-значное: 3-значное × 2-значное требует ≥3 переносов и реже проходит.
  const twoDigit = twoDigitNoZero(rng, 14, 48);
  const width = pickOne(rng, [3, 4, 4, 4] as Array<3 | 4>);
  const ones = twoDigit % 10;
  const tensDigit = Math.floor(twoDigit / 10);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const multiplicand = noZeroNumber(rng, width, Math.max(ones, tensDigit));
    if (isSubstantialTwoDigitCase(multiplicand, twoDigit)) {
      return [multiplicand, twoDigit];
    }
  }
  return null;
}

export function isValidM05Level(a: number, b: number, difficulty: 1 | 2 | 3): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) {
    return false;
  }
  const factors = [a, b];
  const oneDigit = factors.find((value) => value >= 2 && value <= 9);
  const other = oneDigit === a ? b : oneDigit === b ? a : null;
  const hasZero = hasZeroDigit(a) || hasZeroDigit(b);
  const place = factors.find((value) => isPlaceUnit(value));
  const placePartner = place === a ? b : place === b ? a : null;

  if (difficulty === 1) {
    const table = a >= 2 && a <= 9 && b >= 2 && b <= 9;
    const by10 = place === 10 && placePartner !== null && placePartner >= 2 && placePartner <= 99;
    const by100 = place === 100 && placePartner !== null && placePartner >= 2 && placePartner <= 20;
    const by1000 = place === 1000 && placePartner !== null && placePartner >= 2 && placePartner <= 9;
    return table || by10 || by100 || by1000;
  }

  if (difficulty === 2) {
    if (oneDigit === undefined || other === null) {
      return false;
    }
    if (hasZero || isPlaceUnit(a) || isPlaceUnit(b)) {
      return false;
    }
    const otherDigits = digitCount(other);
    if (otherDigits < 3 || otherDigits > 4) {
      return false;
    }
    return countOneDigitCarries(other, oneDigit) >= 1;
  }

  return isSubstantialTwoDigitCase(a, b) || isSubstantialZeroCase(a, b);
}

function isTooEasyForLevel(a: number, b: number, difficulty: 1 | 2 | 3): boolean {
  if (difficulty === 2) {
    return isValidM05Level(a, b, 1);
  }
  if (difficulty === 3) {
    return isValidM05Level(a, b, 1) || isValidM05Level(a, b, 2);
  }
  return false;
}

function subtypeFits(subtype: MultiplicationSubtype, a: number, b: number): boolean {
  const factors = [a, b];
  switch (subtype) {
    case 'table':
      return a >= 2 && a <= 9 && b >= 2 && b <= 9;
    case 'multiply_by_10':
      return factors.includes(10);
    case 'multiply_by_100':
      return factors.includes(100);
    case 'multiply_by_1000':
      return factors.includes(1000);
    case 'one_digit_multiplier':
      return (a >= 2 && a <= 9 && digitCount(b) >= 3) || (b >= 2 && b <= 9 && digitCount(a) >= 3);
    case 'two_digit_multiplier':
      return isSubstantialTwoDigitCase(a, b);
    case 'with_zeros':
      return isSubstantialZeroCase(a, b);
  }
}

export function collectFeatures(a: number, b: number, subtype: MultiplicationSubtype): MultiplicationFeature[] {
  const features: MultiplicationFeature[] = [];
  const tableOrPlace =
    subtype === 'table' ||
    subtype === 'multiply_by_10' ||
    subtype === 'multiply_by_100' ||
    subtype === 'multiply_by_1000';
  if (!tableOrPlace) {
    const carries = countWrittenCarries(a, b);
    if (carries === 1) {
      features.push('with_carry');
    }
    if (carries >= 2) {
      features.push('carry_many');
    }
  }
  if (hasZeroDigit(a) || hasZeroDigit(b)) {
    features.push('zero_inside_factor');
  }
  if (digitCount(a) !== digitCount(b)) {
    features.push('mixed_digits');
  }
  if (isPlaceUnit(a) || isPlaceUnit(b)) {
    features.push('place_unit');
  }
  return features.filter((feature) => feature !== subtype);
}

function isPlausibleDistractor(product: number, candidate: number, mode: 'table' | 'place' | 'written'): boolean {
  if (!Number.isInteger(candidate) || candidate <= 0 || candidate === product) {
    return false;
  }
  const productDigits = digitCount(product);
  const candidateDigits = digitCount(candidate);
  if (Math.abs(productDigits - candidateDigits) > 1) {
    return false;
  }
  if (mode === 'table') {
    return candidate <= product * 3 && candidate >= Math.max(1, Math.floor(product / 4));
  }
  if (mode === 'place') {
    // Потеря/лишний нуль: n, n×100, n×1000 при n×10=product и т.п.
    if (product % 10 === 0 && candidate === product / 10) {
      return true;
    }
    if (product % 100 === 0 && candidate === product / 100) {
      return true;
    }
    if (product % 1000 === 0 && candidate === product / 1000) {
      return true;
    }
    if (candidate === product * 10 || candidate === product * 100) {
      return true;
    }
    // Описка разряда рядом с правильным ответом — не «левые» числа вроде 60 при 240.
    return (
      candidateDigits === productDigits &&
      candidate >= Math.floor(product * 0.85) &&
      candidate <= Math.ceil(product * 1.15)
    );
  }
  // written: не принимать «обрубок» забытого переноса вроде 6020 при 39450
  if (candidate < Math.floor(product * 0.45)) {
    return false;
  }
  if (candidateDigits < productDigits && candidate * 5 < product) {
    return false;
  }
  return true;
}

function uniqueDistractors(a: number, b: number, rng: SeededRng): string[] {
  const product = a * b;
  const mode: 'table' | 'place' | 'written' =
    a >= 2 && a <= 9 && b >= 2 && b <= 9
      ? 'table'
      : a === 10 || b === 10 || a === 100 || b === 100 || a === 1000 || b === 1000
        ? 'place'
        : 'written';

  const byKind: Record<string, number[]> = {
    forgot_carry: [],
    partial_product: [],
    shift_error: [],
    place_zero: [],
    table_hole: [],
    digit_slip: [],
  };

  const add = (kind: keyof typeof byKind, value: number | null) => {
    if (value === null || !isPlausibleDistractor(product, value, mode)) {
      return;
    }
    if (!byKind[kind].includes(value)) {
      byKind[kind].push(value);
    }
  };

  const placeMode = mode === 'place';

  // Для ×10/×100 не применять модели «двузначного письменного» — иначе 24×10 даёт артефакт 60.
  if (!placeMode) {
    const oneDigit = a >= 2 && a <= 9 ? a : b >= 2 && b <= 9 ? b : null;
    const multi = oneDigit === a ? b : oneDigit === b ? a : null;
    if (oneDigit !== null && multi !== null && digitCount(multi) >= 2) {
      add('forgot_carry', forgottenCarryProduct(multi, oneDigit));
      add('partial_product', multi * (oneDigit + 1));
      add('partial_product', oneDigit > 2 ? multi * (oneDigit - 1) : null);
      add('partial_product', (multi + 1) * oneDigit);
      add('partial_product', multi > 10 ? (multi - 1) * oneDigit : null);
    }

    const twoDigit = [a, b].find((value) => digitCount(value) === 2 && value >= 12 && !isPlaceUnit(value));
    const other = twoDigit === a ? b : twoDigit === b ? a : null;
    if (twoDigit !== undefined && other !== null && !isPlaceUnit(other)) {
      const ones = twoDigit % 10;
      const tensDigit = Math.floor(twoDigit / 10);
      add('shift_error', other * ones + other * tensDigit);
      add('shift_error', other * ones + other * tensDigit * 100);
      add('partial_product', other * (twoDigit + 1));
      add('partial_product', other * (twoDigit - 1));
    }
  }

  if (a === 10 || b === 10) {
    const n = a === 10 ? b : a;
    add('place_zero', n);
    add('place_zero', n * 100);
    add('place_zero', n * 1000);
    if (digitCount(n) === 2) {
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      add('place_zero', tens * 100 + ones);
    }
  }
  if (a === 100 || b === 100) {
    const n = a === 100 ? b : a;
    add('place_zero', n * 10);
    add('place_zero', n * 1000);
    add('place_zero', n);
  }

  if (a >= 2 && a <= 9 && b >= 2 && b <= 9) {
    add('table_hole', a * (b + 1));
    add('table_hole', (a + 1) * b);
    add('table_hole', a * Math.max(2, b - 1));
    add('table_hole', a + b);
    add('table_hole', a * b + a);
  }

  // Ошибка одной цифры произведения — только как модель разрядной описки, не ±N к ответу.
  const productText = String(product);
  for (let index = 0; index < productText.length; index += 1) {
    const current = Number(productText[index]);
    for (const delta of [-1, 1]) {
      const digit = current + delta;
      if (digit < 0 || digit > 9 || (index === 0 && digit === 0)) {
        continue;
      }
      const chars = productText.split('');
      chars[index] = String(digit);
      add('digit_slip', Number(chars.join('')));
    }
  }

  const unique: number[] = [];
  const kindOrder = [
    'forgot_carry',
    'partial_product',
    'shift_error',
    'place_zero',
    'table_hole',
    'digit_slip',
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
  if (unique.length < 3) {
    for (const value of shuffleSeeded(Object.values(byKind).flat(), rng)) {
      if (unique.length === 3) {
        break;
      }
      if (!unique.includes(value) && isPlausibleDistractor(product, value, mode)) {
        unique.push(value);
      }
    }
  }
  return unique.slice(0, 3).map(String);
}

function buildExplanation(a: number, b: number, product: number): string {
  if (a >= 2 && a <= 9 && b >= 2 && b <= 9) {
    return `По таблице умножения ${a} × ${b} = ${product}.`;
  }
  if (a === 10 || b === 10 || a === 100 || b === 100 || a === 1000 || b === 1000) {
    return `При умножении на разрядную единицу к числу приписывают нули. ${a} × ${b} = ${product}.`;
  }
  const oneDigit = a >= 2 && a <= 9 ? a : b >= 2 && b <= 9 ? b : null;
  const multi = oneDigit === a ? b : oneDigit === b ? a : null;
  if (oneDigit !== null && multi !== null) {
    return `Умножаем ${multi} на ${oneDigit} в столбик, справа налево, не забывая перенос. Получается ${product}.`;
  }
  return `Умножаем ${a} × ${b} письменно. Произведение равно ${product}.`;
}

function buildHints(a: number, b: number, product: number): Pick<Task, 'hint1' | 'hint2' | 'hint3'> {
  return {
    hint1: 'Подумай, это табличный случай, умножение на 10 или письменное умножение.',
    hint2: 'Если множитель двузначный, умножь отдельно на единицы и на десятки, затем сложи, сдвинув второе произведение.',
    hint3: `${a} × ${b} = ${product}.`,
  };
}

function assertGeneratedM05(task: Task, expectedDifficulty: 1 | 2 | 3, requested: MultiplicationSubtype): void {
  const params = task.generatorParams as M05GeneratorParams | undefined;
  if (!params || !Array.isArray(params.factors) || params.factors.length !== 2) {
    throw new Error('M05: нет generatorParams.factors');
  }
  const [a, b] = params.factors;
  if (a === undefined || b === undefined) {
    throw new Error('M05: множители не заданы');
  }
  const computed = multiplyFactors(a, b);
  const recorded =
    typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
  if (recorded !== computed || params.product !== computed) {
    throw new Error(`M05: ответ ${recorded} не равен произведению ${computed}`);
  }
  if (task.skillId !== M05_SKILL_ID) {
    throw new Error(`M05: неверный skillId ${task.skillId}`);
  }
  if (task.difficulty !== expectedDifficulty) {
    throw new Error(`M05: неверный difficulty`);
  }
  if (!isValidM05Level(a, b, expectedDifficulty) || isTooEasyForLevel(a, b, expectedDifficulty)) {
    throw new Error(`M05: ${a}×${b} не соответствует уровню ${expectedDifficulty}`);
  }
  if (!subtypeFits(requested, a, b)) {
    throw new Error(`M05: подтип ${requested} не соответствует ${a}×${b}`);
  }
  if (task.taskType === 'singleChoice') {
    const answers = task.answers ?? [];
    if (answers.length !== 4 || new Set(answers).size !== 4) {
      throw new Error('M05: нужны 4 уникальных варианта');
    }
    if (answers.filter((item) => item === String(computed)).length !== 1) {
      throw new Error('M05: должен быть ровно один правильный вариант');
    }
  }
}

function toTask(
  factors: [number, number],
  difficulty: 1 | 2 | 3,
  seed: number,
  rng: SeededRng,
  requested: MultiplicationSubtype,
): Task {
  const [a, b] = factors;
  const product = multiplyFactors(a, b);
  const carryCount = countWrittenCarries(a, b);
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const question = `Найди произведение: ${a} × ${b}.`;
  const distractors = taskType === 'singleChoice' ? uniqueDistractors(a, b, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error(`M05: не удалось собрать дистракторы для ${a}×${b}`);
  }
  const answers =
    taskType === 'singleChoice' ? shuffleSeeded([String(product), ...distractors], rng) : undefined;

  const task: Task = {
    id: `generated-m05-${difficulty}-${multiplicationFingerprint(a, b)}`,
    subject: 'mathematics',
    section: 'Вычисления',
    topic: 'Умножение и деление',
    skill: SUBTYPE_TITLES[requested],
    topicId: M05_TOPIC_ID,
    skillId: M05_SKILL_ID,
    difficulty,
    vprVersion: 2027,
    taskType,
    question,
    answers,
    correctAnswer: taskType === 'numberAnswer' ? product : String(product),
    explanation: buildExplanation(a, b, product),
    ...buildHints(a, b, product),
    sourceType: 'generated',
    generatorId: M05_GENERATOR_ID,
    generatorParams: {
      factors,
      product,
      digitCounts: [digitCount(a), digitCount(b)],
      carryCount,
      hasZeros: hasZeroDigit(a) || hasZeroDigit(b),
      subtype: requested,
      features: collectFeatures(a, b, requested),
      seed,
    } satisfies M05GeneratorParams,
  };

  assertGeneratedM05(task, difficulty, requested);
  return task;
}

function tryBuild(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: MultiplicationSubtype,
): [number, number] | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pair = buildFactors(rng, difficulty, subtype);
    if (!pair) {
      continue;
    }
    const [a, b] = pair;
    if (!isValidM05Level(a, b, difficulty) || isTooEasyForLevel(a, b, difficulty)) {
      continue;
    }
    if (!subtypeFits(subtype, a, b)) {
      continue;
    }
    return pair;
  }
  return null;
}

export function generateM05Task(options: M05GenerateOptions): Task {
  if (options.difficulty === 4 || options.difficulty === 5) {
    throw new Error(
      'Генератор M05 пока не создаёт уровни 4–5: L4 — формат ВПР, L5 — рациональный способ / проверка делением.',
    );
  }
  if (options.difficulty !== 1 && options.difficulty !== 2 && options.difficulty !== 3) {
    throw new Error(`Генератор M05: неподдерживаемый уровень ${options.difficulty}`);
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

  throw new Error(`Генератор M05: не удалось собрать задание уровня ${difficulty} (seed ${options.seed})`);
}

export function generateM05Series(options: M05SeriesOptions): Task[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const plan: Array<{ difficulty: 1 | 2 | 3; subtype: MultiplicationSubtype }> = [];

  const level1: MultiplicationSubtype[] = [
    'table',
    'table',
    'table',
    'table',
    'table',
    'table',
    'multiply_by_10',
    'multiply_by_10',
    'multiply_by_10',
    'multiply_by_10',
  ];
  const level2: MultiplicationSubtype[] = Array.from({ length: 10 }, () => 'one_digit_multiplier');
  const level3: MultiplicationSubtype[] = [
    'two_digit_multiplier',
    'two_digit_multiplier',
    'two_digit_multiplier',
    'two_digit_multiplier',
    'two_digit_multiplier',
    'with_zeros',
    'with_zeros',
    'with_zeros',
    'with_zeros',
    'with_zeros',
  ];

  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 1, subtype: level1[index % level1.length] as MultiplicationSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 2, subtype: level2[index % level2.length] as MultiplicationSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 3, subtype: level3[index % level3.length] as MultiplicationSubtype });
  }

  for (let index = 0; index < plan.length; index += 1) {
    const item = plan[index];
    if (!item) {
      continue;
    }
    let created: Task | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seed = (options.seed + (index + 1) * 997 + attempt * 7919) >>> 0;
      const task = generateM05Task({
        difficulty: item.difficulty,
        subtype: item.subtype,
        seed,
      });
      const params = task.generatorParams as M05GeneratorParams;
      const fingerprint = multiplicationFingerprint(params.factors[0], params.factors[1]);
      if (seen.has(fingerprint)) {
        continue;
      }
      if (item.difficulty === 1 && (isValidM05Level(params.factors[0], params.factors[1], 2) || isValidM05Level(params.factors[0], params.factors[1], 3))) {
        continue;
      }
      if (item.difficulty === 2 && (isValidM05Level(params.factors[0], params.factors[1], 1) || isValidM05Level(params.factors[0], params.factors[1], 3))) {
        continue;
      }
      if (item.difficulty === 3 && (isValidM05Level(params.factors[0], params.factors[1], 1) || isValidM05Level(params.factors[0], params.factors[1], 2))) {
        continue;
      }
      seen.add(fingerprint);
      created = task;
      break;
    }
    if (!created) {
      throw new Error(`Генератор M05: не удалось получить уникальное задание №${index + 1}`);
    }
    tasks.push(created);
  }

  return tasks;
}
