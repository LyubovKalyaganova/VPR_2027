/**
 * Генераторы R01–R25 для русского языка (ВПР-2027, 4 класс).
 */
import type { Difficulty, Task } from '../../../types';
import type { RussianSkillCode } from '../../../data/taxonomy/russian';
import { getRussianSkillByCode } from '../../../data/taxonomy/russian';
import {
  R01_PAIRS,
  R02_NOUN_ENDINGS,
  R03_ADJ_ENDINGS,
  R04_VERB_SPELLING,
  R05_PUNCTUATION,
  R06_PROOFREADING,
  R07_DICTATION,
  R08_STRESS,
  R09_PHONETICS,
  R10_SYNTAX_BASE,
  R11_HOMOGENEOUS,
  R12_PARTS_OF_SPEECH,
  R13_NOUN,
  R14_ADJECTIVE,
  R15_MORPHEMES,
  R16_CONTEXT,
  R17_SYNONYMS,
  R18_TEXTS,
  R19_PLANS,
  R20_QUESTIONS,
  R21_SPEECH,
  R22_IDIOMS,
  R23_REASONING,
  R24_SENTENCE_TYPE,
  R25_VERB,
} from './contentBanks';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  svgToDataUri,
  uniqueDistractorsFromModels,
  type Level,
} from './generatorScaffold';

type GenOpts = { difficulty: Difficulty; seed: number; subtype?: string };

function meta(code: RussianSkillCode) {
  const skill = getRussianSkillByCode(code);
  return {
    code,
    skillId: skill.id,
    topicId: skill.topicId,
    section: skill.sectionId.split('.').slice(1).join(' / ') || 'Русский язык',
    topic: skill.title.split(':')[0]?.trim() ?? skill.title,
    skill: skill.title,
    generatorId: `gen.russian.${code.toLowerCase()}`,
  };
}

function taskId(code: RussianSkillCode, difficulty: Level, seed: number, index: number): string {
  return `${code.toLowerCase()}-L${difficulty}-s${seed}-i${index}`;
}

function fingerprint(task: Task): string {
  const p = task.generatorParams ?? {};
  return `${task.skillId}|${task.difficulty}|${p.subtype ?? ''}|${p.key ?? ''}|${task.id}`;
}

// ─── R01 ───────────────────────────────────────────────────────────────────
export const R01_SKILL_ID = 'russian.orthography.base' as const;
export const R01_TOPIC_ID = 'russian.orthography.spelling' as const;
export const R01_GENERATOR_ID = 'gen.russian.r01' as const;
export type R01Subtype = 'check_vowel' | 'unpaired' | 'silent' | 'soft_hard' | 'capital';

export function generateR01Task(options: GenOpts): Task {
  const m = meta('R01');
  rejectAdvancedLevels('R01', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const pair = R01_PAIRS[options.seed % R01_PAIRS.length]!;
  const ruleSubtype =
    pair.rule.includes('ударн') || pair.rule.includes('гласн')
      ? 'check_vowel'
      : pair.rule.includes('парн')
        ? 'unpaired'
        : pair.rule.includes('непроизнос')
          ? 'silent'
          : pair.rule.includes('ь') || pair.rule.includes('ъ')
            ? 'soft_hard'
            : pair.rule.includes('заглав')
              ? 'capital'
              : pair.rule.includes('н / нн') || pair.rule.includes('приставка')
                ? 'other_base'
                : 'other_base';
  const subtype = (options.subtype as R01Subtype | undefined) ?? ruleSubtype;
  const wrongForms = uniqueDistractorsFromModels(pair.correct, pair.distractors, rng);
  const question =
    subtype === 'capital'
      ? `Как правильно написать имя города: «___»?`
      : `Выбери правильное написание слова:`;
  const answers = buildChoiceAnswers(pair.correct, wrongForms, rng);
  return baseTask({
    id: taskId('R01', level, options.seed, 0),
    ...m,
    topicId: R01_TOPIC_ID,
    skillId: R01_SKILL_ID,
    generatorId: R01_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question,
    answers,
    correctAnswer: pair.correct,
    explanation: `${pair.rule}. ${pair.hint}`,
    generatorParams: { subtype, key: `${pair.correct}-${options.seed}`, rule: pair.rule },
  });
}

export function generateR01Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR01Task({ difficulty, seed: seed + index }), fingerprint, 'R01');
}

// ─── R02 ───────────────────────────────────────────────────────────────────
export const R02_SKILL_ID = 'russian.orthography.noun_endings' as const;
export const R02_TOPIC_ID = 'russian.orthography.spelling' as const;
export const R02_GENERATOR_ID = 'gen.russian.r02' as const;

export function generateR02Task(options: GenOpts): Task {
  const m = meta('R02');
  rejectAdvancedLevels('R02', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R02_NOUN_ENDINGS);
  const correct = item.stem + item.correct;
  const distractors = uniqueDistractorsFromModels(
    correct,
    item.endings.filter((e) => e !== item.correct).map((e) => item.stem + e),
    rng,
  );
  return baseTask({
    id: taskId('R02', level, options.seed, 0),
    ...m,
    topicId: R02_TOPIC_ID,
    skillId: R02_SKILL_ID,
    generatorId: R02_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери правильное окончание: ${item.context.replace('___', '___')}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.rule,
    generatorParams: { subtype: 'noun_ending', key: item.stem, ending: item.correct },
  });
}

