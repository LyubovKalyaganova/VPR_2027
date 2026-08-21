/**
 * Справочник математической таксономии.
 * Источник ID: CONTENT_MATRIX_MATH.md
 *
 * Номера заданий ВПР, официальные баллы и критерии сюда не входят:
 * связь с ВПР-2027 остаётся NEEDS_VPR_CHECK.
 */
import type { SubjectId } from '../../types';

export const MATH_SUBJECT_ID = 'mathematics' satisfies SubjectId;

export interface MathSection {
  id: string;
  subjectId: typeof MATH_SUBJECT_ID;
  title: string;
}

export interface MathTopic {
  id: string;
  subjectId: typeof MATH_SUBJECT_ID;
  sectionId: string;
  title: string;
}

export interface MathSkill {
  id: string;
  subjectId: typeof MATH_SUBJECT_ID;
  sectionId: string;
  topicId: string;
  title: string;
}

/**
 * Единое дерево: предмет → раздел → тема → навык.
 * Плоские коллекции ниже выводятся из этого дерева, а не дублируют его вручную.
 */
export const MATH_TAXONOMY = {
  subjectId: MATH_SUBJECT_ID,
  sections: [
    {
      id: 'math.calculation',
      title: 'Вычисления',
      topics: [
        {
          id: 'math.calculation.multi_digit',
          title: 'Сложение и вычитание многозначных чисел',
          skills: [
            { id: 'math.calculation.multi_digit.addition', title: 'Сложение многозначных чисел' },
            { id: 'math.calculation.multi_digit.subtraction', title: 'Вычитание многозначных чисел' },
          ],
        },
        {
          id: 'math.calculation.mul_div',
          title: 'Умножение и деление',
          skills: [
            { id: 'math.calculation.mul_div.multiplication', title: 'Умножение' },
            { id: 'math.calculation.mul_div.division', title: 'Деление' },
          ],
        },
      ],
    },
    {
      id: 'math.order_of_operations',
      title: 'Порядок действий',
      topics: [
        {
          id: 'math.order_of_operations.expressions',
          title: 'Выражения с несколькими действиями',
          skills: [{ id: 'math.order_of_operations.expressions.evaluate', title: 'Вычисление значения выражения' }],
        },
      ],
    },
    {
      id: 'math.quantities',
      title: 'Величины',
      topics: [
        {
          id: 'math.quantities.units',
          title: 'Единицы измерения',
          skills: [{ id: 'math.quantities.units.convert', title: 'Перевод и сравнение единиц' }],
        },
        {
          id: 'math.quantities.time',
          title: 'Время',
          skills: [{ id: 'math.quantities.time.calculate', title: 'Расчёт времени' }],
        },
        {
          id: 'math.quantities.mass',
          title: 'Масса',
          skills: [{ id: 'math.quantities.mass.calculate', title: 'Масса: перевод и расчёт' }],
        },
        {
          id: 'math.quantities.length',
          title: 'Длина',
          skills: [{ id: 'math.quantities.length.calculate', title: 'Длина: перевод и расчёт' }],
        },
        {
          id: 'math.quantities.area',
          title: 'Площадь',
          skills: [{ id: 'math.quantities.area.convert', title: 'Площадь как величина' }],
        },
        {
          id: 'math.quantities.cost',
          title: 'Стоимость',
          skills: [{ id: 'math.quantities.cost.calculate', title: 'Стоимость' }],
        },
        {
          id: 'math.quantities.speed',
          title: 'Скорость',
          skills: [{ id: 'math.quantities.speed.convert', title: 'Скорость как величина' }],
        },
      ],
    },
    {
      id: 'math.geometry',
      title: 'Геометрия',
      topics: [
        {
          id: 'math.geometry.perimeter',
          title: 'Периметр',
          skills: [{ id: 'math.geometry.perimeter.calculate', title: 'Нахождение периметра' }],
        },
        {
          id: 'math.geometry.figure_area',
          title: 'Площадь фигур',
          skills: [{ id: 'math.geometry.figure_area.calculate', title: 'Нахождение площади фигуры' }],
        },
        {
          id: 'math.geometry.symmetry',
          title: 'Симметрия',
          skills: [{ id: 'math.geometry.symmetry.identify', title: 'Распознавание симметрии' }],
        },
      ],
    },
    {
      id: 'math.data',
      title: 'Таблицы и диаграммы',
      topics: [
        {
          id: 'math.data.tables',
          title: 'Таблицы',
          skills: [{ id: 'math.data.tables.read', title: 'Чтение таблицы' }],
        },
        {
          id: 'math.data.charts',
          title: 'Диаграммы',
          skills: [{ id: 'math.data.charts.read', title: 'Чтение диаграммы' }],
        },
      ],
    },
    {
      id: 'math.word_problems',
      title: 'Текстовые задачи',
      topics: [
        {
          id: 'math.word_problems.general',
          title: 'Текстовые задачи',
          skills: [{ id: 'math.word_problems.general.solve', title: 'Решение текстовой задачи' }],
        },
        {
          id: 'math.word_problems.motion',
          title: 'Задачи на движение',
          skills: [
            { id: 'math.word_problems.motion.distance', title: 'Нахождение расстояния' },
            { id: 'math.word_problems.motion.time', title: 'Нахождение времени' },
            { id: 'math.word_problems.motion.speed', title: 'Нахождение скорости' },
          ],
        },
      ],
    },
    {
      id: 'math.logic',
      title: 'Логические задачи',
      topics: [
        {
          id: 'math.logic.problems',
          title: 'Логические задачи',
          skills: [{ id: 'math.logic.problems.solve', title: 'Решение логической задачи' }],
        },
      ],
    },
  ],
} as const;

