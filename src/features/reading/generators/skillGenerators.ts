/**
 * Генераторы L01–L24 для литературного чтения (ВПР-2027, 4 класс).
 */
import type { Difficulty, Task } from '../../../types';
import type { ReadingSkillCode } from '../../../data/taxonomy/literaryReading';
import { getReadingSkillByCode } from '../../../data/taxonomy/literaryReading';
import {
  L01_FOLKLORE,
  L02_GENRES,
  L03_OPINION,
  L04_BOOKS,
  L05_TEXT_TYPES,
  L06_AUTHORS,
  L07_DEVICES,
  L08_INTERPRET,
  L09_SEQUENCE,
  L10_WORD_CONTEXT,
  L11_EXPLICIT,
  L12_CLAIMS,
  L13_CONCLUSION,
  L14_THEME,
  L15_MAIN_IDEA,
  L16_TITLE,
  L17_CHARACTER,
  L18_MOTIVE,
  L19_PLAN,
  L20_COMPOSITION,
  L21_AUTHOR_POSITION,
  L22_PROSE_POETRY,
  L23_COMPARE_HEROES,
  L24_REASONING,
  REASONING_SUBTYPES,
  getPassageById,
} from './contentBanks';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  shuffleSeeded,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';

type GenOpts = { difficulty: Difficulty; seed: number; subtype?: string };

function meta(code: ReadingSkillCode) {
  const skill = getReadingSkillByCode(code);
  return {
    code,
    skillId: skill.id,
    topicId: skill.topicId,
    section: skill.sectionId.split('.').slice(1).join(' / ') || 'Литературное чтение',
    topic: skill.title.split(':')[0]?.trim() ?? skill.title,
    skill: skill.title,
    generatorId: `gen.reading.${code.toLowerCase()}`,
  };
}

function taskId(code: ReadingSkillCode, difficulty: Level, seed: number, index: number): string {
  return `${code.toLowerCase()}-L${difficulty}-s${seed}-i${index}`;
}

function fingerprint(task: Task): string {
  const p = task.generatorParams ?? {};
  return `${task.skillId}|${task.difficulty}|${p.subtype ?? ''}|${p.key ?? ''}|${task.id}`;
}

function shuffleOrder<T extends string>(rng: SeededRng, items: readonly T[]): T[] {
  const copy = [...items] as T[];
  let shuffled = shuffleSeeded(copy, rng);
  if (shuffled.join('|') === items.join('|') && items.length > 1) {
    shuffled = shuffleSeeded([...items].reverse() as T[], rng);
  }
  return shuffled;
}

function buildMatching(pairs: Array<{ left: string; right: string }>, rng: SeededRng) {
  return {
    matchingLeft: pairs.map((p) => p.left),
    matchingRight: shuffleSeeded(
      pairs.map((p) => p.right),
      rng,
    ),
    correctAnswer: pairs.map((p) => `${p.left}|${p.right}`),
  };
}

function pickSubtype<T extends string>(options: GenOpts, rng: SeededRng, allowed: readonly T[]): T {
  return (options.subtype as T | undefined) ?? pickOne(rng, allowed);
}

function passageText(passageId: string): string {
  return getPassageById(passageId).text;
}

// ─── L01 ───────────────────────────────────────────────────────────────────
export const L01_SKILL_ID = 'reading.genres.folklore' as const;
export const L01_TOPIC_ID = 'reading.genres.folklore' as const;
export const L01_GENERATOR_ID = 'gen.reading.l01' as const;
export type L01Subtype = 'fairy_type' | 'folklore_genre' | 'odd_folklore';

export function generateL01Task(options: GenOpts): Task {
  const m = meta('L01');
  rejectAdvancedLevels('L01', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L01Subtype[] =
    level === 1 ? ['fairy_type'] : level === 2 ? ['fairy_type', 'folklore_genre'] : ['fairy_type', 'folklore_genre', 'odd_folklore'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'odd_folklore') {
    const odd = L01_FOLKLORE.filter((f) => f.oddOne);
    const normal = L01_FOLKLORE.filter((f) => !f.oddOne);
    const target = pickOne(rng, odd);
    const row = shuffleSeeded([target, ...shuffleSeeded(normal, rng).slice(0, 3)], rng);
    const correct = target.title;
    const distractors = uniqueDistractorsFromModels(
      correct,
      row.map((f) => f.title),
      rng,
    );
    return baseTask({
      id: taskId('L01', level, options.seed, 0),
      ...m,
      topicId: L01_TOPIC_ID,
      skillId: L01_SKILL_ID,
      generatorId: L01_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Найди лишнее в ряду фольклорных произведений:\n${row.map((f) => `«${f.title}»`).join(', ')}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `«${target.title}» — это ${target.folkloreGenre}, а не сказка.`,
      generatorParams: { subtype, key: target.title },
    });
  }

  const item = pickOne(rng, L01_FOLKLORE.filter((f) => !f.oddOne));
  if (subtype === 'folklore_genre') {
    const correct = item.folkloreGenre;
    const distractors = uniqueDistractorsFromModels(
      correct,
      L01_FOLKLORE.map((f) => f.folkloreGenre),
      rng,
    );
    return baseTask({
      id: taskId('L01', level, options.seed, 0),
      ...m,
      topicId: L01_TOPIC_ID,
      skillId: L01_SKILL_ID,
      generatorId: L01_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `К какому жанру фольклора относится «${item.title}»?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: item.feature,
      generatorParams: { subtype, key: item.title },
    });
  }

  const correct = item.fairyType;
  const distractors = uniqueDistractorsFromModels(
    correct,
    L01_FOLKLORE.map((f) => f.fairyType),
    rng,
  );
  return baseTask({
    id: taskId('L01', level, options.seed, 0),
    ...m,
    topicId: L01_TOPIC_ID,
    skillId: L01_SKILL_ID,
    generatorId: L01_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `К какому виду сказки относится «${item.title}»?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.feature,
    generatorParams: { subtype: 'fairy_type', key: item.title },
  });
}

export function generateL01Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL01Task({ difficulty, seed: seed + index }), fingerprint, 'L01');
}

// ─── L02 ───────────────────────────────────────────────────────────────────
export const L02_SKILL_ID = 'reading.genres.literature' as const;
export const L02_TOPIC_ID = 'reading.genres.literature' as const;
export const L02_GENERATOR_ID = 'gen.reading.l02' as const;
export type L02Subtype = 'match_genre' | 'identify_genre' | 'genre_feature';