export function generateR02Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR02Task({ difficulty, seed: seed + index }), fingerprint, 'R02');
}

// ─── R03 ───────────────────────────────────────────────────────────────────
export const R03_SKILL_ID = 'russian.orthography.adj_endings' as const;
export const R03_TOPIC_ID = 'russian.orthography.spelling' as const;
export const R03_GENERATOR_ID = 'gen.russian.r03' as const;

export function generateR03Task(options: GenOpts): Task {
  const m = meta('R03');
  rejectAdvancedLevels('R03', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R03_ADJ_ENDINGS);
  const correct = item.stem + item.correct;
  const distractors = uniqueDistractorsFromModels(
    correct,
    item.endings.filter((e) => e !== item.correct).map((e) => item.stem + e),
    rng,
  );
  return baseTask({
    id: taskId('R03', level, options.seed, 0),
    ...m,
    topicId: R03_TOPIC_ID,
    skillId: R03_SKILL_ID,
    generatorId: R03_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери окончание прилагательного (${item.noun}, ${item.gender}): ${item.context}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Прилагательное согласуется с существительным в роде, числе и падеже.`,
    generatorParams: { subtype: 'adj_ending', key: item.stem },
  });
}

export function generateR03Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR03Task({ difficulty, seed: seed + index }), fingerprint, 'R03');
}

// ─── R04 ───────────────────────────────────────────────────────────────────
export const R04_SKILL_ID = 'russian.orthography.verb_spelling' as const;
export const R04_TOPIC_ID = 'russian.orthography.spelling' as const;
export const R04_GENERATOR_ID = 'gen.russian.r04' as const;

export function generateR04Task(options: GenOpts): Task {
  const m = meta('R04');
  rejectAdvancedLevels('R04', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R04_VERB_SPELLING);
  const subtype = item.type === 'tся' || item.type === 'ться' ? item.type : 'personal_ending';
  const distractors = uniqueDistractorsFromModels(item.correct, item.distractors, rng);
  return baseTask({
    id: taskId('R04', level, options.seed, 0),
    ...m,
    topicId: R04_TOPIC_ID,
    skillId: R04_SKILL_ID,
    generatorId: R04_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Вставь правильную форму: ${item.sentence}`,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: item.explanation,
    generatorParams: { subtype, key: item.sentence },
  });
}

export function generateR04Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR04Task({ difficulty, seed: seed + index }), fingerprint, 'R04');
}

// ─── R05 ───────────────────────────────────────────────────────────────────
export const R05_SKILL_ID = 'russian.punctuation.homogeneous' as const;
export const R05_TOPIC_ID = 'russian.punctuation.homogeneous' as const;
export const R05_GENERATOR_ID = 'gen.russian.r05' as const;

export function generateR05Task(options: GenOpts): Task {
  const m = meta('R05');
  rejectAdvancedLevels('R05', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R05_PUNCTUATION);
  const marks = ['.', ',', '!', '?'];
  const distractors = uniqueDistractorsFromModels(item.correct, marks.filter((x) => x !== item.correct), rng);
  return baseTask({
    id: taskId('R05', level, options.seed, 0),
    ...m,
    topicId: R05_TOPIC_ID,
    skillId: R05_SKILL_ID,
    generatorId: R05_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какой знак препинания нужен в конце предложения?\n«${item.sentence}___»`,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: item.rule,
    generatorParams: { subtype: 'homogeneous_punct', key: item.sentence },
  });
}

export function generateR05Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR05Task({ difficulty, seed: seed + index }), fingerprint, 'R05');
}

// ─── R06 ───────────────────────────────────────────────────────────────────
export const R06_SKILL_ID = 'russian.orthography.proofreading' as const;
export const R06_TOPIC_ID = 'russian.orthography.spelling' as const;
export const R06_GENERATOR_ID = 'gen.russian.r06' as const;

export function generateR06Task(options: GenOpts): Task {
  const m = meta('R06');
  rejectAdvancedLevels('R06', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R06_PROOFREADING);
  const subtype = level === 3 && item.error !== item.fix ? 'find_error_rule' : item.error === item.fix ? 'no_error' : 'find_fix';
  const options_list =
    item.error === item.fix
      ? ['Ошибки нет', item.error, item.error + 'а', item.error.replace(/.$/, 'о')]
      : [item.fix, item.error, item.error + 'а', item.error.replace(/./, 'о')];
  const correct = item.error === item.fix ? 'Ошибки нет' : item.fix;
  const distractors = uniqueDistractorsFromModels(correct, options_list, rng);
  return baseTask({
    id: taskId('R06', level, options.seed, 0),
    ...m,
    topicId: R06_TOPIC_ID,
    skillId: R06_SKILL_ID,
    generatorId: R06_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Найди ошибку и выбери исправление:\n«${item.text}»`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: item.rule,
    generatorParams: { subtype, key: item.text },
  });
}

export function generateR06Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR06Task({ difficulty, seed: seed + index }), fingerprint, 'R06');
}

