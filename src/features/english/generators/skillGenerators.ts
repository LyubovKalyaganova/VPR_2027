/**
 * Генераторы E01–E18 для английского языка (ВПР-2027, 4 класс).
 */
import type { Difficulty, Task } from '../../../types';
import type { EnglishSkillCode } from '../../../data/taxonomy/english';
import { getEnglishSkillByCode } from '../../../data/taxonomy/english';
import {
  FORM_PROFILES,
  GRAMMAR_CLOZE,
  LEXIS_E12,
  LEXIS_E13,
  LISTENING_DIALOGUES,
  READING_PASSAGES,
  REASONING_SCENARIOS,
  type FormField,
  type GrammarCloze,
  type GrammarGap,
  type ListeningDialogue,
  type ReadingPassage,
  type ReadingQuestion,
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

function meta(code: EnglishSkillCode) {
  const skill = getEnglishSkillByCode(code);
  return {
    code,
    skillId: skill.id,
    topicId: skill.topicId,
    section: skill.sectionId.split('.').slice(1).join(' / ') || 'English',
    topic: skill.title.split(':')[0]?.trim() ?? skill.title,
    skill: skill.title,
    generatorId: `gen.english.${code.toLowerCase()}`,
  };
}

function taskId(code: EnglishSkillCode, difficulty: Level, seed: number, index: number): string {
  return `${code.toLowerCase()}-L${difficulty}-s${seed}-i${index}`;
}

function fingerprint(task: Task): string {
  const p = task.generatorParams ?? {};
  return `${task.skillId}|${task.difficulty}|${p.subtype ?? ''}|${p.key ?? ''}|${task.id}`;
}

function pickSubtype<T extends string>(options: GenOpts, rng: SeededRng, allowed: readonly T[]): T {
  return (options.subtype as T | undefined) ?? pickOne(rng, allowed);
}

function extraEnglishDistractors(correct: string, already: string[], pool: string[]): string[] {
  const extra: string[] = [];
  for (const item of pool) {
    if (item === correct || already.includes(item) || extra.includes(item)) continue;
    extra.push(item);
  }
  return extra;
}

function ruGrammarPoint(point: string): string {
  const map: Record<string, string> = {
    'Past Simple': 'Past Simple — прошедшее время (yesterday, last summer)',
    'Present Simple': 'Present Simple — обычное действие (every day, every morning)',
    'Present Continuous': 'Present Continuous — действие сейчас (now, Look!)',
    will: 'will — будущее решение или обещание',
    'going to': 'going to / Present Continuous — запланированное будущее',
    superlative: 'превосходная степень (the …est / the most)',
    pronoun: 'местоимение в нужном падеже (them, not they)',
    no: 'no = not any (There are no sharks)',
    some: 'some — в утверждениях',
    any: 'any — в отрицаниях и вопросах',
    be: 'глагол be (am / is / are)',
    'be past': 'was / were — прошедшее be',
    'have got': 'have got / has got — «есть, имеется»',
    can: 'can — умение',
    'can negative': 'can’t — отрицание умения',
  };
  return map[point] ?? point;
}

function clozePassage(cloze: GrammarCloze, gaps: GrammarGap[]): string {
  const used = new Set(gaps.map((g) => g.label));
  let text = cloze.text;
  for (const gap of cloze.gaps) {
    if (used.has(gap.label)) continue;
    text = text.replace(`${gap.label}_____`, gap.options[gap.correct - 1]!);
  }
  return text;
}

function buildVprChoiceMatching(
  questions: Array<{ label: string; prompt: string; options: readonly string[]; correct: 1 | 2 | 3 }>,
): {
  matchingLeft: string[];
  matchingRight: string[];
  matchingRowOptions: string[][];
  correctAnswer: string[];
} {
  const matchingLeft = questions.map((q) => `${q.label}. ${q.prompt}`);
  const matchingRowOptions = questions.map((q) => [...q.options]);
  return {
    matchingLeft,
    matchingRight: matchingRowOptions[0] ?? [],
    matchingRowOptions,
    correctAnswer: questions.map((q, index) => `${matchingLeft[index]}|${q.options[q.correct - 1]!}`),
  };
}

function buildListeningMatchingTask(
  code: EnglishSkillCode,
  dialogue: ListeningDialogue,
  subtype: string,
  level: Level,
  seed: number,
  vprHost?: string,
): Task {
  const m = meta(code);
  const match = buildVprChoiceMatching(dialogue.questions);
  return baseTask({
    id: taskId(code, level, seed, 0),
    ...m,
    topicId: m.topicId,
    skillId: m.skillId,
    generatorId: m.generatorId,
    difficulty: level,
    taskType: 'audio',
    question: 'Listen to the dialogue twice. For each sentence, choose the correct answer.',
    transcript: dialogue.transcript,
    listenLimit: 2,
    ...match,
    explanation: `Ответы следуют из диалога «${dialogue.title}». Прослушай ключевые факты ещё раз.`,
    vprTaskType: vprHost,
    generatorParams: { subtype, key: dialogue.id, dialogueId: dialogue.id },
  });
}

function buildReadingMatchingTask(
  code: EnglishSkillCode,
  passage: ReadingPassage,
  questions: ReadingQuestion[],
  subtype: string,
  level: Level,
  seed: number,
  vprHost?: string,
): Task {
  const m = meta(code);
  const match = buildVprChoiceMatching(questions);
  return baseTask({
    id: taskId(code, level, seed, 0),
    ...m,
    topicId: m.topicId,
    skillId: m.skillId,
    generatorId: m.generatorId,
    difficulty: level,
    taskType: 'matching',
    question: 'Read the text. For each sentence, choose the correct answer.',
    passage: passage.text,
    ...match,
    explanation: `Опирайся на текст «${passage.title}»: найди предложение с нужным фактом.`,
    vprTaskType: vprHost,
    generatorParams: { subtype, key: passage.id, passageId: passage.id },
  });
}

function buildGrammarMatchingTask(
  code: EnglishSkillCode,
  clozeId: string,
  gaps: GrammarGap[],
  subtype: string,
  level: Level,
  seed: number,
  vprHost?: string,
): Task {
  const cloze = GRAMMAR_CLOZE.find((c) => c.id === clozeId)!;
  const selected = gaps.length >= 3 ? gaps : cloze.gaps;
  const m = meta(code);
  const matchingLeft = selected.map((g) => `${g.label}.`);
  const matchingRowOptions = selected.map((g) => [...g.options]);
  const correctAnswer = selected.map((g) => `${g.label}.|${g.options[g.correct - 1]!}`);
  return baseTask({
    id: taskId(code, level, seed, 0),
    ...m,
    topicId: m.topicId,
    skillId: m.skillId,
    generatorId: m.generatorId,
    difficulty: level,
    taskType: 'matching',
    question: 'Choose the correct grammar form for each gap.',
    passage: clozePassage(cloze, selected),
    matchingLeft,
    matchingRight: matchingRowOptions[0] ?? [],
    matchingRowOptions,
    correctAnswer,
    explanation: selected
      .map((g) => `${g.label}: «${g.options[g.correct - 1]}». ${ruGrammarPoint(g.grammarPoint)}.`)
      .join(' '),
    vprTaskType: vprHost,
    generatorParams: { subtype, key: clozeId, clozeId },
  });
}

// ─── E01 ───────────────────────────────────────────────────────────────────
export const E01_SKILL_ID = 'english.listening.specific' as const;
export const E01_GENERATOR_ID = 'gen.english.e01' as const;
export type E01Subtype = 'dialogue_fact' | 'time_place' | 'plans';

export function generateE01Task(options: GenOpts): Task {
  rejectAdvancedLevels('E01', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: E01Subtype[] = ['dialogue_fact', 'time_place', 'plans'];
  const subtype = pickSubtype(options, rng, subtypes);
  const dialogue = pickOne(rng, LISTENING_DIALOGUES);
  return buildListeningMatchingTask('E01', dialogue, subtype, level, options.seed, 'VPR-1');
}

export function generateE01Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE01Task({ difficulty, seed: seed + index }), fingerprint, 'E01');
}

