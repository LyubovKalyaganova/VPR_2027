/**
 * Справочник таксономии «Окружающий мир».
 * Источник ID: CONTENT_MATRIX_WORLD.md (W01–W25, заморожено).
 */
import type { SubjectId } from '../../types';

export const WORLD_SUBJECT_ID = 'world' satisfies SubjectId;

export const WORLD_SECTION_COUNT = 6;
export const WORLD_TOPIC_COUNT = 12;
export const WORLD_SKILL_COUNT = 25;

export type WorldSkillCode =
  | 'W01'
  | 'W02'
  | 'W03'
  | 'W04'
  | 'W05'
  | 'W06'
  | 'W07'
  | 'W08'
  | 'W09'
  | 'W10'
  | 'W11'
  | 'W12'
  | 'W13'
  | 'W14'
  | 'W15'
  | 'W16'
  | 'W17'
  | 'W18'
  | 'W19'
  | 'W20'
  | 'W21'
  | 'W22'
  | 'W23'
  | 'W24'
  | 'W25';

export const WORLD_SKILL_CODES: readonly WorldSkillCode[] = [
  'W01',
  'W02',
  'W03',
  'W04',
  'W05',
  'W06',
  'W07',
  'W08',
  'W09',
  'W10',
  'W11',
  'W12',
  'W13',
  'W14',
  'W15',
  'W16',
  'W17',
  'W18',
  'W19',
  'W20',
  'W21',
  'W22',
  'W23',
  'W24',
  'W25',
] as const;

export interface WorldSection {
  id: string;
  subjectId: typeof WORLD_SUBJECT_ID;
  title: string;
}

export interface WorldTopic {
  id: string;
  subjectId: typeof WORLD_SUBJECT_ID;
  sectionId: string;
  title: string;
}

export interface WorldSkill {
  id: string;
  code: WorldSkillCode;
  subjectId: typeof WORLD_SUBJECT_ID;
  sectionId: string;
  topicId: string;
  title: string;
}

