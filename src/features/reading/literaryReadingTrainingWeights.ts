/**
 * Weighted training model for Literary Reading L01–L24.
 * SubjectId: reading
 */
import type { ReadingSkillCode } from '../../data/taxonomy/literaryReading';

export type ReadingWeightTier = 'CORE_HIGH' | 'CORE_MEDIUM' | 'SUPPORT' | 'EXTENSION';

export type ReadingSkillWeight = {
  code: ReadingSkillCode;
  skillId: string;
  tier: ReadingWeightTier;
  examWeight: number;
  trainingWeight: number;
  weeklyTarget: number;
  vprTasks: string;
  notes: string;
};

export const VPR_2027_READING_OFFICIAL = {
  taskCount: 13,
  maxPoints: 19,
  timeMinutes: 45,
  source: 'ФИОКО Описание КИМ ВПР-2027 Литературное чтение 4 класс',
  tasks: [
    { n: '1', focus: 'фольклор / виды сказок', skills: ['L01'] as const, points: 1, level: 'B' as const },
    { n: '2', focus: 'жанр литературы', skills: ['L02'] as const, points: 1, level: 'B' as const },
    { n: '3', focus: 'рассуждение', skills: ['L03'] as const, points: 2, level: 'P' as const },
    { n: '4', focus: 'книга ↔ жанр', skills: ['L04'] as const, points: 1, level: 'B' as const },
    { n: '5', focus: 'виды текстов', skills: ['L05'] as const, points: 2, level: 'B' as const },
    { n: '6', focus: 'авторы и творчество', skills: ['L06'] as const, points: 2, level: 'B' as const },
    { n: '7', focus: 'средства выразительности', skills: ['L07'] as const, points: 1, level: 'B' as const },
    { n: '8', focus: 'интерпретация / достоверность', skills: ['L08'] as const, points: 1, level: 'B' as const },
    { n: '9', focus: 'последовательность событий', skills: ['L09'] as const, points: 1, level: 'B' as const },
    { n: '10', focus: 'слово в контексте', skills: ['L10'] as const, points: 2, level: 'B' as const },
    { n: '11', focus: 'явная информация', skills: ['L11'] as const, points: 1, level: 'B' as const },
    { n: '12', focus: 'утверждения по тексту', skills: ['L12'] as const, points: 2, level: 'B' as const },
    { n: '13', focus: 'высказывание по тексту', skills: ['L13'] as const, points: 2, level: 'P' as const },
  ],
} as const;

export const EXTENSION_CAP = 0.1;

