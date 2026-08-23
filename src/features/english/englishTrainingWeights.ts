/**
 * Weighted training model for English E01–E18.
 */
import type { EnglishSkillCode } from '../../data/taxonomy/english';

export type EnglishWeightTier = 'CORE_HIGH' | 'CORE_MEDIUM' | 'SUPPORT';

export type EnglishSkillWeight = {
  code: EnglishSkillCode;
  skillId: string;
  tier: EnglishWeightTier;
  examWeight: number;
  trainingWeight: number;
  weeklyTarget: number;
  vprTasks: string;
  notes: string;
};

export const VPR_2027_ENGLISH_OFFICIAL = {
  taskCount: 4,
  maxPoints: 25,
  timeMinutes: 45,
  source: 'ФИОКО Описание КИМ ВПР-2027 Английский язык 4 класс',
  tasks: [
    { n: '1', focus: 'listening', skills: ['E01', 'E02', 'E18'] as const, points: 5, level: 'B' as const },
    { n: '2', focus: 'reading', skills: ['E04', 'E05', 'E06', 'E07', 'E18'] as const, points: 5, level: 'B' as const },
    { n: '3', focus: 'grammar', skills: ['E08', 'E09', 'E10', 'E11', 'E17', 'E18'] as const, points: 5, level: 'B' as const },
    { n: '4', focus: 'writing', skills: ['E14', 'E15', 'E16'] as const, points: 10, level: 'B' as const },
  ],
} as const;

export const ENGLISH_SKILL_WEIGHTS: readonly EnglishSkillWeight[] = [
  { code: 'E01', skillId: 'english.listening.specific', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 10, weeklyTarget: 14, vprTasks: '1', notes: 'Listening host' },
  { code: 'E02', skillId: 'english.listening.distractors', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 8, weeklyTarget: 10, vprTasks: '1', notes: 'Distractors' },
  { code: 'E03', skillId: 'english.listening.gist', tier: 'SUPPORT', examWeight: 2, trainingWeight: 4, weeklyTarget: 4, vprTasks: 'curriculum', notes: 'Gist' },
  { code: 'E04', skillId: 'english.reading.specific', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 10, weeklyTarget: 14, vprTasks: '2', notes: 'Reading host' },
  { code: 'E05', skillId: 'english.reading.true_statement', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 7, weeklyTarget: 9, vprTasks: '2', notes: 'True statement' },
  { code: 'E06', skillId: 'english.reading.main_idea', tier: 'SUPPORT', examWeight: 2, trainingWeight: 5, weeklyTarget: 5, vprTasks: 'curriculum', notes: 'Main idea' },
  { code: 'E07', skillId: 'english.reading.vocabulary', tier: 'SUPPORT', examWeight: 2, trainingWeight: 5, weeklyTarget: 5, vprTasks: '2/support', notes: 'Vocab in context' },
  { code: 'E08', skillId: 'english.grammar.cloze_text', tier: 'CORE_HIGH', examWeight: 9, trainingWeight: 11, weeklyTarget: 15, vprTasks: '3', notes: 'Grammar cloze host' },
  { code: 'E09', skillId: 'english.grammar.verbs', tier: 'CORE_HIGH', examWeight: 5, trainingWeight: 9, weeklyTarget: 12, vprTasks: '3', notes: 'Verb systems' },
  { code: 'E10', skillId: 'english.grammar.future', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 7, weeklyTarget: 8, vprTasks: '1/3', notes: 'Future forms' },
  { code: 'E11', skillId: 'english.grammar.forms', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 8, weeklyTarget: 10, vprTasks: '3', notes: 'Comparatives/pronouns' },
  { code: 'E12', skillId: 'english.lexis.life', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 7, weeklyTarget: 8, vprTasks: '1–4', notes: 'Lexis life/school' },
  { code: 'E13', skillId: 'english.lexis.world', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 7, weeklyTarget: 8, vprTasks: '1–4', notes: 'Lexis hobbies/places' },
  { code: 'E14', skillId: 'english.writing.form_fill', tier: 'CORE_HIGH', examWeight: 12, trainingWeight: 11, weeklyTarget: 16, vprTasks: '4', notes: 'Form host 10pts' },
  { code: 'E15', skillId: 'english.writing.spelling', tier: 'CORE_HIGH', examWeight: 5, trainingWeight: 9, weeklyTarget: 12, vprTasks: '4/K2', notes: 'Spelling K2 analog' },
  { code: 'E16', skillId: 'english.writing.completeness', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 8, weeklyTarget: 10, vprTasks: '4/K1', notes: 'Completeness K1 analog' },
  { code: 'E17', skillId: 'english.grammar.core', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 8, weeklyTarget: 9, vprTasks: 'prep', notes: 'Core structures' },
  { code: 'E18', skillId: 'english.reasoning.evidence', tier: 'CORE_HIGH', examWeight: 5, trainingWeight: 8, weeklyTarget: 12, vprTasks: 'meta', notes: 'Reasoning' },
] as const;

export function getEnglishSkillWeight(code: EnglishSkillCode): EnglishSkillWeight {
  const row = ENGLISH_SKILL_WEIGHTS.find((w) => w.code === code);
  if (!row) throw new Error(`No weight for ${code}`);
  return row;
}

export function getEnglishSkillWeightBySkillId(skillId: string): EnglishSkillWeight | undefined {
  return ENGLISH_SKILL_WEIGHTS.find((w) => w.skillId === skillId);
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

export function recommendEnglishSessionSkillMix(slotCount: number, seed = 20270824): EnglishSkillCode[] {
  if (slotCount <= 0) return [];
  const rng = mulberry32(seed >>> 0);
  const result: EnglishSkillCode[] = [];
  const boost: EnglishSkillCode[] = ['E14', 'E01', 'E04', 'E08', 'E18', 'E15'];
  for (const code of boost) {
    if (result.length < slotCount && (seed + result.length) % 2 === 0) {
      result.push(code);
    }
  }
  const totalWeight = ENGLISH_SKILL_WEIGHTS.reduce((s, w) => s + w.trainingWeight, 0);
  while (result.length < slotCount) {
    let r = rng() * totalWeight;
    let picked: EnglishSkillCode = 'E01';
    for (const w of ENGLISH_SKILL_WEIGHTS) {
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
