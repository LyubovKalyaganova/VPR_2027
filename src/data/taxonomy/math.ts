/**
 * Справочник математической таксономии.
 * Источник ID: CONTENT_MATRIX_MATH.md версии 2.0 (заморожена).
 * Каталог: ровно 35 навыков M01–M35.
 *
 * В задания пишется канонический ID (`math.…`), не краткий код M01.
 * Номера заданий ВПР, официальные баллы и критерии сюда не входят:
 * связь с ВПР-2027 остаётся NEEDS_VPR_CHECK.
 */
import type { SubjectId } from '../../types';

export const MATH_SUBJECT_ID = 'mathematics' satisfies SubjectId;

export const MATH_SECTION_COUNT = 7;
export const MATH_TOPIC_COUNT = 21;
export const MATH_SKILL_COUNT = 35;

export type MathSkillCode =
  | 'M01'
  | 'M02'
  | 'M03'
  | 'M04'
  | 'M05'
  | 'M06'
  | 'M07'
  | 'M08'
  | 'M09'
  | 'M10'
  | 'M11'
  | 'M12'
  | 'M13'
  | 'M14'
  | 'M15'
  | 'M16'
  | 'M17'
  | 'M18'
  | 'M19'
  | 'M20'
  | 'M21'
  | 'M22'
  | 'M23'
  | 'M24'
  | 'M25'
  | 'M26'
  | 'M27'
  | 'M28'
  | 'M29'
  | 'M30'
  | 'M31'
  | 'M32'
  | 'M33'
  | 'M34'
  | 'M35';

export const MATH_SKILL_CODES: readonly MathSkillCode[] = [
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
  'M08',
  'M09',
  'M10',
  'M11',
  'M12',
  'M13',
  'M14',
  'M15',
  'M16',
  'M17',
  'M18',
  'M19',
  'M20',
  'M21',
  'M22',
  'M23',
  'M24',
  'M25',
  'M26',
  'M27',
  'M28',
  'M29',
  'M30',
  'M31',
  'M32',
  'M33',
  'M34',
  'M35',
] as const;

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
  code: MathSkillCode;
  subjectId: typeof MATH_SUBJECT_ID;
  sectionId: string;
  topicId: string;
  title: string;
}

/**
 * Единое дерево: предмет → раздел → тема → навык.
 * Плоские коллекции ниже выводятся из этого дерева, а не дублируют его вручную.
 * Порядок навыков совпадает с M01–M35 в CONTENT_MATRIX_MATH.md.
 */
