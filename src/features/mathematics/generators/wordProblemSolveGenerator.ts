/**
 * Генератор M29: составная текстовая задача (2–3 действия).
 * НЕ денежный навык — денежные сюжеты относятся к M15.
 * Контракт: M29_GENERATOR_SPEC.md
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

export const M29_SKILL_ID = 'math.word_problems.general.solve' as const;
export const M29_TOPIC_ID = 'math.word_problems.general' as const;
export const M29_GENERATOR_ID = 'gen.math.word_problems.general' as const;

export type SolveSubtype = 'two_ordered' | 'two_hidden' | 'three_steps' | 'extra_data' | 'choose_solution';
export type SolvePlot =
  | 'inventory'
  | 'books'
  | 'school'
  | 'objects'
  | 'harvest'
  | 'transport_stages'
  | 'performance'
  | 'share'
  | 'solution_path';

export type ReasoningMode = 'full' | 'first' | 'next' | 'error';

export type M29GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: SolveSubtype;
  reasoningMode?: ReasoningMode;
};

export type M29SeriesOptions = { seed: number; countPerLevel?: number };

export type M29GeneratorParams = {
  subtype: SolveSubtype;
  steps: number[];
  answer: number;
  seed: number;
  plot?: SolvePlot;
  reasoningMode?: ReasoningMode;
};

type Person = { name: string; gen: 'm' | 'f'; u: string };

const PEOPLE: Person[] = [
  { name: 'Маша', gen: 'f', u: 'Маши' },
  { name: 'Аня', gen: 'f', u: 'Ани' },
  { name: 'Катя', gen: 'f', u: 'Кати' },
  { name: 'Петя', gen: 'm', u: 'Пети' },
  { name: 'Коля', gen: 'm', u: 'Коли' },
  { name: 'Боря', gen: 'm', u: 'Бори' },
];

const MONEY_RE = /руб|цена|стоим|сдач|купил|заплат|покуп|тетради по \d+ руб/i;

function manyNoun(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${many}`;
  if (last === 1) return `${n} ${one}`;
  if (last >= 2 && last <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function isValidM29Level(difficulty: Level, subtype: SolveSubtype, steps: number[]): boolean {
  if (difficulty === 1) {
    return subtype === 'two_ordered' && steps.length === 2;
  }
  if (difficulty === 2) {
    return (
      (subtype === 'two_hidden' && steps.length === 2) ||
      (subtype === 'choose_solution' && steps.length >= 2)
    );
  }
  return (
    (subtype === 'three_steps' && steps.length === 3) ||
    (subtype === 'extra_data' && steps.length === 2) ||
    (subtype === 'choose_solution' && steps.length >= 2)
  );
}

function resolveSubtype(difficulty: Level, requested: SolveSubtype | undefined, rng: SeededRng): SolveSubtype {
  if (difficulty === 1) return 'two_ordered';
  if (difficulty === 2) {
    if (requested === 'choose_solution' || requested === 'two_hidden') return requested;
    return pickOne(rng, ['two_hidden', 'choose_solution']);
  }
  if (requested === 'three_steps' || requested === 'extra_data' || requested === 'choose_solution') {
    return requested;
  }
  return pickOne(rng, ['three_steps', 'extra_data', 'choose_solution']);
}

type Built = {
  question: string;
  answer: number | string;
  steps: number[];
  models: number[];
  plot: SolvePlot;
  explanation: string;
  choiceOptions?: string[];
  reasoningMode?: ReasoningMode;
};

function buildShareTwoOrdered(rng: SeededRng, person: Person): Built {
  const total = pickOne(rng, [20, 24, 30, 36, 40]);
  const den = pickOne(rng, [2, 3, 4, 5]);
  if (total % den !== 0) {
    return buildTwoOrdered(rng, person);
  }
  const share = total / den;
  const left = total - share;
  const word = den === 2 ? 'половину' : den === 3 ? 'треть' : den === 4 ? 'четверть' : 'пятую часть';
  return {
    question: `В коробке было ${total} карандашей. ${person.name} ${person.gen === 'f' ? 'взяла' : 'взял'} ${word}. Сколько карандашей осталось в коробке?`,
    answer: left,
    steps: [total, den],
    models: [share, total + share, den, left + 1, total],
    plot: 'share',
    explanation: `${total} ÷ ${den} = ${share}; ${total} − ${share} = ${left}.`,
  };
}

function buildChooseSolution(rng: SeededRng, forcedMode?: ReasoningMode): Built {
  const rate = randomInt(rng, 4, 9);
  const hours = randomInt(rng, 2, 5);
  const given = randomInt(rng, 3, 12);
  const made = rate * hours;
  const answerNum = made - given;
  const step1 = `${rate} × ${hours} = ${made}`;
  const step2 = `${made} − ${given} = ${answerNum}`;
  const mode = forcedMode ?? pickOne(rng, ['full', 'first', 'next', 'error'] as const);

  if (mode === 'first') {
    const correct = step1;
    const wrong = [
      `${rate} + ${hours} = ${rate + hours}`,
      `${made} − ${given} = ${answerNum}`,
      `${rate} × ${given} = ${rate * given}`,
    ];
    return {
      question: `Мастер делает по ${rate} деталей в час и работает ${hours} ч. Затем ${given} деталей отложили. Что нужно сделать первым?`,
      answer: correct,
      steps: [rate, hours],
      models: [],
      plot: 'solution_path',
      explanation: `Сначала находим, сколько сделали: ${correct}.`,
      choiceOptions: [correct, ...wrong],
      reasoningMode: mode,
    };
  }

  if (mode === 'next') {
    const correct = step2;
    const wrong = [
      `${rate} × ${hours} = ${made}`,
      `${rate} + ${given} = ${rate + given}`,
      `${hours} × ${given} = ${hours * given}`,
    ];
    return {
      question: `Мастер делает по ${rate} деталей в час и работает ${hours} ч. Уже известно: ${step1}. Что сделать дальше, если ${given} деталей отложили?`,
      answer: correct,
      steps: [rate, hours],
      models: [],
      plot: 'solution_path',
      explanation: `Дальше вычитаем отложенные: ${correct}.`,
      choiceOptions: [correct, ...wrong],
      reasoningMode: mode,
    };
  }

  if (mode === 'error') {
    const badPlan = `1) ${rate} + ${hours} = ${rate + hours}; 2) ${rate + hours} − ${given} = ${rate + hours - given}. Ответ: ${rate + hours - given}`;
    const correct = 'Шаг 1: вместо умножения выполнено сложение';
    const wrong = [
      'Шаг 2: вычитание выполнено верно',
      'Ошибка только в записи ответа',
      'Ошибок нет',
    ];
    return {
      question: `Мастер делает по ${rate} деталей в час и работает ${hours} ч. Затем ${given} деталей отложили. В решении написали:\n${badPlan}\nГде ошибка?`,
      answer: correct,
      steps: [rate, hours],
      models: [],
      plot: 'solution_path',
      explanation: `Нужно было умножить производительность на время (${step1}), а не складывать.`,
      choiceOptions: [correct, ...wrong],
      reasoningMode: mode,
    };
  }

  const correct = `1) ${step1}; 2) ${step2}. Ответ: ${answerNum}`;
  const wrong1 = `1) ${rate} + ${hours} = ${rate + hours}; 2) ${rate + hours} − ${given} = ${rate + hours - given}. Ответ: ${rate + hours - given}`;
  const wrong2 = `1) ${made} − ${given} = ${answerNum}; 2) ${rate} × ${hours} = ${made}. Ответ: ${answerNum}`;
  const wrong3 = `1) ${rate} × ${given} = ${rate * given}; 2) ${rate * given} − ${hours} = ${rate * given - hours}. Ответ: ${rate * given - hours}`;
  return {
    question: `Мастер делает по ${rate} деталей в час и работает ${hours} ч. Затем ${given} деталей отложили. Какая последовательность действий верная?`,
    answer: correct,
    steps: [rate, hours],
    models: [],
    plot: 'solution_path',
    explanation: correct,
    choiceOptions: [correct, wrong1, wrong2, wrong3],
    reasoningMode: mode,
  };
}

function buildTwoOrdered(rng: SeededRng, person: Person): Built {
  // Доли — EXTENSION: редко (не вытесняют ВПР-ядро)
  if (pickOne(rng, [true, false, false, false, false, false, false, false] as const)) {
    return buildShareTwoOrdered(rng, person);
  }
  if (pickOne(rng, [true, false, false] as const)) {
    // Производительность × время → объём, затем вычитание (2 действия)
    const rate = randomInt(rng, 4, 12);
    const hours = randomInt(rng, 2, 6);
    const used = randomInt(rng, 3, Math.min(20, rate * hours - 1));
    const made = rate * hours;
    const answer = made - used;
    const unit = pickOne(rng, ['деталей', 'страниц', 'задач', 'открыток'] as const);
    return {
      question: `${person.name} ${person.gen === 'f' ? 'делала' : 'делал'} по ${rate} ${unit} в час и ${person.gen === 'f' ? 'работала' : 'работал'} ${hours} ч. Затем ${used} ${unit} отложили. Сколько ${unit} осталось?`,
      answer,
      steps: [rate, hours],
      models: [made, rate + hours, made + used, answer + 1, rate * (hours - 1), used],
      plot: 'performance',
      explanation: `${rate} × ${hours} = ${made}; ${made} − ${used} = ${answer}.`,
    };
  }
  const plot = pickOne(rng, ['inventory', 'books', 'harvest', 'school'] as SolvePlot[]);
  const a = randomInt(rng, 12, 40);
  const b = randomInt(rng, 8, 25);
  const c = randomInt(rng, 5, Math.min(20, a + b - 2));
  const answer = a + b - c;
  let question: string;
  let explanation: string;
  if (plot === 'books') {
    question = `В библиотеку привезли ${a} книг утром и ${b} книг днём. ${c} книг сразу передали в класс. Сколько книг осталось в библиотеке?`;
    explanation = `${a} + ${b} = ${a + b}; ${a + b} − ${c} = ${answer}.`;
  } else if (plot === 'harvest') {
    question = `Садовники собрали ${a} кг яблок утром и ещё ${b} кг вечером. ${c} кг сразу отправили на склад школы. Сколько килограммов яблок осталось?`;
    explanation = `${a} + ${b} = ${a + b}; ${a + b} − ${c} = ${answer}.`;
  } else if (plot === 'school') {
    question = `В актовый зал пришли ${manyNoun(a, 'ученик', 'ученика', 'учеников')} из параллели и ещё ${manyNoun(b, 'ученик', 'ученика', 'учеников')} из кружка. ${manyNoun(c, 'ученик', 'ученика', 'учеников')} ушли на репетицию. Сколько учеников осталось в зале?`;
    explanation = `${a} + ${b} = ${a + b}; ${a + b} − ${c} = ${answer}.`;
  } else {
    question = `На складе было ${a} коробок. Привезли ещё ${b} коробок, а затем ${c} коробок увезли в классы. Сколько коробок осталось на складе?`;
    explanation = `${a} + ${b} = ${a + b}; ${a + b} − ${c} = ${answer}.`;
  }
  void person;
  return {
    question,
    answer,
    steps: [a, b],
    models: [a + b, a - c > 0 ? a - c : a + c, b + c, answer + 1, a + b + c, c],
    plot,
    explanation,
  };
}

function buildTwoHidden(rng: SeededRng, person: Person): Built {
  if (pickOne(rng, [true, false, false] as const)) {
    // Найти производительность, затем объём за другое время
    const rate = randomInt(rng, 5, 15);
    const hours1 = randomInt(rng, 2, 5);
    const hours2 = randomInt(rng, 2, 6);
    const volume1 = rate * hours1;
    const answer = rate * hours2;
    const unit = pickOne(rng, ['деталей', 'страниц', 'рисунков'] as const);
    return {
      question: `За ${hours1} ч изготовили ${volume1} ${unit} (с одинаковой скоростью). Сколько ${unit} изготовят за ${hours2} ч с той же производительностью?`,
      answer,
      steps: [volume1, hours1],
      models: [volume1 + hours2, volume1 * hours2, rate + hours2, answer + rate, volume1, hours1 * hours2],
      plot: 'performance',
      explanation: `${volume1} ÷ ${hours1} = ${rate}; ${rate} × ${hours2} = ${answer}.`,
    };
  }
  const plot = pickOne(rng, ['objects', 'books', 'inventory', 'transport_stages'] as SolvePlot[]);
  if (plot === 'objects') {
    const boxes = randomInt(rng, 3, 8);
    const each = randomInt(rng, 4, 12);
    const given = randomInt(rng, 5, Math.min(30, boxes * each - 1));
    const mid = boxes * each;
    const answer = mid - given;
    return {
      question: `В ${boxes} коробках по ${each} карандашей. ${given} карандашей раздали ученикам. Сколько карандашей осталось?`,
      answer,
      steps: [boxes, each],
      models: [mid, boxes + each, mid + given, answer + 1, boxes * (each - 1), given],
      plot,
      explanation: `${boxes} × ${each} = ${mid}; ${mid} − ${given} = ${answer}.`,
    };
  }
  if (plot === 'books') {
    const pages = randomInt(rng, 40, 120);
    const read1 = randomInt(rng, 8, 25);
    const read2 = randomInt(rng, 5, 20);
    if (read1 + read2 >= pages) {
      // запасной сюжет objects
      const boxes = randomInt(rng, 3, 8);
      const each = randomInt(rng, 4, 12);
      const given = randomInt(rng, 5, Math.min(30, boxes * each - 1));
      const mid = boxes * each;
      const ans = mid - given;
      return {
        question: `В ${boxes} коробках по ${each} карандашей. ${given} карандашей раздали ученикам. Сколько карандашей осталось?`,
        answer: ans,
        steps: [boxes, each],
        models: [mid, boxes + each, mid + given, ans + 1, boxes * (each - 1), given],
        plot: 'objects',
        explanation: `${boxes} × ${each} = ${mid}; ${mid} − ${given} = ${ans}.`,
      };
    }
    const leftAfter = pages - read1;
    const answer = leftAfter - read2;
    return {
      question: `В книге ${pages} страниц. ${person.name} ${person.gen === 'f' ? 'прочитала' : 'прочитал'} сначала ${read1} страниц, а потом ещё ${read2}. Сколько страниц осталось прочитать?`,
      answer,
      steps: [pages, read1],
      models: [pages - read1, pages - read2, read1 + read2, answer + 1, pages, read1],
      plot,
      explanation: `${pages} − ${read1} = ${leftAfter}; ${leftAfter} − ${read2} = ${answer}.`,
    };
  }
  if (plot === 'transport_stages') {
    // Два этапа пути — арифметика этапов (не формула s = v·t)
    const d1 = randomInt(rng, 15, 60);
    const d2 = randomInt(rng, 10, 50);
    const cut = randomInt(rng, 5, Math.min(25, d1 + d2 - 1));
    const answer = d1 + d2 - cut;
    return {
      question: `От школы до парка ${d1} км, а от парка до музея ещё ${d2} км. Экскурсия закончилась на ${cut} км раньше музея. Какой путь прошли от школы до места окончания экскурсии?`,
      answer,
      steps: [d1, d2],
      models: [d1 + d2, d1 - cut > 0 ? d1 - cut : d1 + cut, d2 + cut, answer + 1, d1 + d2 + cut],
      plot,
      explanation: `${d1} + ${d2} = ${d1 + d2}; ${d1 + d2} − ${cut} = ${answer}.`,
    };
  }
  // inventory
  const had = randomInt(rng, 20, 80);
  const got = randomInt(rng, 5, 25);
  const used = randomInt(rng, 8, Math.min(40, had + got - 1));
  const answer = had + got - used;
  return {
    question: `У ${person.u} было ${manyNoun(had, 'наклейка', 'наклейки', 'наклеек')}. Друг подарил ещё ${manyNoun(got, 'наклейку', 'наклейки', 'наклеек')}. Затем ${person.name} ${person.gen === 'f' ? 'положила' : 'положил'} ${manyNoun(used, 'наклейку', 'наклейки', 'наклеек')} в альбом. Сколько наклеек осталось?`,
    answer,
    steps: [had, got],
    models: [had + got, had - used > 0 ? had - used : used, got + used, answer + 1, had + got + used],
    plot: 'inventory',
    explanation: `${had} + ${got} = ${had + got}; ${had + got} − ${used} = ${answer}.`,
  };
}

function buildThreeSteps(rng: SeededRng): Built {
  if (pickOne(rng, [true, false, false] as const)) {
    // Две стадии работы с разной производительностью + вычитание/сложение
    const rate1 = randomInt(rng, 4, 10);
    const h1 = randomInt(rng, 2, 4);
    const rate2 = randomInt(rng, 5, 12);
    const h2 = randomInt(rng, 2, 4);
    const part1 = rate1 * h1;
    const part2 = rate2 * h2;
    const answer = part1 + part2;
    const unit = pickOne(rng, ['деталей', 'коробок', 'пакетов'] as const);
    return {
      question: `Утром делали по ${rate1} ${unit} в час и работали ${h1} ч. Днём — по ${rate2} ${unit} в час и работали ${h2} ч. Сколько всего ${unit} сделали за день?`,
      answer,
      steps: [rate1, h1, rate2],
      models: [part1, part2, rate1 * h2 + rate2 * h1, answer + 1, (rate1 + rate2) * (h1 + h2)],
      plot: 'performance',
      explanation: `${rate1} × ${h1} = ${part1}; ${rate2} × ${h2} = ${part2}; ${part1} + ${part2} = ${answer}.`,
    };
  }
  const plot = pickOne(rng, ['books', 'objects', 'school', 'inventory'] as SolvePlot[]);
  if (plot === 'objects' || plot === 'books') {
    const shelves = randomInt(rng, 3, 7);
    const each = randomInt(rng, 12, 30);
    const out = randomInt(rng, 8, 25);
    const back = randomInt(rng, 3, 15);
    const mid = shelves * each;
    const after = mid - out;
    const answer = after + back;
    return {
      question: `В школьной библиотеке было ${manyNoun(shelves, 'полка', 'полки', 'полок')} по ${manyNoun(each, 'книга', 'книги', 'книг')}. На перемене выдали ${manyNoun(out, 'книгу', 'книги', 'книг')}, а после уроков вернули ${manyNoun(back, 'книгу', 'книги', 'книг')}. Сколько книг стало в библиотеке?`,
      answer,
      steps: [shelves, each, back],
      models: [mid, after, mid - out - back, mid + back, answer + 1, shelves * each - back],
      plot: 'books',
      explanation: `${shelves} × ${each} = ${mid}; ${mid} − ${out} = ${after}; ${after} + ${back} = ${answer}.`,
    };
  }
  if (plot === 'school') {
    const c1 = randomInt(rng, 18, 28);
    const c2 = randomInt(rng, 18, 28);
    const c3 = randomInt(rng, 18, 28);
    const left = randomInt(rng, 5, 15);
    const sum = c1 + c2 + c3;
    const answer = sum - left;
    return {
      question: `В трёх классах ${manyNoun(c1, 'ученик', 'ученика', 'учеников')}, ${manyNoun(c2, 'ученик', 'ученика', 'учеников')} и ${manyNoun(c3, 'ученик', 'ученика', 'учеников')}. ${manyNoun(left, 'ученик', 'ученика', 'учеников')} ушли на экскурсию. Сколько учеников осталось в школе из этих классов?`,
      answer,
      steps: [c1, c2, c3],
      models: [sum, c1 + c2, sum + left, answer + 1, c1 + c2 + left],
      plot: 'school',
      explanation: `${c1} + ${c2} + ${c3} = ${sum}; ${sum} − ${left} = ${answer}.`,
    };
  }
  const a = randomInt(rng, 20, 60);
  const b = randomInt(rng, 10, 30);
  const c = randomInt(rng, 5, 20);
  const d = randomInt(rng, 4, 18);
  const mid = a + b - c;
  const answer = mid + d;
  return {
    question: `На складе было ${a} ящиков. Привезли ещё ${b}, затем увезли ${c}, а вечером вернули ${d} ящиков. Сколько ящиков стало на складе?`,
    answer,
    steps: [a, b, d],
    models: [a + b, a + b - c, a + b + d, answer - 1, a + b - c - d > 0 ? a + b - c - d : answer + 2],
    plot: 'inventory',
    explanation: `${a} + ${b} = ${a + b}; ${a + b} − ${c} = ${mid}; ${mid} + ${d} = ${answer}.`,
  };
}

function buildExtraData(rng: SeededRng, person: Person): Built {
  const a = randomInt(rng, 15, 45);
  const b = randomInt(rng, 8, 25);
  const extra = randomInt(rng, 6, 20);
  const c = randomInt(rng, 5, Math.min(20, a + b - 2));
  const answer = a + b - c;
  // Лишнее число встроено естественно, без мета-подсказок
  const question = `У ${person.u} на полке стояло ${manyNoun(a, 'книга', 'книги', 'книг')}, а на столе — ещё ${manyNoun(b, 'книга', 'книги', 'книг')}. Рядом лежала открытка с числом ${extra}. ${person.name} ${person.gen === 'f' ? 'отнесла' : 'отнёс'} ${manyNoun(c, 'книгу', 'книги', 'книг')} в класс. Сколько книг осталось дома у ${person.u}?`;
  return {
    question,
    answer,
    steps: [a, b],
    models: [a + b, a + b + extra - c, a + extra, answer + extra, c, extra, a - c > 0 ? a - c : a + c],
    plot: 'books',
    explanation: `${a} + ${b} = ${a + b}; ${a + b} − ${c} = ${answer}. Число ${extra} в вычислении не участвует.`,
  };
}

export function generateM29Task(options: M29GenerateOptions): Task {
  rejectAdvancedLevels('M29', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const person = pickOne(rng, PEOPLE);
    let built: Built;
    if (subtype === 'choose_solution') {
      built = buildChooseSolution(rng, options.reasoningMode);
    } else if (subtype === 'two_ordered') {
      built = buildTwoOrdered(rng, person);
    } else if (subtype === 'two_hidden') {
      built = buildTwoHidden(rng, person);
    } else if (subtype === 'three_steps') {
      built = buildThreeSteps(rng);
    } else {
      built = buildExtraData(rng, person);
    }

    if (!isValidM29Level(difficulty, subtype, built.steps)) continue;
    if (MONEY_RE.test(built.question)) continue;
    if (/это не нужно|не используй|лишнее число|обрати внимание/i.test(built.question)) continue;
    if (/км\/ч|ехал со скоростью|проехал \d+ км/i.test(built.question)) continue;

    if (subtype === 'choose_solution' && built.choiceOptions) {
      const correct = String(built.answer);
      const distractors = built.choiceOptions.filter((o) => o !== correct);
      const answers = buildChoiceAnswers(correct, distractors, rng);
      if (answers.length !== 4) continue;
      return baseTask({
        id: `generated-m29-${difficulty}-${options.seed}-${attempt}`,
        section: 'Текстовые задачи',
        topic: 'Текстовые задачи',
        skill: 'Текстовая задача в несколько действий',
        topicId: M29_TOPIC_ID,
        skillId: M29_SKILL_ID,
        difficulty,
        taskType: 'singleChoice',
        question: built.question,
        correctAnswer: correct,
        answers,
        explanation: built.explanation,
        generatorId: M29_GENERATOR_ID,
        generatorParams: {
          subtype,
          steps: built.steps,
          answer: built.steps[0]! * (built.steps[1] ?? 1),
          seed: options.seed,
          plot: built.plot,
          reasoningMode: built.reasoningMode,
        } satisfies M29GeneratorParams,
        hint1: 'Выбери верный порядок действий.',
        hint2: 'Сначала найди промежуточный результат.',
        hint3: `Верно: ${correct}`,
      });
    }

    const numericAnswer = Number(built.answer);
    if (!Number.isFinite(numericAnswer) || numericAnswer <= 0) continue;
    const distractors = uniqueDistractorsFromModels(numericAnswer, built.models, rng, 3);
    if (distractors.length < 3 && difficulty !== 3) continue;

    const taskType = difficulty === 3 && subtype !== 'choose_solution' ? 'numberAnswer' : 'singleChoice';
    const answers =
      taskType === 'singleChoice' ? buildChoiceAnswers(numericAnswer, distractors, rng) : undefined;

    return baseTask({
      id: `generated-m29-${difficulty}-${options.seed}-${attempt}`,
      section: 'Текстовые задачи',
      topic: 'Текстовые задачи',
      skill: 'Текстовая задача в несколько действий',
      topicId: M29_TOPIC_ID,
      skillId: M29_SKILL_ID,
      difficulty,
      taskType,
      question: built.question,
      correctAnswer: numericAnswer,
      answers,
      explanation: built.explanation,
      generatorId: M29_GENERATOR_ID,
      generatorParams: {
        subtype,
        steps: built.steps,
        answer: numericAnswer,
        seed: options.seed,
        plot: built.plot,
      } satisfies M29GeneratorParams,
      hint1: 'Разбей задачу на шаги.',
      hint2: 'Сначала найди промежуточный результат, затем ответь на вопрос.',
      hint3: `Ответ: ${numericAnswer}.`,
    });
  }

  throw new Error(`Генератор M29: не удалось собрать задание L${difficulty} (seed ${options.seed})`);
}

export function m29Fingerprint(task: Task): string {
  const p = task.generatorParams as M29GeneratorParams;
  return `${p.subtype}|${p.plot ?? ''}|${p.reasoningMode ?? ''}|${p.steps.join(',')}|${p.answer}|${task.question.slice(0, 60)}`;
}

export function generateM29Series(options: M29SeriesOptions): Task[] {
  const modes: ReasoningMode[] = ['full', 'first', 'next', 'error'];
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      if (difficulty === 2) {
        const subtype: SolveSubtype = index % 2 === 0 ? 'two_hidden' : 'choose_solution';
        const reasoningMode = subtype === 'choose_solution' ? modes[Math.floor(index / 2) % modes.length] : undefined;
        return generateM29Task({ difficulty, seed, subtype, reasoningMode });
      }
      if (difficulty === 3) {
        const pool: SolveSubtype[] = ['three_steps', 'extra_data', 'choose_solution'];
        const subtype = pool[index % pool.length]!;
        const reasoningMode =
          subtype === 'choose_solution' ? modes[Math.floor(index / pool.length) % modes.length] : undefined;
        return generateM29Task({ difficulty, seed, subtype, reasoningMode });
      }
      return generateM29Task({ difficulty, seed });
    },
    m29Fingerprint,
    'M29',
  );
}