export function generateL02Task(options: GenOpts): Task {
  const m = meta('L02');
  rejectAdvancedLevels('L02', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L02Subtype[] =
    level === 1 ? ['identify_genre'] : level === 2 ? ['identify_genre', 'match_genre'] : ['identify_genre', 'match_genre', 'genre_feature'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L02_GENRES);

  if (subtype === 'match_genre') {
    const slice = shuffleSeeded([...L02_GENRES], rng).slice(0, 3);
    const pairs = slice.map((g) => ({ left: g.title, right: g.genre }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('L02', level, options.seed, 0),
      ...m,
      topicId: L02_TOPIC_ID,
      skillId: L02_SKILL_ID,
      generatorId: L02_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини произведение и жанр:',
      ...match,
      explanation: 'Жанр определяется по объёму, форме и характеру событий.',
      generatorParams: { subtype, key: slice.map((g) => g.title).join('|') },
    });
  }

  if (subtype === 'genre_feature') {
    const correct = item.feature;
    const distractors = uniqueDistractorsFromModels(
      correct,
      L02_GENRES.filter((g) => g !== item).map((g) => g.feature),
      rng,
    );
    return baseTask({
      id: taskId('L02', level, options.seed, 0),
      ...m,
      topicId: L02_TOPIC_ID,
      skillId: L02_SKILL_ID,
      generatorId: L02_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какой признак характерен для жанра «${item.genre}»?\nФрагмент: «${item.snippet}»`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `«${item.title}» — ${item.genre}. ${item.feature}.`,
      generatorParams: { subtype, key: item.title },
    });
  }

  const correct = item.genre;
  const distractors = uniqueDistractorsFromModels(
    correct,
    L02_GENRES.map((g) => g.genre),
    rng,
  );
  return baseTask({
    id: taskId('L02', level, options.seed, 0),
    ...m,
    topicId: L02_TOPIC_ID,
    skillId: L02_SKILL_ID,
    generatorId: L02_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Определи жанр по фрагменту:\n«${item.snippet}»`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Это ${item.genre}: ${item.feature}.`,
    generatorParams: { subtype: 'identify_genre', key: item.title },
  });
}

export function generateL02Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL02Task({ difficulty, seed: seed + index }), fingerprint, 'L02');
}

// ─── L03 ───────────────────────────────────────────────────────────────────
export const L03_SKILL_ID = 'reading.response.opinion' as const;
export const L03_TOPIC_ID = 'reading.response.writing' as const;
export const L03_GENERATOR_ID = 'gen.reading.l03' as const;
export type L03Subtype = 'best_argument' | 'pick_evidence' | 'structure_opinion' | 'reject_weak';

const L03_OPINION_STEPS = ['Прочитать вопрос', 'Выбрать сильный аргумент', 'Подтвердить примером из текста'] as const;

export function generateL03Task(options: GenOpts): Task {
  const m = meta('L03');
  rejectAdvancedLevels('L03', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L03Subtype[] =
    level === 1
      ? ['best_argument']
      : level === 2
        ? ['best_argument', 'pick_evidence']
        : ['best_argument', 'pick_evidence', 'reject_weak', 'structure_opinion'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L03_OPINION);

  if (subtype === 'structure_opinion') {
    const shuffled = shuffleOrder(rng, L03_OPINION_STEPS);
    return baseTask({
      id: taskId('L03', level, options.seed, 0),
      ...m,
      topicId: L03_TOPIC_ID,
      skillId: L03_SKILL_ID,
      generatorId: L03_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: `Расставь шаги рассуждения на вопрос «${item.question}»:`,
      items: shuffled,
      correctAnswer: [...L03_OPINION_STEPS],
      explanation: 'Сначала вопрос, потом аргумент и подтверждение.',
      generatorParams: { subtype, key: item.question },
    });
  }

  if (subtype === 'reject_weak') {
    const weak = pickOne(rng, item.weakArguments);
    const distractors = uniqueDistractorsFromModels(weak, [item.bestArgument, ...item.weakArguments.filter((w) => w !== weak)], rng);
    return baseTask({
      id: taskId('L03', level, options.seed, 0),
      ...m,
      topicId: L03_TOPIC_ID,
      skillId: L03_SKILL_ID,
      generatorId: L03_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какой аргумент СЛАБЫЙ для вопроса «${item.question}»?`,
      answers: buildChoiceAnswers(weak, distractors, rng),
      correctAnswer: weak,
      explanation: `Сильный аргумент: ${item.bestArgument}.`,
      generatorParams: { subtype, key: weak },
    });
  }

  if (subtype === 'pick_evidence') {
    const correct = item.evidenceHint;
    const distractors = uniqueDistractorsFromModels(correct, [...item.weakArguments, item.bestArgument], rng);
    return baseTask({
      id: taskId('L03', level, options.seed, 0),
      ...m,
      topicId: L03_TOPIC_ID,
      skillId: L03_SKILL_ID,
      generatorId: L03_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какая подсказка поможет аргументировать ответ на «${item.question}»?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Опора: ${item.evidenceHint}. Лучший аргумент: ${item.bestArgument}.`,
      generatorParams: { subtype, key: item.question },
    });
  }

  const correct = item.bestArgument;
  const distractors = uniqueDistractorsFromModels(correct, item.weakArguments, rng);
  return baseTask({
    id: taskId('L03', level, options.seed, 0),
    ...m,
    topicId: L03_TOPIC_ID,
    skillId: L03_SKILL_ID,
    generatorId: L03_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери лучший аргумент для вопроса «${item.question}»:`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.evidenceHint,
    generatorParams: { subtype: 'best_argument', key: item.question },
  });
}

export function generateL03Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL03Task({ difficulty, seed: seed + index }), fingerprint, 'L03');
}

// ─── L04 ───────────────────────────────────────────────────────────────────
export const L04_SKILL_ID = 'reading.genres.book' as const;
export const L04_TOPIC_ID = 'reading.genres.literature' as const;
export const L04_GENERATOR_ID = 'gen.reading.l04' as const;
export type L04Subtype = 'book_genre' | 'cover_match';

