/**
 * Генератор M04: вычитание многозначных чисел.
 * Контракт: M04_GENERATOR_SPEC.md
 * Педагогические границы: CONTENT_MATRIX_MATH.md, карточка M04.
 */
import type { Difficulty, Task } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export const M04_SKILL_ID = 'math.calculation.multi_digit.subtraction' as const;
export const M04_TOPIC_ID = 'math.calculation.multi_digit' as const;
export const M04_GENERATOR_ID = 'gen.math.multi_digit.subtraction' as const;

export type SubtractionSubtype =
  | 'no_borrow'
  | 'borrow_one'
  | 'borrow_many'
  | 'consecutive_borrows'
  | 'with_zeros'
  | 'mixed_digits'
  | 'from_round';

export type SubtractionFeature = SubtractionSubtype | 'consecutive_borrows';

export type M04GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: SubtractionSubtype;
};

export type M04SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M04GeneratorParams = {
  minuend: number;
  subtrahend: number;
  borrowCount: number;
  digitCounts: number[];
  hasZeros: boolean;
  subtype: SubtractionSubtype;
  features: SubtractionFeature[];
  seed: number;
};

export type BorrowAnalysis = {
  borrowCount: number;
  consecutive: boolean;
  outgoing: number[];
};

type DigitSpec = { min: number; max: number };

type Blueprint = {
  subtype: SubtractionSubtype;
  minuendLength: number;
  subtrahendLength: number;
  borrowFromRight: boolean[];
  minuendZeros: number[];
  subtrahendZeros: number[];
  roundMinuend: boolean;
};

const SUBTYPE_TITLES: Record<SubtractionSubtype, string> = {
  no_borrow: 'Вычитание без заимствования',
  borrow_one: 'Вычитание с заимствованием в одном разряде',
  borrow_many: 'Вычитание с несколькими заимствованиями',
  consecutive_borrows: 'Вычитание с цепочкой заимствований',
  with_zeros: 'Вычитание с нулями',
  mixed_digits: 'Уменьшаемое и вычитаемое разной разрядности',
  from_round: 'Вычитание из круглого числа',
};

const L1_SUBTYPES: SubtractionSubtype[] = ['no_borrow', 'borrow_one', 'mixed_digits'];
const L2_SUBTYPES: SubtractionSubtype[] = ['borrow_many', 'with_zeros', 'mixed_digits'];
const L3_SUBTYPES: SubtractionSubtype[] = [
  'consecutive_borrows',
  'from_round',
  'with_zeros',
  'mixed_digits',
  'borrow_many',
];

const MAX_ATTEMPTS = 120;
const ROUND_MINUENDS = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

function digitCount(value: number): number {
  return String(Math.abs(value)).length;
}

function hasInternalZero(value: number): boolean {
  return String(Math.abs(value)).includes('0');
}

function hasConsecutiveZeros(value: number): boolean {
  return /00/.test(String(Math.abs(value)));
}

function isRoundMinuend(value: number): boolean {
  return ROUND_MINUENDS.includes(value);
}

function padDigits(value: number, width: number): number[] {
  return String(Math.abs(value))
    .padStart(width, '0')
    .split('')
    .map((digit) => Number(digit));
}

export function analyzeBorrows(minuend: number, subtrahend: number): BorrowAnalysis {
  const width = Math.max(digitCount(minuend), digitCount(subtrahend));
  const topDigits = padDigits(minuend, width);
  const bottomDigits = padDigits(subtrahend, width);
  const outgoing: number[] = [];
  let borrowIn = 0;
  let borrowCount = 0;

  for (let index = width - 1; index >= 0; index -= 1) {
    const top = (topDigits[index] ?? 0) - borrowIn;
    const bottom = bottomDigits[index] ?? 0;
    if (top < bottom) {
      borrowCount += 1;
      borrowIn = 1;
      outgoing.push(1);
    } else {
      borrowIn = 0;
      outgoing.push(0);
    }
  }

  const consecutive = outgoing.some((value, index) => value > 0 && (outgoing[index + 1] ?? 0) > 0);
  return { borrowCount, consecutive, outgoing };
}