export const MATH_TAXONOMY = {
  subjectId: MATH_SUBJECT_ID,
  sections: [
    {
      id: 'math.calculation',
      title: 'Вычисления',
      topics: [
        {
          id: 'math.calculation.numbers',
          title: 'Числа и разряды',
          skills: [
            { id: 'math.calculation.numbers.place_value', code: 'M01', title: 'Разрядный состав и запись чисел' },
            { id: 'math.calculation.numbers.compare', code: 'M02', title: 'Сравнение многозначных чисел' },
          ],
        },
        {
          id: 'math.calculation.multi_digit',
          title: 'Сложение и вычитание многозначных чисел',
          skills: [
            { id: 'math.calculation.multi_digit.addition', code: 'M03', title: 'Сложение многозначных чисел' },
            { id: 'math.calculation.multi_digit.subtraction', code: 'M04', title: 'Вычитание многозначных чисел' },
          ],
        },
        {
          id: 'math.calculation.mul_div',
          title: 'Умножение и деление',
          skills: [
            { id: 'math.calculation.mul_div.multiplication', code: 'M05', title: 'Умножение' },
            { id: 'math.calculation.mul_div.division', code: 'M06', title: 'Деление нацело' },
            { id: 'math.calculation.mul_div.division_remainder', code: 'M07', title: 'Деление с остатком' },
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
          skills: [
            {
              id: 'math.order_of_operations.expressions.evaluate',
              code: 'M08',
              title: 'Вычисление значения выражения',
            },
          ],
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
          skills: [{ id: 'math.quantities.units.convert', code: 'M09', title: 'Перевод и сравнение единиц' }],
        },
        {
          id: 'math.quantities.time',
          title: 'Время',
          skills: [
            { id: 'math.quantities.time.read_clock', code: 'M10', title: 'Чтение часов' },
            { id: 'math.quantities.time.calculate', code: 'M11', title: 'Расчёт промежутков времени' },
          ],
        },
        {
          id: 'math.quantities.mass',
          title: 'Масса',
          skills: [{ id: 'math.quantities.mass.calculate', code: 'M12', title: 'Масса: перевод и расчёт' }],
        },
        {
          id: 'math.quantities.length',
          title: 'Длина',
          skills: [{ id: 'math.quantities.length.calculate', code: 'M13', title: 'Длина: перевод и расчёт' }],
        },
        {
          id: 'math.quantities.area',
          title: 'Площадь',
          skills: [{ id: 'math.quantities.area.convert', code: 'M14', title: 'Площадь как величина' }],
        },
        {
          id: 'math.quantities.cost',
          title: 'Стоимость',
          skills: [{ id: 'math.quantities.cost.calculate', code: 'M15', title: 'Стоимость' }],
        },
        {
          id: 'math.quantities.speed',
          title: 'Скорость',
          skills: [{ id: 'math.quantities.speed.convert', code: 'M16', title: 'Скорость как величина' }],
        },
      ],
    },
    {
      id: 'math.geometry',
      title: 'Геометрия',
      topics: [
        {
          id: 'math.geometry.figures',
          title: 'Геометрические фигуры',
          skills: [{ id: 'math.geometry.figures.identify', code: 'M17', title: 'Распознавание геометрических фигур' }],
        },
        {
          id: 'math.geometry.grid',
          title: 'Фигуры на клетчатой бумаге',
          skills: [{ id: 'math.geometry.grid.read', code: 'M18', title: 'Работа с фигурой на клетчатой бумаге' }],
        },
        {
          id: 'math.geometry.perimeter',
          title: 'Периметр',
          skills: [{ id: 'math.geometry.perimeter.calculate', code: 'M19', title: 'Нахождение периметра' }],
        },
        {
          id: 'math.geometry.figure_area',
          title: 'Площадь фигур',
          skills: [{ id: 'math.geometry.figure_area.calculate', code: 'M20', title: 'Нахождение площади фигуры' }],
        },
        {
          id: 'math.geometry.symmetry',
          title: 'Симметрия',
          skills: [{ id: 'math.geometry.symmetry.identify', code: 'M21', title: 'Распознавание симметрии' }],
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
          skills: [
            { id: 'math.data.tables.read', code: 'M22', title: 'Чтение таблицы' },
            { id: 'math.data.tables.calculate', code: 'M23', title: 'Вычисления по таблице' },
          ],
        },
        {
          id: 'math.data.charts',
          title: 'Диаграммы',
          skills: [
            { id: 'math.data.charts.read', code: 'M24', title: 'Чтение диаграммы' },
            { id: 'math.data.charts.compare', code: 'M25', title: 'Сравнение данных диаграммы' },
          ],
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
          skills: [
            { id: 'math.word_problems.general.one_step', code: 'M26', title: 'Текстовая задача в одно действие' },
            { id: 'math.word_problems.general.comparison', code: 'M27', title: 'Задачи на увеличение и уменьшение' },
            { id: 'math.word_problems.general.remainder', code: 'M28', title: 'Задачи с остатком' },
            { id: 'math.word_problems.general.solve', code: 'M29', title: 'Текстовая задача в несколько действий' },
          ],
        },
        {
          id: 'math.word_problems.motion',
          title: 'Задачи на движение',
          skills: [
            { id: 'math.word_problems.motion.distance', code: 'M30', title: 'Нахождение расстояния' },
            { id: 'math.word_problems.motion.time', code: 'M31', title: 'Нахождение времени в движении' },
            { id: 'math.word_problems.motion.speed', code: 'M32', title: 'Нахождение скорости в движении' },
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
          skills: [
            { id: 'math.logic.problems.sequence', code: 'M33', title: 'Закономерности и последовательности' },
            { id: 'math.logic.problems.statements', code: 'M34', title: 'Истинные и ложные утверждения' },
            { id: 'math.logic.problems.solve', code: 'M35', title: 'Решение логической задачи' },
          ],
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
export type AssertMathTopicCount = AssertExact<MathTopicTuple['length'], 21>;
export type AssertMathSkillCount = AssertExact<MathSkillTuple['length'], 35>;

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
          code: skill.code,
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
const skillsByCode = new Map(MATH_SKILLS.map((skill) => [skill.code, skill]));

export function getMathSectionById(id: string): MathSection | undefined {
  return sectionsById.get(id);
}

export function getMathTopicById(id: string): MathTopic | undefined {
  return topicsById.get(id);
}

export function getMathSkillById(id: string): MathSkill | undefined {
  return skillsById.get(id);
}

export function getMathSkillByCode(code: string): MathSkill | undefined {
  return skillsByCode.get(code as MathSkillCode);
}

export function isMathSkillId(id: string): id is MathSkillId {
  return skillsById.has(id);
}

export function isMathSkillCode(code: string): code is MathSkillCode {
  return skillsByCode.has(code as MathSkillCode);
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
  if (MATH_SECTIONS.length !== MATH_SECTION_COUNT) {
    throw new Error(`Таксономия математики: ожидалось ${MATH_SECTION_COUNT} разделов, получено ${MATH_SECTIONS.length}`);
  }
  if (MATH_TOPICS.length !== MATH_TOPIC_COUNT) {
    throw new Error(`Таксономия математики: ожидалось ${MATH_TOPIC_COUNT} тем, получено ${MATH_TOPICS.length}`);
  }
  if (MATH_SKILLS.length !== MATH_SKILL_COUNT) {
    throw new Error(`Таксономия математики: ожидалось ${MATH_SKILL_COUNT} навыков, получено ${MATH_SKILLS.length}`);
  }

  assertUniqueIds(MATH_SECTIONS, 'разделах');
  assertUniqueIds(MATH_TOPICS, 'темах');
  assertUniqueIds(MATH_SKILLS, 'навыках');

  const codes = MATH_SKILLS.map((skill) => skill.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error('Таксономия математики: повторяющиеся коды M01–M35');
  }
  if (codes.join('|') !== MATH_SKILL_CODES.join('|')) {
    throw new Error('Таксономия математики: коды навыков должны идти строго M01–M35');
  }

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