export function generateL04Task(options: GenOpts): Task {
  const m = meta('L04');
  rejectAdvancedLevels('L04', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L04Subtype[] = level === 1 ? ['book_genre'] : ['book_genre', 'cover_match'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L04_BOOKS);

  if (subtype === 'cover_match' || level >= 2) {
    const slice = shuffleSeeded([...L04_BOOKS], rng).slice(0, 3);
    const pairs =
      subtype === 'cover_match'
        ? slice.map((b) => ({ left: b.coverHint, right: b.genre }))
        : slice.map((b) => ({ left: b.title, right: b.genre }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('L04', level, options.seed, 0),
      ...m,
      topicId: L04_TOPIC_ID,
      skillId: L04_SKILL_ID,
      generatorId: L04_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question:
        subtype === 'cover_match'
          ? 'Соедини описание обложки и жанр книги:'
          : 'Соедини название книги и жанр:',
      ...match,
      explanation: 'По названию и оформлению можно определить жанр книги.',
      generatorParams: { subtype, key: slice.map((b) => b.title).join('|') },
    });
  }

  const correct = item.genre;
  const distractors = uniqueDistractorsFromModels(
    correct,
    L04_BOOKS.map((b) => b.genre),
    rng,
  );
  return baseTask({
    id: taskId('L04', level, options.seed, 0),
    ...m,
    topicId: L04_TOPIC_ID,
    skillId: L04_SKILL_ID,
    generatorId: L04_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `К какому жанру относится книга «${item.title}»?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `На обложке: ${item.coverHint}.`,
    generatorParams: { subtype: 'book_genre', key: item.title },
  });
}

export function generateL04Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL04Task({ difficulty, seed: seed + index }), fingerprint, 'L04');
}

// ─── L05 ───────────────────────────────────────────────────────────────────
export const L05_SKILL_ID = 'reading.genres.text_types' as const;
export const L05_TOPIC_ID = 'reading.genres.literature' as const;
export const L05_GENERATOR_ID = 'gen.reading.l05' as const;
export type L05Subtype = 'fiction_nonfiction' | 'text_type';

export function generateL05Task(options: GenOpts): Task {
  const m = meta('L05');
  rejectAdvancedLevels('L05', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, L05_TEXT_TYPES);
  const subtype = pickSubtype(options, rng, ['fiction_nonfiction', 'text_type'] as const);
  const correct = item.textType;
  const distractors = uniqueDistractorsFromModels(correct, ['художественный', 'познавательный'], rng);
  const question =
    subtype === 'text_type'
      ? `Какой это текст?\n«${item.snippet}»`
      : `Художественный это текст или познавательный?\n«${item.snippet}»`;
  return baseTask({
    id: taskId('L05', level, options.seed, 0),
    ...m,
    topicId: L05_TOPIC_ID,
    skillId: L05_SKILL_ID,
    generatorId: L05_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.reason,
    generatorParams: { subtype, key: item.snippet.slice(0, 30) },
  });
}

export function generateL05Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL05Task({ difficulty, seed: seed + index }), fingerprint, 'L05');
}

// ─── L06 ───────────────────────────────────────────────────────────────────
export const L06_SKILL_ID = 'reading.knowledge.authors' as const;
export const L06_TOPIC_ID = 'reading.knowledge.authors' as const;
export const L06_GENERATOR_ID = 'gen.reading.l06' as const;
export type L06Subtype = 'author_work' | 'work_author' | 'fact_about_author';

export function generateL06Task(options: GenOpts): Task {
  const m = meta('L06');
  rejectAdvancedLevels('L06', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L06Subtype[] =
    level === 1 ? ['author_work'] : level === 2 ? ['author_work', 'work_author'] : ['author_work', 'work_author', 'fact_about_author'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L06_AUTHORS);

  if (subtype === 'fact_about_author') {
    const correct = item.fact;
    const distractors = uniqueDistractorsFromModels(
      correct,
      L06_AUTHORS.filter((a) => a !== item).map((a) => a.fact),
      rng,
    );
    return baseTask({
      id: taskId('L06', level, options.seed, 0),
      ...m,
      topicId: L06_TOPIC_ID,
      skillId: L06_SKILL_ID,
      generatorId: L06_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Что верно об авторе ${item.author}?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `${item.author} — автор «${item.work}».`,
      generatorParams: { subtype, key: item.author },
    });
  }

  const slice = shuffleSeeded([...L06_AUTHORS], rng).slice(0, 3);
  const pairs =
    subtype === 'work_author'
      ? slice.map((a) => ({ left: a.work, right: a.author }))
      : slice.map((a) => ({ left: a.author, right: a.work }));
  const match = buildMatching(pairs, rng);
  return baseTask({
    id: taskId('L06', level, options.seed, 0),
    ...m,
    topicId: L06_TOPIC_ID,
    skillId: L06_SKILL_ID,
    generatorId: L06_GENERATOR_ID,
    difficulty: level,
    taskType: 'matching',
    question: subtype === 'work_author' ? 'Соедини произведение и автора:' : 'Соедини автора и произведение:',
    ...match,
    explanation: 'Запоминай пары «автор — произведение».',
    generatorParams: { subtype, key: slice.map((a) => a.author).join('|') },
  });
}

export function generateL06Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL06Task({ difficulty, seed: seed + index }), fingerprint, 'L06');
}

// ─── L07 ───────────────────────────────────────────────────────────────────
export const L07_SKILL_ID = 'reading.knowledge.devices' as const;
export const L07_TOPIC_ID = 'reading.knowledge.devices' as const;
export const L07_GENERATOR_ID = 'gen.reading.l07' as const;
export type L07Subtype = 'find_device' | 'name_device' | 'device_function';

export function generateL07Task(options: GenOpts): Task {
  const m = meta('L07');
  rejectAdvancedLevels('L07', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L07Subtype[] =
    level === 1 ? ['find_device'] : level === 2 ? ['find_device', 'name_device'] : ['find_device', 'name_device', 'device_function'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L07_DEVICES);

  if (subtype === 'device_function') {
    const correct = item.explanation;
    const distractors = uniqueDistractorsFromModels(
      correct,
      L07_DEVICES.filter((d) => d !== item).map((d) => d.explanation),
      rng,
    );
    return baseTask({
      id: taskId('L07', level, options.seed, 0),
      ...m,
      topicId: L07_TOPIC_ID,
      skillId: L07_SKILL_ID,
      generatorId: L07_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Объясни, почему в строке «${item.quote}» использовано ${item.device}:`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: correct,
      generatorParams: { subtype, key: item.quote },
    });
  }

  const correct = item.device;
  const distractors = uniqueDistractorsFromModels(
    correct,
    L07_DEVICES.map((d) => d.device),
    rng,
  );
  return baseTask({
    id: taskId('L07', level, options.seed, 0),
    ...m,
    topicId: L07_TOPIC_ID,
    skillId: L07_SKILL_ID,
    generatorId: L07_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какое средство выразительности в строке «${item.quote}»?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.explanation,
    generatorParams: { subtype: subtype === 'name_device' ? 'name_device' : 'find_device', key: item.quote },
  });
}

export function generateL07Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL07Task({ difficulty, seed: seed + index }), fingerprint, 'L07');
}

// ─── L08 ───────────────────────────────────────────────────────────────────
export const L08_SKILL_ID = 'reading.comprehension.interpret' as const;
export const L08_TOPIC_ID = 'reading.comprehension.content' as const;
export const L08_GENERATOR_ID = 'gen.reading.l08' as const;
export type L08Subtype = 'true_false_claim' | 'plausible_event' | 'interpret';

export function generateL08Task(options: GenOpts): Task {
  const m = meta('L08');
  rejectAdvancedLevels('L08', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L08Subtype[] =
    level === 1 ? ['interpret'] : level === 2 ? ['interpret', 'true_false_claim'] : ['interpret', 'true_false_claim', 'plausible_event'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L08_INTERPRET);
  const passage = passageText(item.passageId);

  if (subtype === 'true_false_claim') {
    const claims = getPassageById(item.passageId).claims;
    const claim = pickOne(rng, claims);
    const correct = claim.true ? 'верно' : 'неверно';
    const distractors = uniqueDistractorsFromModels(correct, ['верно', 'неверно', 'не знаю'], rng);
    return baseTask({
      id: taskId('L08', level, options.seed, 0),
      ...m,
      topicId: L08_TOPIC_ID,
      skillId: L08_SKILL_ID,
      generatorId: L08_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Верно ли утверждение по тексту?\n«${claim.text}»`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: claim.true ? 'Утверждение подтверждается текстом.' : 'В тексте этого нет.',
      passage,
      generatorParams: { subtype, key: claim.text },
    });
  }

  const correct = item.correct;
  const distractors = uniqueDistractorsFromModels(correct, item.distractors, rng);
  return baseTask({
    id: taskId('L08', level, options.seed, 0),
    ...m,
    topicId: L08_TOPIC_ID,
    skillId: L08_SKILL_ID,
    generatorId: L08_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `${item.question}\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Ответ следует из текста и его смысла.',
    passage,
    generatorParams: { subtype: subtype === 'plausible_event' ? 'plausible_event' : 'interpret', key: item.passageId },
  });
}

export function generateL08Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL08Task({ difficulty, seed: seed + index }), fingerprint, 'L08');
}

