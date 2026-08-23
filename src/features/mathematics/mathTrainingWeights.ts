/**
 * Weighted training model for mathematics M01–M35.
 *
 * Separates:
 * - generationPoolHint — how large a generator bank can be (audit convenience)
 * - examWeight — share of official VPR-2027 primary points (max 18)
 * - trainingWeight — how much practice a child should get in the app
 *
 * Source: official ФИОКО «Описание КИМ ВПР 2027 Математика 4 класс»
 * (11 tasks, max 18 points). Fractions/shares are NOT listed as a VPR item → EXTENSION.
 *
 * Does NOT change taxonomy (still 35 skills). Does NOT create M36.
 */
import type { MathSkillCode } from '../../data/taxonomy/math';

export type MathWeightTier = 'CORE_HIGH' | 'CORE_MEDIUM' | 'SUPPORT' | 'EXTENSION';

export type MathSkillWeight = {
  code: MathSkillCode;
  skillId: string;
  tier: MathWeightTier;
  /** Relative exam importance 1–10 (derived from VPR points + role). */
  examWeight: number;
  /** Relative training volume 1–10 (may exceed exam for hard rare skills). */
  trainingWeight: number;
  /** Suggested tasks per training week (not generation pool size). */
  weeklyTarget: number;
  vprTasks: string;
  notes: string;
};

/**
 * Official VPR-2027 point map (confirmed):
 * 1:1, 2:1, 3:2, 4:1, 5(1)+5(2):1+1, 6(1)+6(2):1+1, 7:1, 8:2, 9:2, 10:2, 11:2 → 18.
 */
