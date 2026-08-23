/**
 * Генератор M03: сложение многозначных чисел.
 * Контракт: M03_GENERATOR_SPEC.md
 * Педагогические границы: CONTENT_MATRIX_MATH.md, карточка M03.
 */
import type { Difficulty, Task } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export const M03_SKILL_ID = 'math.calculation.multi_digit.addition' as const;
export const M03_TOPIC_ID = 'math.calculation.multi_digit' as const;
export const M03_GENERATOR_ID = 'gen.math.multi_digit.addition' as const;

export type AdditionSubtype =
  | 'no_carry'
  | 'carry_one'
  | 'carry_many'
  | 'with_zeros'
  | 'three_addends'
  | 'mixed_digits';

export type AdditionFeature = AdditionSubtype | 'consecutive_carries';

export type M03GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: AdditionSubtype;
};

export type M03SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M03GeneratorParams = {
  addends: number[];
  carryCount: number;
  digitCounts: number[];
  hasZeros: boolean;
  subtype: AdditionSubtype;
  features: AdditionFeature[];
  seed: number;
};

export type CarryAnalysis = {
  carryCount: number;
  consecutive: boolean;
  outgoing: number[];
};

type DigitSpec = { min: number; max: number };

type ZeroSlot = { addendIndex: number; placeFromRight: number };

type Blueprint = {
  subtype: AdditionSubtype;
  digitCounts: number[];
  carryFromRight: boolean[];
  zeros: ZeroSlot[];
};

const SUBTYPE_TITLES: Record<AdditionSubtype, string> = {
  no_carry: 'Сложение без перехода через разряд',
  carry_one: 'Сложение с переходом в одном разряде',
  carry_many: 'Сложение с несколькими переходами',
  with_zeros: 'Сложение с нулями',
  three_addends: 'Сложение трёх слагаемых',
  mixed_digits: 'Слагаемые разной разрядности',
};

const L1_SUBTYPES: AdditionSubtype[] = ['no_carry', 'carry_one', 'mixed_digits'];
const L2_SUBTYPES: AdditionSubtype[] = ['carry_many', 'with_zeros', 'mixed_digits'];
const L3_SUBTYPES: AdditionSubtype[] = ['three_addends', 'with_zeros', 'mixed_digits', 'carry_many'];

const MAX_ATTEMPTS = 120;

function digitCount(value: number): number {
  return String(Math.abs(value)).length;
}

function hasInternalZero(value: number): boolean {
  return String(Math.abs(value)).includes('0');
}

function hasConsecutiveZeros(value: number): boolean {
  return /00/.test(String(Math.abs(value)));
}

function columnDigits(addends: readonly number[]): number[][] {
  const width = Math.max(...addends.map(digitCount));
  return addends.map((value) =>
    String(Math.abs(value))
      .padStart(width, '0')
      .split('')
      .map((digit) => Number(digit)),
  );
}

export function analyzeCarries(addends: readonly number[]): CarryAnalysis {
  const columns = columnDigits(addends);
  const width = columns[0]?.length ?? 0;
  const outgoing: number[] = [];
  let carry = 0;
  let carryCount = 0;
  for (let index = width - 1; index >= 0; index -= 1) {
    const columnSum = columns.reduce((sum, digits) => sum + (digits[index] ?? 0), 0) + carry;
    if (columnSum >= 10) {
      carryCount += 1;
      carry = Math.floor(columnSum / 10);
    } else {
      carry = 0;
    }
    outgoing.push(carry);
  }
  const consecutive = outgoing.some((value, index) => value > 0 && (outgoing[index + 1] ?? 0) > 0);
  return { carryCount, consecutive, outgoing };
}

export function countCarries(addends: readonly number[]): number {
  return analyzeCarries(addends).carryCount;
}

export function sumAddends(addends: readonly number[]): number {
  return addends.reduce((total, value) => total + value, 0);
}

export function additionFingerprint(addends: readonly number[]): string {
  return addends.join('+');
}