// ─── L09 ───────────────────────────────────────────────────────────────────
export const L09_SKILL_ID = 'reading.comprehension.sequence' as const;
export const L09_TOPIC_ID = 'reading.comprehension.content' as const;
export const L09_GENERATOR_ID = 'gen.reading.l09' as const;
export type L09Subtype = 'order_events' | 'find_error_order' | 'next_event';

export function generateL09Task(options: GenOpts): Task {
  const m = meta('L09');
  rejectAdvancedLevels('L09', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L09Subtype[] =
    level === 1 ? ['order_events'] : level === 2 ? ['order_events', 'next_event'] : ['order_events', 'find_error_order', 'next_event'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L09_SEQUENCE);
  const passage = passageText(item.passageId);

  if (subtype === 'order_events') {
    const shuffled = shuffleOrder(rng, item.events);
    return baseTask({
      id: taskId('L09', level, options.seed, 0),
      ...m,
      topicId: L09_TOPIC_ID,
      skillId: L09_SKILL_ID,
      generatorId: L09_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: 'Расставь события по порядку, как они происходят в тексте:',
      items: shuffled,
      correctAnswer: [...item.events],
      explanation: 'События идут в том порядке, в каком они описаны в тексте.',
      passage,
      generatorParams: { subtype, key: item.passageId },
    });
  }

  if (subtype === 'find_error_order') {
    const broken = [...item.events].reverse();
    const correct = `Неверный порядок: ${broken.join(' → ')}`;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [`Порядок верный: ${item.events.join(' → ')}`, 'нет ошибки', item.distractorEvent],
      rng,
    );
    return baseTask({
      id: taskId('L09', level, options.seed, 0),
      ...m,
      topicId: L09_TOPIC_ID,
      skillId: L09_SKILL_ID,
      generatorId: L09_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Найди ошибку в последовательности событий:\n${broken.join(' → ')}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Верный порядок: ${item.events.join(' → ')}.`,
      passage,
      generatorParams: { subtype, key: broken.join('|') },
    });
  }

  const next = item.events[Math.min(2, item.events.length - 1)]!;
  const distractors = uniqueDistractorsFromModels(next, [...item.events.filter((e) => e !== next), item.distractorEvent], rng);
  return baseTask({
    id: taskId('L09', level, options.seed, 0),
    ...m,
    topicId: L09_TOPIC_ID,
    skillId: L09_SKILL_ID,
    generatorId: L09_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какое событие происходит после «${item.events[1] ?? item.events[0]}»?`,
    answers: buildChoiceAnswers(next, distractors, rng),
    correctAnswer: next,
    explanation: 'Сверь порядок событий с текстом.',
    passage,
    generatorParams: { subtype: 'next_event', key: item.passageId },
  });
}

export function generateL09Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL09Task({ difficulty, seed: seed + index }), fingerprint, 'L09');
}

// ─── L10 ───────────────────────────────────────────────────────────────────
export const L10_SKILL_ID = 'reading.comprehension.word' as const;
export const L10_TOPIC_ID = 'reading.comprehension.content' as const;
export const L10_GENERATOR_ID = 'gen.reading.l10' as const;
export type L10Subtype = 'word_meaning' | 'synonym_context' | 'match_meaning';

export function generateL10Task(options: GenOpts): Task {
  const m = meta('L10');
  rejectAdvancedLevels('L10', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L10Subtype[] =
    level === 1 ? ['word_meaning'] : level === 2 ? ['word_meaning', 'match_meaning'] : ['word_meaning', 'match_meaning', 'synonym_context'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L10_WORD_CONTEXT);
  const passage = passageText(item.passageId);

  if (subtype === 'match_meaning') {
    const slice = shuffleSeeded([...L10_WORD_CONTEXT], rng).slice(0, 3);
    const pairs = slice.map((w) => ({ left: w.word, right: w.meaning }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('L10', level, options.seed, 0),
      ...m,
      topicId: L10_TOPIC_ID,
      skillId: L10_SKILL_ID,
      generatorId: L10_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини слово из текста и его значение по контексту:',
      ...match,
      explanation: 'Значение слова определяется по контексту произведения.',
      passage,
      generatorParams: { subtype, key: slice.map((w) => w.word).join('|') },
    });
  }

  const correct = item.meaning;
  const distractors = uniqueDistractorsFromModels(correct, item.distractors, rng);
  return baseTask({
    id: taskId('L10', level, options.seed, 0),
    ...m,
    topicId: L10_TOPIC_ID,
    skillId: L10_SKILL_ID,
    generatorId: L10_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Что означает слово «${item.word}» в тексте?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `В этом тексте «${item.word}» — ${item.meaning}.`,
    passage,
    generatorParams: { subtype: subtype === 'synonym_context' ? 'synonym_context' : 'word_meaning', key: item.word },
  });
}

export function generateL10Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL10Task({ difficulty, seed: seed + index }), fingerprint, 'L10');
}

// ─── L11 ───────────────────────────────────────────────────────────────────
export const L11_SKILL_ID = 'reading.comprehension.explicit' as const;
export const L11_TOPIC_ID = 'reading.comprehension.content' as const;
export const L11_GENERATOR_ID = 'gen.reading.l11' as const;
export type L11Subtype = 'explicit_fact' | 'who_what_where' | 'quote_support';

