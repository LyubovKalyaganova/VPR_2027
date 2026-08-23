/**
 * Генератор M26: текстовая задача в одно действие (НЕ деньги).
 * Контракт: M26_GENERATOR_SPEC.md
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

export const M26_SKILL_ID = 'math.word_problems.general.one_step' as const;
export const M26_TOPIC_ID = 'math.word_problems.general' as const;
export const M26_GENERATOR_ID = 'gen.math.word_problems.one_step' as const;

export type OneStepOp = 'add' | 'sub' | 'mul' | 'div' | 'share';
export type OneStepSubtype = OneStepOp | 'extra_number';

export type M26GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: OneStepSubtype;
};

export type M26SeriesOptions = { seed: number; countPerLevel?: number };

export type M26GeneratorParams = {
  subtype: OneStepSubtype;
  op: OneStepOp;
  a: number;
  b: number;
  extra?: number;
  answer: number;
  seed: number;
};

type Person = { name: string; gen: 'm' | 'f'; u: string };

const PEOPLE: Person[] = [
  { name: 'Маша', gen: 'f', u: 'Маши' },
  { name: 'Аня', gen: 'f', u: 'Ани' },
  { name: 'Катя', gen: 'f', u: 'Кати' },
  { name: 'Оля', gen: 'f', u: 'Оли' },
  { name: 'Петя', gen: 'm', u: 'Пети' },
  { name: 'Коля', gen: 'm', u: 'Коли' },
  { name: 'Боря', gen: 'm', u: 'Бори' },
  { name: 'Игорь', gen: 'm', u: 'Игоря' },
];

/** Формы существительного под числительное (упрощённо для 4 класса). */
type Noun = { one: string; few: string; many: string };

const NOUNS: Noun[] = [
  { one: 'книга', few: 'книги', many: 'книг' },
  { one: 'наклейка', few: 'наклейки', many: 'наклеек' },
  { one: 'карандаш', few: 'карандаша', many: 'карандашей' },
  { one: 'яблоко', few: 'яблока', many: 'яблок' },
  { one: 'марка', few: 'марки', many: 'марок' },
  { one: 'страница', few: 'страницы', many: 'страниц' },
  { one: 'цветок', few: 'цветка', many: 'цветов' },
  { one: 'игрушка', few: 'игрушки', many: 'игрушек' },
];

function countForm(n: number, noun: Noun): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${noun.many}`;
  if (last === 1) return `${n} ${noun.one}`;
  if (last >= 2 && last <= 4) return `${n} ${noun.few}`;
  return `${n} ${noun.many}`;
}

function basketForm(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} корзин`;
  if (last === 1) return `${n} корзину`;
  if (last >= 2 && last <= 4) return `${n} корзины`;
  return `${n} корзин`;
}

function boxForm(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} коробках`;
  if (last === 1) return `${n} коробке`;
  return `${n} коробках`;
}

function pupilForm(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ученикам`;
  if (last === 1) return `${n} ученику`;
  return `${n} ученикам`;
}

export function isValidM26Level(difficulty: Level, subtype: OneStepSubtype, a: number, b: number): boolean {
  if (difficulty === 1) {
    return subtype !== 'extra_number' && a <= 20 && b <= 20;
  }
  if (difficulty === 2) {
    return subtype !== 'extra_number' && a <= 100 && b <= 100;
  }
  return subtype === 'extra_number';
}

const CORE_OPS: OneStepOp[] = ['add', 'sub', 'mul', 'div'];

function resolveSubtype(difficulty: Level, requested: OneStepSubtype | undefined, rng: SeededRng): OneStepSubtype {
  if (difficulty === 3) return 'extra_number';
  if (requested === 'share' || (requested && CORE_OPS.includes(requested as OneStepOp))) {
    return requested;
  }
  if (requested === ('compare' as unknown as OneStepSubtype)) {
    return pickOne(rng, CORE_OPS);
  }
  // Доли — EXTENSION: не равноправный op в пуле (иначе ~20%+ серии)
  return pickOne(rng, CORE_OPS);
}

function applyOp(op: OneStepOp, a: number, b: number): number | null {
  if (op === 'add') return a + b;
  if (op === 'sub') return a > b ? a - b : null;
  if (op === 'mul') return a * b;
  if (op === 'share') {
    // a = целое, b = знаменатель доли 1/b
    if (b < 2 || a % b !== 0) return null;
    return a / b;
  }
  if (b === 0 || a % b !== 0) return null;
  return a / b;
}

/** Запрещённые формулировки сравнения (ядро M27). */
export function hasComparisonPhrase(question: string): boolean {
  return /на сколько|во сколько раз|больше, чем|меньше, чем/i.test(question);
}