export function countBorrows(minuend: number, subtrahend: number): number {
  return analyzeBorrows(minuend, subtrahend).borrowCount;
}

export function subtractPair(minuend: number, subtrahend: number): number {
  return minuend - subtrahend;
}

export function subtractionFingerprint(minuend: number, subtrahend: number): string {
  return `${minuend}-${subtrahend}`;
}

function fromDigitsRightFirst(digitsFromRight: number[]): number {
  return Number([...digitsFromRight].reverse().join(''));
}

function rangeInclusive(min: number, max: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += 1) {
    values.push(value);
  }
  return values;
}

function pickColumnDigits(
  rng: SeededRng,
  minuendSpec: DigitSpec,
  subtrahendSpec: DigitSpec,
  borrowIn: number,
  wantBorrow: boolean,
): { minuendDigit: number; subtrahendDigit: number } | null {
  const minuendOptions = shuffleSeeded(rangeInclusive(minuendSpec.min, minuendSpec.max), rng);
  for (const minuendDigit of minuendOptions) {
    const top = minuendDigit - borrowIn;
    const subMin = wantBorrow ? Math.max(subtrahendSpec.min, top + 1) : subtrahendSpec.min;
    const subMax = wantBorrow ? subtrahendSpec.max : Math.min(subtrahendSpec.max, top);
    if (subMin <= subMax) {
      return { minuendDigit, subtrahendDigit: randomInt(rng, subMin, subMax) };
    }
  }
  return null;
}

function slotForPlace(length: number, placeFromRight: number, zeroHere: boolean, forced?: number): DigitSpec {
  if (forced !== undefined) {
    return { min: forced, max: forced };
  }
  if (placeFromRight >= length) {
    return { min: 0, max: 0 };
  }
  if (zeroHere) {
    return { min: 0, max: 0 };
  }
  if (placeFromRight === length - 1) {
    return { min: 1, max: 9 };
  }
  return { min: 0, max: 9 };
}

function planBorrowsFromRight(width: number, borrowPlaces: number[]): boolean[] {
  const plan = Array.from({ length: width }, () => false);
  for (const place of borrowPlaces) {
    if (place >= 0 && place < width) {
      plan[place] = true;
    }
  }
  return plan;
}

function pickWidth(rng: SeededRng, preferFour: boolean): 3 | 4 {
  return preferFour ? pickOne(rng, [3, 4, 4, 4]) : pickOne(rng, [3, 3, 4]);
}

function makeBlueprint(rng: SeededRng, difficulty: 1 | 2 | 3, subtype: SubtractionSubtype): Blueprint {
  if (difficulty === 1) {
    if (subtype === 'mixed_digits') {
      return {
        subtype,
        minuendLength: 4,
        subtrahendLength: 3,
        borrowFromRight: planBorrowsFromRight(4, []),
        minuendZeros: [],
        subtrahendZeros: [],
        roundMinuend: false,
      };
    }
    const width = pickWidth(rng, false);
    return {
      subtype,
      minuendLength: width,
      subtrahendLength: width,
      borrowFromRight: planBorrowsFromRight(width, subtype === 'borrow_one' ? [0] : []),
      minuendZeros: [],
      subtrahendZeros: [],
      roundMinuend: false,
    };
  }

  if (difficulty === 2) {
    if (subtype === 'mixed_digits') {
      return {
        subtype,
        minuendLength: 4,
        subtrahendLength: 3,
        borrowFromRight: planBorrowsFromRight(4, [0, 1]),
        minuendZeros: [],
        subtrahendZeros: [],
        roundMinuend: false,
      };
    }
    const width = pickWidth(rng, true);
    const minuendZeros = subtype === 'with_zeros' ? [0] : [];
    const subtrahendZeros =
      subtype === 'with_zeros' && minuendZeros.length === 0 ? [Math.min(2, width - 1)] : [];
    return {
      subtype,
      minuendLength: width,
      subtrahendLength: width,
      borrowFromRight: planBorrowsFromRight(width, [0, 1]),
      minuendZeros,
      subtrahendZeros,
      roundMinuend: false,
    };
  }

  if (subtype === 'from_round') {
    const subLen = pickOne(rng, [3, 3, 4]);
    return {
      subtype,
      minuendLength: 4,
      subtrahendLength: subLen,
      borrowFromRight: planBorrowsFromRight(4, [0, 1, 2]),
      minuendZeros: [0, 1, 2],
      subtrahendZeros: [],
      roundMinuend: true,
    };
  }

  if (subtype === 'mixed_digits') {
    return {
      subtype,
      minuendLength: 4,
      subtrahendLength: 3,
      borrowFromRight: planBorrowsFromRight(4, [0, 1, 2]),
      minuendZeros: [],
      subtrahendZeros: [],
      roundMinuend: false,
    };
  }

  const width = subtype === 'with_zeros' ? 4 : pickOne(rng, [3, 4, 4]);
  const minuendZeros = subtype === 'with_zeros' ? [1] : [];
  return {
    subtype,
    minuendLength: width,
    subtrahendLength: width,
    borrowFromRight: planBorrowsFromRight(width, [0, 1, 2].filter((place) => place < width)),
    minuendZeros,
    subtrahendZeros: [],
    roundMinuend: false,
  };
}