export function generateL11Task(options: GenOpts): Task {
  const m = meta('L11');
  rejectAdvancedLevels('L11', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L11Subtype[] =
    level === 1 ? ['explicit_fact'] : level === 2 ? ['explicit_fact', 'who_what_where'] : ['explicit_fact', 'who_what_where', 'quote_support'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L11_EXPLICIT);
  const passage = passageText(item.passageId);

  if (subtype === 'quote_support' && level >= 3) {
    return baseTask({
      id: taskId('L11', level, options.seed, 0),
      ...m,
      topicId: L11_TOPIC_ID,
      skillId: L11_SKILL_ID,
      generatorId: L11_GENERATOR_ID,
      difficulty: level,
      taskType: 'shortAnswer',
      question: `${item.question}\n\n${passage}`,
      correctAnswer: item.correct,
      acceptableAnswers: [item.correct, item.correct.toLowerCase(), ...item.distractors],
      explanation: 'Ответ прямо сказан в тексте.',
      passage,
      generatorParams: { subtype, key: item.question },
    });
  }

  if (level === 1 && subtype === 'explicit_fact' && rng() > 0.5) {
    return baseTask({
      id: taskId('L11', level, options.seed, 0),
      ...m,
      topicId: L11_TOPIC_ID,
      skillId: L11_SKILL_ID,
      generatorId: L11_GENERATOR_ID,
      difficulty: level,
      taskType: 'shortAnswer',
      question: `${item.question}\n\n${passage}`,
      correctAnswer: item.correct,
      acceptableAnswers: [item.correct, item.correct.toLowerCase()],
      explanation: 'Найди в тексте прямой ответ.',
      passage,
      generatorParams: { subtype: 'explicit_fact', key: item.question },
    });
  }

  const correct = item.correct;
  const distractors = uniqueDistractorsFromModels(correct, item.distractors, rng);
  return baseTask({
    id: taskId('L11', level, options.seed, 0),
    ...m,
    topicId: L11_TOPIC_ID,
    skillId: L11_SKILL_ID,
    generatorId: L11_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `${item.question}\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Ответ содержится в тексте явно.',
    passage,
    generatorParams: { subtype, key: item.passageId },
  });
}

export function generateL11Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL11Task({ difficulty, seed: seed + index }), fingerprint, 'L11');
}

// ─── L12 ───────────────────────────────────────────────────────────────────
export const L12_SKILL_ID = 'reading.comprehension.claims' as const;
export const L12_TOPIC_ID = 'reading.comprehension.content' as const;
export const L12_GENERATOR_ID = 'gen.reading.l12' as const;
export type L12Subtype = 'select_true_claims' | 'reject_false' | 'multi_match';

export function generateL12Task(options: GenOpts): Task {
  const m = meta('L12');
  rejectAdvancedLevels('L12', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L12Subtype[] =
    level === 1 ? ['select_true_claims'] : level === 2 ? ['select_true_claims', 'reject_false'] : ['select_true_claims', 'reject_false', 'multi_match'];
  const subtype = pickSubtype(options, rng, subtypes);
  const block = pickOne(rng, L12_CLAIMS);
  const passage = passageText(block.passageId);
  const trueClaims = block.claims.filter((c) => c.true);
  const falseClaims = block.claims.filter((c) => !c.true);

  if (subtype === 'multi_match') {
    const slice = shuffleSeeded([...block.claims], rng).slice(0, 3);
    const pairs = slice.map((c) => ({ left: c.text, right: c.true ? 'верно' : 'неверно' }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('L12', level, options.seed, 0),
      ...m,
      topicId: L12_TOPIC_ID,
      skillId: L12_SKILL_ID,
      generatorId: L12_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини утверждение и его соответствие тексту:',
      ...match,
      explanation: 'Каждое утверждение нужно проверить по тексту.',
      passage,
      generatorParams: { subtype, key: block.passageId },
    });
  }

  if (subtype === 'reject_false') {
    const claim = pickOne(rng, falseClaims);
    const distractors = uniqueDistractorsFromModels(
      claim.text,
      [...trueClaims.map((c) => c.text), ...falseClaims.filter((c) => c !== claim).map((c) => c.text)],
      rng,
    );
    return baseTask({
      id: taskId('L12', level, options.seed, 0),
      ...m,
      topicId: L12_TOPIC_ID,
      skillId: L12_SKILL_ID,
      generatorId: L12_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какое утверждение НЕ соответствует тексту?\n\n${passage}`,
      answers: buildChoiceAnswers(claim.text, distractors, rng),
      correctAnswer: claim.text,
      explanation: 'Это утверждение не подтверждается текстом.',
      passage,
      generatorParams: { subtype, key: claim.text },
    });
  }

  const claim = pickOne(rng, trueClaims);
  const distractors = uniqueDistractorsFromModels(
    claim.text,
    [...falseClaims.map((c) => c.text), ...trueClaims.filter((c) => c !== claim).map((c) => c.text)],
    rng,
  );
  return baseTask({
    id: taskId('L12', level, options.seed, 0),
    ...m,
    topicId: L12_TOPIC_ID,
    skillId: L12_SKILL_ID,
    generatorId: L12_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какое утверждение соответствует тексту?\n\n${passage}`,
    answers: buildChoiceAnswers(claim.text, distractors, rng),
    correctAnswer: claim.text,
    explanation: 'Утверждение подтверждается текстом.',
    passage,
    generatorParams: { subtype: 'select_true_claims', key: claim.text },
  });
}

export function generateL12Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL12Task({ difficulty, seed: seed + index }), fingerprint, 'L12');
}

// ─── L13 ───────────────────────────────────────────────────────────────────
export const L13_SKILL_ID = 'reading.response.conclusion' as const;
export const L13_TOPIC_ID = 'reading.response.writing' as const;
export const L13_GENERATOR_ID = 'gen.reading.l13' as const;
export type L13Subtype = 'best_conclusion' | 'justify_choice' | 'plan_answer';

export function generateL13Task(options: GenOpts): Task {
  const m = meta('L13');
  rejectAdvancedLevels('L13', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L13Subtype[] =
    level === 1 ? ['best_conclusion'] : level === 2 ? ['best_conclusion', 'justify_choice'] : ['best_conclusion', 'justify_choice', 'plan_answer'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L13_CONCLUSION);
  const passage = passageText(item.passageId);
  const p = getPassageById(item.passageId);

  if (subtype === 'plan_answer') {
    const shuffled = shuffleOrder(rng, item.planSteps);
    return baseTask({
      id: taskId('L13', level, options.seed, 0),
      ...m,
      topicId: L13_TOPIC_ID,
      skillId: L13_SKILL_ID,
      generatorId: L13_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: `Расставь шаги высказывания по тексту «${p.title}»:`,
      items: shuffled,
      correctAnswer: [...item.planSteps],
      explanation: 'Сначала опора на текст, потом вывод.',
      passage,
      generatorParams: { subtype, key: item.passageId },
    });
  }

  if (subtype === 'justify_choice') {
    const correct = p.mainIdea;
    const distractors = uniqueDistractorsFromModels(correct, [...item.weakConclusions, item.bestConclusion], rng);
    return baseTask({
      id: taskId('L13', level, options.seed, 0),
      ...m,
      topicId: L13_TOPIC_ID,
      skillId: L13_SKILL_ID,
      generatorId: L13_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Почему верен вывод «${item.bestConclusion}»?\n\n${passage}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Главная мысль текста: ${p.mainIdea}.`,
      passage,
      generatorParams: { subtype, key: item.bestConclusion },
    });
  }

  const correct = item.bestConclusion;
  const distractors = uniqueDistractorsFromModels(correct, item.weakConclusions, rng);
  return baseTask({
    id: taskId('L13', level, options.seed, 0),
    ...m,
    topicId: L13_TOPIC_ID,
    skillId: L13_SKILL_ID,
    generatorId: L13_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери лучший вывод по тексту «${p.title}»:\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: p.mainIdea,
    passage,
    generatorParams: { subtype: 'best_conclusion', key: item.passageId },
  });
}

export function generateL13Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL13Task({ difficulty, seed: seed + index }), fingerprint, 'L13');
}