// ─── R07 ───────────────────────────────────────────────────────────────────
export const R07_SKILL_ID = 'russian.orthography.dictation_prep' as const;
export const R07_TOPIC_ID = 'russian.orthography.spelling' as const;
export const R07_GENERATOR_ID = 'gen.russian.r07' as const;

export function generateR07Task(options: GenOpts): Task {
  const m = meta('R07');
  rejectAdvancedLevels('R07', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = R07_DICTATION[options.seed % R07_DICTATION.length]!;
  const distractors = uniqueDistractorsFromModels(item.word, item.distractors, rng);
  const subtypes = ['hear_choose', 'find_orthogram', 'self_check'] as const;
  const subtype = (options.subtype as (typeof subtypes)[number] | undefined) ?? pickOne(rng, subtypes);
  const questionBySubtype =
    subtype === 'find_orthogram'
      ? 'Прослушай слово. В каком варианте верно выделена орфограмма?'
      : subtype === 'self_check'
        ? 'Прослушай слово и проверь: какое написание верное?'
        : 'Прослушай слово и выбери правильное написание:';
  return baseTask({
    id: taskId('R07', level, options.seed, 0),
    ...m,
    topicId: R07_TOPIC_ID,
    skillId: R07_SKILL_ID,
    generatorId: R07_GENERATOR_ID,
    difficulty: level,
    taskType: 'audio',
    question: questionBySubtype,
    answers: buildChoiceAnswers(item.word, distractors, rng),
    correctAnswer: item.word,
    explanation: `Правильное написание: «${item.word}». Цифровая подготовка к диктанту, не замена рукописного бланка ВПР.`,
    transcript: item.transcript,
    generatorParams: { subtype, key: `${item.word}-${options.seed}`, spokenWord: item.word },
  });
}

export function generateR07Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR07Task({ difficulty, seed: seed + index }), fingerprint, 'R07');
}

// ─── R08 ───────────────────────────────────────────────────────────────────
export const R08_SKILL_ID = 'russian.phonetics.stress' as const;
export const R08_TOPIC_ID = 'russian.phonetics.stress' as const;
export const R08_GENERATOR_ID = 'gen.russian.r08' as const;

export function generateR08Task(options: GenOpts): Task {
  const m = meta('R08');
  rejectAdvancedLevels('R08', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R08_STRESS);
  const stressed = item.options[item.stress - 1] ?? item.options[0]!;
  const distractors = uniqueDistractorsFromModels(stressed, item.options.filter((o) => o !== stressed), rng);
  return baseTask({
    id: taskId('R08', level, options.seed, 0),
    ...m,
    topicId: R08_TOPIC_ID,
    skillId: R08_SKILL_ID,
    generatorId: R08_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери вариант с правильным ударением в слове «${item.word}»:`,
    answers: buildChoiceAnswers(stressed, distractors, rng),
    correctAnswer: stressed,
    explanation: `Ударение падает на ${item.stress}-й слог.`,
    generatorParams: { subtype: 'stress', key: item.word },
  });
}

export function generateR08Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR08Task({ difficulty, seed: seed + index }), fingerprint, 'R08');
}

// ─── R09 ───────────────────────────────────────────────────────────────────
export const R09_SKILL_ID = 'russian.phonetics.sound_letter' as const;
export const R09_TOPIC_ID = 'russian.phonetics.sound_letter' as const;
export const R09_GENERATOR_ID = 'gen.russian.r09' as const;

export function generateR09Task(options: GenOpts): Task {
  const m = meta('R09');
  rejectAdvancedLevels('R09', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const askSounds = level !== 3;
  const unequal = R09_PHONETICS.filter((row) => row.sounds !== row.letters);
  const item = pickOne(rng, askSounds && level > 1 ? unequal : R09_PHONETICS);
  const correct = askSounds ? item.sounds : item.syllables;
  return baseTask({
    id: taskId('R09', level, options.seed, 0),
    ...m,
    topicId: R09_TOPIC_ID,
    skillId: R09_SKILL_ID,
    generatorId: R09_GENERATOR_ID,
    difficulty: level,
    taskType: 'numberAnswer',
    question: askSounds
      ? `Сколько звуков в слове «${item.word}»?`
      : `Сколько слогов в слове «${item.word}»?`,
    correctAnswer: correct,
    explanation: askSounds
      ? `В слове «${item.word}» ${item.sounds} звук(ов) и ${item.letters} букв(ы).`
      : `Слогов: ${item.syllables}.`,
    generatorParams: { subtype: askSounds ? 'sound_count' : 'syllable_count', key: item.word },
  });
}

export function generateR09Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR09Task({ difficulty, seed: seed + index }), fingerprint, 'R09');
}

// ─── R10 ───────────────────────────────────────────────────────────────────
export const R10_SKILL_ID = 'russian.syntax.base' as const;
export const R10_TOPIC_ID = 'russian.syntax.base' as const;
export const R10_GENERATOR_ID = 'gen.russian.r10' as const;

export function generateR10Task(options: GenOpts): Task {
  const m = meta('R10');
  rejectAdvancedLevels('R10', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R10_SYNTAX_BASE);
  const askSubject = level !== 2 || rng() > 0.5;
  const correct = askSubject ? item.subject : item.predicate;
  const distractors = uniqueDistractorsFromModels(correct, [item.subject, item.predicate, 'во дворе', 'утром', 'тихо'], rng);
  return baseTask({
    id: taskId('R10', level, options.seed, 0),
    ...m,
    topicId: R10_TOPIC_ID,
    skillId: R10_SKILL_ID,
    generatorId: R10_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: askSubject
      ? `Найди подлежащее: «${item.sentence}»`
      : `Найди сказуемое: «${item.sentence}»`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Подлежащее: ${item.subject}. Сказуемое: ${item.predicate}.`,
    generatorParams: { subtype: askSubject ? 'find_subject' : 'find_predicate', key: item.sentence },
  });
}