function roundLeadingDigit(rng: SeededRng): number {
  return pickOne(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
}

function buildFromBlueprint(rng: SeededRng, blueprint: Blueprint): { minuend: number; subtrahend: number } | null {
  const width = Math.max(blueprint.minuendLength, blueprint.subtrahendLength);
  const minuendDigits: number[] = [];
  const subtrahendDigits: number[] = [];
  let borrowIn = 0;
  const roundLead = blueprint.roundMinuend ? roundLeadingDigit(rng) : undefined;

  for (let place = 0; place < width; place += 1) {
    const wantBorrow = blueprint.borrowFromRight[place] === true;
    const forcedMinuend =
      blueprint.roundMinuend && place === width - 1
        ? roundLead
        : blueprint.roundMinuend && place < 3
          ? 0
          : undefined;
    const minuendSpec = slotForPlace(
      blueprint.minuendLength,
      place,
      blueprint.minuendZeros.includes(place),
      forcedMinuend,
    );
    const subtrahendSpec = slotForPlace(
      blueprint.subtrahendLength,
      place,
      blueprint.subtrahendZeros.includes(place),
    );
    const column = pickColumnDigits(rng, minuendSpec, subtrahendSpec, borrowIn, wantBorrow);
    if (!column) {
      return null;
    }
    minuendDigits.push(column.minuendDigit);
    subtrahendDigits.push(column.subtrahendDigit);
    const top = column.minuendDigit - borrowIn;
    borrowIn = top < column.subtrahendDigit ? 1 : 0;
  }

  const minuend = fromDigitsRightFirst(minuendDigits);
  const subtrahend = fromDigitsRightFirst(subtrahendDigits);
  if (digitCount(minuend) !== blueprint.minuendLength || digitCount(subtrahend) !== blueprint.subtrahendLength) {
    return null;
  }
  if (minuend <= subtrahend) {
    return null;
  }
  if (!blueprint.roundMinuend && (hasConsecutiveZeros(minuend) || hasConsecutiveZeros(subtrahend))) {
    return null;
  }
  return { minuend, subtrahend };
}

function allowedSubtypes(difficulty: 1 | 2 | 3): SubtractionSubtype[] {
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
  requested: SubtractionSubtype | undefined,
  rng: SeededRng,
): SubtractionSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  return pickOne(rng, allowed);
}

function isMixedDigits(minuend: number, subtrahend: number): boolean {
  return digitCount(minuend) !== digitCount(subtrahend);
}