export const READING_SKILL_WEIGHTS: readonly ReadingSkillWeight[] = [
  { code: 'L01', skillId: 'reading.genres.folklore', tier: 'CORE_HIGH', examWeight: 5, trainingWeight: 7, weeklyTarget: 10, vprTasks: '1', notes: 'Фольклор' },
  { code: 'L02', skillId: 'reading.genres.literature', tier: 'CORE_HIGH', examWeight: 5, trainingWeight: 7, weeklyTarget: 10, vprTasks: '2', notes: 'Жанры' },
  { code: 'L03', skillId: 'reading.response.opinion', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 9, weeklyTarget: 14, vprTasks: '3', notes: 'Рассуждение П' },
  { code: 'L04', skillId: 'reading.genres.book', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 5, weeklyTarget: 6, vprTasks: '4', notes: 'Книга-жанр' },
  { code: 'L05', skillId: 'reading.genres.text_types', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '5', notes: 'Виды текстов' },
  { code: 'L06', skillId: 'reading.knowledge.authors', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '6', notes: 'Авторы' },
  { code: 'L07', skillId: 'reading.knowledge.devices', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: '7', notes: 'Тропы' },
  { code: 'L08', skillId: 'reading.comprehension.interpret', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 8, weeklyTarget: 12, vprTasks: '8', notes: 'Интерпретация' },
  { code: 'L09', skillId: 'reading.comprehension.sequence', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 8, weeklyTarget: 12, vprTasks: '9', notes: 'Последовательность' },
  { code: 'L10', skillId: 'reading.comprehension.word', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '10', notes: 'Контекст' },
  { code: 'L11', skillId: 'reading.comprehension.explicit', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: '11', notes: 'Явный факт' },
  { code: 'L12', skillId: 'reading.comprehension.claims', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 9, weeklyTarget: 14, vprTasks: '12', notes: 'Утверждения' },
  { code: 'L13', skillId: 'reading.response.conclusion', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 9, weeklyTarget: 14, vprTasks: '13', notes: 'Высказывание П' },
  { code: 'L14', skillId: 'reading.comprehension.theme', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 7, weeklyTarget: 9, vprTasks: 'curriculum', notes: 'Тема' },
  { code: 'L15', skillId: 'reading.comprehension.main_idea', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 8, weeklyTarget: 10, vprTasks: 'curriculum', notes: 'Главная мысль' },
  { code: 'L16', skillId: 'reading.comprehension.title', tier: 'SUPPORT', examWeight: 2, trainingWeight: 4, weeklyTarget: 4, vprTasks: 'curriculum', notes: 'Заголовок' },
  { code: 'L17', skillId: 'reading.characters.trait', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 7, weeklyTarget: 9, vprTasks: 'support', notes: 'Герой' },
  { code: 'L18', skillId: 'reading.characters.motive', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 7, weeklyTarget: 9, vprTasks: 'support', notes: 'Мотив' },
  { code: 'L19', skillId: 'reading.characters.plan', tier: 'SUPPORT', examWeight: 2, trainingWeight: 4, weeklyTarget: 4, vprTasks: 'curriculum', notes: 'План' },
  { code: 'L20', skillId: 'reading.characters.composition', tier: 'SUPPORT', examWeight: 2, trainingWeight: 4, weeklyTarget: 4, vprTasks: 'curriculum', notes: 'Композиция' },
  { code: 'L21', skillId: 'reading.characters.author', tier: 'SUPPORT', examWeight: 2, trainingWeight: 5, weeklyTarget: 5, vprTasks: 'curriculum', notes: 'Авторская позиция' },
  { code: 'L22', skillId: 'reading.genres.prose_poetry', tier: 'SUPPORT', examWeight: 2, trainingWeight: 4, weeklyTarget: 4, vprTasks: 'curriculum', notes: 'Проза/поэзия' },
  { code: 'L23', skillId: 'reading.characters.compare', tier: 'EXTENSION', examWeight: 1, trainingWeight: 3, weeklyTarget: 2, vprTasks: 'extension', notes: 'Сравнение героев' },
  { code: 'L24', skillId: 'reading.response.reasoning', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 9, weeklyTarget: 14, vprTasks: 'reasoning', notes: 'Reasoning' },
] as const;

export function getReadingSkillWeight(code: ReadingSkillCode): ReadingSkillWeight {
  const row = READING_SKILL_WEIGHTS.find((w) => w.code === code);
  if (!row) throw new Error(`No weight for ${code}`);
  return row;
}

export function getReadingSkillWeightBySkillId(skillId: string): ReadingSkillWeight | undefined {
  return READING_SKILL_WEIGHTS.find((w) => w.skillId === skillId);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function recommendReadingSessionSkillMix(slotCount: number, seed = 20270823): ReadingSkillCode[] {
  if (slotCount <= 0) return [];
  const rng = mulberry32(seed >>> 0);
  const result: ReadingSkillCode[] = [];
  const boost: ReadingSkillCode[] = ['L03', 'L12', 'L13', 'L09', 'L24', 'L05'];
  for (const code of boost) {
    if (result.length < slotCount && (seed + result.length) % 3 === 0) {
      result.push(code);
    }
  }
  const extensionCodes = new Set(READING_SKILL_WEIGHTS.filter((w) => w.tier === 'EXTENSION').map((w) => w.code));
  const maxExtension = Math.floor(slotCount * EXTENSION_CAP);
  let extensionCount = result.filter((c) => extensionCodes.has(c)).length;
  const totalWeight = READING_SKILL_WEIGHTS.reduce((s, w) => s + w.trainingWeight, 0);
  while (result.length < slotCount) {
    let r = rng() * totalWeight;
    let picked: ReadingSkillCode = 'L01';
    for (const w of READING_SKILL_WEIGHTS) {
      r -= w.trainingWeight;
      if (r <= 0) {
        picked = w.code;
        break;
      }
    }
    if (extensionCodes.has(picked) && extensionCount >= maxExtension) {
      const nonExt = READING_SKILL_WEIGHTS.filter((w) => w.tier !== 'EXTENSION');
      let r2 = rng() * nonExt.reduce((s, w) => s + w.trainingWeight, 0);
      for (const w of nonExt) {
        r2 -= w.trainingWeight;
        if (r2 <= 0) {
          picked = w.code;
          break;
        }
      }
    }
    if (extensionCodes.has(picked)) extensionCount += 1;
    result.push(picked);
  }
  return result.slice(0, slotCount);
}

export const LITERARY_READING_SKILL_WEIGHTS = READING_SKILL_WEIGHTS;
