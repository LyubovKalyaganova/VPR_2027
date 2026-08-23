/**
 * Справочник таксономии русского языка.
 * Источник ID: CONTENT_MATRIX_RUSSIAN.md (R01–R25, заморожено).
 */
import type { SubjectId } from '../../types';

export const RUSSIAN_SUBJECT_ID = 'russian' satisfies SubjectId;

export const RUSSIAN_SECTION_COUNT = 9;
export const RUSSIAN_TOPIC_COUNT = 14;
export const RUSSIAN_SKILL_COUNT = 25;

export type RussianSkillCode =
  | 'R01'
  | 'R02'
  | 'R03'
  | 'R04'
  | 'R05'
  | 'R06'
  | 'R07'
  | 'R08'
  | 'R09'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13'
  | 'R14'
  | 'R15'
  | 'R16'
  | 'R17'
  | 'R18'
  | 'R19'
  | 'R20'
  | 'R21'
  | 'R22'
  | 'R23'
  | 'R24'
  | 'R25';

export const RUSSIAN_SKILL_CODES: readonly RussianSkillCode[] = [
  'R01',
  'R02',
  'R03',
  'R04',
  'R05',
  'R06',
  'R07',
  'R08',
  'R09',
  'R10',
  'R11',
  'R12',
  'R13',
  'R14',
  'R15',
  'R16',
  'R17',
  'R18',
  'R19',
  'R20',
  'R21',
  'R22',
  'R23',
  'R24',
  'R25',
] as const;

export interface RussianSection {
  id: string;
  subjectId: typeof RUSSIAN_SUBJECT_ID;
  title: string;
}

export interface RussianTopic {
  id: string;
  subjectId: typeof RUSSIAN_SUBJECT_ID;
  sectionId: string;
  title: string;
}

export interface RussianSkill {
  id: string;
  code: RussianSkillCode;
  subjectId: typeof RUSSIAN_SUBJECT_ID;
  sectionId: string;
  topicId: string;
  title: string;
}