export function collectFeatures(
  minuend: number,
  subtrahend: number,
  analysis: BorrowAnalysis,
  subtype: SubtractionSubtype,
): SubtractionFeature[] {
  const features: SubtractionFeature[] = [];
  if (analysis.borrowCount === 0) {
    features.push('no_borrow');
  }
  if (analysis.borrowCount === 1) {
    features.push('borrow_one');
  }
  if (analysis.borrowCount >= 2) {
    features.push('borrow_many');
  }
  if (analysis.consecutive) {
    features.push('consecutive_borrows');
  }
  if (hasInternalZero(minuend) || hasInternalZero(subtrahend)) {
    features.push('with_zeros');
  }
  if (isMixedDigits(minuend, subtrahend)) {
    features.push('mixed_digits');
  }
  if (isRoundMinuend(minuend)) {
    features.push('from_round');
  }
  return features.filter((feature) => feature !== subtype);
}

function subtypeFits(
  subtype: SubtractionSubtype,
  minuend: number,
  subtrahend: number,
  analysis: BorrowAnalysis,
): boolean {
  switch (subtype) {
    case 'no_borrow':
      return analysis.borrowCount === 0;
    case 'borrow_one':
      return analysis.borrowCount === 1;
    case 'borrow_many':
      return analysis.borrowCount >= 2;
    case 'consecutive_borrows':
      return analysis.consecutive && analysis.borrowCount >= 3;
    case 'with_zeros':
      return hasInternalZero(minuend) || hasInternalZero(subtrahend);
    case 'mixed_digits':
      return isMixedDigits(minuend, subtrahend);
    case 'from_round':
      return isRoundMinuend(minuend);
  }
}

export function isValidM04Level(minuend: number, subtrahend: number, difficulty: 1 | 2 | 3): boolean {
  if (!Number.isInteger(minuend) || !Number.isInteger(subtrahend) || minuend <= subtrahend) {
    return false;
  }
  const minuendDigits = digitCount(minuend);
  const subtrahendDigits = digitCount(subtrahend);
  if (minuendDigits < 3 || minuendDigits > 4 || subtrahendDigits < 3 || subtrahendDigits > 4) {
    return false;
  }
  if (!isRoundMinuend(minuend) && (hasConsecutiveZeros(minuend) || hasConsecutiveZeros(subtrahend))) {
    return false;
  }

  const analysis = analyzeBorrows(minuend, subtrahend);
  const mixed = isMixedDigits(minuend, subtrahend);
  const difference = minuend - subtrahend;
  const minLen = Math.min(minuendDigits, subtrahendDigits);
  if (digitCount(difference) < minLen - 1) {
    return false;
  }

  if (difficulty === 1) {
    if (analysis.borrowCount > 1) {
      return false;
    }
    if (mixed) {
      return analysis.borrowCount === 0;
    }
    return true;
  }
  if (difficulty === 2) {
    return analysis.borrowCount === 2 && analysis.consecutive;
  }
  return analysis.borrowCount >= 3;
}

function isTooEasyForLevel(minuend: number, subtrahend: number, difficulty: 1 | 2 | 3): boolean {
  if (difficulty === 2) {
    return isValidM04Level(minuend, subtrahend, 1);
  }
  if (difficulty === 3) {
    return isValidM04Level(minuend, subtrahend, 1) || isValidM04Level(minuend, subtrahend, 2);
  }
  return false;
}

function buildPair(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: SubtractionSubtype,
): { minuend: number; subtrahend: number } | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const blueprint = makeBlueprint(rng, difficulty, subtype);
    const pair = buildFromBlueprint(rng, blueprint);
    if (!pair) {
      continue;
    }
    const analysis = analyzeBorrows(pair.minuend, pair.subtrahend);
    if (!isValidM04Level(pair.minuend, pair.subtrahend, difficulty)) {
      continue;
    }
    if (isTooEasyForLevel(pair.minuend, pair.subtrahend, difficulty)) {
      continue;
    }
    if (!subtypeFits(subtype, pair.minuend, pair.subtrahend, analysis)) {
      continue;
    }
    return pair;
  }
  return null;
}