// ─── E02 ───────────────────────────────────────────────────────────────────
export const E02_SKILL_ID = 'english.listening.distractors' as const;
export const E02_GENERATOR_ID = 'gen.english.e02' as const;
export type E02Subtype = 'distractor_near' | 'number_name';

export function generateE02Task(options: GenOpts): Task {
  rejectAdvancedLevels('E02', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['distractor_near', 'number_name'] as const);
  const dialogue = pickOne(rng, LISTENING_DIALOGUES);
  const q = pickOne(rng, dialogue.questions);
  const correct = q.options[q.correct - 1]!;
  const distractors = q.options.filter((o) => o !== correct);
  const extra = extraEnglishDistractors(
    correct,
    distractors,
    dialogue.questions.flatMap((item) => item.options),
  );
  const wrong = uniqueDistractorsFromModels(correct, [...distractors, ...extra], rng);
  if (subtype === 'number_name') {
    return baseTask({
      ...meta('E02'),
      id: taskId('E02', level, options.seed, 0),
      topicId: E02_SKILL_ID,
      skillId: E02_SKILL_ID,
      generatorId: E02_GENERATOR_ID,
      difficulty: level,
      taskType: 'audio',
      question: `Listen and choose the correct fact: ${q.prompt}`,
      transcript: dialogue.transcript,
      listenLimit: 2,
      answers: buildChoiceAnswers(correct, wrong, rng),
      correctAnswer: correct,
      explanation: `В диалоге сказано: «${correct}».`,
      generatorParams: { subtype, key: `${dialogue.id}-${q.label}` },
    });
  }
  return baseTask({
    ...meta('E02'),
    id: taskId('E02', level, options.seed, 0),
    topicId: E02_SKILL_ID,
    skillId: E02_SKILL_ID,
    generatorId: E02_GENERATOR_ID,
    difficulty: level,
    taskType: 'audio',
    question: `Listen carefully. Which answer matches the dialogue? ${q.prompt}`,
    transcript: dialogue.transcript,
    listenLimit: 2,
    answers: buildChoiceAnswers(correct, wrong, rng),
    correctAnswer: correct,
    explanation: `Не путай похожие слова из записи. Верно: «${correct}».`,
    generatorParams: { subtype: 'distractor_near', key: `${dialogue.id}-${q.label}` },
  });
}