export function generateR10Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR10Task({ difficulty, seed: seed + index }), fingerprint, 'R10');
}

// ─── R11 ───────────────────────────────────────────────────────────────────
export const R11_SKILL_ID = 'russian.syntax.homogeneous' as const;
export const R11_TOPIC_ID = 'russian.syntax.base' as const;
export const R11_GENERATOR_ID = 'gen.russian.r11' as const;

export function generateR11Task(options: GenOpts): Task {
  const m = meta('R11');
  rejectAdvancedLevels('R11', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R11_HOMOGENEOUS);
  const member = pickOne(rng, item.members);
  const notMember = member === item.members[0] ? 'во дворе' : item.members[0]!;
  const distractors = uniqueDistractorsFromModels(member, [...item.members.filter((x) => x !== member), notMember, 'вчера', 'тихо'], rng);
  return baseTask({
    id: taskId('R11', level, options.seed, 0),
    ...m,
    topicId: R11_TOPIC_ID,
    skillId: R11_SKILL_ID,
    generatorId: R11_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какое слово является однородным членом?\n«${item.sentence}»`,
    answers: buildChoiceAnswers(member, distractors, rng),
    correctAnswer: member,
    explanation: `Однородные члены: ${item.members.join(', ')}.`,
    generatorParams: { subtype: 'identify_member', key: item.sentence },
  });
}

export function generateR11Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR11Task({ difficulty, seed: seed + index }), fingerprint, 'R11');
}

// ─── R12 ───────────────────────────────────────────────────────────────────
export const R12_SKILL_ID = 'russian.morphology.parts_of_speech' as const;
export const R12_TOPIC_ID = 'russian.morphology.parts_of_speech' as const;
export const R12_GENERATOR_ID = 'gen.russian.r12' as const;

export function generateR12Task(options: GenOpts): Task {
  const m = meta('R12');
  rejectAdvancedLevels('R12', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const pool = level === 1 ? R12_PARTS_OF_SPEECH.filter((x) => !x.extension) : R12_PARTS_OF_SPEECH;
  const item = pickOne(rng, pool.length ? pool : R12_PARTS_OF_SPEECH);
  const parts = ['существительное', 'глагол', 'прилагательное', 'наречие', 'местоимение', 'союз', 'предлог'];
  const distractors = uniqueDistractorsFromModels(item.pos, parts.filter((p) => p !== item.pos), rng);
  return baseTask({
    id: taskId('R12', level, options.seed, 0),
    ...m,
    topicId: R12_TOPIC_ID,
    skillId: R12_SKILL_ID,
    generatorId: R12_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Определи часть речи слова «${item.word}»:`,
    answers: buildChoiceAnswers(item.pos, distractors, rng),
    correctAnswer: item.pos,
    explanation: `«${item.word}» — ${item.pos}.`,
    generatorParams: { subtype: item.extension ? 'extension_pos' : 'core_pos', key: item.word, extension: item.extension },
  });
}

export function generateR12Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR12Task({ difficulty, seed: seed + index }), fingerprint, 'R12');
}

// ─── R13 ───────────────────────────────────────────────────────────────────
export const R13_SKILL_ID = 'russian.morphology.noun' as const;
export const R13_TOPIC_ID = 'russian.morphology.parts_of_speech' as const;
export const R13_GENERATOR_ID = 'gen.russian.r13' as const;

