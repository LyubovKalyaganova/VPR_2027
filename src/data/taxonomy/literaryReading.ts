/**
 * Справочник таксономии литературного чтения.
 * Источник ID: CONTENT_MATRIX_LITERARY_READING.md (L01–L24, заморожено).
 * SubjectId проекта: `reading`.
 */
import type { SubjectId } from '../../types';

export const READING_SUBJECT_ID = 'reading' satisfies SubjectId;

export const READING_SECTION_COUNT = 5;
export const READING_TOPIC_COUNT = 10;
export const READING_SKILL_COUNT = 24;

export type ReadingSkillCode =
  | 'L01'
  | 'L02'
  | 'L03'
  | 'L04'
  | 'L05'
  | 'L06'
  | 'L07'
  | 'L08'
  | 'L09'
  | 'L10'
  | 'L11'
  | 'L12'
  | 'L13'
  | 'L14'
  | 'L15'
  | 'L16'
  | 'L17'
  | 'L18'
  | 'L19'
  | 'L20'
  | 'L21'
  | 'L22'
  | 'L23'
  | 'L24';

export const READING_SKILL_CODES: readonly ReadingSkillCode[] = [
  'L01',
  'L02',
  'L03',
  'L04',
  'L05',
  'L06',
  'L07',
  'L08',
  'L09',
  'L10',
  'L11',
  'L12',
  'L13',
  'L14',
  'L15',
  'L16',
  'L17',
  'L18',
  'L19',
  'L20',
  'L21',
  'L22',
  'L23',
  'L24',
] as const;

export interface ReadingSection {
  id: string;
  subjectId: typeof READING_SUBJECT_ID;
  title: string;
}

export interface ReadingTopic {
  id: string;
  subjectId: typeof READING_SUBJECT_ID;
  sectionId: string;
  title: string;
}

export interface ReadingSkill {
  id: string;
  code: ReadingSkillCode;
  subjectId: typeof READING_SUBJECT_ID;
  sectionId: string;
  topicId: string;
  title: string;
}

export const READING_TAXONOMY = {
  subjectId: READING_SUBJECT_ID,
  sections: [
    {
      id: 'reading.genres',
      title: 'Жанры и виды текстов',
      topics: [
        {
          id: 'reading.genres.folklore',
          title: 'Фольклор и сказки',
          skills: [{ id: 'reading.genres.folklore', code: 'L01', title: 'Фольклор и виды сказок' }],
        },
        {
          id: 'reading.genres.literature',
          title: 'Жанры литературы',
          skills: [
            { id: 'reading.genres.literature', code: 'L02', title: 'Жанры художественной литературы' },
            { id: 'reading.genres.book', code: 'L04', title: 'Книга и жанр' },
            { id: 'reading.genres.text_types', code: 'L05', title: 'Художественный и познавательный текст' },
            { id: 'reading.genres.prose_poetry', code: 'L22', title: 'Проза и поэзия (ритм, рифма)' },
          ],
        },
      ],
    },
    {
      id: 'reading.knowledge',
      title: 'Литературные знания',
      topics: [
        {
          id: 'reading.knowledge.authors',
          title: 'Авторы и произведения',
          skills: [{ id: 'reading.knowledge.authors', code: 'L06', title: 'Авторы и произведения' }],
        },
        {
          id: 'reading.knowledge.devices',
          title: 'Выразительность',
          skills: [{ id: 'reading.knowledge.devices', code: 'L07', title: 'Средства художественной выразительности' }],
        },
      ],
    },
    {
      id: 'reading.comprehension',
      title: 'Понимание текста',
      topics: [
        {
          id: 'reading.comprehension.content',
          title: 'Содержание и факты',
          skills: [
            { id: 'reading.comprehension.interpret', code: 'L08', title: 'Интерпретация и достоверность' },
            { id: 'reading.comprehension.sequence', code: 'L09', title: 'Последовательность событий' },
            { id: 'reading.comprehension.word', code: 'L10', title: 'Слово в контексте произведения' },
            { id: 'reading.comprehension.explicit', code: 'L11', title: 'Явная информация текста' },
            { id: 'reading.comprehension.claims', code: 'L12', title: 'Соответствие утверждений тексту' },
          ],
        },
        {
          id: 'reading.comprehension.theme',
          title: 'Тема и мысль',
          skills: [
            { id: 'reading.comprehension.theme', code: 'L14', title: 'Тема произведения' },
            { id: 'reading.comprehension.main_idea', code: 'L15', title: 'Главная мысль' },
            { id: 'reading.comprehension.title', code: 'L16', title: 'Заголовок' },
          ],
        },
      ],
    },
    {
      id: 'reading.characters',
      title: 'Герои и композиция',
      topics: [
        {
          id: 'reading.characters.hero',
          title: 'Герой',
          skills: [
            { id: 'reading.characters.trait', code: 'L17', title: 'Характеристика героя' },
            { id: 'reading.characters.motive', code: 'L18', title: 'Мотив / причина поступка' },
            { id: 'reading.characters.compare', code: 'L23', title: 'Сравнение героев' },
          ],
        },
        {
          id: 'reading.characters.structure',
          title: 'Структура текста',
          skills: [
            { id: 'reading.characters.plan', code: 'L19', title: 'План текста' },
            { id: 'reading.characters.composition', code: 'L20', title: 'Эпизод и композиция' },
            { id: 'reading.characters.author', code: 'L21', title: 'Авторская позиция' },
          ],
        },
      ],
    },
    {
      id: 'reading.response',
      title: 'Высказывание и рассуждение',
      topics: [
        {
          id: 'reading.response.writing',
          title: 'Ответ по тексту',
          skills: [
            { id: 'reading.response.opinion', code: 'L03', title: 'Рассуждение: мнение и аргумент' },
            { id: 'reading.response.conclusion', code: 'L13', title: 'Вывод и высказывание по тексту' },
          ],
        },
        {
          id: 'reading.response.reasoning',
          title: 'Ход разбора',
          skills: [{ id: 'reading.response.reasoning', code: 'L24', title: 'Reasoning: ход разбора текста' }],
        },
      ],
    },
  ],
} as const;

function flattenSkills(): ReadingSkill[] {
  const skills: ReadingSkill[] = [];
  for (const section of READING_TAXONOMY.sections) {
    for (const topic of section.topics) {
      for (const skill of topic.skills) {
        skills.push({
          id: skill.id,
          code: skill.code as ReadingSkillCode,
          subjectId: READING_SUBJECT_ID,
          sectionId: section.id,
          topicId: topic.id,
          title: skill.title,
        });
      }
    }
  }
  return skills;
}

export const READING_SKILLS: readonly ReadingSkill[] = flattenSkills();
export const LITERARY_READING_SKILLS = READING_SKILLS;

export const LITERARY_READING_TOPICS: readonly ReadingTopic[] = READING_TAXONOMY.sections.flatMap((section) =>
  section.topics.map((topic) => ({
    id: topic.id,
    subjectId: READING_SUBJECT_ID,
    sectionId: section.id,
    title: topic.title,
  })),
);

export const READING_SECTIONS: readonly ReadingSection[] = READING_TAXONOMY.sections.map((s) => ({
  id: s.id,
  subjectId: READING_SUBJECT_ID,
  title: s.title,
}));

export const READING_TOPICS: readonly ReadingTopic[] = LITERARY_READING_TOPICS;

export function getReadingSkillByCode(code: ReadingSkillCode): ReadingSkill {
  const skill = READING_SKILLS.find((s) => s.code === code);
  if (!skill) throw new Error(`Unknown Reading skill code ${code}`);
  return skill;
}