function forgottenBorrowValue(minuend: number, subtrahend: number): number | null {
  const width = Math.max(digitCount(minuend), digitCount(subtrahend));
  const topDigits = padDigits(minuend, width);
  const bottomDigits = padDigits(subtrahend, width);
  const digits: number[] = [];
  for (let index = width - 1; index >= 0; index -= 1) {
    const top = topDigits[index] ?? 0;
    const bottom = bottomDigits[index] ?? 0;
    digits.unshift(Math.abs(top - bottom));
  }
  const value = Number(digits.join(''));
  const difference = minuend - subtrahend;
  return value > 0 && value !== difference ? value : null;
}

function missedDecrementValue(minuend: number, subtrahend: number, analysis: BorrowAnalysis): number | null {
  const firstBorrow = analysis.outgoing.findIndex((value) => value > 0);
  if (firstBorrow < 0) {
    return null;
  }
  const difference = minuend - subtrahend;
  const value = difference + 10 ** (firstBorrow + 1);
  return value > 0 && value !== difference ? value : null;
}

function zeroWithoutChainValue(minuend: number, subtrahend: number): number | null {
  const width = Math.max(digitCount(minuend), digitCount(subtrahend));
  const topDigits = padDigits(minuend, width);
  const bottomDigits = padDigits(subtrahend, width);
  const digits: number[] = [];
  let borrowIn = 0;
  let usedZeroRule = false;

  for (let index = width - 1; index >= 0; index -= 1) {
    const rawTop = topDigits[index] ?? 0;
    const bottom = bottomDigits[index] ?? 0;
    if (rawTop === 0 && bottom > 0 && !usedZeroRule) {
      digits.unshift(bottom);
      borrowIn = 0;
      usedZeroRule = true;
      continue;
    }
    const top = rawTop - borrowIn;
    if (top < bottom) {
      digits.unshift(top + 10 - bottom);
      borrowIn = 1;
    } else {
      digits.unshift(top - bottom);
      borrowIn = 0;
    }
  }

  if (!usedZeroRule) {
    return null;
  }
  const value = Number(digits.join(''));
  const difference = minuend - subtrahend;
  return value > 0 && value !== difference ? value : null;
}

function wrongColumnValue(minuend: number, subtrahend: number): number | null {
  if (!isMixedDigits(minuend, subtrahend)) {
    return null;
  }
  const gap = digitCount(minuend) - digitCount(subtrahend);
  if (gap <= 0) {
    return null;
  }
  const shifted = subtrahend * 10 ** gap;
  const value = minuend - shifted;
  return value > 0 && value !== minuend - subtrahend ? value : null;
}

function digitSlips(difference: number, rng: SeededRng): number[] {
  const chars = String(difference).split('');
  const values: number[] = [];
  for (let index = 0; index < chars.length; index += 1) {
    const current = Number(chars[index]);
    for (const delta of [-1, 1]) {
      const digit = current + delta;
      if (digit < 0 || digit > 9 || (index === 0 && digit === 0)) {
        continue;
      }
      const next = [...chars];
      next[index] = String(digit);
      const value = Number(next.join(''));
      if (value > 0 && value !== difference) {
        values.push(value);
      }
    }
  }
  return shuffleSeeded(values, rng);
}

function isPlausibleSubtractionDistractor(difference: number, candidate: number): boolean {
  if (!Number.isInteger(candidate) || candidate <= 0 || candidate === difference) {
    return false;
  }
  if (Math.abs(digitCount(candidate) - digitCount(difference)) > 1) {
    return false;
  }
  // Отсекаем сдвиг столбца, дающий 2759 при разности 9122, и прочие обрубки.
  if (candidate < Math.floor(difference * 0.65) || candidate > Math.ceil(difference * 1.55)) {
    return false;
  }
  return true;
}