export function generateR13Task(options: GenOpts): Task {
  const m = meta('R13');
  rejectAdvancedLevels('R13', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R13_NOUN);
  const traits = level === 1 ? ['gender'] : level === 2 ? ['gender', 'number'] : ['gender', 'number', 'case'];
  const trait = pickOne(rng, traits);
  const correct = trait === 'gender' ? item.gender : trait === 'number' ? item.number : item.case;
  const pool =
    trait === 'gender'
      ? ['м.р.', 'ж.р.', 'ср.р.', 'общего рода']
      : trait === 'number'
        ? ['ед.ч.', 'мн.ч.', 'только ед.ч.', 'только мн.ч.']
        : ['им.', 'род.', 'дат.', 'вин.', 'тв.', 'пр.'];
  const distractors = uniqueDistractorsFromModels(correct, pool.filter((p) => p !== correct), rng);
  return baseTask({
    id: taskId('R13', level, options.seed, 0),
    ...m,
    topicId: R13_TOPIC_ID,
    skillId: R13_SKILL_ID,
    generatorId: R13_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Определи ${trait === 'gender' ? 'род' : trait === 'number' ? 'число' : 'падеж'} существительного «${item.word}»:`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `${item.word}: ${item.gender}, ${item.number}, ${item.case}, ${item.declension}.`,
    generatorParams: { subtype: `noun_${trait}`, key: item.word },
  });
}

export function generateR13Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR13Task({ difficulty, seed: seed + index }), fingerprint, 'R13');
}

// ─── R14 ───────────────────────────────────────────────────────────────────
export const R14_SKILL_ID = 'russian.morphology.adjective' as const;
export const R14_TOPIC_ID = 'russian.morphology.parts_of_speech' as const;
export const R14_GENERATOR_ID = 'gen.russian.r14' as const;

export function generateR14Task(options: GenOpts): Task {
  const m = meta('R14');
  rejectAdvancedLevels('R14', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R14_ADJECTIVE);
  const correct = level === 1 ? item.gender : `${item.gender}, ${item.number}`;
  const distractors = uniqueDistractorsFromModels(correct, ['м.р.', 'ж.р.', 'ср.р.', 'м.р., ед.ч.', 'ж.р., ед.ч.', 'м.р., мн.ч.'], rng);
  return baseTask({
    id: taskId('R14', level, options.seed, 0),
    ...m,
    topicId: R14_TOPIC_ID,
    skillId: R14_SKILL_ID,
    generatorId: R14_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Определи признаки прилагательного «${item.word}» (согласуется с «${item.agrees}»):`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Прилагательное согласуется с существительным.`,
    generatorParams: { subtype: 'adj_traits', key: item.word },
  });
}

export function generateR14Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR14Task({ difficulty, seed: seed + index }), fingerprint, 'R14');
}

// ─── R15 ───────────────────────────────────────────────────────────────────
export const R15_SKILL_ID = 'russian.morphology.word_structure' as const;
export const R15_TOPIC_ID = 'russian.morphology.word_structure' as const;
export const R15_GENERATOR_ID = 'gen.russian.r15' as const;

function morphemeSvg(schema: string): string {
  const cells = schema.split('|');
  const w = cells.length * 36 + 20;
  const rects = cells
    .map((c, i) => {
      const fill = c === '—' ? '#e8e8e8' : '#dbeafe';
      return `<rect x="${10 + i * 36}" y="20" width="32" height="40" fill="${fill}" stroke="#333"/><text x="${26 + i * 36}" y="48" text-anchor="middle" font-size="16">${c === '—' ? '+' : c}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="80">${rects}</svg>`;
}

export function generateR15Task(options: GenOpts): Task {
  const m = meta('R15');
  rejectAdvancedLevels('R15', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R15_MORPHEMES);
  const subtype = level === 3 ? 'choose_schema' : level === 2 ? 'next_morpheme_step' : 'find_root';
  const correct = subtype === 'find_root' ? item.parts[0]! : item.schema;
  const distractors =
    subtype === 'find_root'
      ? uniqueDistractorsFromModels(correct, item.parts.slice(1).concat(['окон']), rng)
      : uniqueDistractorsFromModels(correct, [item.schema.replace('|', ''), 'к|о|р|е|н|ь', item.schema + '|x'], rng);
  const image = subtype === 'choose_schema' ? svgToDataUri(morphemeSvg(item.schema)) : undefined;
  return baseTask({
    id: taskId('R15', level, options.seed, 0),
    ...m,
    topicId: R15_TOPIC_ID,
    skillId: R15_SKILL_ID,
    generatorId: R15_GENERATOR_ID,
    difficulty: level,
    taskType: subtype === 'choose_schema' ? 'imageTask' : 'singleChoice',
    question:
      subtype === 'find_root'
        ? `Найди корень в слове «${item.word}»:`
        : subtype === 'choose_schema'
          ? `Выбери правильную схему слова «${item.word}»:`
          : `Какой морфемный шаг следующий для «${item.word}»?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Разбор: ${item.parts.join(' + ')}.`,
    image,
    generatorParams: { subtype, key: item.word, schema: item.schema },
  });
}

export function generateR15Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR15Task({ difficulty, seed: seed + index }), fingerprint, 'R15');
}

// ─── R16 ───────────────────────────────────────────────────────────────────
export const R16_SKILL_ID = 'russian.lexis.context_meaning' as const;
export const R16_TOPIC_ID = 'russian.lexis.meaning' as const;
export const R16_GENERATOR_ID = 'gen.russian.r16' as const;

export function generateR16Task(options: GenOpts): Task {
  const m = meta('R16');
  rejectAdvancedLevels('R16', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R16_CONTEXT);
  const distractors = uniqueDistractorsFromModels(item.meaning, item.distractors, rng);
  return baseTask({
    id: taskId('R16', level, options.seed, 0),
    ...m,
    topicId: R16_TOPIC_ID,
    skillId: R16_SKILL_ID,
    generatorId: R16_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Что означает слово «${item.word}» в предложении?\n«${item.sentence}»`,
    answers: buildChoiceAnswers(item.meaning, distractors, rng),
    correctAnswer: item.meaning,
    explanation: `В этом контексте «${item.word}» — ${item.meaning}.`,
    passage: item.sentence,
    generatorParams: { subtype: 'context_meaning', key: item.word },
  });
}

export function generateR16Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR16Task({ difficulty, seed: seed + index }), fingerprint, 'R16');
}

