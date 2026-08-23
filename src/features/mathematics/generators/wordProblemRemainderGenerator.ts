/**
 * Генератор M28: текстовые задачи с остатком.
 * Контракт: M28_GENERATOR_SPEC.md
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

export const M28_SKILL_ID = 'math.word_problems.general.remainder' as const;
export const M28_TOPIC_ID = 'math.word_problems.general' as const;
export const M28_GENERATOR_ID = 'gen.math.word_problems.remainder' as const;

export type RemainderStorySubtype = 'ask_remainder' | 'ask_groups' | 'ask_boxes_only';

export type M28GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: RemainderStorySubtype;
};

export type M28SeriesOptions = { seed: number; countPerLevel?: number };

export type M28GeneratorParams = {
  subtype: RemainderStorySubtype;
  total: number;
  perGroup: number;
  quotient: number;
  remainder: number;
  answer: number;
  seed: number;
};

type Noun = { one: string; few: string; many: string };
type Box = { one: string; few: string; many: string; prepPl: string };

const NOUNS: Noun[] = [
  { one: 'яблоко', few: 'яблока', many: 'яблок' },
  { one: 'карандаш', few: 'карандаша', many: 'карандашей' },
  { one: 'тетрадь', few: 'тетради', many: 'тетрадей' },
  { one: 'конфета', few: 'конфеты', many: 'конфет' },
  { one: 'ручка', few: 'ручки', many: 'ручек' },
];

const BOXES: Box[] = [
  { one: 'коробка', few: 'коробки', many: 'коробок', prepPl: 'коробки' },
  { one: 'пакет', few: 'пакета', many: 'пакетов', prepPl: 'пакеты' },
  { one: 'ящик', few: 'ящика', many: 'ящиков', prepPl: 'ящики' },
];

function pieceWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'штук';
  if (last === 1) return 'штуке';
  if (last >= 2 && last <= 4) return 'штуки';
  return 'штук';
}

function countForm(n: number, noun: Noun): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${noun.many}`;
  if (last === 1) return `${n} ${noun.one}`;
  if (last >= 2 && last <= 4) return `${n} ${noun.few}`;
  return `${n} ${noun.many}`;
}

export function isValidM28Level(
  difficulty: Level,
  subtype: RemainderStorySubtype,
  total: number,
  perGroup: number,
  remainder: number,
): boolean {
  if (perGroup < 2 || remainder <= 0 || remainder >= perGroup) {
    return false;
  }
  if (total !== Math.floor(total / perGroup) * perGroup + remainder) {
    return false;
  }
  if (difficulty === 1) {
    return subtype === 'ask_remainder' && total <= 30 && perGroup <= 9;
  }
  if (difficulty === 2) {
    return (subtype === 'ask_remainder' || subtype === 'ask_groups') && total <= 100;
  }
  return subtype === 'ask_boxes_only' && total <= 200;
}

function resolveSubtype(
  difficulty: Level,
  requested: RemainderStorySubtype | undefined,
  rng: SeededRng,
): RemainderStorySubtype {
  if (difficulty === 1) {
    return 'ask_remainder';
  }
  if (difficulty === 2) {
    if (requested === 'ask_remainder' || requested === 'ask_groups') {
      return requested;
    }
    return pickOne(rng, ['ask_remainder', 'ask_groups']);
  }
  return 'ask_boxes_only';
}

export function generateM28Task(options: M28GenerateOptions): Task {
  rejectAdvancedLevels('M28', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const perGroup = difficulty === 1 ? randomInt(rng, 2, 9) : randomInt(rng, 3, 12);
    const remainder = randomInt(rng, 1, perGroup - 1);
    const quotient =
      difficulty === 1 ? randomInt(rng, 1, 5) : difficulty === 2 ? randomInt(rng, 2, 12) : randomInt(rng, 3, 15);
    const total = perGroup * quotient + remainder;
    if (!isValidM28Level(difficulty, subtype, total, perGroup, remainder)) {
      continue;
    }

    const noun = pickOne(rng, NOUNS);
    const box = pickOne(rng, BOXES);
    let question: string;
    let answer: number;
    let models: number[];

    if (subtype === 'ask_remainder') {
      answer = remainder;
      question = `Есть ${countForm(total, noun)}. Их раскладывают в ${box.prepPl} по ${perGroup} ${pieceWord(perGroup)}. Сколько ${noun.many} останется?`;
      models = [quotient, remainder + 1, perGroup, total, quotient + 1, remainder - 1, perGroup - 1];
    } else if (subtype === 'ask_groups') {
      answer = quotient;
      question = `Есть ${countForm(total, noun)}. В каждый ${box.one} кладут по ${perGroup} ${noun.many}. Сколько полных ${box.many} получится?`;
      models = [remainder, quotient + 1, quotient - 1, total, perGroup, remainder + quotient];
    } else {
      answer = quotient;
      question = `${countForm(total, noun)} укладывают в ${box.prepPl} по ${perGroup} ${pieceWord(perGroup)}. Сколько ${box.many} заполнится полностью?`;
      models = [remainder, quotient + 1, total - remainder, perGroup, quotient - 1, total];
    }

    const distractors = uniqueDistractorsFromModels(answer, models, rng, 3);
    if (distractors.length < 3 && difficulty !== 3) {
      continue;
    }
    // Гарантируем «чужой» ответ quotient↔remainder среди дистракторов на L1/L2
    if (difficulty < 3) {
      const swap = answer === remainder ? quotient : remainder;
      if (!distractors.includes(String(swap)) && swap !== answer) {
        distractors[0] = String(swap);
      }
      if (new Set(distractors).size < 3) continue;
    }
    const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
    const answers =
      taskType === 'singleChoice' ? buildChoiceAnswers(answer, distractors, rng) : undefined;

    return baseTask({
      id: `generated-m28-${difficulty}-${options.seed}-${attempt}`,
      section: 'Текстовые задачи',
      topic: 'Текстовые задачи',
      skill: 'Задачи с остатком',
      topicId: M28_TOPIC_ID,
      skillId: M28_SKILL_ID,
      difficulty,
      taskType,
      question,
      correctAnswer: answer,
      answers,
      explanation: `${total} = ${perGroup} × ${quotient} + ${remainder}, остаток ${remainder} < ${perGroup}. Ответ на вопрос: ${answer}.`,
      generatorId: M28_GENERATOR_ID,
      generatorParams: {
        subtype,
        total,
        perGroup,
        quotient,
        remainder,
        answer,
        seed: options.seed,
      } satisfies M28GeneratorParams,
      hint1: 'Раздели с остатком: полное число групп и остаток.',
      hint2: `Остаток должен быть меньше ${perGroup}.`,
      hint3: `Ответ: ${answer}.`,
    });
  }

  throw new Error(`Генератор M28: не удалось собрать задание L${difficulty} (seed ${options.seed})`);
}

export function m28Fingerprint(task: Task): string {
  const p = task.generatorParams as M28GeneratorParams;
  return `${p.subtype}|${p.total}|${p.perGroup}|${p.answer}`;
}

export function generateM28Series(options: M28SeriesOptions): Task[] {
  return makeSeries(options, ({ difficulty, seed }) => generateM28Task({ difficulty, seed }), m28Fingerprint, 'M28');
}
