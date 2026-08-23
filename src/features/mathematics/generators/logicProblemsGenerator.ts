/**
 * Генератор M35: решение логической задачи (соответствие / исключение).
 * Контракт: M35_GENERATOR_SPEC.md
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';

export const M35_SKILL_ID = 'math.logic.problems.solve' as const;
export const M35_TOPIC_ID = 'math.logic.problems' as const;
export const M35_GENERATOR_ID = 'gen.math.logic.problems' as const;

export type M35Subtype = 'short_search' | 'who_what' | 'three_by_three';
export type M35Feature = 'unique_search' | 'matching' | 'three_conditions' | 'inference';

export type M35GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: M35Subtype };
export type M35SeriesOptions = { seed: number; countPerLevel?: number };

export type M35GeneratorParams = {
  subtype: M35Subtype;
  features: M35Feature[];
  story: string;
  answer: string;
  options: string[];
  seed: number;
  askedEntity?: string;
};

type Built = {
  subtype: M35Subtype;
  features: M35Feature[];
  story: string;
  answer: string;
  options: string[];
  question: string;
  explanation: string;
  askedEntity?: string;
  statedPairs: Array<{ who: string; what: string }>;
};

const MAX_ATTEMPTS = 120;

function allowedSubtypes(difficulty: Level): M35Subtype[] {
  if (difficulty === 1) return ['short_search'];
  if (difficulty === 2) return ['who_what'];
  return ['three_by_three'];
}

function resolveSubtype(difficulty: Level, requested: M35Subtype | undefined, rng: SeededRng): M35Subtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function isValidM35Level(
  params: { subtype: M35Subtype; features: readonly M35Feature[] },
  difficulty: Level,
): boolean {
  if (difficulty === 1) {
    return params.subtype === 'short_search' && params.features.includes('unique_search');
  }
  if (difficulty === 2) {
    return params.subtype === 'who_what' && params.features.includes('matching');
  }
  return params.subtype === 'three_by_three' && params.features.includes('three_conditions');
}

/** Ответ уже буквально назван как прямая пара с субъектом вопроса. */
export function answerAlreadyInQuestion(question: string, answer: string, askedEntity?: string): boolean {
  if (!askedEntity || !answer || answer.length < 2) return false;
  const who = askedEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Только прямые утверждения: «X любит Y», «X занимается «Y»», не список в одном предложении
  const directPair = new RegExp(
    `${who}\\s+(любит|занимается)\\s*[«"]?${a}[»"]?|${a}\\s+(любит|выбрал)\\s+${who}`,
    'i',
  );
  return directPair.test(question);
}

export function isDirectPairAsked(
  statedPairs: Array<{ who: string; what: string }>,
  askedEntity: string | undefined,
  answer: string,
): boolean {
  if (!askedEntity) return false;
  return statedPairs.some((p) => p.who === askedEntity && p.what === answer);
}

export function hasRuleLeakStyle(question: string): boolean {
  return /чередуются умножение|сначала умножаем|правило ряда|каждый второй член/i.test(question);
}

function buildL1(rng: SeededRng): Built | null {
  const mode = pickOne(rng, ['numbers', 'objects'] as const);
  if (mode === 'numbers') {
    const candidates = pickOne(rng, [
      [7, 12, 15],
      [9, 14, 21],
      [8, 11, 16],
      [6, 13, 18],
      [10, 15, 22],
    ] as const);
    const rule = pickOne(rng, ['even_gt10', 'odd_lt15', 'div3'] as const);
    let answer: number | null = null;
    let ruleText = '';
    if (rule === 'even_gt10') {
      ruleText = 'чётное и больше 10';
      const hits = candidates.filter((n) => n % 2 === 0 && n > 10);
      if (hits.length !== 1) return null;
      answer = hits[0]!;
    } else if (rule === 'odd_lt15') {
      ruleText = 'нечётное и меньше 15';
      const hits = candidates.filter((n) => n % 2 === 1 && n < 15);
      if (hits.length !== 1) return null;
      answer = hits[0]!;
    } else {
      ruleText = 'делится на 3 и больше 10';
      const hits = candidates.filter((n) => n % 3 === 0 && n > 10);
      if (hits.length !== 1) return null;
      answer = hits[0]!;
    }
    const options = [...candidates.map(String), String(answer + 1)].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4);
    while (options.length < 4) options.push(String(40 + options.length));
    return {
      subtype: 'short_search',
      features: ['unique_search', 'inference'],
      story: `Даны числа: ${candidates.join(', ')}.`,
      answer: String(answer),
      options,
      question: `Даны числа: ${candidates.join(', ')}. Какое из них ${ruleText}?`,
      explanation: `Под условие «${ruleText}» подходит только ${answer}.`,
      statedPairs: [],
    };
  }

  // Минимальный вывод: исключение из двух вариантов
  const person = pickOne(rng, ['Маша', 'Катя', 'Аня', 'Лена', 'Оля']);
  const items = pickOne(rng, [
    ['яблоко', 'груша', 'слива'],
    ['тетрадь', 'ручка', 'ластик'],
    ['мяч', 'скакалка', 'обруч'],
    ['суп', 'каша', 'салат'],
  ] as const);
  const rejected = items[0];
  const kept = pickOne(rng, [items[1], items[2]]);
  const eliminated = kept === items[1] ? items[2] : items[1];
  const answer = kept;
  const decoy = pickOne(rng, ['апельсин', 'лимон', 'линейка', 'пенал', 'йогурт']);
  const story = `${person} не любит «${rejected}». Она выбирала между «${items[1]}» и «${items[2]}». «${eliminated}» ей тоже не подошло.`;
  const question = `${story} Что могла выбрать ${person}?`;
  return {
    subtype: 'short_search',
    features: ['unique_search', 'inference'],
    story,
    answer,
    options: [items[1], items[2], rejected, decoy],
    question,
    explanation: `Исключили «${rejected}» и «${eliminated}». Остаётся «${answer}».`,
    askedEntity: person,
    statedPairs: [],
  };
}