function uniqueDistractors(minuend: number, subtrahend: number, rng: SeededRng): string[] {
  const difference = minuend - subtrahend;
  const analysis = analyzeBorrows(minuend, subtrahend);
  const byKind: Record<string, number[]> = {
    forgot_borrow: [],
    missed_decrement: [],
    zero_without_chain: [],
    wrong_column: [],
    digit_subtraction_error: [],
  };

  const add = (kind: keyof typeof byKind, value: number | null) => {
    if (value === null || !isPlausibleSubtractionDistractor(difference, value)) {
      return;
    }
    if (!byKind[kind].includes(value)) {
      byKind[kind].push(value);
    }
  };

  add('forgot_borrow', forgottenBorrowValue(minuend, subtrahend));
  add('missed_decrement', missedDecrementValue(minuend, subtrahend, analysis));
  add('zero_without_chain', zeroWithoutChainValue(minuend, subtrahend));
  add('wrong_column', wrongColumnValue(minuend, subtrahend));
  for (const value of digitSlips(difference, rng)) {
    add('digit_subtraction_error', value);
  }

  const unique: number[] = [];
  const kindOrder = [
    'forgot_borrow',
    'missed_decrement',
    'wrong_column',
    'zero_without_chain',
    'digit_subtraction_error',
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

  const leftovers = shuffleSeeded(Object.values(byKind).flat(), rng);
  for (const value of leftovers) {
    if (unique.length === 3) {
      break;
    }
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }

  return unique.slice(0, 3).map(String);
}

function buildExplanation(minuend: number, subtrahend: number, difference: number): string {
  const width = Math.max(digitCount(minuend), digitCount(subtrahend));
  const topDigits = padDigits(minuend, width);
  const bottomDigits = padDigits(subtrahend, width);
  const placeNames = ['единицы', 'десятки', 'сотни', 'тысячи', 'десятки тысяч'];
  const steps: string[] = [];
  let borrowIn = 0;

  for (let index = width - 1, place = 0; index >= 0; index -= 1, place += 1) {
    const rawTop = topDigits[index] ?? 0;
    const bottom = bottomDigits[index] ?? 0;
    const placeName = placeNames[place] ?? `разряд ${place}`;
    const top = rawTop - borrowIn;
    if (top < bottom) {
      const written = top + 10 - bottom;
      steps.push(
        `${placeName}: ${rawTop}${borrowIn > 0 ? ' − 1' : ''} меньше ${bottom}, занимаем 10, получается ${written}.`,
      );
      borrowIn = 1;
    } else {
      steps.push(`${placeName}: ${rawTop}${borrowIn > 0 ? ' − 1' : ''} − ${bottom} = ${top - bottom}.`);
      borrowIn = 0;
    }
  }

  steps.push(`Получается ${difference}.`);
  return steps.join(' ');
}

function buildHints(minuend: number, subtrahend: number, difference: number): Pick<Task, 'hint1' | 'hint2' | 'hint3'> {
  return {
    hint1: 'Запиши числа столбиком: единицы под единицами, десятки под десятками.',
    hint2: 'Если цифра уменьшаемого меньше цифры вычитаемого, займи 1 из соседнего разряда слева.',
    hint3: `Нужно вычислить ${minuend} − ${subtrahend}. Разность равна ${difference}.`,
  };
}

function assertGeneratedM04(
  task: Task,
  expectedDifficulty: 1 | 2 | 3,
  requested: SubtractionSubtype,
): void {
  const params = task.generatorParams as M04GeneratorParams | undefined;
  if (!params || typeof params.minuend !== 'number' || typeof params.subtrahend !== 'number') {
    throw new Error('M04: нет generatorParams.minuend/subtrahend');
  }
  if (!Array.isArray(params.features)) {
    throw new Error('M04: нет generatorParams.features');
  }
  if (params.minuend <= params.subtrahend) {
    throw new Error('M04: уменьшаемое должно быть больше вычитаемого');
  }
  const computed = subtractPair(params.minuend, params.subtrahend);
  const recorded =
    typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
  if (recorded !== computed) {
    throw new Error(`M04: записанный ответ ${recorded} не равен разности ${computed}`);
  }
  if (task.skillId !== M04_SKILL_ID) {
    throw new Error(`M04: неверный skillId ${task.skillId}`);
  }
  if (task.difficulty !== expectedDifficulty) {
    throw new Error(`M04: неверный difficulty ${task.difficulty}`);
  }
  if (!isValidM04Level(params.minuend, params.subtrahend, expectedDifficulty)) {
    throw new Error(`M04: ${params.minuend}−${params.subtrahend} не соответствует уровню ${expectedDifficulty}`);
  }
  if (isTooEasyForLevel(params.minuend, params.subtrahend, expectedDifficulty)) {
    throw new Error(`M04: задание уровня ${expectedDifficulty} слишком простое`);
  }
  const analysis = analyzeBorrows(params.minuend, params.subtrahend);
  if (!subtypeFits(requested, params.minuend, params.subtrahend, analysis)) {
    throw new Error(`M04: подтип ${requested} не соответствует числам`);
  }
  if (task.taskType === 'singleChoice') {
    const answers = task.answers ?? [];
    if (answers.length !== 4 || new Set(answers).size !== 4) {
      throw new Error('M04: для singleChoice нужно 4 уникальных варианта');
    }
    if (answers.filter((item) => item === String(computed)).length !== 1) {
      throw new Error('M04: должен быть ровно один правильный вариант');
    }
  }
}

function toTask(
  minuend: number,
  subtrahend: number,
  difficulty: 1 | 2 | 3,
  seed: number,
  rng: SeededRng,
  requested: SubtractionSubtype,
): Task {
  const difference = subtractPair(minuend, subtrahend);
  const analysis = analyzeBorrows(minuend, subtrahend);
  const subtype = requested;
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const question = `Найди разность: ${minuend} − ${subtrahend}.`;
  const distractors = taskType === 'singleChoice' ? uniqueDistractors(minuend, subtrahend, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error(`M04: не удалось собрать 3 дистрактора для ${minuend}−${subtrahend}`);
  }
  const answers =
    taskType === 'singleChoice' ? shuffleSeeded([String(difference), ...distractors], rng) : undefined;

  const task: Task = {
    id: `generated-m04-${difficulty}-${subtractionFingerprint(minuend, subtrahend)}`,
    subject: 'mathematics',
    section: 'Вычисления',
    topic: 'Сложение и вычитание многозначных чисел',
    skill: SUBTYPE_TITLES[subtype],
    topicId: M04_TOPIC_ID,
    skillId: M04_SKILL_ID,
    difficulty,
    vprVersion: 2027,
    taskType,
    question,
    answers,
    correctAnswer: taskType === 'numberAnswer' ? difference : String(difference),
    explanation: buildExplanation(minuend, subtrahend, difference),
    ...buildHints(minuend, subtrahend, difference),
    sourceType: 'generated',
    generatorId: M04_GENERATOR_ID,
    generatorParams: {
      minuend,
      subtrahend,
      borrowCount: analysis.borrowCount,
      digitCounts: [digitCount(minuend), digitCount(subtrahend)],
      hasZeros: hasInternalZero(minuend) || hasInternalZero(subtrahend),
      subtype,
      features: collectFeatures(minuend, subtrahend, analysis, subtype),
      seed,
    } satisfies M04GeneratorParams,
  };

  assertGeneratedM04(task, difficulty, requested);
  return task;
}

export function generateM04Task(options: M04GenerateOptions): Task {
  if (options.difficulty === 4 || options.difficulty === 5) {
    throw new Error(
      'Генератор M04 пока не создаёт уровни 4–5: для них нужна отдельная спецификация формата (ВПР / поиск ошибки), а не увеличение чисел.',
    );
  }
  if (options.difficulty !== 1 && options.difficulty !== 2 && options.difficulty !== 3) {
    throw new Error(`Генератор M04: неподдерживаемый уровень ${options.difficulty}`);
  }

  const rng = createSeededRng(options.seed >>> 0);
  const difficulty = options.difficulty;
  const requested = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const pair = buildPair(rng, difficulty, requested);
    if (!pair) {
      continue;
    }
    try {
      return toTask(pair.minuend, pair.subtrahend, difficulty, options.seed, rng, requested);
    } catch {
      continue;
    }
  }

  throw new Error(`Генератор M04: не удалось собрать задание уровня ${difficulty} (seed ${options.seed})`);
}