export function generateE02Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE02Task({ difficulty, seed: seed + index }), fingerprint, 'E02');
}

// ─── E03 ───────────────────────────────────────────────────────────────────
export const E03_SKILL_ID = 'english.listening.gist' as const;
export const E03_GENERATOR_ID = 'gen.english.e03' as const;

export function generateE03Task(options: GenOpts): Task {
  rejectAdvancedLevels('E03', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['topic', 'mood'] as const);
  const dialogue = pickOne(rng, LISTENING_DIALOGUES);
  const topicOptions =
    subtype === 'topic'
      ? ([dialogue.title, 'A maths lesson', 'A hospital visit', 'A football match'] as const)
      : (['Friendly and calm', 'Angry and loud', 'Sad and silent', 'Bored and quiet'] as const);
  const correct = topicOptions[0];
  const distractors = uniqueDistractorsFromModels(correct, [...topicOptions], rng);
  return baseTask({
    ...meta('E03'),
    id: taskId('E03', level, options.seed, 0),
    topicId: E03_SKILL_ID,
    skillId: E03_SKILL_ID,
    generatorId: E03_GENERATOR_ID,
    difficulty: level,
    taskType: 'audio',
    question: subtype === 'topic' ? 'What is the dialogue mainly about?' : 'How do the speakers feel?',
    transcript: dialogue.transcript,
    listenLimit: 2,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Главная мысль записи: ${correct}.`,
    generatorParams: { subtype, key: dialogue.id },
  });
}

export function generateE03Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE03Task({ difficulty, seed: seed + index }), fingerprint, 'E03');
}

// ─── E04 ───────────────────────────────────────────────────────────────────
export const E04_SKILL_ID = 'english.reading.specific' as const;
export const E04_GENERATOR_ID = 'gen.english.e04' as const;

export function generateE04Task(options: GenOpts): Task {
  rejectAdvancedLevels('E04', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['who_what_where', 'event'] as const);
  const passage = pickOne(rng, READING_PASSAGES);
  return buildReadingMatchingTask('E04', passage, [...passage.questions], subtype, level, options.seed, 'VPR-2');
}

export function generateE04Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE04Task({ difficulty, seed: seed + index }), fingerprint, 'E04');
}

// ─── E05 ───────────────────────────────────────────────────────────────────
export const E05_SKILL_ID = 'english.reading.true_statement' as const;
export const E05_GENERATOR_ID = 'gen.english.e05' as const;

export function generateE05Task(options: GenOpts): Task {
  rejectAdvancedLevels('E05', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['choose_true', 'reject_false'] as const);
  const passage = pickOne(rng, READING_PASSAGES);
  const trueQ = passage.questions.find((q) => q.kind === 'true_statement')!;
  const correct = trueQ.options[trueQ.correct - 1]!;
  const extraTrue = extraEnglishDistractors(
    correct,
    trueQ.options.filter((o) => o !== correct),
    passage.questions.flatMap((q) => q.options),
  );
  const trueWrong = uniqueDistractorsFromModels(correct, [...trueQ.options.filter((o) => o !== correct), ...extraTrue], rng);
  if (subtype === 'choose_true') {
    return baseTask({
      ...meta('E05'),
      id: taskId('E05', level, options.seed, 0),
      topicId: E05_SKILL_ID,
      skillId: E05_SKILL_ID,
      generatorId: E05_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Read the text and choose the true sentence.`,
      passage: passage.text,
      answers: buildChoiceAnswers(correct, trueWrong, rng),
      correctAnswer: correct,
      explanation: `Это предложение совпадает с текстом.`,
      vprTaskType: 'VPR-2',
      generatorParams: { subtype, key: passage.id },
    });
  }
  const falseOption = trueQ.options.find((_, i) => i + 1 !== trueQ.correct)!;
  const extraFalse = extraEnglishDistractors(
    falseOption,
    trueQ.options.filter((o) => o !== falseOption),
    passage.questions.flatMap((q) => q.options),
  );
  return baseTask({
    ...meta('E05'),
    id: taskId('E05', level, options.seed, 0),
    topicId: E05_SKILL_ID,
    skillId: E05_SKILL_ID,
    generatorId: E05_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Which sentence is NOT true according to the text?`,
    passage: passage.text,
    answers: buildChoiceAnswers(
      falseOption,
      uniqueDistractorsFromModels(falseOption, [...trueQ.options.filter((o) => o !== falseOption), ...extraFalse], rng),
      rng,
    ),
    correctAnswer: falseOption,
    explanation: `Это утверждение тексту противоречит.`,
    generatorParams: { subtype: 'reject_false', key: passage.id },
  });
}

export function generateE05Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE05Task({ difficulty, seed: seed + index }), fingerprint, 'E05');
}

// ─── E06 ───────────────────────────────────────────────────────────────────
export const E06_SKILL_ID = 'english.reading.main_idea' as const;
export const E06_GENERATOR_ID = 'gen.english.e06' as const;

export function generateE06Task(options: GenOpts): Task {
  rejectAdvancedLevels('E06', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['predict_title', 'gist'] as const);
  const passage = pickOne(rng, READING_PASSAGES);
  const mainQ = passage.questions.find((q) => q.kind === 'main_idea')!;
  const correct = mainQ.options[mainQ.correct - 1]!;
  return baseTask({
    ...meta('E06'),
    id: taskId('E06', level, options.seed, 0),
    topicId: E06_SKILL_ID,
    skillId: E06_SKILL_ID,
    generatorId: E06_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: subtype === 'predict_title' ? 'Choose the best title for the text.' : 'What is the main idea?',
    passage: passage.text,
    answers: buildChoiceAnswers(
      correct,
      uniqueDistractorsFromModels(
        correct,
        [...mainQ.options.filter((o) => o !== correct), ...passage.questions.flatMap((q) => q.options)],
        rng,
      ),
      rng,
    ),
    correctAnswer: correct,
    explanation: `Заголовок / главная мысль: ${correct}.`,
    generatorParams: { subtype, key: passage.id },
  });
}

export function generateE06Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE06Task({ difficulty, seed: seed + index }), fingerprint, 'E06');
}

// ─── E07 ───────────────────────────────────────────────────────────────────
export const E07_SKILL_ID = 'english.reading.vocabulary' as const;
export const E07_GENERATOR_ID = 'gen.english.e07' as const;

export function generateE07Task(options: GenOpts): Task {
  rejectAdvancedLevels('E07', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['internationalism', 'context_clue'] as const);
  const passage = pickOne(rng, READING_PASSAGES);
  const vocabQ = passage.questions.find((q) => q.kind === 'vocab_clue')!;
  const correct = vocabQ.options[vocabQ.correct - 1]!;
  return baseTask({
    ...meta('E07'),
    id: taskId('E07', level, options.seed, 0),
    topicId: E07_SKILL_ID,
    skillId: E07_SKILL_ID,
    generatorId: E07_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: subtype === 'internationalism' ? `Guess the meaning (international word): ${vocabQ.prompt}` : vocabQ.prompt,
    passage: passage.text,
    answers: buildChoiceAnswers(
      correct,
      uniqueDistractorsFromModels(
        correct,
        [...vocabQ.options.filter((o) => o !== correct), ...passage.questions.flatMap((q) => q.options)],
        rng,
      ),
      rng,
    ),
    correctAnswer: correct,
    explanation: `По контексту подходит: ${correct}.`,
    generatorParams: { subtype, key: passage.id },
  });
}

export function generateE07Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE07Task({ difficulty, seed: seed + index }), fingerprint, 'E07');
}

// ─── E08 ───────────────────────────────────────────────────────────────────
export const E08_SKILL_ID = 'english.grammar.cloze_text' as const;
export const E08_GENERATOR_ID = 'gen.english.e08' as const;

export function generateE08Task(options: GenOpts): Task {
  rejectAdvancedLevels('E08', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['tense_marker', 'agreement_choice'] as const);
  const cloze = pickOne(rng, GRAMMAR_CLOZE);
  return buildGrammarMatchingTask('E08', cloze.id, [...cloze.gaps], subtype, level, options.seed, 'VPR-3');
}

export function generateE08Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE08Task({ difficulty, seed: seed + index }), fingerprint, 'E08');
}

// ─── E09 ───────────────────────────────────────────────────────────────────
export const E09_SKILL_ID = 'english.grammar.verbs' as const;
export const E09_GENERATOR_ID = 'gen.english.e09' as const;

export function generateE09Task(options: GenOpts): Task {
  rejectAdvancedLevels('E09', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['past_marker', 'every_year', 'now'] as const);
  const marker =
    subtype === 'past_marker' ? 'Past' : subtype === 'every_year' ? 'Present Simple' : 'Continuous';
  const cloze = pickOne(
    rng,
    GRAMMAR_CLOZE.filter((c) => c.gaps.some((g) => g.grammarPoint.includes(marker.split(' ')[0]!))),
  );
  return buildGrammarMatchingTask('E09', cloze.id, [...cloze.gaps], subtype, level, options.seed);
}

export function generateE09Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE09Task({ difficulty, seed: seed + index }), fingerprint, 'E09');
}

// ─── E10 ───────────────────────────────────────────────────────────────────
export const E10_SKILL_ID = 'english.grammar.future' as const;
export const E10_GENERATOR_ID = 'gen.english.e10' as const;

export function generateE10Task(options: GenOpts): Task {
  rejectAdvancedLevels('E10', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['will', 'going_to'] as const);
  const point = subtype === 'will' ? 'will' : 'going to';
  const cloze = pickOne(rng, GRAMMAR_CLOZE.filter((c) => c.gaps.some((g) => g.grammarPoint.toLowerCase().includes(point))));
  return buildGrammarMatchingTask('E10', cloze.id, [...cloze.gaps], subtype, level, options.seed);
}

export function generateE10Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE10Task({ difficulty, seed: seed + index }), fingerprint, 'E10');
}

// ─── E11 ───────────────────────────────────────────────────────────────────
export const E11_SKILL_ID = 'english.grammar.forms' as const;
export const E11_GENERATOR_ID = 'gen.english.e11' as const;

export function generateE11Task(options: GenOpts): Task {
  rejectAdvancedLevels('E11', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['superlative', 'pronoun', 'no_some_any'] as const);
  const point =
    subtype === 'superlative' ? 'superlative' : subtype === 'pronoun' ? 'pronoun' : 'no';
  const cloze = pickOne(rng, GRAMMAR_CLOZE.filter((c) => c.gaps.some((g) => g.grammarPoint.toLowerCase().includes(point))));
  return buildGrammarMatchingTask('E11', cloze.id, [...cloze.gaps], subtype, level, options.seed);
}

export function generateE11Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE11Task({ difficulty, seed: seed + index }), fingerprint, 'E11');
}

// ─── E12 / E13 lexis ───────────────────────────────────────────────────────
function generateLexisTask(code: 'E12' | 'E13', pool: typeof LEXIS_E12, fieldFilter: string | null, options: GenOpts): Task {
  rejectAdvancedLevels(code, options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const items = fieldFilter ? pool.filter((i) => i.field === fieldFilter) : pool;
  const item = pickOne(rng, items.length ? items : pool);
  const skillId = code === 'E12' ? 'english.lexis.life' : 'english.lexis.world';
  const m = meta(code);
  return baseTask({
    ...m,
    id: taskId(code, level, options.seed, 0),
    topicId: skillId,
    skillId,
    generatorId: `gen.english.${code.toLowerCase()}`,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Choose the correct English word: ${item.translation}`,
    answers: buildChoiceAnswers(item.word, item.distractors, rng),
    correctAnswer: item.word,
    explanation: `${item.translation} по-английски: ${item.word}.`,
    generatorParams: { subtype: item.field, key: item.word },
  });
}

