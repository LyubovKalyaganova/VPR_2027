/**
 * Справочник таксономии английского языка.
 * Источник ID: CONTENT_MATRIX_ENGLISH.md (E01–E18).
 */
import type { SubjectId } from '../../types';

export const ENGLISH_SUBJECT_ID = 'english' satisfies SubjectId;

export const ENGLISH_SECTION_COUNT = 6;
export const ENGLISH_TOPIC_COUNT = 6;
export const ENGLISH_SKILL_COUNT = 18;

export type EnglishSkillCode =
  | 'E01'
  | 'E02'
  | 'E03'
  | 'E04'
  | 'E05'
  | 'E06'
  | 'E07'
  | 'E08'
  | 'E09'
  | 'E10'
  | 'E11'
  | 'E12'
  | 'E13'
  | 'E14'
  | 'E15'
  | 'E16'
  | 'E17'
  | 'E18';

export const ENGLISH_SKILL_CODES: readonly EnglishSkillCode[] = [
  'E01',
  'E02',
  'E03',
  'E04',
  'E05',
  'E06',
  'E07',
  'E08',
  'E09',
  'E10',
  'E11',
  'E12',
  'E13',
  'E14',
  'E15',
  'E16',
  'E17',
  'E18',
] as const;

export interface EnglishSection {
  id: string;
  subjectId: typeof ENGLISH_SUBJECT_ID;
  title: string;
}

export interface EnglishTopic {
  id: string;
  subjectId: typeof ENGLISH_SUBJECT_ID;
  sectionId: string;
  title: string;
}

export interface EnglishSkill {
  id: string;
  subjectId: typeof ENGLISH_SUBJECT_ID;
  topicId: string;
  sectionId: string;
  code: EnglishSkillCode;
  title: string;
}

export const ENGLISH_TAXONOMY = {
  subjectId: ENGLISH_SUBJECT_ID,
  sections: [
    {
      id: 'english.listening',
      title: 'Аудирование',
      topics: [
        {
          id: 'english.listening.comprehension',
          title: 'Понимание на слух',
          skills: [
            { id: 'english.listening.specific', code: 'E01', title: 'Listening: specific information' },
            { id: 'english.listening.distractors', code: 'E02', title: 'Listening: keyword & distractor control' },
            { id: 'english.listening.gist', code: 'E03', title: 'Listening: gist' },
          ],
        },
      ],
    },
    {
      id: 'english.reading',
      title: 'Чтение',
      topics: [
        {
          id: 'english.reading.comprehension',
          title: 'Понимание текста',
          skills: [
            { id: 'english.reading.specific', code: 'E04', title: 'Reading: specific information' },
            { id: 'english.reading.true_statement', code: 'E05', title: 'Reading: true statement' },
            { id: 'english.reading.main_idea', code: 'E06', title: 'Reading: title / main idea' },
            { id: 'english.reading.vocabulary', code: 'E07', title: 'Vocabulary in context / language guess' },
          ],
        },
      ],
    },
    {
      id: 'english.grammar',
      title: 'Грамматика и структуры',
      topics: [
        {
          id: 'english.grammar.cloze',
          title: 'Грамматика в контексте',
          skills: [
            { id: 'english.grammar.cloze_text', code: 'E08', title: 'Grammar cloze in connected text' },
            { id: 'english.grammar.verbs', code: 'E09', title: 'Verb systems: Present/Past Simple (+ Continuous)' },
            { id: 'english.grammar.future', code: 'E10', title: 'Future: will / be going to' },
            { id: 'english.grammar.forms', code: 'E11', title: 'Comparatives / pronouns / quantifiers' },
            { id: 'english.grammar.core', code: 'E17', title: 'Core structures: be / have got / can / Q/neg' },
          ],
        },
      ],
    },
    {
      id: 'english.lexis',
      title: 'Лексика',
      topics: [
        {
          id: 'english.lexis.fields',
          title: 'Лексические поля',
          skills: [
            { id: 'english.lexis.life', code: 'E12', title: 'Lexis: self & school life' },
            { id: 'english.lexis.world', code: 'E13', title: 'Lexis: hobbies, animals, places, weather' },
          ],
        },
      ],
    },
    {
      id: 'english.writing',
      title: 'Письмо',
      topics: [
        {
          id: 'english.writing.forms',
          title: 'Анкеты и формуляры',
          skills: [
            { id: 'english.writing.form_fill', code: 'E14', title: 'Form filling: extract personal data' },
            { id: 'english.writing.spelling', code: 'E15', title: 'Writing: spelling & numbers-in-words' },
            { id: 'english.writing.completeness', code: 'E16', title: 'Writing: field completeness' },
          ],
        },
      ],
    },
    {
      id: 'english.reasoning',
      title: 'Reasoning',
      topics: [
        {
          id: 'english.reasoning.strategy',
          title: 'Стратегия ответа',
          skills: [{ id: 'english.reasoning.evidence', code: 'E18', title: 'Reasoning: evidence in text/audio' }],
        },
      ],
    },
  ],
  reasoning: {
    id: 'english.reasoning.meta',
    code: 'E18',
    title: 'Reasoning: evidence in text/audio',
    skillId: 'english.reasoning.evidence',
    topicId: 'english.reasoning.strategy',
    sectionId: 'english.reasoning',
  },
} as const;

function flattenSkills(): EnglishSkill[] {
  const skills: EnglishSkill[] = [];
  for (const section of ENGLISH_TAXONOMY.sections) {
    for (const topic of section.topics) {
      for (const skill of topic.skills) {
        skills.push({
          id: skill.id,
          subjectId: ENGLISH_SUBJECT_ID,
          topicId: topic.id,
          sectionId: section.id,
          code: skill.code,
          title: skill.title,
        });
      }
    }
  }
  return skills;
}

export const ENGLISH_SKILLS: readonly EnglishSkill[] = flattenSkills();

export const ENGLISH_TOPICS: readonly EnglishTopic[] = ENGLISH_TAXONOMY.sections.flatMap((section) =>
  section.topics.map((topic) => ({
    id: topic.id,
    subjectId: ENGLISH_SUBJECT_ID,
    sectionId: section.id,
    title: topic.title,
  })),
);

export function getEnglishSkillByCode(code: EnglishSkillCode): EnglishSkill {
  const skill = ENGLISH_SKILLS.find((s) => s.code === code);
  if (!skill) throw new Error(`Unknown English skill code: ${code}`);
  return skill;
}