export const RUSSIAN_TAXONOMY = {
  subjectId: RUSSIAN_SUBJECT_ID,
  sections: [
    {
      id: 'russian.orthography',
      title: 'Орфография и правописание',
      topics: [
        {
          id: 'russian.orthography.spelling',
          title: 'Базовая орфография',
          skills: [
            { id: 'russian.orthography.base', code: 'R01', title: 'Орфография: база 1–3 классов' },
            { id: 'russian.orthography.noun_endings', code: 'R02', title: 'Безударные окончания существительных' },
            { id: 'russian.orthography.adj_endings', code: 'R03', title: 'Безударные окончания прилагательных' },
            { id: 'russian.orthography.verb_spelling', code: 'R04', title: 'Орфография глагола: -тся/-ться, личные окончания' },
            { id: 'russian.orthography.proofreading', code: 'R06', title: 'Орфографическая зоркость' },
            { id: 'russian.orthography.dictation_prep', code: 'R07', title: 'Диктант-готовность' },
          ],
        },
      ],
    },
    {
      id: 'russian.punctuation',
      title: 'Пунктуация',
      topics: [
        {
          id: 'russian.punctuation.homogeneous',
          title: 'Однородные члены',
          skills: [
            { id: 'russian.punctuation.homogeneous', code: 'R05', title: 'Пунктуация: однородные члены' },
          ],
        },
      ],
    },
    {
      id: 'russian.phonetics',
      title: 'Фонетика и орфоэпия',
      topics: [
        {
          id: 'russian.phonetics.stress',
          title: 'Ударение',
          skills: [{ id: 'russian.phonetics.stress', code: 'R08', title: 'Орфоэпия: ударение' }],
        },
        {
          id: 'russian.phonetics.sound_letter',
          title: 'Звуко-буквенный разбор',
          skills: [{ id: 'russian.phonetics.sound_letter', code: 'R09', title: 'Фонетика: звуко-буквенный разбор' }],
        },
      ],
    },
    {
      id: 'russian.syntax',
      title: 'Синтаксис',
      topics: [
        {
          id: 'russian.syntax.base',
          title: 'Грамматическая основа',
          skills: [
            { id: 'russian.syntax.base', code: 'R10', title: 'Синтаксис: грамматическая основа' },
            { id: 'russian.syntax.homogeneous', code: 'R11', title: 'Синтаксис: однородные члены' },
            { id: 'russian.syntax.simple_complex', code: 'R24', title: 'Синтаксис: простое / сложное предложение' },
          ],
        },
      ],
    },
    {
      id: 'russian.morphology',
      title: 'Морфология и морфемика',
      topics: [
        {
          id: 'russian.morphology.parts_of_speech',
          title: 'Части речи',
          skills: [
            { id: 'russian.morphology.parts_of_speech', code: 'R12', title: 'Морфология: части речи' },
            { id: 'russian.morphology.noun', code: 'R13', title: 'Морфология: существительное' },
            { id: 'russian.morphology.adjective', code: 'R14', title: 'Морфология: прилагательное' },
            { id: 'russian.morphology.verb', code: 'R25', title: 'Морфология: глагол' },
          ],
        },
        {
          id: 'russian.morphology.word_structure',
          title: 'Состав слова',
          skills: [{ id: 'russian.morphology.word_structure', code: 'R15', title: 'Морфемика: состав слова + схема' }],
        },
      ],
    },
    {
      id: 'russian.lexis',
      title: 'Лексика',
      topics: [
        {
          id: 'russian.lexis.meaning',
          title: 'Значение слова',
          skills: [
            { id: 'russian.lexis.context_meaning', code: 'R16', title: 'Лексика: значение слова по контексту' },
            { id: 'russian.lexis.synonyms_antonyms', code: 'R17', title: 'Лексика: синонимы / антонимы' },
          ],
        },
      ],
    },
    {
      id: 'russian.text',
      title: 'Работа с текстом',
      topics: [
        {
          id: 'russian.text.comprehension',
          title: 'Понимание текста',
          skills: [
            { id: 'russian.text.theme_main_idea', code: 'R18', title: 'Текст: тема и основная мысль + заголовок' },
            { id: 'russian.text.plan', code: 'R19', title: 'Текст: план / последовательность частей' },
            { id: 'russian.text.comprehension', code: 'R20', title: 'Текст: вопрос и понимание содержания' },
          ],
        },
      ],
    },
    {
      id: 'russian.speech',
      title: 'Речь',
      topics: [
        {
          id: 'russian.speech.communication',
          title: 'Ситуации общения',
          skills: [
            { id: 'russian.speech.situational', code: 'R21', title: 'Речь: мини-текст ситуации общения' },
            { id: 'russian.speech.idiom', code: 'R22', title: 'Речь: фразеологизм в контексте' },
          ],
        },
      ],
    },
    {
      id: 'russian.reasoning',
      title: 'Рассуждение',
      topics: [
        {
          id: 'russian.reasoning.analysis',
          title: 'Ход разбора',
          skills: [{ id: 'russian.reasoning.analysis', code: 'R23', title: 'Рассуждение: ход / ошибка в разборе' }],
        },
      ],
    },
  ],
} as const;

function flattenSkills(): RussianSkill[] {
  const skills: RussianSkill[] = [];
  for (const section of RUSSIAN_TAXONOMY.sections) {
    for (const topic of section.topics) {
      for (const skill of topic.skills) {
        skills.push({
          id: skill.id,
          code: skill.code,
          subjectId: RUSSIAN_SUBJECT_ID,
          sectionId: section.id,
          topicId: topic.id,
          title: skill.title,
        });
      }
    }
  }
  return skills;
}

export const RUSSIAN_SKILLS: readonly RussianSkill[] = flattenSkills();

export const RUSSIAN_SECTIONS: readonly RussianSection[] = RUSSIAN_TAXONOMY.sections.map((s) => ({
  id: s.id,
  subjectId: RUSSIAN_SUBJECT_ID,
  title: s.title,
}));

export const RUSSIAN_TOPICS: readonly RussianTopic[] = RUSSIAN_TAXONOMY.sections.flatMap((section) =>
  section.topics.map((topic) => ({
    id: topic.id,
    subjectId: RUSSIAN_SUBJECT_ID,
    sectionId: section.id,
    title: topic.title,
  })),
);

export function getRussianSkillByCode(code: RussianSkillCode): RussianSkill {
  const skill = RUSSIAN_SKILLS.find((s) => s.code === code);
  if (!skill) throw new Error(`Unknown Russian skill code ${code}`);
  return skill;
}