type FlattenTopics<Sections extends readonly { readonly topics: readonly unknown[] }[]> =
  Sections extends readonly [
    infer Head extends { readonly topics: readonly unknown[] },
    ...infer Rest extends readonly { readonly topics: readonly unknown[] }[],
  ]
    ? [...Head['topics'], ...FlattenTopics<Rest>]
    : [];

type FlattenSkills<Topics extends readonly { readonly skills: readonly unknown[] }[]> =
  Topics extends readonly [
    infer Head extends { readonly skills: readonly unknown[] },
    ...infer Rest extends readonly { readonly skills: readonly unknown[] }[],
  ]
    ? [...Head['skills'], ...FlattenSkills<Rest>]
    : [];

type MathTopicTuple = FlattenTopics<(typeof MATH_TAXONOMY)['sections']>;
type MathSkillTuple = FlattenSkills<MathTopicTuple>;

type AssertExact<Actual extends Expected, Expected> = Actual;

export type AssertMathSectionCount = AssertExact<(typeof MATH_TAXONOMY.sections)['length'], 7>;
export type AssertMathTopicCount = AssertExact<MathTopicTuple['length'], 18>;
export type AssertMathSkillCount = AssertExact<MathSkillTuple['length'], 22>;

export type MathSectionId = (typeof MATH_TAXONOMY.sections)[number]['id'];
export type MathTopicId = MathTopicTuple[number]['id'];
export type MathSkillId = MathSkillTuple[number]['id'];

function flattenMathTaxonomy(): {
  sections: MathSection[];
  topics: MathTopic[];
  skills: MathSkill[];
} {
  const subjectId = MATH_TAXONOMY.subjectId;
  const sections: MathSection[] = [];
  const topics: MathTopic[] = [];
  const skills: MathSkill[] = [];

  for (const section of MATH_TAXONOMY.sections) {
    sections.push({
      id: section.id,
      subjectId,
      title: section.title,
    });

    for (const topic of section.topics) {
      topics.push({
        id: topic.id,
        subjectId,
        sectionId: section.id,
        title: topic.title,
      });

      for (const skill of topic.skills) {
        skills.push({
          id: skill.id,
          subjectId,
          sectionId: section.id,
          topicId: topic.id,
          title: skill.title,
        });
      }
    }
  }

  return { sections, topics, skills };
}

const flattened = flattenMathTaxonomy();

export const MATH_SECTIONS: readonly MathSection[] = flattened.sections;
export const MATH_TOPICS: readonly MathTopic[] = flattened.topics;
export const MATH_SKILLS: readonly MathSkill[] = flattened.skills;

function indexById<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

const sectionsById = indexById(MATH_SECTIONS);
const topicsById = indexById(MATH_TOPICS);
const skillsById = indexById(MATH_SKILLS);

export function getMathSectionById(id: string): MathSection | undefined {
  return sectionsById.get(id);
}

export function getMathTopicById(id: string): MathTopic | undefined {
  return topicsById.get(id);
}

export function getMathSkillById(id: string): MathSkill | undefined {
  return skillsById.get(id);
}

export function getMathTopicsBySectionId(sectionId: string): MathTopic[] {
  return MATH_TOPICS.filter((topic) => topic.sectionId === sectionId);
}

export function getMathSkillsByTopicId(topicId: string): MathSkill[] {
  return MATH_SKILLS.filter((skill) => skill.topicId === topicId);
}

function assertUniqueIds(items: readonly { id: string }[], label: string): void {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Таксономия математики: повторяющиеся ID в ${label}`);
  }
}

function assertMathTaxonomyConsistency(): void {
  if (MATH_SECTIONS.length !== 7) {
    throw new Error(`Таксономия математики: ожидалось 7 разделов, получено ${MATH_SECTIONS.length}`);
  }
  if (MATH_TOPICS.length !== 18) {
    throw new Error(`Таксономия математики: ожидалось 18 тем, получено ${MATH_TOPICS.length}`);
  }
  if (MATH_SKILLS.length !== 22) {
    throw new Error(`Таксономия математики: ожидалось 22 навыка, получено ${MATH_SKILLS.length}`);
  }

  assertUniqueIds(MATH_SECTIONS, 'разделах');
  assertUniqueIds(MATH_TOPICS, 'темах');
  assertUniqueIds(MATH_SKILLS, 'навыках');

  if (MATH_TAXONOMY.subjectId !== 'mathematics') {
    throw new Error('Таксономия математики: subjectId должен быть mathematics');
  }

  for (const section of MATH_SECTIONS) {
    if (section.subjectId !== 'mathematics') {
      throw new Error(`Таксономия математики: раздел ${section.id} не относится к mathematics`);
    }
  }

  for (const topic of MATH_TOPICS) {
    if (topic.subjectId !== 'mathematics') {
      throw new Error(`Таксономия математики: тема ${topic.id} не относится к mathematics`);
    }
    if (!sectionsById.has(topic.sectionId)) {
      throw new Error(`Таксономия математики: тема ${topic.id} ссылается на неизвестный раздел ${topic.sectionId}`);
    }
  }

  for (const skill of MATH_SKILLS) {
    if (skill.subjectId !== 'mathematics') {
      throw new Error(`Таксономия математики: навык ${skill.id} не относится к mathematics`);
    }
    const topic = topicsById.get(skill.topicId);
    if (!topic) {
      throw new Error(`Таксономия математики: навык ${skill.id} ссылается на неизвестную тему ${skill.topicId}`);
    }
    if (skill.sectionId !== topic.sectionId) {
      throw new Error(`Таксономия математики: навык ${skill.id} привязан к другому разделу, чем его тема`);
    }
  }
}

assertMathTaxonomyConsistency();