function fromDigits(digits: number[]): number {
  return Number(digits.join(''));
}

function randomDigitsWithSum(rng: SeededRng, specs: DigitSpec[], targetSum: number): number[] | null {
  const digits: number[] = [];
  let remaining = targetSum;
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    if (!spec) {
      return null;
    }
    const rest = specs.slice(index + 1);
    const restMin = rest.reduce((sum, item) => sum + item.min, 0);
    const restMax = rest.reduce((sum, item) => sum + item.max, 0);
    const lo = Math.max(spec.min, remaining - restMax);
    const hi = Math.min(spec.max, remaining - restMin);
    if (lo > hi) {
      return null;
    }
    const digit = randomInt(rng, lo, hi);
    digits.push(digit);
    remaining -= digit;
  }
  return remaining === 0 ? digits : null;
}

function buildColumn(
  rng: SeededRng,
  slots: DigitSpec[],
  carryIn: number,
  wantCarryOut: boolean,
): { digits: number[]; carryOut: number } | null {
  const minS = slots.reduce((sum, slot) => sum + slot.min, 0);
  const maxS = slots.reduce((sum, slot) => sum + slot.max, 0);
  const lo = wantCarryOut ? Math.max(minS, 10 - carryIn) : minS;
  const hi = wantCarryOut ? maxS : Math.min(maxS, 9 - carryIn);
  if (lo > hi) {
    return null;
  }
  const target = randomInt(rng, lo, hi);
  const digits = randomDigitsWithSum(rng, slots, target);
  if (!digits) {
    return null;
  }
  return { digits, carryOut: Math.floor((target + carryIn) / 10) };
}

function slotForPlace(length: number, placeFromRight: number, zeroHere: boolean): DigitSpec {
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

function buildFromBlueprint(rng: SeededRng, blueprint: Blueprint): number[] | null {
  const { digitCounts, carryFromRight, zeros } = blueprint;
  const width = Math.max(...digitCounts);
  const rows: number[][] = digitCounts.map(() => []);
  let carryIn = 0;

  for (let place = 0; place < width; place += 1) {
    const wantCarry = carryFromRight[place] === true;
    const slots = digitCounts.map((length, addendIndex) =>
      slotForPlace(
        length,
        place,
        zeros.some((slot) => slot.addendIndex === addendIndex && slot.placeFromRight === place),
      ),
    );
    const column = buildColumn(rng, slots, carryIn, wantCarry);
    if (!column) {
      return null;
    }
    column.digits.forEach((digit, addendIndex) => {
      rows[addendIndex]?.push(digit);
    });
    carryIn = column.carryOut;
  }

  const addends = rows.map((row) => fromDigits([...row].reverse()));
  if (addends.some((value, index) => digitCount(value) !== digitCounts[index])) {
    return null;
  }
  if (addends.some((value) => value <= 0 || hasConsecutiveZeros(value))) {
    return null;
  }
  return addends;
}

function planCarriesFromRight(width: number, carryPlaces: number[]): boolean[] {
  const plan = Array.from({ length: width }, () => false);
  for (const place of carryPlaces) {
    if (place >= 0 && place < width) {
      plan[place] = true;
    }
  }
  return plan;
}

function pickWidth(rng: SeededRng, preferFour: boolean): 3 | 4 {
  return preferFour ? pickOne(rng, [3, 4, 4, 4]) : pickOne(rng, [3, 3, 4]);
}

function makeBlueprint(rng: SeededRng, difficulty: 1 | 2 | 3, subtype: AdditionSubtype): Blueprint {
  if (difficulty === 1) {
    if (subtype === 'mixed_digits') {
      const pair = pickOne(rng, [
        [4, 3],
        [3, 4],
      ] as Array<[number, number]>);
      return {
        subtype,
        digitCounts: pair,
        carryFromRight: planCarriesFromRight(4, []),
        zeros: [],
      };
    }
    const width = pickWidth(rng, false);
    const carryPlaces = subtype === 'carry_one' ? [0] : [];
    return {
      subtype,
      digitCounts: [width, width],
      carryFromRight: planCarriesFromRight(width, carryPlaces),
      zeros: [],
    };
  }

  if (difficulty === 2) {
    if (subtype === 'mixed_digits') {
      return {
        subtype,
        digitCounts: pickOne(rng, [
          [4, 3],
          [3, 4],
        ]),
        carryFromRight: planCarriesFromRight(4, [0, 1]),
        zeros: [],
      };
    }
    const width = pickWidth(rng, true);
    const zeros: ZeroSlot[] =
      subtype === 'with_zeros'
        ? [{ addendIndex: 0, placeFromRight: pickOne(rng, [1, 2].filter((place) => place < width - 1)) }]
        : [];
    return {
      subtype,
      digitCounts: [width, width],
      carryFromRight: planCarriesFromRight(width, [0, 1]),
      zeros,
    };
  }

  if (subtype === 'three_addends') {
    const digitCounts = pickOne(rng, [
      [3, 3, 3],
      [4, 3, 3],
      [4, 3, 4],
      [4, 4, 3],
    ]);
    const width = Math.max(...digitCounts);
    return {
      subtype,
      digitCounts,
      carryFromRight: planCarriesFromRight(width, [0, 1, 2].filter((place) => place < width)),
      zeros: [],
    };
  }

  if (subtype === 'mixed_digits') {
    return {
      subtype,
      digitCounts: pickOne(rng, [
        [4, 3],
        [3, 4],
      ]),
      carryFromRight: planCarriesFromRight(4, [0, 1, 2]),
      zeros: [],
    };
  }

  const zeros: ZeroSlot[] =
    subtype === 'with_zeros' ? [{ addendIndex: 0, placeFromRight: pickOne(rng, [1, 2]) }] : [];
  return {
    subtype,
    digitCounts: [4, 4],
    carryFromRight: planCarriesFromRight(4, [0, 1, 2]),
    zeros,
  };
}

function allowedSubtypes(difficulty: 1 | 2 | 3): AdditionSubtype[] {
  if (difficulty === 1) {
    return L1_SUBTYPES;
  }
  if (difficulty === 2) {
    return L2_SUBTYPES;
  }
  return L3_SUBTYPES;
}

function resolveSubtype(difficulty: 1 | 2 | 3, requested: AdditionSubtype | undefined, rng: SeededRng): AdditionSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  return pickOne(rng, allowed);
}