// ─── L14 ───────────────────────────────────────────────────────────────────
export const L14_SKILL_ID = 'reading.comprehension.theme' as const;
export const L14_TOPIC_ID = 'reading.comprehension.theme' as const;
export const L14_GENERATOR_ID = 'gen.reading.l14' as const;
export type L14Subtype = 'theme' | 'theme_vs_detail';

export function generateL14Task(options: GenOpts): Task {
  const m = meta('L14');
  rejectAdvancedLevels('L14', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['theme', 'theme_vs_detail'] as const);
  const item = pickOne(rng, L14_THEME);
  const passage = passageText(item.passageId);

  if (subtype === 'theme_vs_detail') {
    const correct = item.detailTrap;
    const distractors = uniqueDistractorsFromModels(correct, [item.theme, ...item.otherThemes], rng);
    return baseTask({
      id: taskId('L14', level, options.seed, 0),
      ...m,
      topicId: L14_TOPIC_ID,
      skillId: L14_SKILL_ID,
      generatorId: L14_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Что является деталью, а не темой текста?\n\n${passage}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Тема текста: ${item.theme}.`,
      passage,
      generatorParams: { subtype, key: item.passageId },
    });
  }

  const correct = item.theme;
  const distractors = uniqueDistractorsFromModels(correct, [...item.otherThemes, item.detailTrap], rng);
  return baseTask({
    id: taskId('L14', level, options.seed, 0),
    ...m,
    topicId: L14_TOPIC_ID,
    skillId: L14_SKILL_ID,
    generatorId: L14_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `О чём этот текст?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Тема — главное, о чём повествует текст.',
    passage,
    generatorParams: { subtype: 'theme', key: item.passageId },
  });
}

export function generateL14Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL14Task({ difficulty, seed: seed + index }), fingerprint, 'L14');
}

// ─── L15 ───────────────────────────────────────────────────────────────────
export const L15_SKILL_ID = 'reading.comprehension.main_idea' as const;
export const L15_TOPIC_ID = 'reading.comprehension.theme' as const;
export const L15_GENERATOR_ID = 'gen.reading.l15' as const;
export type L15Subtype = 'main_idea' | 'idea_vs_theme';

export function generateL15Task(options: GenOpts): Task {
  const m = meta('L15');
  rejectAdvancedLevels('L15', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['main_idea', 'idea_vs_theme'] as const);
  const item = pickOne(rng, L15_MAIN_IDEA);
  const passage = passageText(item.passageId);

  if (subtype === 'idea_vs_theme') {
    const correct = item.themeOnly;
    const distractors = uniqueDistractorsFromModels(correct, [item.mainIdea, ...item.wrongIdeas], rng);
    return baseTask({
      id: taskId('L15', level, options.seed, 0),
      ...m,
      topicId: L15_TOPIC_ID,
      skillId: L15_SKILL_ID,
      generatorId: L15_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Что ближе к теме, а не к главной мысли?\n\n${passage}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Главная мысль: ${item.mainIdea}.`,
      passage,
      generatorParams: { subtype, key: item.passageId },
    });
  }

  const correct = item.mainIdea;
  const distractors = uniqueDistractorsFromModels(correct, [...item.wrongIdeas, item.themeOnly], rng);
  return baseTask({
    id: taskId('L15', level, options.seed, 0),
    ...m,
    topicId: L15_TOPIC_ID,
    skillId: L15_SKILL_ID,
    generatorId: L15_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какова главная мысль текста?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Главная мысль — чему учит текст.',
    passage,
    generatorParams: { subtype: 'main_idea', key: item.passageId },
  });
}

export function generateL15Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL15Task({ difficulty, seed: seed + index }), fingerprint, 'L15');
}

// ─── L16 ───────────────────────────────────────────────────────────────────
export const L16_SKILL_ID = 'reading.comprehension.title' as const;
export const L16_TOPIC_ID = 'reading.comprehension.theme' as const;
export const L16_GENERATOR_ID = 'gen.reading.l16' as const;
export type L16Subtype = 'best_title' | 'title_vs_theme';

export function generateL16Task(options: GenOpts): Task {
  const m = meta('L16');
  rejectAdvancedLevels('L16', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['best_title', 'title_vs_theme'] as const);
  const item = pickOne(rng, L16_TITLE);
  const passage = passageText(item.passageId);

  if (subtype === 'title_vs_theme') {
    const wrong = pickOne(rng, item.weakTitles);
    const distractors = uniqueDistractorsFromModels(wrong, [item.bestTitle, ...item.weakTitles.filter((t) => t !== wrong)], rng);
    return baseTask({
      id: taskId('L16', level, options.seed, 0),
      ...m,
      topicId: L16_TOPIC_ID,
      skillId: L16_SKILL_ID,
      generatorId: L16_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какой заголовок НЕ подходит к тексту?\n\n${passage}`,
      answers: buildChoiceAnswers(wrong, distractors, rng),
      correctAnswer: wrong,
      explanation: `Лучший заголовок: «${item.bestTitle}».`,
      passage,
      generatorParams: { subtype, key: wrong },
    });
  }

  const correct = item.bestTitle;
  const distractors = uniqueDistractorsFromModels(correct, item.weakTitles, rng);
  return baseTask({
    id: taskId('L16', level, options.seed, 0),
    ...m,
    topicId: L16_TOPIC_ID,
    skillId: L16_SKILL_ID,
    generatorId: L16_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери подходящий заголовок:\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Заголовок отражает главных героев и событие.',
    passage,
    generatorParams: { subtype: 'best_title', key: item.passageId },
  });
}

export function generateL16Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL16Task({ difficulty, seed: seed + index }), fingerprint, 'L16');
}

// ─── L17 ───────────────────────────────────────────────────────────────────
export const L17_SKILL_ID = 'reading.characters.trait' as const;
export const L17_TOPIC_ID = 'reading.characters.hero' as const;
export const L17_GENERATOR_ID = 'gen.reading.l17' as const;
export type L17Subtype = 'character_trait' | 'portrait' | 'feelings';

