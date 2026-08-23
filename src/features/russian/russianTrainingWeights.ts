/**
 * Weighted training model for Russian R01–R25.
 * trainingWeight values — утверждённые коэффициенты (отдельно от examWeight).
 */
import type { RussianSkillCode } from '../../data/taxonomy/russian';

export type RussianWeightTier = 'CORE_HIGH' | 'CORE_MEDIUM' | 'SUPPORT' | 'EXTENSION';

export type RussianSkillWeight = {
  code: RussianSkillCode;
  skillId: string;
  tier: RussianWeightTier;
  examWeight: number;
  trainingWeight: number;
  weeklyTarget: number;
  vprTasks: string;
  notes: string;
};

/** 15 заданий КИМ ВПР-2027 русский язык 4 класс */
export const VPR_2027_RUSSIAN_OFFICIAL = {
  taskCount: 15,
  source: 'ФИОКО Описание КИМ ВПР-2027 Русский язык 4 класс',
  tasks: [
    { n: 1, focus: 'диктант', skills: ['R07', 'R01', 'R02', 'R03', 'R04'] },
    { n: 2, focus: 'однородные (пунктуация)', skills: ['R05', 'R11'] },
    { n: '3.1', focus: 'грамматическая основа', skills: ['R10'] },
    { n: '3.2', focus: 'части речи', skills: ['R12'] },
    { n: 4, focus: 'ударение', skills: ['R08'] },
    { n: 5, focus: 'звуко-буквенный', skills: ['R09'] },
    { n: 6, focus: 'найти и исправить', skills: ['R06'] },
    { n: 7, focus: 'тема / основная мысль', skills: ['R18'] },
    { n: 8, focus: 'план', skills: ['R19'] },
    { n: 9, focus: 'вопрос по тексту', skills: ['R20'] },
    { n: 10, focus: 'значение слова', skills: ['R16'] },
    { n: 11, focus: 'синоним / антоним', skills: ['R17'] },
    { n: 12, focus: 'состав слова', skills: ['R15'] },
    { n: 13, focus: 'существительное', skills: ['R13'] },
    { n: 14, focus: 'прилагательное', skills: ['R14'] },
    { n: 15, focus: 'мини-текст + фразеологизм', skills: ['R21', 'R22'] },
  ],
} as const;

export const EXTENSION_CAP = 0.12;