function isMixedDigits(addends: readonly number[]): boolean {
  return new Set(addends.map(digitCount)).size > 1;
}

export function collectFeatures(
  addends: readonly number[],
  analysis: CarryAnalysis,
  subtype: AdditionSubtype,
): AdditionFeature[] {
  const features: AdditionFeature[] = [];
  if (addends.length >= 3) {
    features.push('three_addends');
  }
  if (analysis.carryCount === 0) {
    features.push('no_carry');
  }
  if (analysis.carryCount === 1) {
    features.push('carry_one');
  }
  if (analysis.carryCount >= 2) {
    features.push('carry_many');
  }
  if (analysis.consecutive) {
    features.push('consecutive_carries');
  }
  if (addends.some(hasInternalZero)) {
    features.push('with_zeros');
  }
  if (isMixedDigits(addends)) {
    features.push('mixed_digits');
  }
  return features.filter((feature) => feature !== subtype);
}

function subtypeFits(subtype: AdditionSubtype, addends: readonly number[], analysis: CarryAnalysis): boolean {
  switch (subtype) {
    case 'no_carry':
      return addends.length === 2 && analysis.carryCount === 0;
    case 'carry_one':
      return addends.length === 2 && analysis.carryCount === 1;
    case 'carry_many':
      return addends.length >= 2 && analysis.carryCount >= 2;
    case 'with_zeros':
      return addends.some(hasInternalZero);
    case 'three_addends':
      return addends.length === 3;
    case 'mixed_digits':
      return isMixedDigits(addends);
  }
}