export const VPR_2027_OFFICIAL = {
  taskCount: 11,
  maxPrimaryScore: 18,
  source: 'ФИОКО Описание КИМ ВПР-2027 Математика 4 класс',
  tasks: [
    { n: 1, points: 1, focus: 'арифметика ≤100', skills: ['M03', 'M04', 'M05', 'M06', 'M07'] },
    { n: 2, points: 1, focus: 'порядок действий', skills: ['M08'] },
    { n: 3, points: 2, focus: 'практика / лишние данные / способ', skills: ['M29', 'M22', 'M23'] },
    { n: 4, points: 1, focus: 'единицы величин', skills: ['M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] },
    { n: 5, points: 2, focus: 'периметр + площадь составных', skills: ['M19', 'M20'] },
    { n: 6, points: 2, focus: 'таблицы / диаграммы', skills: ['M22', 'M23', 'M24', 'M25'] },
    { n: 7, points: 1, focus: 'письменные многозначные', skills: ['M03', 'M04', 'M05', 'M06', 'M07'] },
    { n: 8, points: 2, focus: 'текстовые 3–4 действия + величины', skills: ['M29', 'M15', 'M09'] },
    { n: 9, points: 2, focus: 'движение + производительность', skills: ['M30', 'M31', 'M32', 'M26', 'M29'] },
    { n: 10, points: 2, focus: 'пространство / схема / чертёж', skills: ['M17'] },
    { n: 11, points: 2, focus: 'нестандарт / составные / рассуждение', skills: ['M29', 'M35', 'M33', 'M34'] },
  ],
} as const;

/** Generation pool may stay large; training uses weeklyTarget / trainingWeight. */
export const MATH_SKILL_WEIGHTS: readonly MathSkillWeight[] = [
  { code: 'M01', skillId: 'math.calculation.numbers.place_value', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 6, weeklyTarget: 8, vprTasks: 'support 1/7', notes: 'Опора вычислений' },
  { code: 'M02', skillId: 'math.calculation.numbers.compare', tier: 'CORE_MEDIUM', examWeight: 3, trainingWeight: 5, weeklyTarget: 6, vprTasks: 'support', notes: 'Сравнение чисел' },
  { code: 'M03', skillId: 'math.calculation.multi_digit.addition', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1,7', notes: 'Базовая арифметика' },
  { code: 'M04', skillId: 'math.calculation.multi_digit.subtraction', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1,7', notes: 'Базовая арифметика' },
  { code: 'M05', skillId: 'math.calculation.mul_div.multiplication', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1,7', notes: 'Базовая арифметика' },
  { code: 'M06', skillId: 'math.calculation.mul_div.division', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 8, weeklyTarget: 12, vprTasks: '1,7', notes: 'Базовая арифметика' },
  { code: 'M07', skillId: 'math.calculation.mul_div.division_remainder', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: '1,7', notes: 'Остаток' },
  { code: 'M08', skillId: 'math.order_of_operations.expressions.evaluate', tier: 'CORE_HIGH', examWeight: 8, trainingWeight: 8, weeklyTarget: 12, vprTasks: '2', notes: 'Прямое №2' },
  { code: 'M09', skillId: 'math.quantities.units.convert', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 7, weeklyTarget: 10, vprTasks: '4,8', notes: 'Единицы + л' },
  { code: 'M10', skillId: 'math.quantities.time.read_clock', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: '4', notes: 'Визуал времени' },
  { code: 'M11', skillId: 'math.quantities.time.calculate', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: '4,8', notes: 'Интервалы' },
  { code: 'M12', skillId: 'math.quantities.mass.calculate', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: '4,8', notes: 'Масса' },
  { code: 'M13', skillId: 'math.quantities.length.calculate', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: '4,8', notes: 'Длина' },
  { code: 'M14', skillId: 'math.quantities.area.convert', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: '4', notes: 'Площадь как величина' },
  { code: 'M15', skillId: 'math.quantities.cost.calculate', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: '4,8', notes: 'Стоимость в текстах' },
  { code: 'M16', skillId: 'math.quantities.speed.convert', tier: 'SUPPORT', examWeight: 4, trainingWeight: 5, weeklyTarget: 5, vprTasks: '4,9', notes: 'Скорость как величина' },
  { code: 'M17', skillId: 'math.geometry.figures.identify', tier: 'CORE_MEDIUM', examWeight: 7, trainingWeight: 5, weeklyTarget: 6, vprTasks: '10', notes: 'Пространство/схемы — exam↑ training↓ (не раздувать SVG)' },
  { code: 'M18', skillId: 'math.geometry.grid.read', tier: 'SUPPORT', examWeight: 2, trainingWeight: 3, weeklyTarget: 3, vprTasks: 'support 5', notes: 'Сетка' },
  { code: 'M19', skillId: 'math.geometry.perimeter.calculate', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 10, vprTasks: '5', notes: 'Периметр' },
  { code: 'M20', skillId: 'math.geometry.figure_area.calculate', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 10, vprTasks: '5', notes: 'Площадь фигур' },
  { code: 'M21', skillId: 'math.geometry.symmetry.identify', tier: 'SUPPORT', examWeight: 2, trainingWeight: 3, weeklyTarget: 3, vprTasks: 'curriculum', notes: 'Симметрия — программа, не ядро ВПР-2027 КИМ' },
  { code: 'M22', skillId: 'math.data.tables.read', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '3,6', notes: 'Таблицы' },
  { code: 'M23', skillId: 'math.data.tables.calculate', tier: 'CORE_MEDIUM', examWeight: 6, trainingWeight: 6, weeklyTarget: 8, vprTasks: '6', notes: 'Вычисления по таблице' },
  { code: 'M24', skillId: 'math.data.charts.read', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 5, weeklyTarget: 6, vprTasks: '6', notes: 'Диаграммы' },
  { code: 'M25', skillId: 'math.data.charts.compare', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 5, weeklyTarget: 6, vprTasks: '6', notes: 'Сравнение данных' },
  { code: 'M26', skillId: 'math.word_problems.general.one_step', tier: 'CORE_HIGH', examWeight: 6, trainingWeight: 8, weeklyTarget: 12, vprTasks: '9 support', notes: 'Одно действие + производительность; доли — малый subtype' },
  { code: 'M27', skillId: 'math.word_problems.general.comparison', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: 'support 8', notes: 'На сколько / во сколько' },
  { code: 'M28', skillId: 'math.word_problems.general.remainder', tier: 'CORE_MEDIUM', examWeight: 4, trainingWeight: 5, weeklyTarget: 6, vprTasks: 'support', notes: 'Остаток в тексте' },
  { code: 'M29', skillId: 'math.word_problems.general.solve', tier: 'CORE_HIGH', examWeight: 10, trainingWeight: 10, weeklyTarget: 18, vprTasks: '3,8,9,11', notes: 'Главный навык рассуждения + составные + choose_solution' },
  { code: 'M30', skillId: 'math.word_problems.motion.distance', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 10, vprTasks: '9', notes: 's = v·t' },
  { code: 'M31', skillId: 'math.word_problems.motion.time', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 10, vprTasks: '9', notes: 't = s÷v' },
  { code: 'M32', skillId: 'math.word_problems.motion.speed', tier: 'CORE_HIGH', examWeight: 7, trainingWeight: 7, weeklyTarget: 10, vprTasks: '9', notes: 'v = s÷t' },
  { code: 'M33', skillId: 'math.logic.problems.sequence', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: '11 support', notes: 'Ряды; в 2027 №9 уже не логика' },
  { code: 'M34', skillId: 'math.logic.problems.statements', tier: 'SUPPORT', examWeight: 3, trainingWeight: 4, weeklyTarget: 4, vprTasks: '11 support', notes: 'Утверждения' },
  { code: 'M35', skillId: 'math.logic.problems.solve', tier: 'CORE_MEDIUM', examWeight: 5, trainingWeight: 6, weeklyTarget: 8, vprTasks: '11', notes: 'Логический вывод' },
] as const;

export function getMathSkillWeight(code: MathSkillCode): MathSkillWeight {
  const row = MATH_SKILL_WEIGHTS.find((w) => w.code === code);
  if (!row) throw new Error(`No weight for ${code}`);
  return row;
}

export function getMathSkillWeightBySkillId(skillId: string): MathSkillWeight | undefined {
  return MATH_SKILL_WEIGHTS.find((w) => w.skillId === skillId);
}

/** Share of weekly practice slots for a skill (sums to ~1). */
export function trainingShare(code: MathSkillCode): number {
  const total = MATH_SKILL_WEIGHTS.reduce((s, w) => s + w.weeklyTarget, 0);
  return getMathSkillWeight(code).weeklyTarget / total;
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

function largestRemainderMix(slotCount: number): MathSkillCode[] {
  const totalWeekly = MATH_SKILL_WEIGHTS.reduce((s, w) => s + w.weeklyTarget, 0);
  const rows = MATH_SKILL_WEIGHTS.map((w) => {
    const exact = (w.weeklyTarget / totalWeekly) * slotCount;
    return { code: w.code, floor: Math.floor(exact), frac: exact - Math.floor(exact), tier: w.tier };
  });
  let assigned = rows.reduce((s, r) => s + r.floor, 0);
  const byFrac = [...rows].sort((a, b) => b.frac - a.frac || b.floor - a.floor);
  for (const row of byFrac) {
    if (assigned >= slotCount) break;
    row.floor += 1;
    assigned += 1;
  }

  const m29 = rows.find((r) => r.code === 'M29')!;
  const m29Min = slotCount >= 15 ? 2 : 1;
  while (m29.floor < m29Min) {
    const donor =
      [...rows]
        .filter((r) => r.code !== 'M29' && r.floor > 0 && (r.tier === 'SUPPORT' || r.tier === 'EXTENSION'))
        .sort((a, b) => b.floor - a.floor)[0] ??
      [...rows].filter((r) => r.code !== 'M29' && r.floor > 0).sort((a, b) => b.floor - a.floor)[0];
    if (!donor) break;
    donor.floor -= 1;
    m29.floor += 1;
  }

  const bag: MathSkillCode[] = [];
  for (const row of rows) {
    for (let i = 0; i < row.floor; i += 1) bag.push(row.code);
  }
  while (bag.length < slotCount) bag.push('M29');
  return bag.slice(0, slotCount);
}

/**
 * Build a recommended skill mix for a session of `slotCount` tasks.
 * - Large N (≥100): largest-remainder quotas (weeklyTarget).
 * - Short sessions: seeded weighted sample by trainingWeight (CORE-HIGH чаще,
 *   SUPPORT/M17 иногда появляются; не детерминированный «всегда одни и те же 10»).
 */
export function recommendSessionSkillMix(slotCount: number, seed = 20270823): MathSkillCode[] {
  if (slotCount <= 0) return [];
  if (slotCount >= 100) {
    return largestRemainderMix(slotCount);
  }

  const rng = mulberry32(seed >>> 0);
  const result: MathSkillCode[] = [];
  const m29Min = slotCount >= 15 ? 2 : slotCount >= 5 ? 1 : 0;
  for (let i = 0; i < m29Min; i += 1) {
    result.push('M29');
  }

  const totalWeight = MATH_SKILL_WEIGHTS.reduce((s, w) => s + w.trainingWeight, 0);
  while (result.length < slotCount) {
    let r = rng() * totalWeight;
    let picked: MathSkillCode = 'M29';
    for (const w of MATH_SKILL_WEIGHTS) {
      r -= w.trainingWeight;
      if (r <= 0) {
        picked = w.code;
        break;
      }
    }
    result.push(picked);
  }
  return result;
}

/** Subtypes that count as reasoning / solution-sequence (not bare computation). */
export const REASONING_SUBTYPE_HINTS = [
  'choose_solution',
  'first_step',
  'next_step',
  'find_error',
  'extra_data',
  'solution_path',
] as const;

export function isExtensionSkill(code: MathSkillCode): boolean {
  return getMathSkillWeight(code).tier === 'EXTENSION';
}

/**
 * Fractions/shares: curriculum support inside M26/M29, NOT a separate M and NOT a VPR-2027 КИМ item.
 * Keep generation present but training share low.
 */
export const FRACTIONS_SHARES_POLICY = {
  status: 'EXTENSION_CURRICULUM_SUPPORT' as const,
  inOfficialVpr2027Kim: false,
  hostSkills: ['M26', 'M29'] as const,
  maxShareOfHostSeries: 0.15,
  note: 'Официальное Описание КИМ ВПР-2027 не выделяет доли/дроби отдельным заданием. Тренируем мало, внутри M26/M29.',
};
