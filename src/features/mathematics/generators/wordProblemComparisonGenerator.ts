/**
 * Генератор M27: задачи на «на сколько» / «во сколько».
 * Контракт: M27_GENERATOR_SPEC.md
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

export const M27_SKILL_ID = 'math.word_problems.general.comparison' as const;
export const M27_TOPIC_ID = 'math.word_problems.general' as const;
export const M27_GENERATOR_ID = 'gen.math.word_problems.comparison' as const;

export type ComparisonSubtype = 'how_much_diff' | 'find_by_diff' | 'how_many_times';

export type M27GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: ComparisonSubtype;
};

export type M27SeriesOptions = { seed: number; countPerLevel?: number };

export type M27GeneratorParams = {
  subtype: ComparisonSubtype;
  bigger: number;
  smaller: number;
  answer: number;
  seed: number;
};

type Noun = { one: string; few: string; many: string };

const NOUNS: Noun[] = [
  { one: 'марка', few: 'марки', many: 'марок' },
  { one: 'наклейка', few: 'наклейки', many: 'наклеек' },
  { one: 'открытка', few: 'открытки', many: 'открыток' },
  { one: 'балл', few: 'балла', many: 'баллов' },
  { one: 'карандаш', few: 'карандаша', many: 'карандашей' },
  { one: 'яблоко', few: 'яблока', many: 'яблок' },
];

const PEOPLE = [
  { nom: 'Маша', gen: 'Маши' },
  { nom: 'Аня', gen: 'Ани' },
  { nom: 'Катя', gen: 'Кати' },
  { nom: 'Петя', gen: 'Пети' },
  { nom: 'Боря', gen: 'Бори' },
  { nom: 'Дима', gen: 'Димы' },
] as const;


function nounForm(n: number, noun: Noun): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return noun.many;
  if (last === 1) return noun.one;
  if (last >= 2 && last <= 4) return noun.few;
  return noun.many;
}

function countForm(n: number, noun: Noun): string {
  return `${n} ${nounForm(n, noun)}`;
}

export function isValidM27Level(
  difficulty: Level,
  subtype: ComparisonSubtype,
  bigger: number,
  smaller: number,
): boolean {
  if (bigger <= smaller || smaller <= 0) {
    return false;
  }
  if (difficulty === 1) {
    return subtype === 'how_much_diff' && bigger <= 20 && smaller <= 20 && bigger - smaller >= 2;
  }
  if (difficulty === 2) {
    return (subtype === 'how_much_diff' || subtype === 'find_by_diff') && bigger <= 200;
  }
  return subtype === 'how_many_times' && bigger % smaller === 0 && bigger / smaller >= 2;
}

function resolveSubtype(
  difficulty: Level,
  requested: ComparisonSubtype | undefined,
  rng: SeededRng,
): ComparisonSubtype {
  if (difficulty === 1) {
    return 'how_much_diff';
  }
  if (difficulty === 2) {
    if (requested === 'how_much_diff' || requested === 'find_by_diff') {
      return requested;
    }
    return pickOne(rng, ['how_much_diff', 'find_by_diff']);
  }
  return 'how_many_times';
}

function forceInclude(
  answer: number,
  models: number[],
  mustHave: number[],
  rng: SeededRng,
): string[] {
  const preferred = [...mustHave.filter((n) => n !== answer && n > 0), ...models];
  return uniqueDistractorsFromModels(answer, preferred, rng, 3);
}

export function generateM27Task(options: M27GenerateOptions): Task {
  rejectAdvancedLevels('M27', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    let bigger: number;
    let smaller: number;
    let answer: number;
    let question: string;
    let models: number[];
    let mustHave: number[] = [];

    const personA = pickOne(rng, PEOPLE.filter((p) => ['Маша', 'Аня', 'Катя'].includes(p.nom)));
    const personB = pickOne(rng, PEOPLE.filter((p) => ['Петя', 'Боря', 'Дима'].includes(p.nom)));
    const nameA = personA.gen;
    const nameB = personB.gen;
    const noun = pickOne(rng, NOUNS);
    const askLess = rng() < 0.35 && subtype === 'how_much_diff';

    if (subtype === 'how_many_times') {
      const factor = pickOne(rng, [2, 3, 4, 5]);
      smaller = randomInt(rng, 4, 25);
      bigger = smaller * factor;
      answer = factor;
      question = `У ${nameA} ${countForm(bigger, noun)}, а у ${nameB} ${countForm(smaller, noun)}. Во сколько раз у ${nameA} больше, чем у ${nameB}?`;
      models = [bigger - smaller, bigger + smaller, factor + 1, factor - 1, smaller, bigger];
      mustHave = [bigger - smaller];
    } else if (subtype === 'find_by_diff') {
      smaller = randomInt(rng, 10, 80);
      const diff = randomInt(rng, 5, 40);
      bigger = smaller + diff;
      answer = bigger;
      question = `У ${nameB} ${countForm(smaller, noun)}. У ${nameA} на ${diff} ${nounForm(diff, noun)} больше. Сколько ${noun.many} у ${nameA}?`;
      models = [smaller, diff, bigger - 1, smaller + diff + 1, Math.abs(smaller - diff)];
      mustHave = [diff, smaller];
    } else {
      smaller = difficulty === 1 ? randomInt(rng, 2, 12) : randomInt(rng, 10, 90);
      const diff = difficulty === 1 ? randomInt(rng, 2, 8) : randomInt(rng, 5, 50);
      bigger = smaller + diff;
      if (difficulty === 1 && bigger > 20) {
        continue;
      }
      answer = diff;
      if (askLess) {
        question = `У ${nameA} ${countForm(bigger, noun)}, у ${nameB} ${countForm(smaller, noun)}. На сколько ${noun.many} у ${nameB} меньше, чем у ${nameA}?`;
      } else {
        question = `У ${nameA} ${countForm(bigger, noun)}, у ${nameB} ${countForm(smaller, noun)}. На сколько ${noun.many} у ${nameA} больше, чем у ${nameB}?`;
      }
      const timesGuess = Math.round(bigger / smaller);
      models = [
        bigger,
        smaller,
        bigger + smaller,
        timesGuess !== diff && timesGuess > 1 ? timesGuess : answer + 2,
        answer + 1,
        answer - 1,
      ];
      mustHave = [bigger + smaller];
    }

    if (!isValidM27Level(difficulty, subtype, bigger, smaller)) {
      continue;
    }

    const distractors = forceInclude(answer, models, mustHave, rng);
    if (distractors.length < 3 && difficulty !== 3) {
      continue;
    }
    if (difficulty === 3 && !distractors.includes(String(bigger - smaller))) {
      // L3: разность должна быть среди моделей; для numberAnswer дистракторов нет
    }
    const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
    const answers =
      taskType === 'singleChoice' ? buildChoiceAnswers(answer, distractors, rng) : undefined;

    return baseTask({
      id: `generated-m27-${difficulty}-${options.seed}-${attempt}`,
      section: 'Текстовые задачи',
      topic: 'Текстовые задачи',
      skill: 'Задачи на увеличение и уменьшение',
      topicId: M27_TOPIC_ID,
      skillId: M27_SKILL_ID,
      difficulty,
      taskType,
      question,
      correctAnswer: answer,
      answers,
      explanation:
        subtype === 'how_many_times'
          ? `«Во сколько» — деление: ${bigger} : ${smaller} = ${answer}. Не путай с разностью ${bigger - smaller}.`
          : `«На сколько» — вычитание. Ответ: ${answer}.`,
      generatorId: M27_GENERATOR_ID,
      generatorParams: {
        subtype,
        bigger,
        smaller,
        answer,
        seed: options.seed,
      } satisfies M27GeneratorParams,
      hint1: '«На сколько» — это вычитание, «во сколько раз» — деление.',
      hint2: subtype === 'how_many_times' ? `Разность была бы ${bigger - smaller}.` : `Ответ: ${answer}.`,
      hint3: `Ответ: ${answer}.`,
    });
  }

  throw new Error(`Генератор M27: не удалось собрать задание L${difficulty} (seed ${options.seed})`);
}

export function m27Fingerprint(task: Task): string {
  const p = task.generatorParams as M27GeneratorParams;
  return `${p.subtype}|${p.bigger}|${p.smaller}|${p.answer}`;
}

export function generateM27Series(options: M27SeriesOptions): Task[] {
  return makeSeries(options, ({ difficulty, seed }) => generateM27Task({ difficulty, seed }), m27Fingerprint, 'M27');
}