export function generateL17Task(options: GenOpts): Task {
  const m = meta('L17');
  rejectAdvancedLevels('L17', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: L17Subtype[] =
    level === 1 ? ['character_trait'] : level === 2 ? ['character_trait', 'portrait'] : ['character_trait', 'portrait', 'feelings'];
  const subtype = pickSubtype(options, rng, subtypes);
  const item = pickOne(rng, L17_CHARACTER);
  const passage = passageText(item.passageId);

  if (subtype === 'portrait') {
    const correct = item.evidence;
    const distractors = uniqueDistractorsFromModels(correct, [...item.wrongTraits, item.trait], rng);
    return baseTask({
      id: taskId('L17', level, options.seed, 0),
      ...m,
      topicId: L17_TOPIC_ID,
      skillId: L17_SKILL_ID,
      generatorId: L17_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какой поступок показывает черту «${item.trait}» у ${item.character}?\n\n${passage}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Черта «${item.trait}» видна в поступке: ${item.evidence}.`,
      passage,
      generatorParams: { subtype, key: item.character },
    });
  }

  const correct = item.trait;
  const distractors = uniqueDistractorsFromModels(correct, item.wrongTraits, rng);
  return baseTask({
    id: taskId('L17', level, options.seed, 0),
    ...m,
    topicId: L17_TOPIC_ID,
    skillId: L17_SKILL_ID,
    generatorId: L17_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Как можно охарактеризовать ${item.character}?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.evidence,
    passage,
    generatorParams: { subtype: subtype === 'feelings' ? 'feelings' : 'character_trait', key: item.character },
  });
}

export function generateL17Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL17Task({ difficulty, seed: seed + index }), fingerprint, 'L17');
}

// ─── L18 ───────────────────────────────────────────────────────────────────
export const L18_SKILL_ID = 'reading.characters.motive' as const;
export const L18_TOPIC_ID = 'reading.characters.hero' as const;
export const L18_GENERATOR_ID = 'gen.reading.l18' as const;
export type L18Subtype = 'motive' | 'cause_effect_action';

export function generateL18Task(options: GenOpts): Task {
  const m = meta('L18');
  rejectAdvancedLevels('L18', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['motive', 'cause_effect_action'] as const);
  const item = pickOne(rng, L18_MOTIVE);
  const passage = passageText(item.passageId);
  const correct = item.motive;
  const distractors = uniqueDistractorsFromModels(correct, item.wrongMotives, rng);
  return baseTask({
    id: taskId('L18', level, options.seed, 0),
    ...m,
    topicId: L18_TOPIC_ID,
    skillId: L18_SKILL_ID,
    generatorId: L18_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      subtype === 'cause_effect_action'
        ? `Почему произошло действие: «${item.action}»?\n\n${passage}`
        : `Зачем герой сделал так: «${item.action}»?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Мотив поступка: ${item.motive}.`,
    passage,
    generatorParams: { subtype, key: item.action },
  });
}

export function generateL18Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL18Task({ difficulty, seed: seed + index }), fingerprint, 'L18');
}

// ─── L19 ───────────────────────────────────────────────────────────────────
export const L19_SKILL_ID = 'reading.characters.plan' as const;
export const L19_TOPIC_ID = 'reading.characters.structure' as const;
export const L19_GENERATOR_ID = 'gen.reading.l19' as const;
export type L19Subtype = 'order_plan' | 'best_plan';

export function generateL19Task(options: GenOpts): Task {
  const m = meta('L19');
  rejectAdvancedLevels('L19', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['order_plan', 'best_plan'] as const);
  const item = pickOne(rng, L19_PLAN);
  const passage = passageText(item.passageId);

  if (subtype === 'best_plan') {
    const correct = item.goodPlan.join(' → ');
    const distractors = uniqueDistractorsFromModels(
      correct,
      [shuffleOrder(rng, item.goodPlan).join(' → '), item.extraPoint, ...item.badPlan],
      rng,
    );
    return baseTask({
      id: taskId('L19', level, options.seed, 0),
      ...m,
      topicId: L19_TOPIC_ID,
      skillId: L19_SKILL_ID,
      generatorId: L19_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Выбери верный план текста:\n\n${passage}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: 'План отражает ход событий текста.',
      passage,
      generatorParams: { subtype, key: item.passageId },
    });
  }

  const shuffled = shuffleOrder(rng, item.goodPlan);
  return baseTask({
    id: taskId('L19', level, options.seed, 0),
    ...m,
    topicId: L19_TOPIC_ID,
    skillId: L19_SKILL_ID,
    generatorId: L19_GENERATOR_ID,
    difficulty: level,
    taskType: 'ordering',
    question: 'Расставь части плана текста по порядку:',
    items: shuffled,
    correctAnswer: [...item.goodPlan],
    explanation: 'План следует за развитием сюжета.',
    passage,
    generatorParams: { subtype: 'order_plan', key: item.passageId },
  });
}

export function generateL19Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL19Task({ difficulty, seed: seed + index }), fingerprint, 'L19');
}

// ─── L20 ───────────────────────────────────────────────────────────────────
export const L20_SKILL_ID = 'reading.characters.composition' as const;
export const L20_TOPIC_ID = 'reading.characters.structure' as const;
export const L20_GENERATOR_ID = 'gen.reading.l20' as const;
export type L20Subtype = 'episode_role' | 'composition_part';

export function generateL20Task(options: GenOpts): Task {
  const m = meta('L20');
  rejectAdvancedLevels('L20', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, L20_COMPOSITION);
  const passage = passageText(item.passageId);
  const subtype = pickSubtype(options, rng, ['episode_role', 'composition_part'] as const);
  const correct = item.role;
  const distractors = uniqueDistractorsFromModels(
    correct,
    ['завязка', 'развитие', 'кульминация', 'развязка'].filter((r) => r !== correct),
    rng,
  );
  return baseTask({
    id: taskId('L20', level, options.seed, 0),
    ...m,
    topicId: L20_TOPIC_ID,
    skillId: L20_SKILL_ID,
    generatorId: L20_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какую роль в композиции играет эпизод «${item.episode}»?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.explanation,
    passage,
    generatorParams: { subtype, key: item.episode },
  });
}

export function generateL20Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL20Task({ difficulty, seed: seed + index }), fingerprint, 'L20');
}

// ─── L21 ───────────────────────────────────────────────────────────────────
export const L21_SKILL_ID = 'reading.characters.author' as const;
export const L21_TOPIC_ID = 'reading.characters.structure' as const;
export const L21_GENERATOR_ID = 'gen.reading.l21' as const;
export type L21Subtype = 'author_attitude' | 'find_position';

export function generateL21Task(options: GenOpts): Task {
  const m = meta('L21');
  rejectAdvancedLevels('L21', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, L21_AUTHOR_POSITION);
  const passage = passageText(item.passageId);
  const subtype = pickSubtype(options, rng, ['author_attitude', 'find_position'] as const);
  const correct = item.position;
  const distractors = uniqueDistractorsFromModels(correct, item.wrongPositions, rng);
  return baseTask({
    id: taskId('L21', level, options.seed, 0),
    ...m,
    topicId: L21_TOPIC_ID,
    skillId: L21_SKILL_ID,
    generatorId: L21_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      subtype === 'find_position'
        ? `Какова позиция автора?\n\n${passage}`
        : `Как автор относится к поступку героев?\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: correct,
    passage,
    generatorParams: { subtype, key: item.passageId },
  });
}

export function generateL21Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL21Task({ difficulty, seed: seed + index }), fingerprint, 'L21');
}

// ─── L22 ───────────────────────────────────────────────────────────────────
export const L22_SKILL_ID = 'reading.genres.prose_poetry' as const;
export const L22_TOPIC_ID = 'reading.genres.literature' as const;
export const L22_GENERATOR_ID = 'gen.reading.l22' as const;
export type L22Subtype = 'prose_poetry' | 'rhyme_rhythm';