function buildL2(rng: SeededRng): Built | null {
  const people = pickOne(rng, [
    ['Аня', 'Боря', 'Витя'],
    ['Галя', 'Дима', 'Егор'],
    ['Кира', 'Лёша', 'Миша'],
    ['Нина', 'Олег', 'Петя'],
    ['Соня', 'Тимур', 'Федя'],
    ['Юля', 'Коля', 'Саша'],
  ] as const);
  const fruits = pickOne(rng, [
    ['яблоко', 'груша', 'слива'],
    ['банан', 'киви', 'манго'],
    ['персик', 'абрикос', 'вишня'],
    ['дыня', 'арбуз', 'айва'],
  ] as const);
  const mode = pickOne(rng, ['via_third', 'via_two_stated'] as const);
  // people[0] → fruits[0], people[1] → fruits[1], people[2] → fruits[2]
  const mapping: Record<string, string> = {
    [people[0]]: fruits[0],
    [people[1]]: fruits[1],
    [people[2]]: fruits[2],
  };
  // Всегда спрашиваем people[1]: его пара ни разу не названа прямой фразой
  const askWho = people[1];
  const answer = mapping[askWho]!;
  const decoy = pickOne(rng, ['апельсин', 'лимон', 'ананас', 'гранат']);
  let story: string;
  let stated: Array<{ who: string; what: string }>;
  if (mode === 'via_third') {
    story = [
      `${people[0]}, ${people[1]} и ${people[2]} любят разные фрукты: ${fruits[0]}, ${fruits[1]} и ${fruits[2]}.`,
      `${people[0]} любит ${fruits[0]}.`,
      `${people[1]} не любит ${fruits[0]}.`,
      `${fruits[2]} выбрал тот, кто не ${people[0]} и не ${people[1]}.`,
    ].join(' ');
    stated = [{ who: people[0], what: fruits[0] }];
  } else {
    story = [
      `${people[0]}, ${people[1]} и ${people[2]} любят разные фрукты: ${fruits[0]}, ${fruits[1]} и ${fruits[2]}.`,
      `${people[0]} любит ${fruits[0]}.`,
      `${people[2]} любит ${fruits[2]}.`,
      `У ${people[1]} остался другой фрукт.`,
    ].join(' ');
    stated = [
      { who: people[0], what: fruits[0] },
      { who: people[2], what: fruits[2] },
    ];
  }
  if (isDirectPairAsked(stated, askWho, answer)) return null;
  if (answerAlreadyInQuestion(`${story} Что любит ${askWho}?`, answer, askWho)) return null;
  return {
    subtype: 'who_what',
    features: ['matching', 'inference'],
    story,
    answer,
    options: [...fruits, decoy],
    question: `${story} Что любит ${askWho}?`,
    explanation:
      mode === 'via_third'
        ? `${people[0]} — ${fruits[0]}; ${fruits[2]} — у ${people[2]}; значит ${people[1]} — ${fruits[1]}.`
        : `${people[0]} — ${fruits[0]}, ${people[2]} — ${fruits[2]}; остаётся ${people[1]} — ${fruits[1]}.`,
    askedEntity: askWho,
    statedPairs: stated,
  };
}