export function isValidM03Level(addends: readonly number[], difficulty: 1 | 2 | 3): boolean {
  if (addends.length < 2 || addends.some((value) => !Number.isInteger(value) || value <= 0)) {
    return false;
  }
  if (addends.some((value) => digitCount(value) < 3 || digitCount(value) > 4)) {
    return false;
  }
  if (addends.some(hasConsecutiveZeros)) {
    return false;
  }

  const analysis = analyzeCarries(addends);
  const counts = addends.map(digitCount);
  const mixed = isMixedDigits(addends);

  if (difficulty === 1) {
    if (addends.length !== 2 || analysis.carryCount > 1) {
      return false;
    }
    if (mixed) {
      return analysis.carryCount === 0;
    }
    return true;
  }
  if (difficulty === 2) {
    return addends.length === 2 && analysis.carryCount === 2 && analysis.consecutive;
  }
  if (addends.length === 3) {
    return analysis.carryCount >= 2 && counts.every((count) => count >= 3);
  }
  return addends.length === 2 && analysis.carryCount >= 3;
}

function isTooEasyForLevel(addends: readonly number[], difficulty: 1 | 2 | 3): boolean {
  if (difficulty === 2) {
    return isValidM03Level(addends, 1);
  }
  if (difficulty === 3) {
    return isValidM03Level(addends, 1) || isValidM03Level(addends, 2);
  }
  return false;
}

function buildAddends(rng: SeededRng, difficulty: 1 | 2 | 3, subtype: AdditionSubtype): number[] | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const blueprint = makeBlueprint(rng, difficulty, subtype);
    const addends = buildFromBlueprint(rng, blueprint);
    if (!addends) {
      continue;
    }
    const analysis = analyzeCarries(addends);
    if (!isValidM03Level(addends, difficulty)) {
      continue;
    }
    if (isTooEasyForLevel(addends, difficulty)) {
      continue;
    }
    if (!subtypeFits(subtype, addends, analysis)) {
      continue;
    }
    return addends;
  }
  return null;
}

function forgottenAllCarries(addends: readonly number[]): number {
  const columns = columnDigits(addends);
  const width = columns[0]?.length ?? 0;
  const digits: number[] = [];
  for (let index = width - 1; index >= 0; index -= 1) {
    const columnSum = columns.reduce((sum, column) => sum + (column[index] ?? 0), 0);
    digits.unshift(columnSum % 10);
  }
  return Number(digits.join(''));
}

function forgottenFirstCarry(addends: readonly number[]): number | null {
  const columns = columnDigits(addends);
  const width = columns[0]?.length ?? 0;
  let carry = 0;
  let missed = false;
  const digits: number[] = [];
  for (let index = width - 1; index >= 0; index -= 1) {
    const columnSum = columns.reduce((sum, column) => sum + (column[index] ?? 0), 0) + carry;
    digits.unshift(columnSum % 10);
    const outgoing = Math.floor(columnSum / 10);
    if (!missed && outgoing > 0) {
      carry = 0;
      missed = true;
    } else {
      carry = outgoing;
    }
  }
  if (!missed) {
    return null;
  }
  return carry > 0 ? carry * 10 ** width + Number(digits.join('')) : Number(digits.join(''));
}

function leftAlignedSum(addends: readonly number[]): number | null {
  if (!isMixedDigits(addends)) {
    return null;
  }
  const width = Math.max(...addends.map(digitCount));
  const shifted = addends.map((value) => {
    const gap = width - digitCount(value);
    return gap > 0 ? value * 10 ** gap : value;
  });
  return sumAddends(shifted);
}

function lostLeadingDigit(sum: number, addends: readonly number[]): number | null {
  const maxDigits = Math.max(...addends.map(digitCount));
  const text = String(sum);
  if (text.length > maxDigits && text.length > 1) {
    const next = Number(text.slice(1));
    return next > 0 && next !== sum ? next : null;
  }
  return null;
}

