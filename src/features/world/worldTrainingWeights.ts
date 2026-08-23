/**
 * Weighted training model for World W01–W25.
 */
import type { WorldSkillCode } from '../../data/taxonomy/world';

export type WorldWeightTier = 'CORE_HIGH' | 'CORE_MEDIUM' | 'SUPPORT' | 'EXTENSION';

export type WorldSkillWeight = {
  code: WorldSkillCode;
  skillId: string;
  tier: WorldWeightTier;
  examWeight: number;
  trainingWeight: number;
  weeklyTarget: number;
  vprTasks: string;
  notes: string;
};

/** 10 заданий КИМ ВПР-2027 окружающий мир 4 класс */
export const VPR_2027_WORLD_OFFICIAL = {
  taskCount: 10,
  maxPoints: 28,
  timeMinutes: 45,
  source: 'ФИОКО Описание КИМ ВПР-2027 Окружающий мир 4 класс',
  tasks: [
    { n: '1', focus: 'таблица прогноза погоды', skills: ['W01'] },
    { n: '2.1', focus: 'карта природных зон', skills: ['W02'] },
    { n: '2.2', focus: 'флора/фауна зоны', skills: ['W02'] },
    { n: '2.3', focus: 'утверждения о зоне', skills: ['W03'] },
    { n: '3', focus: 'цепь питания', skills: ['W04'] },
    { n: '4', focus: 'органы тела', skills: ['W05'] },
    { n: '5', focus: 'здоровье', skills: ['W06'] },
    { n: '6', focus: 'безопасность', skills: ['W07'] },
    { n: '7.1', focus: 'эксперимент', skills: ['W08'] },
    { n: '7.2', focus: 'вывод по опыту', skills: ['W09'] },
    { n: '8.1', focus: 'отрасли экономики', skills: ['W10'] },
    { n: '8.2', focus: 'социальная значимость труда', skills: ['W10'] },
    { n: '9.1', focus: 'история: личности', skills: ['W11'] },
    { n: '9.2', focus: 'лента времени', skills: ['W12'] },
    { n: '10.1', focus: 'родной край: факты', skills: ['W13'] },
    { n: '10.2', focus: 'родной край: высказывание', skills: ['W14'] },
  ],
} as const;

export const EXTENSION_CAP = 0.1;