// ─── R17 ───────────────────────────────────────────────────────────────────
export const R17_SKILL_ID = 'russian.lexis.synonyms_antonyms' as const;
export const R17_TOPIC_ID = 'russian.lexis.meaning' as const;
export const R17_GENERATOR_ID = 'gen.russian.r17' as const;

export function generateR17Task(options: GenOpts): Task {
  const m = meta('R17');
  rejectAdvancedLevels('R17', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R17_SYNONYMS);
  const askSynonym = rng() > 0.4;
  const correct = askSynonym ? item.synonym : item.antonym;
  const distractors = uniqueDistractorsFromModels(
    correct,
    [item.word, item.synonym, item.antonym, ...R17_SYNONYMS.flatMap((row) => [row.synonym, row.antonym])],
    rng,
  );
  return baseTask({
    id: taskId('R17', level, options.seed, 0),
    ...m,
    topicId: R17_TOPIC_ID,
    skillId: R17_SKILL_ID,
    generatorId: R17_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: askSynonym
      ? `Подбери синоним к слову «${item.word}»:`
      : `Подбери антоним к слову «${item.word}»:`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Синоним: ${item.synonym}. Антоним: ${item.antonym}.`,
    generatorParams: { subtype: askSynonym ? 'synonym' : 'antonym', key: item.word },
  });
}

export function generateR17Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR17Task({ difficulty, seed: seed + index }), fingerprint, 'R17');
}

// ─── R18 ───────────────────────────────────────────────────────────────────
export const R18_SKILL_ID = 'russian.text.theme_main_idea' as const;
export const R18_TOPIC_ID = 'russian.text.comprehension' as const;
export const R18_GENERATOR_ID = 'gen.russian.r18' as const;

export function generateR18Task(options: GenOpts): Task {
  const m = meta('R18');
  rejectAdvancedLevels('R18', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const text = pickOne(rng, R18_TEXTS);
  const subtypes = ['theme', 'main_idea', 'theme_vs_main', 'heading'] as const;
  const subtype = (options.subtype as (typeof subtypes)[number] | undefined) ?? pickOne(rng, subtypes);
  let correct: string;
  let question: string;
  if (subtype === 'theme') {
    correct = text.theme;
    question = 'Определи тему текста:';
  } else if (subtype === 'main_idea') {
    correct = text.mainIdea;
    question = 'Определи основную мысль:';
  } else if (subtype === 'heading') {
    correct = text.headings[0]!;
    question = 'Выбери лучший заголовок:';
  } else {
    correct = text.theme;
    question = 'Что является темой (не основной мыслью)?';
  }
  const pool =
    subtype === 'heading'
      ? text.headings
      : [text.theme, text.mainIdea, 'зима в городе', 'школьные каникулы', 'морское путешествие'];
  const distractors = uniqueDistractorsFromModels(correct, pool.filter((p) => p !== correct), rng);
  return baseTask({
    id: taskId('R18', level, options.seed, 0),
    ...m,
    topicId: R18_TOPIC_ID,
    skillId: R18_SKILL_ID,
    generatorId: R18_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `${question}\n\n${text.passage}`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Тема: ${text.theme}. Основная мысль: ${text.mainIdea}.`,
    passage: text.passage,
    generatorParams: { subtype, key: text.title },
  });
}

export function generateR18Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR18Task({ difficulty, seed: seed + index }), fingerprint, 'R18');
}

// ─── R19 ───────────────────────────────────────────────────────────────────
export const R19_SKILL_ID = 'russian.text.plan' as const;
export const R19_TOPIC_ID = 'russian.text.comprehension' as const;
export const R19_GENERATOR_ID = 'gen.russian.r19' as const;

export function generateR19Task(options: GenOpts): Task {
  const m = meta('R19');
  rejectAdvancedLevels('R19', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const plan = pickOne(rng, R19_PLANS);
  const subtypes = ['order_events', 'extra_part', 'best_plan'] as const;
  const allowed =
    level === 1 ? (['order_events'] as const) : level === 2 ? (['order_events', 'best_plan'] as const) : subtypes;
  const subtype =
    (options.subtype as (typeof subtypes)[number] | undefined) ??
    allowed[(options.seed + level) % allowed.length]!;
  if (subtype === 'order_events') {
    const shuffled = [...plan.parts].sort(() => rng() - 0.5);
    while (shuffled.join('|') === plan.parts.join('|')) shuffled.reverse();
    return baseTask({
      id: taskId('R19', level, options.seed, 0),
      ...m,
      topicId: R19_TOPIC_ID,
      skillId: R19_SKILL_ID,
      generatorId: R19_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: 'Расположи пункты плана в правильном порядке:',
      items: shuffled,
      correctAnswer: plan.parts,
      explanation: 'План должен отражать последовательность событий текста.',
      generatorParams: { subtype, key: `${plan.parts.join('|')}-${options.seed}` },
    });
  }
  if (subtype === 'best_plan') {
    const correct = plan.goodPlanLabel;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [...plan.badPlan, plan.parts.join(' → '), plan.extra],
      rng,
    );
    return baseTask({
      id: taskId('R19', level, options.seed, 0),
      ...m,
      topicId: R19_TOPIC_ID,
      skillId: R19_SKILL_ID,
      generatorId: R19_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: 'Выбери лучший план текста:',
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: 'Лучший план отражает последовательность частей текста.',
      generatorParams: { subtype, key: plan.goodPlanLabel },
    });
  }
  const correct = plan.extra;
  const distractors = uniqueDistractorsFromModels(correct, plan.parts, rng);
  return baseTask({
    id: taskId('R19', level, options.seed, 0),
    ...m,
    topicId: R19_TOPIC_ID,
    skillId: R19_SKILL_ID,
    generatorId: R19_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: 'Какой пункт лишний в плане текста?',
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Лишний пункт не относится к содержанию текста.',
    generatorParams: { subtype, key: plan.extra },
  });
}