function assertSeriesTask(task: Task, difficulty: 1 | 2 | 3, requested: SubtractionSubtype): void {
  const params = task.generatorParams as M04GeneratorParams;
  if (task.skillId !== M04_SKILL_ID || task.difficulty !== difficulty) {
    throw new Error('M04 series: неверный skillId или difficulty');
  }
  if (params.minuend <= params.subtrahend) {
    throw new Error('M04 series: minuend <= subtrahend');
  }
  if (params.borrowCount !== countBorrows(params.minuend, params.subtrahend)) {
    throw new Error('M04 series: borrowCount не совпадает с пересчётом');
  }
  const computed = subtractPair(params.minuend, params.subtrahend);
  const recorded = typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
  if (computed !== recorded) {
    throw new Error('M04 series: ответ не равен разности');
  }
  const expectedType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  if (task.taskType !== expectedType) {
    throw new Error('M04 series: неверный taskType');
  }
  if (!subtypeFits(requested, params.minuend, params.subtrahend, analyzeBorrows(params.minuend, params.subtrahend))) {
    throw new Error(`M04 series: подтип ${params.subtype} не соответствует запросу ${requested}`);
  }
  if (isTooEasyForLevel(params.minuend, params.subtrahend, difficulty)) {
    throw new Error('M04 series: задание проще заявленного уровня');
  }
  if (difficulty === 1 && isValidM04Level(params.minuend, params.subtrahend, 2)) {
    throw new Error('M04 series: L1 проходит правила L2');
  }
  if (difficulty === 2 && (isValidM04Level(params.minuend, params.subtrahend, 1) || isValidM04Level(params.minuend, params.subtrahend, 3))) {
    throw new Error('M04 series: L2 пересекается с L1 или L3');
  }
  if (difficulty === 3 && (isValidM04Level(params.minuend, params.subtrahend, 1) || isValidM04Level(params.minuend, params.subtrahend, 2))) {
    throw new Error('M04 series: L3 пересекается с L1 или L2');
  }
}