export const WORLD_SKILL_WEIGHTS: readonly WorldSkillWeight[] = [
  { code: 'W01', skillId: 'world.nature.weather', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1', notes: 'Погода' },
  { code: 'W02', skillId: 'world.nature.map_zones', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 9, weeklyTarget: 14, vprTasks: '2.1-2.2', notes: 'Карта зон' },
  { code: 'W03', skillId: 'world.nature.zone_life', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '2.3', notes: 'Флора/фауна' },
  { code: 'W04', skillId: 'world.nature.food_chain', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 9, weeklyTarget: 14, vprTasks: '3', notes: 'Цепь питания' },
  { code: 'W05', skillId: 'world.nature.body_structure', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '4', notes: 'Тело' },
  { code: 'W06', skillId: 'world.nature.health', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 7, weeklyTarget: 9, vprTasks: '5', notes: 'Здоровье' },
  { code: 'W07', skillId: 'world.safety.public', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '6', notes: 'Безопасность' },
  { code: 'W08', skillId: 'world.nature.experiment_read', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 7, weeklyTarget: 9, vprTasks: '7.1', notes: 'Эксперимент' },
  { code: 'W09', skillId: 'world.nature.experiment_conclusion', tier: 'CORE_HIGH', examWeight: 5, trainingWeight: 8, weeklyTarget: 12, vprTasks: '7.2', notes: 'Вывод' },
  { code: 'W10', skillId: 'world.society.economy', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 9, weeklyTarget: 14, vprTasks: '8.1-8.2', notes: 'Экономика' },
  { code: 'W11', skillId: 'world.society.history_match', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 7, weeklyTarget: 10, vprTasks: '9.1', notes: 'История' },
  { code: 'W12', skillId: 'world.society.timeline', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 8, weeklyTarget: 12, vprTasks: '9.2', notes: 'Лента времени' },
  { code: 'W13', skillId: 'world.society.region_facts', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 10, vprTasks: '10.1', notes: 'Родной край' },
  { code: 'W14', skillId: 'world.society.region_speech', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 8, weeklyTarget: 12, vprTasks: '10.2', notes: 'Высказывание' },
  { code: 'W15', skillId: 'world.nature.cause_effect', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 7, weeklyTarget: 8, vprTasks: 'curriculum', notes: 'Причины в природе' },
  { code: 'W16', skillId: 'world.nature.ecology', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 6, weeklyTarget: 7, vprTasks: 'curriculum', notes: 'Экология' },
  { code: 'W17', skillId: 'world.nature.classification', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 6, weeklyTarget: 7, vprTasks: 'curriculum', notes: 'Классификация' },
  { code: 'W18', skillId: 'world.nature.geography', tier: 'SUPPORT', examWeight: 3, trainingWeight: 5, weeklyTarget: 5, vprTasks: 'curriculum', notes: 'География' },
  { code: 'W19', skillId: 'world.society.civic', tier: 'SUPPORT', examWeight: 3, trainingWeight: 5, weeklyTarget: 5, vprTasks: 'curriculum', notes: 'Гражданские знания' },
  { code: 'W20', skillId: 'world.society.historical_map', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: 'curriculum', notes: 'Ист. карта' },
  { code: 'W21', skillId: 'world.society.heritage', tier: 'EXTENSION', examWeight: 2, trainingWeight: 3, weeklyTarget: 2, vprTasks: 'extension', notes: 'Наследие' },
  { code: 'W22', skillId: 'world.safety.online', tier: 'EXTENSION', examWeight: 2, trainingWeight: 3, weeklyTarget: 2, vprTasks: 'extension', notes: 'Интернет' },
  { code: 'W23', skillId: 'world.nature.earth_sun', tier: 'SUPPORT', examWeight: 3, trainingWeight: 5, weeklyTarget: 5, vprTasks: 'curriculum', notes: 'Земля/Солнце' },
  { code: 'W24', skillId: 'world.nature.methods', tier: 'EXTENSION', examWeight: 2, trainingWeight: 3, weeklyTarget: 2, vprTasks: 'extension', notes: 'Методы' },
  { code: 'W25', skillId: 'world.reasoning.analysis', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 9, weeklyTarget: 14, vprTasks: 'reasoning', notes: 'Рассуждение' },
] as const;

export function getWorldSkillWeight(code: WorldSkillCode): WorldSkillWeight {
  const row = WORLD_SKILL_WEIGHTS.find((w) => w.code === code);
  if (!row) throw new Error(`No weight for ${code}`);
  return row;
}

export function getWorldSkillWeightBySkillId(skillId: string): WorldSkillWeight | undefined {
  return WORLD_SKILL_WEIGHTS.find((w) => w.skillId === skillId);
}

export function isExtensionWorldSkill(code: WorldSkillCode): boolean {
  return getWorldSkillWeight(code).tier === 'EXTENSION';
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

export function recommendWorldSessionSkillMix(slotCount: number, seed = 20270823): WorldSkillCode[] {
  if (slotCount <= 0) return [];
  const rng = mulberry32(seed >>> 0);
  const result: WorldSkillCode[] = [];

  const boost: WorldSkillCode[] = ['W02', 'W04', 'W10', 'W25', 'W01'];
  for (const code of boost) {
    if (result.length < slotCount && (seed + result.length) % 3 === 0) {
      result.push(code);
    }
  }

  const extensionCodes = new Set(WORLD_SKILL_WEIGHTS.filter((w) => w.tier === 'EXTENSION').map((w) => w.code));
  const maxExtension = Math.floor(slotCount * EXTENSION_CAP);
  let extensionCount = result.filter((c) => extensionCodes.has(c)).length;

  const totalWeight = WORLD_SKILL_WEIGHTS.reduce((s, w) => s + w.trainingWeight, 0);
  while (result.length < slotCount) {
    let r = rng() * totalWeight;
    let picked: WorldSkillCode = 'W01';
    for (const w of WORLD_SKILL_WEIGHTS) {
      r -= w.trainingWeight;
      if (r <= 0) {
        picked = w.code;
        break;
      }
    }
    if (extensionCodes.has(picked) && extensionCount >= maxExtension) {
      const nonExt = WORLD_SKILL_WEIGHTS.filter((w) => w.tier !== 'EXTENSION');
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

export const REASONING_SUBTYPE_HINTS = ['first_step', 'next_step', 'find_error', 'choose_sequence', 'cause_effect'] as const;