export function generateL22Task(options: GenOpts): Task {
  const m = meta('L22');
  rejectAdvancedLevels('L22', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, L22_PROSE_POETRY);
  const subtype = pickSubtype(options, rng, ['prose_poetry', 'rhyme_rhythm'] as const);
  const correct = item.form;
  const distractors = uniqueDistractorsFromModels(correct, ['проза', 'поэзия'], rng);
  return baseTask({
    id: taskId('L22', level, options.seed, 0),
    ...m,
    topicId: L22_TOPIC_ID,
    skillId: L22_SKILL_ID,
    generatorId: L22_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      subtype === 'rhyme_rhythm'
        ? `Есть ли в тексте признаки поэзии (ритм, рифма)?\n«${item.text.replace(/\n/g, ' / ')}»`
        : `Это проза или поэзия?\n«${item.text.replace(/\n/g, ' / ')}»`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.clue,
    generatorParams: { subtype, key: item.form },
  });
}

export function generateL22Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL22Task({ difficulty, seed: seed + index }), fingerprint, 'L22');
}

// ─── L23 ───────────────────────────────────────────────────────────────────
export const L23_SKILL_ID = 'reading.characters.compare' as const;
export const L23_TOPIC_ID = 'reading.characters.hero' as const;
export const L23_GENERATOR_ID = 'gen.reading.l23' as const;
export type L23Subtype = 'compare_heroes' | 'contrast';

export function generateL23Task(options: GenOpts): Task {
  const m = meta('L23');
  rejectAdvancedLevels('L23', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, L23_COMPARE_HEROES);
  const passage = passageText(item.passageId);
  const subtype = pickSubtype(options, rng, ['compare_heroes', 'contrast'] as const);

  if (subtype === 'compare_heroes' && level >= 2) {
    const pairs = [
      { left: item.heroA, right: item.similarity },
      { left: `${item.heroA} и ${item.heroB}`, right: item.difference },
    ];
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('L23', level, options.seed, 0),
      ...m,
      topicId: L23_TOPIC_ID,
      skillId: L23_SKILL_ID,
      generatorId: L23_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини героев и верное сравнение:',
      ...match,
      explanation: 'Сравнивай героев по поступкам и отношению.',
      passage,
      generatorParams: { subtype, key: item.passageId },
    });
  }

  const correct = item.correct;
  const distractors = uniqueDistractorsFromModels(correct, item.distractors, rng);
  return baseTask({
    id: taskId('L23', level, options.seed, 0),
    ...m,
    topicId: L23_TOPIC_ID,
    skillId: L23_SKILL_ID,
    generatorId: L23_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `${item.contrastQuestion}\n\n${passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.difference,
    passage,
    generatorParams: { subtype: 'contrast', key: item.heroA },
  });
}

export function generateL23Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL23Task({ difficulty, seed: seed + index }), fingerprint, 'L23');
}

// ─── L24 ───────────────────────────────────────────────────────────────────
export const L24_SKILL_ID = 'reading.response.reasoning' as const;
export const L24_TOPIC_ID = 'reading.response.reasoning' as const;
export const L24_GENERATOR_ID = 'gen.reading.l24' as const;
export type L24Subtype = (typeof REASONING_SUBTYPES)[number];

export function generateL24Task(options: GenOpts): Task {
  const m = meta('L24');
  rejectAdvancedLevels('L24', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, L24_REASONING);
  const mode = (options.subtype as L24Subtype | undefined) ?? item.subtype;

  if (mode === 'find_error') {
    const distractors = uniqueDistractorsFromModels(item.error, [item.correct, 'ошибки нет', 'оба верны'], rng);
    return baseTask({
      id: taskId('L24', level, options.seed, 0),
      ...m,
      topicId: L24_TOPIC_ID,
      skillId: L24_SKILL_ID,
      generatorId: L24_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Найди ошибку в рассуждении (${item.skill}): «${item.error}»`,
      answers: buildChoiceAnswers(item.error, distractors, rng),
      correctAnswer: item.error,
      explanation: `Правильно: ${item.correct}.`,
      generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
    });
  }

  if (mode === 'choose_sequence') {
    const correct = item.steps.join(' → ');
    const wrongSeq = shuffleOrder(rng, item.steps).join(' → ');
    const distractors = uniqueDistractorsFromModels(correct, [wrongSeq, item.error, [...item.steps].reverse().join(' → ')], rng);
    return baseTask({
      id: taskId('L24', level, options.seed, 0),
      ...m,
      topicId: L24_TOPIC_ID,
      skillId: L24_SKILL_ID,
      generatorId: L24_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Выбери правильную последовательность шагов рассуждения (${item.skill}):`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Шаги: ${item.steps.join('; ')}.`,
      generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
    });
  }

  if (mode === 'justify_choice') {
    const distractors = uniqueDistractorsFromModels(item.correct, [item.error, 'не связано', 'наоборот'], rng);
    return baseTask({
      id: taskId('L24', level, options.seed, 0),
      ...m,
      topicId: L24_TOPIC_ID,
      skillId: L24_SKILL_ID,
      generatorId: L24_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какой ход разбора верен (${item.skill})?`,
      answers: buildChoiceAnswers(item.correct, distractors, rng),
      correctAnswer: item.correct,
      explanation: item.correct,
      generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
    });
  }

  const stepIndex = mode === 'first_step' ? 0 : Math.min(1, item.steps.length - 1);
  const correct = item.steps[stepIndex]!;
  const distractors = uniqueDistractorsFromModels(correct, [...item.steps.filter((_, i) => i !== stepIndex), item.error], rng);
  return baseTask({
    id: taskId('L24', level, options.seed, 0),
    ...m,
    topicId: L24_TOPIC_ID,
    skillId: L24_SKILL_ID,
    generatorId: L24_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      mode === 'first_step'
        ? `Какой первый шаг рассуждения верен (${item.skill})?`
        : `Какой следующий шаг рассуждения верен (${item.skill})?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Правильный ход: ${item.correct}.`,
    generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
  });
}

export function generateL24Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateL24Task({ difficulty, seed: seed + index }), fingerprint, 'L24');
}

// ─── Registry ──────────────────────────────────────────────────────────────
export const READING_GENERATORS: Record<ReadingSkillCode, (opts: GenOpts) => Task> = {
  L01: generateL01Task,
  L02: generateL02Task,
  L03: generateL03Task,
  L04: generateL04Task,
  L05: generateL05Task,
  L06: generateL06Task,
  L07: generateL07Task,
  L08: generateL08Task,
  L09: generateL09Task,
  L10: generateL10Task,
  L11: generateL11Task,
  L12: generateL12Task,
  L13: generateL13Task,
  L14: generateL14Task,
  L15: generateL15Task,
  L16: generateL16Task,
  L17: generateL17Task,
  L18: generateL18Task,
  L19: generateL19Task,
  L20: generateL20Task,
  L21: generateL21Task,
  L22: generateL22Task,
  L23: generateL23Task,
  L24: generateL24Task,
};

export function generateReadingTask(code: ReadingSkillCode, options: GenOpts): Task {
  const fn = READING_GENERATORS[code];
  if (!fn) throw new Error(`No generator for ${code}`);
  return fn(options);
}

export function fingerprintReadingTask(task: Task): string {
  return fingerprint(task);
}