export function generateE12Task(options: GenOpts): Task {
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['family', 'school', 'food', 'routine'] as const);
  return generateLexisTask('E12', LEXIS_E12, subtype, options);
}

export function generateE12Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE12Task({ difficulty, seed: seed + index }), fingerprint, 'E12');
}

export function generateE13Task(options: GenOpts): Task {
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['sport', 'pet', 'city_village', 'weather'] as const);
  return generateLexisTask('E13', LEXIS_E13, subtype, options);
}

export function generateE13Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE13Task({ difficulty, seed: seed + index }), fingerprint, 'E13');
}

// ─── E14–E16 writing ───────────────────────────────────────────────────────
function pickProfileField(profile: (typeof FORM_PROFILES)[number], rng: SeededRng): FormField {
  return pickOne(rng, profile.fields);
}

export function generateE14Task(options: GenOpts): Task {
  rejectAdvancedLevels('E14', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['name', 'age', 'country', 'city', 'hobby'] as const);
  const profile = pickOne(rng, FORM_PROFILES);
  const field = profile.fields.find((f) => f.key === subtype) ?? pickProfileField(profile, rng);
  return baseTask({
    ...meta('E14'),
    id: taskId('E14', level, options.seed, 0),
    topicId: 'english.writing.form_fill',
    skillId: 'english.writing.form_fill',
    generatorId: 'gen.english.e14',
    difficulty: level,
    taskType: 'shortAnswer',
    question: `Read the text and write ONE word for the field "${field.label}" (no articles).`,
    passage: profile.text,
    correctAnswer: field.answer,
    acceptableAnswers: field.acceptableAnswers,
    explanation: `В анкете поле «${field.label}»: ${field.answer}.`,
    vprTaskType: 'VPR-4',
    generatorParams: { subtype: field.key, key: profile.id },
  });
}