export function generateR19Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR19Task({ difficulty, seed: seed + index }), fingerprint, 'R19');
}

// ─── R20 ───────────────────────────────────────────────────────────────────
export const R20_SKILL_ID = 'russian.text.comprehension' as const;
export const R20_TOPIC_ID = 'russian.text.comprehension' as const;
export const R20_GENERATOR_ID = 'gen.russian.r20' as const;

export function generateR20Task(options: GenOpts): Task {
  const m = meta('R20');
  rejectAdvancedLevels('R20', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R20_QUESTIONS);
  const distractors = uniqueDistractorsFromModels(item.answer, item.distractors, rng);
  return baseTask({
    id: taskId('R20', level, options.seed, 0),
    ...m,
    topicId: R20_TOPIC_ID,
    skillId: R20_SKILL_ID,
    generatorId: R20_GENERATOR_ID,
    difficulty: level,
    taskType: level === 1 ? 'shortAnswer' : 'singleChoice',
    question: `${item.question}\n\n«${item.passage}»`,
    answers: level === 1 ? undefined : buildChoiceAnswers(item.answer, distractors, rng),
    correctAnswer: item.answer,
    acceptableAnswers: level === 1 ? [item.answer, item.answer.toLowerCase()] : undefined,
    explanation: item.type === 'fact' ? 'Ответ прямо есть в предложении.' : 'Ответ требует понимания текста.',
    passage: item.passage,
    generatorParams: { subtype: item.type, key: item.question },
  });
}

export function generateR20Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR20Task({ difficulty, seed: seed + index }), fingerprint, 'R20');
}

// ─── R21 ───────────────────────────────────────────────────────────────────
export const R21_SKILL_ID = 'russian.speech.situational' as const;
export const R21_TOPIC_ID = 'russian.speech.communication' as const;
export const R21_GENERATOR_ID = 'gen.russian.r21' as const;

export function generateR21Task(options: GenOpts): Task {
  const m = meta('R21');
  rejectAdvancedLevels('R21', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R21_SPEECH);
  const correct = item.options[1] ?? item.options[0]!;
  const distractors = uniqueDistractorsFromModels(correct, item.options.filter((o) => o !== correct), rng);
  return baseTask({
    id: taskId('R21', level, options.seed, 0),
    ...m,
    topicId: R21_TOPIC_ID,
    skillId: R21_SKILL_ID,
    generatorId: R21_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Ситуация: ${item.situation}\nВыбери подходящую формулировку (${item.goal}):`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Цель высказывания: ${item.goal}.`,
    generatorParams: { subtype: 'situational', key: item.situation },
  });
}

export function generateR21Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR21Task({ difficulty, seed: seed + index }), fingerprint, 'R21');
}

// ─── R22 ───────────────────────────────────────────────────────────────────
export const R22_SKILL_ID = 'russian.speech.idiom' as const;
export const R22_TOPIC_ID = 'russian.speech.communication' as const;
export const R22_GENERATOR_ID = 'gen.russian.r22' as const;

export function generateR22Task(options: GenOpts): Task {
  const m = meta('R22');
  rejectAdvancedLevels('R22', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R22_IDIOMS);
  const askMeaning = rng() > 0.35;
  const correct = askMeaning ? item.meaning : item.literal;
  const distractors = uniqueDistractorsFromModels(correct, [item.meaning, item.literal, 'играть', 'спать'], rng);
  return baseTask({
    id: taskId('R22', level, options.seed, 0),
    ...m,
    topicId: R22_TOPIC_ID,
    skillId: R22_SKILL_ID,
    generatorId: R22_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: askMeaning
      ? `Что означает фразеологизм «${item.idiom}»?`
      : `Что означает «${item.idiom}» — буквально или переносно?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Переносное значение: ${item.meaning}.`,
    generatorParams: { subtype: askMeaning ? 'idiom_meaning' : 'literal_vs_figurative', key: item.idiom },
  });
}

export function generateR22Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR22Task({ difficulty, seed: seed + index }), fingerprint, 'R22');
}

// ─── R23 ───────────────────────────────────────────────────────────────────
export const R23_SKILL_ID = 'russian.reasoning.analysis' as const;
export const R23_TOPIC_ID = 'russian.reasoning.analysis' as const;
export const R23_GENERATOR_ID = 'gen.russian.r23' as const;