export function isCompareSubtype(subtype: OneStepSubtype | string): boolean {
  return subtype === 'compare';
}

function distractorModels(op: OneStepOp, a: number, b: number, answer: number, extra?: number): number[] {
  const models: Array<number | null | undefined> = [];
  if (op === 'add') {
    models.push(a - b > 0 ? a - b : null, a, b, answer + 1, answer - 1, answer + 10);
  } else if (op === 'sub') {
    models.push(a + b, b - a > 0 ? b - a : null, a, b, answer + 1, answer - 1, answer + 10);
  } else if (op === 'mul') {
    models.push(a + b, a * (b - 1), a * (b + 1), a, b, answer + a);
  } else if (op === 'share') {
    models.push(a - b, a + b, b, a / Math.max(2, b - 1), answer + 1, a);
  } else {
    models.push(a - b, a + b, b, answer + 1, answer - 1 || answer + 2, a);
  }
  if (extra !== undefined) {
    models.push(extra, answer + extra, Math.abs(answer - extra) || answer + 2);
  }
  return models.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0);
}

const SHARE_WORDS: Record<number, string> = {
  2: 'половину',
  3: 'треть',
  4: 'четверть',
  5: 'пятую часть',
  10: 'десятую часть',
};

function buildStory(
  difficulty: Level,
  op: OneStepOp,
  a: number,
  b: number,
  explicit: boolean,
  extra: number | undefined,
  rng: SeededRng,
): { text: string; answer: number } {
  const answer = applyOp(op, a, b);
  if (answer === null) throw new Error('bad op');
  const person = pickOne(rng, PEOPLE);
  const noun = pickOne(rng, NOUNS);
  const pastGift = person.gen === 'f' ? 'подарила' : 'подарил';
  const pastGet = person.gen === 'f' ? 'получила' : 'получил';

  let text: string;
  if (op === 'share') {
    const word = SHARE_WORDS[b] ?? `1/${b}`;
    const mode = pickOne(rng, ['part_of', 'part_of', 'whole_from_part'] as const);
    if (mode === 'whole_from_part') {
      const whole = a;
      const partVal = whole / b;
      text = pickOne(rng, [
        `${word.charAt(0).toUpperCase()}${word.slice(1)} числа равна ${partVal}. Чему равно всё число?`,
        `Известно, что ${word} составляет ${partVal}. Найди целое число.`,
      ]);
      return { text, answer: whole };
    }
    text = pickOne(rng, [
      `Найди ${word} от числа ${a}.`,
      `В коробке ${countForm(a, noun)}. ${word.charAt(0).toUpperCase()}${word.slice(1)} ${noun.many} — красные. Сколько красных ${noun.many}?`,
      `У ${person.u} было ${countForm(a, noun)}. ${person.name} ${person.gen === 'f' ? 'отдала' : 'отдал'} ${word}. Сколько ${noun.many} это?`,
    ]);
  } else if (op === 'add') {
    text = explicit
      ? `На полке было ${countForm(a, noun)}. Поставили ещё ${countForm(b, noun)}. Сколько ${noun.many} стало на полке?`
      : `У ${person.u} было ${countForm(a, noun)}. ${person.name} ${pastGet} ещё ${countForm(b, noun)}. Сколько ${noun.many} стало у ${person.u}?`;
  } else if (op === 'sub') {
    text = explicit
      ? `Было ${countForm(a, noun)}. Из них взяли ${b}. Сколько осталось?`
      : `У ${person.u} было ${countForm(a, noun)}. ${person.name} ${pastGift} ${countForm(b, noun)}. Сколько ${noun.many} осталось?`;
  } else if (op === 'mul') {
    if (pickOne(rng, [true, false, false] as const)) {
      text = `${person.name} делает по ${a} деталей в час. Сколько деталей ${person.name} сделает за ${b} ч?`;
    } else {
      text = explicit
        ? `В ${boxForm(a)} по ${countForm(b, noun)}. Сколько всего ${noun.many}?`
        : `В ${a} пачках лежит по ${countForm(b, noun)}. Сколько ${noun.many} во всех пачках вместе?`;
    }
  } else if (pickOne(rng, [true, false, false] as const) && a % b === 0) {
    text = `За ${b} ч изготовили ${a} деталей с одинаковой скоростью. Сколько деталей делают за 1 ч?`;
  } else {
    text = explicit
      ? `${countForm(a, noun)} разложили поровну в ${basketForm(b)}. Сколько ${noun.many} в каждой корзине?`
      : `${countForm(a, noun)} раздали поровну ${pupilForm(b)}. По сколько ${noun.many} получил каждый ученик?`;
  }

  if (difficulty === 3 && extra !== undefined) {
    text =
      pickOne(rng, [
        person.gen === 'f'
          ? `${person.name} сегодня занималась ${extra} минут. `
          : `${person.name} сегодня занимался ${extra} минут. `,
        `В шкафу стоит ${extra} коробок с разными вещами. `,
        `За окном растёт ${extra} деревьев. `,
      ]) + text;
  }
  return { text, answer };
}