export function generateE14Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE14Task({ difficulty, seed: seed + index }), fingerprint, 'E14');
}

export function generateE15Task(options: GenOpts): Task {
  rejectAdvancedLevels('E15', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['age_words', 'subject_spell', 'food'] as const);
  const profile = pickOne(rng, FORM_PROFILES);
  const field =
    subtype === 'age_words'
      ? profile.fields.find((f) => f.key === 'age')!
      : subtype === 'subject_spell'
        ? profile.fields.find((f) => f.key === 'subject') ?? profile.fields[0]!
        : profile.fields.find((f) => f.key === 'food' || f.key === 'drink') ?? profile.fields[0]!;
  return baseTask({
    ...meta('E15'),
    id: taskId('E15', level, options.seed, 0),
    topicId: 'english.writing.spelling',
    skillId: 'english.writing.spelling',
    generatorId: 'gen.english.e15',
    difficulty: level,
    taskType: 'shortAnswer',
    question: `Write the answer as a word (check spelling). Field: ${field.label}.`,
    passage: profile.text,
    correctAnswer: field.answer,
    acceptableAnswers: field.acceptableAnswers,
    explanation: `Правильное написание: ${field.answer}.`,
    generatorParams: { subtype, key: `${profile.id}-${field.key}` },
  });
}