export const WORLD_TAXONOMY = {
  subjectId: WORLD_SUBJECT_ID,
  sections: [
    {
      id: 'world.nature',
      title: 'Человек и природа',
      topics: [
        {
          id: 'world.nature.weather',
          title: 'Погода и природные явления',
          skills: [{ id: 'world.nature.weather', code: 'W01', title: 'Погода: таблица, символы, выводы' }],
        },
        {
          id: 'world.nature.zones',
          title: 'Природные зоны и карта',
          skills: [
            { id: 'world.nature.map_zones', code: 'W02', title: 'Карта: зоны/материки, чтение' },
            { id: 'world.nature.zone_life', code: 'W03', title: 'Флора/фауна зоны, истинность утверждений' },
          ],
        },
        {
          id: 'world.nature.food_chain',
          title: 'Цепи питания',
          skills: [{ id: 'world.nature.food_chain', code: 'W04', title: 'Цепи питания и группировка по питанию' }],
        },
        {
          id: 'world.nature.human_body',
          title: 'Тело человека',
          skills: [
            { id: 'world.nature.body_structure', code: 'W05', title: 'Строение тела человека (органы)' },
            { id: 'world.nature.health', code: 'W06', title: 'Здоровье, органы, вредные привычки' },
          ],
        },
        {
          id: 'world.nature.experiment',
          title: 'Наблюдение и эксперимент',
          skills: [
            { id: 'world.nature.experiment_read', code: 'W08', title: 'Эксперимент/наблюдение: чтение текста' },
            { id: 'world.nature.experiment_conclusion', code: 'W09', title: 'Вывод по опыту' },
          ],
        },
        {
          id: 'world.nature.cause_effect',
          title: 'Причинно-следственные связи',
          skills: [{ id: 'world.nature.cause_effect', code: 'W15', title: 'Причинно-следственные связи в природе' }],
        },
        {
          id: 'world.nature.ecology',
          title: 'Экология',
          skills: [{ id: 'world.nature.ecology', code: 'W16', title: 'Экология и охрана природы' }],
        },
        {
          id: 'world.nature.classification',
          title: 'Классификация природы',
          skills: [{ id: 'world.nature.classification', code: 'W17', title: 'Сравнение и классификация природы' }],
        },
        {
          id: 'world.nature.geography',
          title: 'География России',
          skills: [{ id: 'world.nature.geography', code: 'W18', title: 'География России: рельеф, водоёмы' }],
        },
        {
          id: 'world.nature.earth_sun',
          title: 'Земля и Солнце',
          skills: [{ id: 'world.nature.earth_sun', code: 'W23', title: 'Земля, Солнце, смена дня/сезонов' }],
        },
        {
          id: 'world.nature.methods',
          title: 'Методы познания',
          skills: [{ id: 'world.nature.methods', code: 'W24', title: 'Методы познания природы' }],
        },
      ],
    },
    {
      id: 'world.society',
      title: 'Человек и общество',
      topics: [
        {
          id: 'world.society.economy',
          title: 'Экономика и труд',
          skills: [{ id: 'world.society.economy', code: 'W10', title: 'Отрасли экономики и профессии' }],
        },
        {
          id: 'world.society.history',
          title: 'История',
          skills: [
            { id: 'world.society.history_match', code: 'W11', title: 'История: личности и события' },
            { id: 'world.society.timeline', code: 'W12', title: 'Лента времени' },
          ],
        },
        {
          id: 'world.society.region',
          title: 'Родной край',
          skills: [
            { id: 'world.society.region_facts', code: 'W13', title: 'Родной край: факты' },
            { id: 'world.society.region_speech', code: 'W14', title: 'Родной край: структурированное высказывание' },
          ],
        },
        {
          id: 'world.society.civic',
          title: 'Гражданские знания',
          skills: [{ id: 'world.society.civic', code: 'W19', title: 'Государство, символы, праздники' }],
        },
        {
          id: 'world.society.historical_map',
          title: 'Историческая карта',
          skills: [{ id: 'world.society.historical_map', code: 'W20', title: 'Историческая карта России' }],
        },
        {
          id: 'world.society.heritage',
          title: 'Всемирное наследие',
          skills: [{ id: 'world.society.heritage', code: 'W21', title: 'Всемирное наследие' }],
        },
      ],
    },
    {
      id: 'world.safety',
      title: 'Безопасность',
      topics: [
        {
          id: 'world.safety.public',
          title: 'Безопасность в обществе',
          skills: [{ id: 'world.safety.public', code: 'W07', title: 'Безопасность в городе и общественных местах' }],
        },
        {
          id: 'world.safety.online',
          title: 'Безопасность в интернете',
          skills: [{ id: 'world.safety.online', code: 'W22', title: 'Безопасность в интернете' }],
        },
      ],
    },
    {
      id: 'world.reasoning',
      title: 'Рассуждение',
      topics: [
        {
          id: 'world.reasoning.analysis',
          title: 'Ход рассуждения',
          skills: [{ id: 'world.reasoning.analysis', code: 'W25', title: 'Reasoning: ход рассуждения' }],
        },
      ],
    },
  ],
} as const;

function flattenSkills(): WorldSkill[] {
  const skills: WorldSkill[] = [];
  for (const section of WORLD_TAXONOMY.sections) {
    for (const topic of section.topics) {
      for (const skill of topic.skills) {
        skills.push({
          id: skill.id,
          code: skill.code as WorldSkillCode,
          subjectId: WORLD_SUBJECT_ID,
          sectionId: section.id,
          topicId: topic.id,
          title: skill.title,
        });
      }
    }
  }
  return skills;
}

export const WORLD_SKILLS: readonly WorldSkill[] = flattenSkills();

export const WORLD_SECTIONS: readonly WorldSection[] = WORLD_TAXONOMY.sections.map((s) => ({
  id: s.id,
  subjectId: WORLD_SUBJECT_ID,
  title: s.title,
}));

export const WORLD_TOPICS: readonly WorldTopic[] = WORLD_TAXONOMY.sections.flatMap((section) =>
  section.topics.map((topic) => ({
    id: topic.id,
    subjectId: WORLD_SUBJECT_ID,
    sectionId: section.id,
    title: topic.title,
  })),
);

export function getWorldSkillByCode(code: WorldSkillCode): WorldSkill {
  const skill = WORLD_SKILLS.find((s) => s.code === code);
  if (!skill) throw new Error(`Unknown World skill code ${code}`);
  return skill;
}
