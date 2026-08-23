/**
 * Генератор M01: разрядный состав и запись чисел.
 * Контракт: карточка M01 в CONTENT_MATRIX_MATH.md (L1–L3).
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

export const M01_SKILL_ID = 'math.calculation.numbers.place_value' as const;
export const M01_TOPIC_ID = 'math.calculation.numbers' as const;
export const M01_GENERATOR_ID = 'gen.math.numbers.place_value' as const;

export type PlaceValueSubtype = 'digit_value' | 'compose' | 'place_digit' | 'zeros';
export type PlaceName = 'единиц' | 'десятков' | 'сотен' | 'тысяч';

export type M01GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: PlaceValueSubtype };
export type M01SeriesOptions = { seed: number; countPerLevel?: number };

export type M01GeneratorParams = {
  subtype: PlaceValueSubtype;
  number: number;
  place: PlaceName;
  answer: number | string;
  seed: number;
};

const MAX_ATTEMPTS = 100;

const PLACE_WEIGHT: Record<PlaceName, number> = {
  единиц: 1,
  десятков: 10,
  сотен: 100,
  тысяч: 1000,
};

function digitAt(n: number, place: PlaceName): number {
  return Math.floor(n / PLACE_WEIGHT[place]) % 10;
}

function noZeroDigits(n: number): boolean {
  return !String(n).includes('0');
}

function allowedSubtypes(difficulty: Level): PlaceValueSubtype[] {
  if (difficulty === 1) return ['digit_value'];
  if (difficulty === 2) return ['compose', 'digit_value'];
  return ['place_digit', 'zeros'];
}

function resolveSubtype(
  difficulty: Level,
  requested: PlaceValueSubtype | undefined,
  rng: SeededRng,
): PlaceValueSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function isValidM01Level(
  params: Pick<M01GeneratorParams, 'subtype' | 'number'>,
  difficulty: Level,
): boolean {
  const digits = String(params.number).length;
  if (difficulty === 1) {
    return params.subtype === 'digit_value' && digits === 3 && noZeroDigits(params.number);
  }
  if (difficulty === 2) {
    return (params.subtype === 'compose' || params.subtype === 'digit_value') && digits === 4;
  }
  return (
    (params.subtype === 'place_digit' || params.subtype === 'zeros') &&
    digits === 4 &&
    String(params.number).includes('0')
  );
}

type Built = {
  subtype: PlaceValueSubtype;
  number: number;
  place: PlaceName;
  answer: number | string;
  question: string;
  explanation: string;
  distractors: Array<number | string>;
  taskType: 'singleChoice' | 'numberAnswer';
};

function buildDigitValue(rng: SeededRng, difficulty: Level): Built | null {
  const three = difficulty === 1;
  let n: number;
  if (three) {
    n = randomInt(rng, 123, 987);
    if (!noZeroDigits(n)) return null;
  } else {
    n = randomInt(rng, 1023, 9876);
  }
  const places: PlaceName[] = three
    ? ['единиц', 'десятков', 'сотен']
    : ['единиц', 'десятков', 'сотен', 'тысяч'];
  const place = pickOne(rng, places);
  const answer = digitAt(n, place);
  const askValue = pickOne(rng, [true, false] as const);
  if (askValue) {
    const value = answer * PLACE_WEIGHT[place];
    const wrongPlaces = places.filter((p) => p !== place);
    const distractors = uniqueDistractorsFromModels(
      value,
      [
        digitAt(n, wrongPlaces[0] ?? 'единиц') * PLACE_WEIGHT[wrongPlaces[0] ?? 'единиц'],
        digitAt(n, wrongPlaces[1] ?? 'десятков') * PLACE_WEIGHT[wrongPlaces[1] ?? 'десятков'],
        answer,
        value + PLACE_WEIGHT[place],
        Math.floor(n / 10),
      ],
      rng,
      3,
    );
    return {
      subtype: 'digit_value',
      number: n,
      place,
      answer: value,
      question: `В числе ${n} какое значение имеет цифра в разряде ${place}?`,
      explanation: `В разряде ${place} стоит цифра ${answer}, её значение — ${value}.`,
      distractors,
      taskType: 'singleChoice',
    };
  }
  const distractors = uniqueDistractorsFromModels(
    answer,
    [digitAt(n, 'единиц'), digitAt(n, 'десятков'), digitAt(n, 'сотен'), (answer + 1) % 10, answer === 0 ? 1 : 0],
    rng,
    3,
  );
  return {
    subtype: 'digit_value',
    number: n,
    place,
    answer,
    question: `Сколько ${place} в числе ${n}?`,
    explanation: `В разряде ${place} стоит цифра ${answer}.`,
    distractors,
    taskType: 'singleChoice',
  };
}

function buildCompose(rng: SeededRng): Built | null {
  const th = randomInt(rng, 1, 9);
  const h = randomInt(rng, 1, 9);
  const t = randomInt(rng, 1, 9);
  const o = randomInt(rng, 1, 9);
  const n = th * 1000 + h * 100 + t * 10 + o;
  const answer = n;
  const mode = pickOne(rng, ['sum', 'words'] as const);
  let question: string;
  if (mode === 'sum') {
    question = `Запиши число: ${th} тыс. + ${h} сот. + ${t} дес. + ${o} ед.`;
  } else {
    question = `Какое число состоит из ${th} тысяч, ${h} сотен, ${t} десятков и ${o} единиц?`;
  }
  const distractors = uniqueDistractorsFromModels(
    answer,
    [
      th * 1000 + h * 100 + t + o,
      th * 100 + h * 10 + t,
      h * 1000 + th * 100 + t * 10 + o,
      th * 1000 + h * 100 + o * 10 + t,
      n + 10,
    ],
    rng,
    3,
  );
  return {
    subtype: 'compose',
    number: n,
    place: 'тысяч',
    answer,
    question,
    explanation: `${th}×1000 + ${h}×100 + ${t}×10 + ${o} = ${n}.`,
    distractors,
    taskType: 'singleChoice',
  };
}

function buildPlaceDigit(rng: SeededRng): Built | null {
  // Четырёхзначное с нулём (не все разряды «заняты»)
  const positions = [0, 1, 2, 3];
  const zeroPos = pickOne(rng, positions);
  const digits = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) {
    if (i === zeroPos) {
      digits[i] = 0;
    } else if (i === 0) {
      digits[i] = randomInt(rng, 1, 9);
    } else {
      digits[i] = randomInt(rng, 1, 9);
    }
  }
  if (digits[0] === 0) return null;
  const n = digits[0]! * 1000 + digits[1]! * 100 + digits[2]! * 10 + digits[3]!;
  if (!String(n).includes('0')) return null;
  const place = pickOne(rng, ['тысяч', 'сотен', 'десятков', 'единиц'] as PlaceName[]);
  const answer = digitAt(n, place);
  const distractors = uniqueDistractorsFromModels(
    answer,
    [digits[0]!, digits[1]!, digits[2]!, digits[3]!, (answer + 1) % 10],
    rng,
    3,
  );
  return {
    subtype: 'place_digit',
    number: n,
    place,
    answer,
    question: `В числе ${n} в разряде ${place} стоит цифра…`,
    explanation: `В разряде ${place} стоит ${answer}.`,
    distractors,
    taskType: 'singleChoice',
  };
}

function buildZeros(rng: SeededRng): Built | null {
  const th = randomInt(rng, 1, 9);
  const h = pickOne(rng, [0, randomInt(rng, 1, 9)]);
  const t = h === 0 ? randomInt(rng, 1, 9) : 0;
  const o = randomInt(rng, 1, 9);
  const n = th * 1000 + h * 100 + t * 10 + o;
  if (!String(n).includes('0')) return null;
  const answer = n;
  const question = `Запиши число: ${th} тысяч, ${h} сотен, ${t} десятков, ${o} единиц.`;
  const distractors = uniqueDistractorsFromModels(
    answer,
    [
      th * 1000 + h * 100 + t + o,
      Number(`${th}${h}${t}${o}`.replace(/0/g, '') || th),
      th * 100 + h * 10 + t,
      n + 100,
      th * 1000 + o,
    ],
    rng,
    3,
  );
  return {
    subtype: 'zeros',
    number: n,
    place: 'тысяч',
    answer,
    question,
    explanation: `С учётом нулей получается ${n}.`,
    distractors,
    taskType: 'singleChoice',
  };
}

function buildCase(rng: SeededRng, difficulty: Level, subtype: PlaceValueSubtype): Built | null {
  if (subtype === 'digit_value') return buildDigitValue(rng, difficulty);
  if (subtype === 'compose') return buildCompose(rng);
  if (subtype === 'place_digit') return buildPlaceDigit(rng);
  return buildZeros(rng);
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  if (!isValidM01Level({ subtype: built.subtype, number: built.number }, difficulty)) {
    throw new Error(`M01: невалидный L${difficulty}`);
  }
  if (String(built.question).includes(String(built.answer)) && built.subtype === 'digit_value') {
    // цифра ответа может совпасть с цифрой в числе — это нормально; запрещаем явный «ответ: N»
    if (/ответ\s*:/i.test(built.question)) throw new Error('M01: leak');
  }
  const distractors = built.distractors.map(String);
  const answers =
    built.taskType === 'singleChoice'
      ? buildChoiceAnswers(String(built.answer), distractors, rng)
      : undefined;
  if (built.taskType === 'singleChoice' && (!answers || answers.length !== 4)) {
    throw new Error('M01: options');
  }
  return baseTask({
    id: `generated-m01-${difficulty}-${built.subtype}-${built.number}-${built.place}-${seed}`,
    section: 'Вычисления',
    topic: 'Числа и разряды',
    skill: 'Разрядный состав и запись чисел',
    topicId: M01_TOPIC_ID,
    skillId: M01_SKILL_ID,
    difficulty,
    taskType: built.taskType,
    question: built.question,
    correctAnswer: built.answer,
    answers,
    explanation: built.explanation,
    generatorId: M01_GENERATOR_ID,
    generatorParams: {
      subtype: built.subtype,
      number: built.number,
      place: built.place,
      answer: built.answer,
      seed,
    } satisfies M01GeneratorParams,
  });
}

export function fingerprintM01(task: Task): string {
  const p = task.generatorParams as M01GeneratorParams;
  return `${p.subtype}|${p.number}|${p.place}|${p.answer}`;
}

export function generateM01Task(options: M01GenerateOptions): Task {
  rejectAdvancedLevels('M01', options.difficulty);
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
  throw new Error(`M01: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM01Series(options: M01SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM01Task({ difficulty, seed, subtype: subtypes[index % subtypes.length] });
    },
    fingerprintM01,
    'M01',
  );
}