export function generateE15Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE15Task({ difficulty, seed: seed + index }), fingerprint, 'E15');
}

export function generateE16Task(options: GenOpts): Task {
  rejectAdvancedLevels('E16', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['map_text_to_field', 'missing_slot'] as const);
  const profile = pickOne(rng, FORM_PROFILES);
  const fields = profile.fields.slice(0, Math.min(5, profile.fields.length));
  const left = fields.map((f) => f.label);
  const right = shuffleSeeded(fields.map((f) => f.answer), rng);
  const correctAnswer = fields.map((f) => `${f.label}|${f.answer}`);
  if (subtype === 'missing_slot') {
    const missing = pickOne(rng, fields);
    return baseTask({
      ...meta('E16'),
      id: taskId('E16', level, options.seed, 0),
      topicId: 'english.writing.completeness',
      skillId: 'english.writing.completeness',
      generatorId: 'gen.english.e16',
      difficulty: level,
      taskType: 'singleChoice',
      question: `Which field is missing from the form if only these are filled: ${fields.filter((f) => f.key !== missing.key).map((f) => f.label).join(', ')}?`,
      passage: profile.text,
      answers: buildChoiceAnswers(missing.label, fields.filter((f) => f.key !== missing.key).map((f) => f.label), rng),
      correctAnswer: missing.label,
      explanation: `В анкете не хватает поля «${missing.label}».`,
      generatorParams: { subtype, key: profile.id },
    });
  }
  return baseTask({
    ...meta('E16'),
    id: taskId('E16', level, options.seed, 0),
    topicId: 'english.writing.completeness',
    skillId: 'english.writing.completeness',
    generatorId: 'gen.english.e16',
    difficulty: level,
    taskType: 'matching',
    question: `Match each form field to the correct value from the text.`,
    passage: profile.text,
    matchingLeft: left,
    matchingRight: right,
    correctAnswer,
    explanation: 'Все поля анкеты нужно заполнить по тексту — так проверяют полноту ответа.',
    generatorParams: { subtype, key: profile.id },
  });
}