function misdirectedCarry(sum: number, analysis: CarryAnalysis): number | null {
  const firstCarryPlace = analysis.outgoing.findIndex((value) => value > 0);
  if (firstCarryPlace < 0) {
    return null;
  }
  const nextPlace = firstCarryPlace + 1;
  const skippedPlace = firstCarryPlace + 2;
  const value = sum - 10 ** nextPlace + 10 ** skippedPlace;
  return value > 0 && value !== sum ? value : null;
}

function digitSlips(sum: number, rng: SeededRng): number[] {
  const chars = String(sum).split('');
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
      if (value > 0 && value !== sum) {
        values.push(value);
      }
    }
  }
  return shuffleSeeded(values, rng);
}

function isPlausibleAdditionDistractor(sum: number, candidate: number): boolean {
  if (!Number.isInteger(candidate) || candidate <= 0 || candidate === sum) {
    return false;
  }
  if (Math.abs(digitCount(candidate) - digitCount(sum)) > 1) {
    return false;
  }
  // Отсекаем «левое выравнивание», дающее 7313 при сумме 1724, и прочие обрубки.
  if (candidate < Math.floor(sum * 0.65) || candidate > Math.ceil(sum * 1.55)) {
    return false;
  }
  return true;
}

function uniqueDistractors(sum: number, addends: readonly number[], rng: SeededRng): string[] {
  const analysis = analyzeCarries(addends);
  const byKind: Record<string, number[]> = {
    forgot_carry: [],
    wrong_column: [],
    place_value_error: [],
    digit_addition_error: [],
  };

  const add = (kind: keyof typeof byKind, value: number | null) => {
    if (value === null || !isPlausibleAdditionDistractor(sum, value)) {
      return;
    }
    if (!byKind[kind].includes(value)) {
      byKind[kind].push(value);
    }
  };

  add('forgot_carry', forgottenFirstCarry(addends));
  add('forgot_carry', forgottenAllCarries(addends));
  add('wrong_column', leftAlignedSum(addends));
  add('place_value_error', lostLeadingDigit(sum, addends));
  add('place_value_error', misdirectedCarry(sum, analysis));
  for (const value of digitSlips(sum, rng)) {
    add('digit_addition_error', value);
  }

  const unique: number[] = [];
  const kindOrder = ['forgot_carry', 'wrong_column', 'place_value_error', 'digit_addition_error'];
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

function buildExplanation(addends: readonly number[], sum: number): string {
  const columns = columnDigits(addends);
  const width = columns[0]?.length ?? 0;
  const steps: string[] = [];
  let carry = 0;
  const placeNames = ['единицы', 'десятки', 'сотни', 'тысячи', 'десятки тысяч'];
  for (let index = width - 1, place = 0; index >= 0; index -= 1, place += 1) {
    const parts = columns.map((column) => column[index] ?? 0);
    const columnSum = parts.reduce((total, digit) => total + digit, 0) + carry;
    const written = columnSum % 10;
    const nextCarry = Math.floor(columnSum / 10);
    const addText = parts.join(' + ') + (carry > 0 ? ` + ${carry}` : '');
    const placeName = placeNames[place] ?? `разряд ${place}`;
    if (nextCarry > 0) {
      steps.push(`${placeName}: ${addText} = ${columnSum}, пишем ${written}, переносим ${nextCarry}.`);
    } else {
      steps.push(`${placeName}: ${addText} = ${columnSum}.`);
    }
    carry = nextCarry;
  }
  if (carry > 0) {
    steps.push(`Следующий разряд: перенос ${carry}.`);
  }
  steps.push(`Получается ${sum}.`);
  return steps.join(' ');
}

function buildHints(addends: readonly number[], sum: number): Pick<Task, 'hint1' | 'hint2' | 'hint3'> {
  return {
    hint1: 'Запиши числа столбиком: единицы под единицами, десятки под десятками.',
    hint2: 'Складывай справа налево. Если в разряде получилось 10 или больше, запиши единицы, а десяток перенеси.',
    hint3: `Слагаемые: ${addends.join(' + ')}. Сумма равна ${sum}.`,
  };
}

function assertGeneratedM03(task: Task, expectedDifficulty: 1 | 2 | 3, requested: AdditionSubtype): void {
  const params = task.generatorParams as M03GeneratorParams | undefined;
  if (!params || !Array.isArray(params.addends) || !Array.isArray(params.features)) {
    throw new Error('M03: нет generatorParams.addends/features');
  }
  const computed = sumAddends(params.addends);
  const recorded =
    typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
  if (recorded !== computed) {
    throw new Error(`M03: записанный ответ ${recorded} не равен сумме ${computed}`);
  }
  if (task.skillId !== M03_SKILL_ID) {
    throw new Error(`M03: неверный skillId ${task.skillId}`);
  }
  if (task.difficulty !== expectedDifficulty) {
    throw new Error(`M03: неверный difficulty ${task.difficulty}`);
  }
  if (!isValidM03Level(params.addends, expectedDifficulty)) {
    throw new Error(`M03: слагаемые ${params.addends.join('+')} не соответствуют уровню ${expectedDifficulty}`);
  }
  if (isTooEasyForLevel(params.addends, expectedDifficulty)) {
    throw new Error(`M03: задание уровня ${expectedDifficulty} слишком простое`);
  }
  const analysis = analyzeCarries(params.addends);
  if (!subtypeFits(requested, params.addends, analysis) && !subtypeFits(params.subtype, params.addends, analysis)) {
    throw new Error(`M03: подтип ${params.subtype} не соответствует числам`);
  }
  if (task.taskType === 'singleChoice') {
    const answers = task.answers ?? [];
    if (answers.length !== 4 || new Set(answers).size !== 4) {
      throw new Error('M03: для singleChoice нужно 4 уникальных варианта');
    }
    if (answers.filter((item) => item === String(computed)).length !== 1) {
      throw new Error('M03: должен быть ровно один правильный вариант');
    }
  }
}

function toTask(
  addends: number[],
  difficulty: 1 | 2 | 3,
  seed: number,
  rng: SeededRng,
  requested: AdditionSubtype,
): Task {
  const sum = sumAddends(addends);
  const analysis = analyzeCarries(addends);
  const subtype = requested;
  const carryCount = analysis.carryCount;
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const question = `Найди сумму: ${addends.join(' + ')}.`;
  const distractors = taskType === 'singleChoice' ? uniqueDistractors(sum, addends, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error(`M03: не удалось собрать 3 дистрактора для ${addends.join('+')}`);
  }
  const answers =
    taskType === 'singleChoice' ? shuffleSeeded([String(sum), ...distractors], rng) : undefined;

  const task: Task = {
    id: `generated-m03-${difficulty}-${additionFingerprint(addends)}`,
    subject: 'mathematics',
    section: 'Вычисления',
    topic: 'Сложение и вычитание многозначных чисел',
    skill: SUBTYPE_TITLES[subtype],
    topicId: M03_TOPIC_ID,
    skillId: M03_SKILL_ID,
    difficulty,
    vprVersion: 2027,
    taskType,
    question,
    answers,
    correctAnswer: taskType === 'numberAnswer' ? sum : String(sum),
    explanation: buildExplanation(addends, sum),
    ...buildHints(addends, sum),
    sourceType: 'generated',
    generatorId: M03_GENERATOR_ID,
    generatorParams: {
      addends,
      carryCount,
      digitCounts: addends.map(digitCount),
      hasZeros: addends.some(hasInternalZero),
      subtype,
      features: collectFeatures(addends, analysis, subtype),
      seed,
    } satisfies M03GeneratorParams,
  };

  assertGeneratedM03(task, difficulty, requested);
  return task;
}

export function generateM03Task(options: M03GenerateOptions): Task {
  if (options.difficulty === 4 || options.difficulty === 5) {
    throw new Error(
      'Генератор M03 пока не создаёт уровни 4–5: для них нужна отдельная спецификация формата, а не увеличение чисел.',
    );
  }
  if (options.difficulty !== 1 && options.difficulty !== 2 && options.difficulty !== 3) {
    throw new Error(`Генератор M03: неподдерживаемый уровень ${options.difficulty}`);
  }

  const rng = createSeededRng(options.seed >>> 0);
  const difficulty = options.difficulty;
  const requested = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const addends = buildAddends(rng, difficulty, requested);
    if (!addends) {
      continue;
    }
    try {
      return toTask(addends, difficulty, options.seed, rng, requested);
    } catch {
      continue;
    }
  }

  throw new Error(`Генератор M03: не удалось собрать задание уровня ${difficulty} (seed ${options.seed})`);
}