export const RUSSIAN_SKILL_WEIGHTS: readonly RussianSkillWeight[] = [
  { code: 'R01', skillId: 'russian.orthography.base', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 9, weeklyTarget: 14, vprTasks: '1', notes: 'Базовая орфография' },
  { code: 'R02', skillId: 'russian.orthography.noun_endings', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1', notes: 'Окончания сущ.' },
  { code: 'R03', skillId: 'russian.orthography.adj_endings', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 7, weeklyTarget: 11, vprTasks: '1', notes: 'Окончания прил.' },
  { code: 'R04', skillId: 'russian.orthography.verb_spelling', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1', notes: 'Правописание глагола' },
  { code: 'R05', skillId: 'russian.punctuation.homogeneous', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 11, vprTasks: '2', notes: 'Пунктуация ОЧ' },
  { code: 'R06', skillId: 'russian.orthography.proofreading', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 9, weeklyTarget: 14, vprTasks: '6', notes: 'Орфозоркость' },
  { code: 'R07', skillId: 'russian.orthography.dictation_prep', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 9, weeklyTarget: 15, vprTasks: '1', notes: 'Диктант-подготовка' },
  { code: 'R08', skillId: 'russian.phonetics.stress', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '4', notes: 'Ударение' },
  { code: 'R09', skillId: 'russian.phonetics.sound_letter', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '5', notes: 'Звуко-буквенный' },
  { code: 'R10', skillId: 'russian.syntax.base', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 8, weeklyTarget: 12, vprTasks: '3.1', notes: 'Грам. основа' },
  { code: 'R11', skillId: 'russian.syntax.homogeneous', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '2', notes: 'ОЧ синтаксис' },
  { code: 'R12', skillId: 'russian.morphology.parts_of_speech', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '3.2', notes: 'Части речи' },
  { code: 'R13', skillId: 'russian.morphology.noun', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 11, vprTasks: '13', notes: 'Существительное' },
  { code: 'R14', skillId: 'russian.morphology.adjective', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '14', notes: 'Прилагательное' },
  { code: 'R15', skillId: 'russian.morphology.word_structure', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 8, weeklyTarget: 12, vprTasks: '12', notes: 'Состав слова' },
  { code: 'R16', skillId: 'russian.lexis.context_meaning', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '10', notes: 'Значение по контексту' },
  { code: 'R17', skillId: 'russian.lexis.synonyms_antonyms', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '11', notes: 'Синонимы/антонимы' },
  { code: 'R18', skillId: 'russian.text.theme_main_idea', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 9, weeklyTarget: 14, vprTasks: '7', notes: 'Тема/мысль' },
  { code: 'R19', skillId: 'russian.text.plan', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 10, weeklyTarget: 16, vprTasks: '8', notes: 'План текста' },
  { code: 'R20', skillId: 'russian.text.comprehension', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 7, weeklyTarget: 9, vprTasks: '9', notes: 'Вопрос по тексту' },
  { code: 'R21', skillId: 'russian.speech.situational', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '15', notes: 'Ситуация общения' },
  { code: 'R22', skillId: 'russian.speech.idiom', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '15', notes: 'Фразеологизм' },
  { code: 'R23', skillId: 'russian.reasoning.analysis', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 9, weeklyTarget: 14, vprTasks: 'support', notes: 'Рассуждение/разбор' },
  { code: 'R24', skillId: 'russian.syntax.simple_complex', tier: 'SUPPORT', examWeight: 4, trainingWeight: 4, weeklyTarget: 5, vprTasks: 'curriculum', notes: 'Простое/сложное' },
  { code: 'R25', skillId: 'russian.morphology.verb', tier: 'SUPPORT', examWeight: 5, trainingWeight: 5, weeklyTarget: 6, vprTasks: 'curriculum', notes: 'Признаки глагола' },
] as const;

export function getRussianSkillWeight(code: RussianSkillCode): RussianSkillWeight {
  const row = RUSSIAN_SKILL_WEIGHTS.find((w) => w.code === code);
  if (!row) throw new Error(`No weight for ${code}`);
  return row;
}

export function getRussianSkillWeightBySkillId(skillId: string): RussianSkillWeight | undefined {
  return RUSSIAN_SKILL_WEIGHTS.find((w) => w.skillId === skillId);
}

export function isExtensionRussianSkill(code: RussianSkillCode): boolean {
  return getRussianSkillWeight(code).tier === 'EXTENSION';
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

export function recommendRussianSessionSkillMix(slotCount: number, seed = 20270823): RussianSkillCode[] {
  if (slotCount <= 0) return [];
  const rng = mulberry32(seed >>> 0);
  const result: RussianSkillCode[] = [];

  const boost: RussianSkillCode[] = ['R07', 'R19', 'R23', 'R18', 'R06'];
  for (const code of boost) {
    if (result.length < slotCount && (seed + result.length) % 3 === 0) {
      result.push(code);
    }
  }

  const totalWeight = RUSSIAN_SKILL_WEIGHTS.reduce((s, w) => s + w.trainingWeight, 0);
  while (result.length < slotCount) {
    let r = rng() * totalWeight;
    let picked: RussianSkillCode = 'R01';
    for (const w of RUSSIAN_SKILL_WEIGHTS) {
      r -= w.trainingWeight;
      if (r <= 0) {
        picked = w.code;
        break;
      }
    }
    result.push(picked);
  }
  return result.slice(0, slotCount);
}

export const REASONING_SUBTYPE_HINTS = ['first_step', 'next_step', 'find_error', 'choose_sequence', 'reasoningMode'] as const;