export function generateM04Series(options: M04SeriesOptions): Task[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const plan: Array<{ difficulty: 1 | 2 | 3; subtype: SubtractionSubtype }> = [];

  const level1: SubtractionSubtype[] = [
    'no_borrow',
    'no_borrow',
    'no_borrow',
    'no_borrow',
    'borrow_one',
    'borrow_one',
    'borrow_one',
    'mixed_digits',
    'mixed_digits',
    'mixed_digits',
  ];
  const level2: SubtractionSubtype[] = [
    'borrow_many',
    'borrow_many',
    'borrow_many',
    'borrow_many',
    'with_zeros',
    'with_zeros',
    'with_zeros',
    'mixed_digits',
    'mixed_digits',
    'mixed_digits',
  ];
  const level3: SubtractionSubtype[] = [
    'consecutive_borrows',
    'consecutive_borrows',
    'consecutive_borrows',
    'from_round',
    'from_round',
    'from_round',
    'with_zeros',
    'with_zeros',
    'mixed_digits',
    'borrow_many',
  ];

  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 1, subtype: level1[index % level1.length] as SubtractionSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 2, subtype: level2[index % level2.length] as SubtractionSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 3, subtype: level3[index % level3.length] as SubtractionSubtype });
  }

  for (let index = 0; index < plan.length; index += 1) {
    const item = plan[index];
    if (!item) {
      continue;
    }
    let created: Task | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seed = (options.seed + (index + 1) * 997 + attempt * 7919) >>> 0;
      const task = generateM04Task({
        difficulty: item.difficulty,
        subtype: item.subtype,
        seed,
      });
      const params = task.generatorParams as M04GeneratorParams;
      const fingerprint = subtractionFingerprint(params.minuend, params.subtrahend);
      if (seen.has(fingerprint)) {
        continue;
      }
      assertSeriesTask(task, item.difficulty, item.subtype);
      seen.add(fingerprint);
      created = task;
      break;
    }
    if (!created) {
      throw new Error(`Генератор M04: не удалось получить уникальное задание №${index + 1}`);
    }
    tasks.push(created);
  }

  return tasks;
}