export function generateE16Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE16Task({ difficulty, seed: seed + index }), fingerprint, 'E16');
}

// ─── E17 ───────────────────────────────────────────────────────────────────
export const E17_SKILL_ID = 'english.grammar.core' as const;
export const E17_GENERATOR_ID = 'gen.english.e17' as const;

export function generateE17Task(options: GenOpts): Task {
  rejectAdvancedLevels('E17', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, ['be', 'have_got', 'can', 'do_does'] as const);
  const templates: Record<string, { q: string; correct: string; wrong: string[] }> = {
    be: { q: 'She ___ my friend.', correct: 'is', wrong: ['are', 'am', 'be'] },
    have_got: { q: 'They ___ a big garden.', correct: 'have got', wrong: ['has got', 'have', 'had'] },
    can: { q: 'I ___ swim very well.', correct: 'can', wrong: ['must', 'am', 'do'] },
    do_does: { q: '___ he play tennis?', correct: 'Does', wrong: ['Do', 'Is', 'Can'] },
  };
  const t = templates[subtype]!;
  return baseTask({
    ...meta('E17'),
    id: taskId('E17', level, options.seed, 0),
    topicId: E17_SKILL_ID,
    skillId: E17_SKILL_ID,
    generatorId: E17_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Choose the correct form: ${t.q}`,
    answers: buildChoiceAnswers(t.correct, t.wrong, rng),
    correctAnswer: t.correct,
    explanation: `Нужная форма: ${t.correct}.`,
    generatorParams: { subtype, key: subtype },
  });
}

export function generateE17Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE17Task({ difficulty, seed: seed + index }), fingerprint, 'E17');
}

// ─── E18 reasoning ─────────────────────────────────────────────────────────
export const E18_SKILL_ID = 'english.reasoning.evidence' as const;
export const E18_GENERATOR_ID = 'gen.english.e18' as const;
export const REASONING_SUBTYPES = ['locate_line', 'eliminate', 'next_step', 'rule_from_marker'] as const;

export function generateE18Task(options: GenOpts): Task {
  rejectAdvancedLevels('E18', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtype = pickSubtype(options, rng, REASONING_SUBTYPES);
  if (subtype === 'rule_from_marker') {
    const scenario = pickOne(rng, REASONING_SCENARIOS);
    return baseTask({
      ...meta('E18'),
      id: taskId('E18', level, options.seed, 0),
      topicId: 'english.reasoning.strategy',
      skillId: E18_SKILL_ID,
      generatorId: E18_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Which grammar rule fits the marker "${scenario.marker}"?`,
      answers: buildChoiceAnswers(scenario.rule, ['Past Perfect', 'Passive Voice', 'Conditionals'], rng),
      correctAnswer: scenario.rule,
      explanation: scenario.evidence,
      generatorParams: { subtype, reasoningMode: subtype, key: scenario.id },
    });
  }
  if (subtype === 'eliminate') {
    const passage = pickOne(rng, READING_PASSAGES);
    const q = passage.questions[0]!;
    const wrong = q.options.filter((_, i) => i + 1 !== q.correct);
    const eliminate = pickOne(rng, wrong);
    return baseTask({
      ...meta('E18'),
      id: taskId('E18', level, options.seed, 0),
      topicId: 'english.reasoning.strategy',
      skillId: E18_SKILL_ID,
      generatorId: E18_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Read and eliminate the distractor for: ${q.prompt}`,
      passage: passage.text,
      answers: buildChoiceAnswers(
        eliminate,
        uniqueDistractorsFromModels(eliminate, [...q.options.filter((o) => o !== eliminate), ...passage.questions.flatMap((item) => item.options)], rng),
        rng,
      ),
      correctAnswer: eliminate,
      explanation: 'Этот вариант тексту не соответствует.',
      generatorParams: { subtype, reasoningMode: subtype, key: passage.id },
    });
  }
  if (subtype === 'next_step') {
    return baseTask({
      ...meta('E18'),
      id: taskId('E18', level, options.seed, 0),
      topicId: 'english.reasoning.strategy',
      skillId: E18_SKILL_ID,
      generatorId: E18_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: 'Choose the best order of steps to answer a reading task.',
      items: ['Read the question', 'Find evidence in the text', 'Compare options', 'Choose the answer'],
      correctAnswer: ['Read the question', 'Find evidence in the text', 'Compare options', 'Choose the answer'],
      explanation: 'Сначала вопрос, потом доказательство в тексте, сравнение вариантов и ответ.',
      generatorParams: { subtype, reasoningMode: subtype, key: 'steps' },
    });
  }
  const dialogue = pickOne(rng, LISTENING_DIALOGUES);
  const q = dialogue.questions[0]!;
  const correct = q.options[q.correct - 1]!;
  return baseTask({
    ...meta('E18'),
    id: taskId('E18', level, options.seed, 0),
    topicId: 'english.reasoning.strategy',
    skillId: E18_SKILL_ID,
    generatorId: E18_GENERATOR_ID,
    difficulty: level,
    taskType: 'audio',
    question: `Listen and locate evidence for: ${q.prompt}`,
    transcript: dialogue.transcript,
    listenLimit: 2,
    answers: buildChoiceAnswers(
      correct,
      uniqueDistractorsFromModels(
        correct,
        [...q.options.filter((o) => o !== correct), ...dialogue.questions.flatMap((item) => item.options)],
        rng,
      ),
      rng,
    ),
    correctAnswer: correct,
    explanation: `В записи сказано: «${correct}».`,
    generatorParams: { subtype: 'locate_line', reasoningMode: 'locate_line', key: dialogue.id },
  });
}

export function generateE18Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateE18Task({ difficulty, seed: seed + index }), fingerprint, 'E18');
}

// ─── Registry ──────────────────────────────────────────────────────────────
export const ENGLISH_GENERATORS: Record<EnglishSkillCode, (opts: GenOpts) => Task> = {
  E01: generateE01Task,
  E02: generateE02Task,
  E03: generateE03Task,
  E04: generateE04Task,
  E05: generateE05Task,
  E06: generateE06Task,
  E07: generateE07Task,
  E08: generateE08Task,
  E09: generateE09Task,
  E10: generateE10Task,
  E11: generateE11Task,
  E12: generateE12Task,
  E13: generateE13Task,
  E14: generateE14Task,
  E15: generateE15Task,
  E16: generateE16Task,
  E17: generateE17Task,
  E18: generateE18Task,
};

export function generateEnglishTask(code: EnglishSkillCode, options: GenOpts): Task {
  const gen = ENGLISH_GENERATORS[code];
  if (!gen) throw new Error(`No generator for ${code}`);
  return gen(options);
}

export function fingerprintEnglishTask(task: Task): string {
  return fingerprint(task);
}