export function generateR23Task(options: GenOpts): Task {
  const m = meta('R23');
  rejectAdvancedLevels('R23', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R23_REASONING);
  const modes = ['find_error', 'first_step', 'next_step', 'choose_sequence'] as const;
  const mode = (options.subtype as (typeof modes)[number] | undefined) ?? pickOne(rng, modes);
  const correct = mode === 'find_error' ? item.error : item.correct;
  const distractors = uniqueDistractorsFromModels(correct, [item.error, item.correct, 'ошибки нет', 'оба верны'], rng);
  return baseTask({
    id: taskId('R23', level, options.seed, 0),
    ...m,
    topicId: R23_TOPIC_ID,
    skillId: R23_SKILL_ID,
    generatorId: R23_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      mode === 'find_error'
        ? `Найди ошибку в разборе (${item.skill}): «${item.error}»`
        : mode === 'first_step'
          ? `Какой первый шаг разбора верен для ${item.skill}?`
          : `Выбери правильный следующий шаг разбора:`,
    answers: buildChoiceAnswers(mode === 'find_error' ? item.error : item.correct, distractors, rng),
    correctAnswer: mode === 'find_error' ? item.error : item.correct,
    explanation: `Правильно: ${item.correct}.`,
    generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
  });
}

export function generateR23Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR23Task({ difficulty, seed: seed + index }), fingerprint, 'R23');
}

// ─── R24 ───────────────────────────────────────────────────────────────────
export const R24_SKILL_ID = 'russian.syntax.simple_complex' as const;
export const R24_TOPIC_ID = 'russian.syntax.base' as const;
export const R24_GENERATOR_ID = 'gen.russian.r24' as const;

export function generateR24Task(options: GenOpts): Task {
  const m = meta('R24');
  rejectAdvancedLevels('R24', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R24_SENTENCE_TYPE);
  const distractors = uniqueDistractorsFromModels(item.type, ['простое', 'сложное', 'осложнённое однородными', 'вопросительное'], rng);
  return baseTask({
    id: taskId('R24', level, options.seed, 0),
    ...m,
    topicId: R24_TOPIC_ID,
    skillId: R24_SKILL_ID,
    generatorId: R24_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Простое или сложное предложение?\n«${item.sentence}»`,
    answers: buildChoiceAnswers(item.type, distractors, rng),
    correctAnswer: item.type,
    explanation: item.explanation,
    generatorParams: { subtype: 'sentence_type', key: item.sentence },
  });
}

export function generateR24Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR24Task({ difficulty, seed: seed + index }), fingerprint, 'R24');
}

// ─── R25 ───────────────────────────────────────────────────────────────────
export const R25_SKILL_ID = 'russian.morphology.verb' as const;
export const R25_TOPIC_ID = 'russian.morphology.parts_of_speech' as const;
export const R25_GENERATOR_ID = 'gen.russian.r25' as const;

export function generateR25Task(options: GenOpts): Task {
  const m = meta('R25');
  rejectAdvancedLevels('R25', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, R25_VERB);
  const trait = level === 1 ? 'tense' : level === 2 ? 'conjugation' : 'person_number';
  const correct =
    trait === 'tense' ? item.tense : trait === 'conjugation' ? item.conjugation + ' спр.' : `${item.person}, ${item.number}`;
  const pool =
    trait === 'tense'
      ? ['наст.вр.', 'прош.вр.', 'буд.вр.', 'неопр. форма']
      : trait === 'conjugation'
        ? ['I спр.', 'II спр.', 'разноспрягаемый', 'не спрягается']
        : ['3 л., ед.ч.', '3 л., мн.ч.', '1 л., ед.ч.', '2 л., ед.ч.'];
  const distractors = uniqueDistractorsFromModels(correct, pool.filter((p) => p !== correct), rng);
  return baseTask({
    id: taskId('R25', level, options.seed, 0),
    ...m,
    topicId: R25_TOPIC_ID,
    skillId: R25_SKILL_ID,
    generatorId: R25_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Определи грамматические признаки глагола «${item.word}» (${trait}):`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `${item.word}: ${item.tense}, ${item.conjugation} спряжение. R25 — признаки, не правописание (R04).`,
    generatorParams: { subtype: `verb_${trait}`, key: item.word },
  });
}

export function generateR25Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateR25Task({ difficulty, seed: seed + index }), fingerprint, 'R25');
}

// ─── Registry ──────────────────────────────────────────────────────────────
export const RUSSIAN_GENERATORS: Record<RussianSkillCode, (opts: GenOpts) => Task> = {
  R01: generateR01Task,
  R02: generateR02Task,
  R03: generateR03Task,
  R04: generateR04Task,
  R05: generateR05Task,
  R06: generateR06Task,
  R07: generateR07Task,
  R08: generateR08Task,
  R09: generateR09Task,
  R10: generateR10Task,
  R11: generateR11Task,
  R12: generateR12Task,
  R13: generateR13Task,
  R14: generateR14Task,
  R15: generateR15Task,
  R16: generateR16Task,
  R17: generateR17Task,
  R18: generateR18Task,
  R19: generateR19Task,
  R20: generateR20Task,
  R21: generateR21Task,
  R22: generateR22Task,
  R23: generateR23Task,
  R24: generateR24Task,
  R25: generateR25Task,
};

export function generateRussianTask(code: RussianSkillCode, options: GenOpts): Task {
  const fn = RUSSIAN_GENERATORS[code];
  if (!fn) throw new Error(`No generator for ${code}`);
  return fn(options);
}

export function fingerprintRussianTask(task: Task): string {
  return fingerprint(task);
}