export function generateM26Task(options: M26GenerateOptions): Task {
  rejectAdvancedLevels('M26', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);
  const op: OneStepOp =
    subtype === 'extra_number'
      ? pickOne(rng, CORE_OPS)
      : subtype === 'share'
        ? 'share'
        : (subtype as OneStepOp);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    let a: number;
    let b: number;
    if (op === 'share') {
      b = pickOne(rng, difficulty === 1 ? [2, 4, 5] : [2, 3, 4, 5, 10]);
      const maxQ = Math.max(2, Math.floor((difficulty === 1 ? 20 : 100) / b));
      const q = randomInt(rng, 2, Math.min(maxQ, difficulty === 1 ? 8 : 20));
      a = b * q;
    } else if (op === 'mul') {
      a = difficulty === 1 ? randomInt(rng, 2, 9) : randomInt(rng, 2, 12);
      b = difficulty === 1 ? randomInt(rng, 2, 9) : randomInt(rng, 2, 10);
    } else if (op === 'div') {
      b = randomInt(rng, 2, 9);
      const q = difficulty === 1 ? randomInt(rng, 2, 9) : randomInt(rng, 2, 12);
      a = b * q;
    } else if (op === 'sub') {
      b = difficulty === 1 ? randomInt(rng, 1, 10) : randomInt(rng, 5, 40);
      a = b + (difficulty === 1 ? randomInt(rng, 1, 10) : randomInt(rng, 5, 50));
    } else {
      a = difficulty === 1 ? randomInt(rng, 1, 15) : randomInt(rng, 10, 60);
      b = difficulty === 1 ? randomInt(rng, 1, 15) : randomInt(rng, 10, 40);
    }
    const extra = difficulty === 3 ? randomInt(rng, 5, 18) : undefined;
    if (!isValidM26Level(difficulty, subtype, a, b)) continue;
    if (isCompareSubtype(subtype) || isCompareSubtype(op)) continue;

    let story: { text: string; answer: number };
    try {
      story = buildStory(difficulty, op, a, b, difficulty === 1, extra, rng);
    } catch {
      continue;
    }

    if (/руб|цена|стоим|сдач|купил|заплат|покуп/i.test(story.text)) continue;
    if (hasComparisonPhrase(story.text)) continue;
    if (/У \w+(е|у)\b/.test(story.text) && /У (Маше|Ане|Кате|Оле|Пете|Коле|Боре|Игорю)\b/.test(story.text)) {
      continue;
    }

    const models = distractorModels(op, a, b, story.answer, extra);
    const distractors = uniqueDistractorsFromModels(story.answer, models, rng, 3);
    if (distractors.length < 3 && difficulty !== 3) continue;

    const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
    const answers =
      taskType === 'singleChoice' ? buildChoiceAnswers(story.answer, distractors, rng) : undefined;

    return baseTask({
      id: `generated-m26-${difficulty}-${options.seed}-${attempt}`,
      section: 'Текстовые задачи',
      topic: 'Текстовые задачи',
      skill: 'Текстовая задача в одно действие',
      topicId: M26_TOPIC_ID,
      skillId: M26_SKILL_ID,
      difficulty,
      taskType,
      question: story.text,
      correctAnswer: story.answer,
      answers,
      explanation: `Нужно одно действие. Ответ: ${story.answer}.`,
      generatorId: M26_GENERATOR_ID,
      generatorParams: {
        subtype,
        op,
        a,
        b,
        extra,
        answer: story.answer,
        seed: options.seed,
      } satisfies M26GeneratorParams,
      hint1: 'Определи, какое одно действие нужно выполнить.',
      hint2: 'Внимательно прочитай условие и найди нужные числа.',
      hint3: `Ответ: ${story.answer}.`,
    });
  }

  throw new Error(`Генератор M26: не удалось собрать задание L${difficulty} (seed ${options.seed})`);
}

export function m26Fingerprint(task: Task): string {
  const p = task.generatorParams as M26GeneratorParams;
  return `${p.op}|${p.a}|${p.b}|${p.extra ?? ''}|${p.answer}`;
}

export function generateM26Series(options: M26SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      // ~10% серии — доли (EXTENSION), без вытеснения ядра ВПР
      if (index % 10 === 0) {
        return generateM26Task({ difficulty, seed, subtype: 'share' });
      }
      return generateM26Task({ difficulty, seed });
    },
    m26Fingerprint,
    'M26',
  );
}