function assertSeriesTask(task: Task, difficulty: 1 | 2 | 3, requested: AdditionSubtype): void {
  const params = task.generatorParams as M03GeneratorParams;
  if (task.skillId !== M03_SKILL_ID || task.difficulty !== difficulty) {
    throw new Error('M03 series: неверный skillId или difficulty');
  }
  if (params.subtype !== requested && !subtypeFits(requested, params.addends, analyzeCarries(params.addends))) {
    throw new Error(`M03 series: подтип ${params.subtype} не соответствует запросу ${requested}`);
  }
  if (params.carryCount !== countCarries(params.addends)) {
    throw new Error('M03 series: carryCount не совпадает с пересчётом');
  }
  if (params.digitCounts.join(',') !== params.addends.map(digitCount).join(',')) {
    throw new Error('M03 series: digitCounts не совпадают');
  }
  const computed = sumAddends(params.addends);
  const recorded = typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
  if (computed !== recorded) {
    throw new Error('M03 series: ответ не равен сумме');
  }
  const expectedType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  if (task.taskType !== expectedType) {
    throw new Error('M03 series: неверный taskType');
  }
  if (isTooEasyForLevel(params.addends, difficulty)) {
    throw new Error('M03 series: задание проще заявленного уровня');
  }
}

export function generateM03Series(options: M03SeriesOptions): Task[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const plan: Array<{ difficulty: 1 | 2 | 3; subtype: AdditionSubtype }> = [];

  const level1: AdditionSubtype[] = [
    'no_carry',
    'no_carry',
    'no_carry',
    'no_carry',
    'carry_one',
    'carry_one',
    'carry_one',
    'mixed_digits',
    'mixed_digits',
    'mixed_digits',
  ];
  const level2: AdditionSubtype[] = [
    'carry_many',
    'carry_many',
    'carry_many',
    'carry_many',
    'with_zeros',
    'with_zeros',
    'with_zeros',
    'mixed_digits',
    'mixed_digits',
    'mixed_digits',
  ];
  const level3: AdditionSubtype[] = [
    'three_addends',
    'three_addends',
    'three_addends',
    'with_zeros',
    'with_zeros',
    'with_zeros',
    'mixed_digits',
    'mixed_digits',
    'carry_many',
    'carry_many',
  ];

  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 1, subtype: level1[index % level1.length] as AdditionSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 2, subtype: level2[index % level2.length] as AdditionSubtype });
  }
  for (let index = 0; index < countPerLevel; index += 1) {
    plan.push({ difficulty: 3, subtype: level3[index % level3.length] as AdditionSubtype });
  }

  for (let index = 0; index < plan.length; index += 1) {
    const item = plan[index];
    if (!item) {
      continue;
    }
    let created: Task | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seed = (options.seed + (index + 1) * 997 + attempt * 7919) >>> 0;
      const task = generateM03Task({
        difficulty: item.difficulty,
        subtype: item.subtype,
        seed,
      });
      const params = task.generatorParams as M03GeneratorParams;
      const fingerprint = additionFingerprint(params.addends);
      if (seen.has(fingerprint)) {
        continue;
      }
      assertSeriesTask(task, item.difficulty, item.subtype);
      seen.add(fingerprint);
      created = task;
      break;
    }
    if (!created) {
      throw new Error(`Генератор M03: не удалось получить уникальное задание №${index + 1}`);
    }
    tasks.push(created);
  }

  return tasks;
}