function buildL3(rng: SeededRng): Built | null {
  const kids = pickOne(rng, [
    ['Аня', 'Боря', 'Витя'],
    ['Галя', 'Дима', 'Егор'],
    ['Кира', 'Лёша', 'Миша'],
  ] as const);
  const hobbies = pickOne(rng, [
    ['рисование', 'футбол', 'чтение'],
    ['шахматы', 'плавание', 'музыка'],
    ['лепка', 'танцы', 'бег'],
  ] as const);
  // Единственное решение:
  // kids[1] → hobbies[2] (явно)
  // kids[0] не hobbies[1]
  // kids[2] не hobbies[0]
  // → kids[0]=hobbies[0], kids[2]=hobbies[1]
  const mapping: Record<string, string> = {
    [kids[0]]: hobbies[0],
    [kids[1]]: hobbies[2],
    [kids[2]]: hobbies[1],
  };
  // Не спрашиваем kids[1] (пара названа явно)
  const ask = pickOne(rng, [kids[0], kids[2]]);
  const answer = mapping[ask]!;
  const statedPairs = [{ who: kids[1], what: hobbies[2] }];
  const decoy = pickOne(rng, ['садоводство', 'кулинария', 'фото']);
  const story = [
    `${kids[0]}, ${kids[1]} и ${kids[2]} занимаются разными делами: ${hobbies[0]}, ${hobbies[1]} и ${hobbies[2]}.`,
    `${kids[1]} занимается «${hobbies[2]}».`,
    `${kids[0]} не занимается «${hobbies[1]}».`,
    `${kids[2]} не занимается «${hobbies[0]}».`,
  ].join(' ');
  if (isDirectPairAsked(statedPairs, ask, answer)) return null;
  return {
    subtype: 'three_by_three',
    features: ['three_conditions', 'inference'],
    story,
    answer,
    options: [...hobbies, decoy],
    question: `${story} Чем занимается ${ask}?`,
    explanation: `${kids[1]} — ${hobbies[2]}. Тогда ${kids[0]} — ${hobbies[0]}, ${kids[2]} — ${hobbies[1]}. Значит ${ask} — ${answer}.`,
    askedEntity: ask,
    statedPairs,
  };
}

function buildCase(rng: SeededRng, difficulty: Level, _subtype: M35Subtype): Built | null {
  if (difficulty === 1) return buildL1(rng);
  if (difficulty === 2) return buildL2(rng);
  return buildL3(rng);
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  if (!isValidM35Level({ subtype: built.subtype, features: built.features }, difficulty)) {
    throw new Error(`M35: невалидный L${difficulty}`);
  }
  if (isDirectPairAsked(built.statedPairs, built.askedEntity, built.answer)) {
    throw new Error('M35: direct pair asked');
  }
  if (difficulty >= 2 && answerAlreadyInQuestion(built.question, built.answer, built.askedEntity)) {
    throw new Error('M35: answer already in question');
  }
  const distractors = uniqueDistractorsFromModels(
    built.answer,
    built.options.filter((o) => o !== built.answer),
    rng,
    3,
  );
  if (distractors.length !== 3) throw new Error('M35: дистракторы');

  return baseTask({
    id: `generated-m35-${difficulty}-${built.subtype}-${built.answer}-${seed}`,
    section: 'Логические задачи',
    topic: 'Логические задачи',
    skill: 'Решение логической задачи',
    topicId: M35_TOPIC_ID,
    skillId: M35_SKILL_ID,
    difficulty,
    taskType: 'singleChoice',
    question: built.question,
    correctAnswer: built.answer,
    answers: buildChoiceAnswers(built.answer, distractors, rng),
    explanation: built.explanation,
    generatorId: M35_GENERATOR_ID,
    generatorParams: {
      subtype: built.subtype,
      features: built.features,
      story: built.story,
      answer: built.answer,
      options: built.options,
      seed,
      askedEntity: built.askedEntity,
    } satisfies M35GeneratorParams,
    hint1: 'Отметь, что точно известно, и исключи остальное.',
    hint2: 'Каждому — ровно одно значение.',
    hint3: `Ответ: ${built.answer}.`,
  });
}

export function fingerprintM35(task: Task): string {
  const p = task.generatorParams as M35GeneratorParams;
  return `${p.subtype}|${p.story}|${p.answer}|${p.askedEntity ?? ''}`;
}

export function generateM35Task(options: M35GenerateOptions): Task {
  rejectAdvancedLevels('M35', options.difficulty);
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
  throw new Error(`M35: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM35Series(options: M35SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM35Task({ difficulty, seed, subtype: subtypes[index % subtypes.length] });
    },
    fingerprintM35,
    'M35',
  );
}
