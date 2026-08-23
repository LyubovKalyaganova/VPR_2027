/**
 * Wiring: MATH_SKILL_WEIGHTS → recommendSessionSkillMix → реальные Task для сессии.
 * Не создаёт M36+. Не меняет Task contract / generatorScaffold.
 */
import type { Difficulty, Task } from '../../types';
import type { MathSkillCode } from '../../data/taxonomy/math';
import { MATH_SKILLS } from '../../data/taxonomy/math';
import {
  generateM01Task,
  generateM02Task,
  generateM03Task,
  generateM04Task,
  generateM05Task,
  generateM06Task,
  generateM07Task,
  generateM08Task,
  generateM09Task,
  generateM10Task,
  generateM11Task,
  generateM12Task,
  generateM13Task,
  generateM14Task,
  generateM15Task,
  generateM16Task,
  generateM17Task,
  generateM18Task,
  generateM19Task,
  generateM20Task,
  generateM21Task,
  generateM22Task,
  generateM23Task,
  generateM24Task,
  generateM25Task,
  generateM26Task,
  generateM27Task,
  generateM28Task,
  generateM29Task,
  generateM30Task,
  generateM31Task,
  generateM32Task,
  generateM33Task,
  generateM34Task,
  generateM35Task,
} from './generators';
import {
  getMathSkillWeight,
  getMathSkillWeightBySkillId,
  recommendSessionSkillMix,
  type MathWeightTier,
} from './mathTrainingWeights';
import { shuffle } from '../../utils/shuffle';

type Level = 1 | 2 | 3;

type SkillTaskFactory = (difficulty: Level, seed: number) => Task;

const GENERATORS: Record<MathSkillCode, SkillTaskFactory> = {
  M01: (d, s) => generateM01Task({ difficulty: d, seed: s }),
  M02: (d, s) => generateM02Task({ difficulty: d, seed: s }),
  M03: (d, s) => generateM03Task({ difficulty: d, seed: s }),
  M04: (d, s) => generateM04Task({ difficulty: d, seed: s }),
  M05: (d, s) => generateM05Task({ difficulty: d, seed: s }),
  M06: (d, s) => generateM06Task({ difficulty: d, seed: s }),
  M07: (d, s) => generateM07Task({ difficulty: d, seed: s }),
  M08: (d, s) => generateM08Task({ difficulty: d, seed: s }),
  M09: (d, s) => generateM09Task({ difficulty: d, seed: s }),
  M10: (d, s) => generateM10Task({ difficulty: d, seed: s }),
  M11: (d, s) => generateM11Task({ difficulty: d, seed: s }),
  M12: (d, s) => generateM12Task({ difficulty: d, seed: s }),
  M13: (d, s) => generateM13Task({ difficulty: d, seed: s }),
  M14: (d, s) => generateM14Task({ difficulty: d, seed: s }),
  M15: (d, s) => generateM15Task({ difficulty: d, seed: s }),
  M16: (d, s) => generateM16Task({ difficulty: d, seed: s }),
  M17: (d, s) => generateM17Task({ difficulty: d, seed: s }),
  M18: (d, s) => generateM18Task({ difficulty: d, seed: s }),
  M19: (d, s) => generateM19Task({ difficulty: d, seed: s }),
  M20: (d, s) => generateM20Task({ difficulty: d, seed: s }),
  M21: (d, s) => generateM21Task({ difficulty: d, seed: s }),
  M22: (d, s) => generateM22Task({ difficulty: d, seed: s }),
  M23: (d, s) => generateM23Task({ difficulty: d, seed: s }),
  M24: (d, s) => generateM24Task({ difficulty: d, seed: s }),
  M25: (d, s) => generateM25Task({ difficulty: d, seed: s }),
  M26: (d, s) => generateM26Task({ difficulty: d, seed: s }),
  M27: (d, s) => generateM27Task({ difficulty: d, seed: s }),
  M28: (d, s) => generateM28Task({ difficulty: d, seed: s }),
  M29: (d, s) => generateM29Task({ difficulty: d, seed: s }),
  M30: (d, s) => generateM30Task({ difficulty: d, seed: s }),
  M31: (d, s) => generateM31Task({ difficulty: d, seed: s }),
  M32: (d, s) => generateM32Task({ difficulty: d, seed: s }),
  M33: (d, s) => generateM33Task({ difficulty: d, seed: s }),
  M34: (d, s) => generateM34Task({ difficulty: d, seed: s }),
  M35: (d, s) => generateM35Task({ difficulty: d, seed: s }),
};

function asLevel(difficulty: Difficulty): Level {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

export function hasGeneratorForSkillCode(code: string): code is MathSkillCode {
  return Object.prototype.hasOwnProperty.call(GENERATORS, code);
}

export function generateTaskForMathSkillCode(
  code: MathSkillCode,
  difficulty: Difficulty,
  seed: number,
): Task {
  const factory = GENERATORS[code];
  if (!factory) {
    throw new Error(`Нет генератора для ${code}`);
  }
  const level = asLevel(difficulty);
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return factory(level, (seed + attempt * 104729) >>> 0);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Не удалось сгенерировать ${code} L${level}: ${String(lastError)}`);
}

export function generateTaskForMathSkillId(skillId: string, difficulty: Difficulty, seed: number): Task {
  const row = getMathSkillWeightBySkillId(skillId);
  if (!row) {
    throw new Error(`Неизвестный skillId для тренировки: ${skillId}`);
  }
  return generateTaskForMathSkillCode(row.code, difficulty, seed);
}

/**
 * Подбор заданий для quick / normal / random:
 * веса → mix skill codes → генерация Task (не равномерный shuffle банка).
 */
export function selectWeightedMathSessionTasks(
  count: number,
  options?: { seed?: number; shuffleOrder?: boolean },
): Task[] {
  if (count <= 0) return [];
  const baseSeed = (options?.seed ?? Date.now()) >>> 0;
  const mix = recommendSessionSkillMix(count, baseSeed);
  const tasks: Task[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < mix.length; index += 1) {
    const code = mix[index]!;
    // M29: чаще L2/L3 — там choose_solution / рассуждение (L1 = только two_ordered)
    const difficulty: Level =
      code === 'M29'
        ? (([2, 3, 2] as const)[(baseSeed + index) % 3] as Level)
        : (((baseSeed + index) % 3) + 1) as Level;
    const slotSeed = (baseSeed + index * 7919) >>> 0;
    let task: Task | null = null;
    for (let attempt = 0; attempt < 40 && !task; attempt += 1) {
      const seed = (slotSeed + attempt * 104729) >>> 0;
      try {
        if (code === 'M26' && (baseSeed + index) % 12 === 0) {
          task = generateM26Task({ difficulty, seed, subtype: 'share' });
        } else if (code === 'M29' && difficulty >= 2 && (baseSeed + index) % 2 === 0) {
          const modes = ['full', 'first', 'next', 'error'] as const;
          task = generateM29Task({
            difficulty,
            seed,
            subtype: 'choose_solution',
            reasoningMode: modes[(baseSeed + index) % modes.length],
          });
        } else {
          task = generateTaskForMathSkillCode(code, difficulty, seed);
        }
      } catch {
        task = null;
      }
    }
    if (!task) {
      task = generateTaskForMathSkillCode(code, difficulty, slotSeed);
    }
    if (seenIds.has(task.id)) {
      task = { ...task, id: `${task.id}-slot${index}` };
    }
    seenIds.add(task.id);
    tasks.push(task);
  }

  return options?.shuffleOrder === false ? tasks : shuffle(tasks);
}

/** Пул для repository / adaptive / topic: несколько заданий на каждый M01–M35. */
export function buildMathTrainingPool(options?: { perLevel?: number; seed?: number }): Task[] {
  const perLevel = options?.perLevel ?? 2;
  const baseSeed = (options?.seed ?? 20270823) >>> 0;
  const tasks: Task[] = [];
  const codes = Object.keys(GENERATORS) as MathSkillCode[];
  if (codes.length !== 35) {
    throw new Error(`Ожидалось 35 генераторов, получено ${codes.length}`);
  }
  for (let c = 0; c < codes.length; c += 1) {
    const code = codes[c]!;
    for (const difficulty of [1, 2, 3] as const) {
      for (let i = 0; i < perLevel; i += 1) {
        const seed = (baseSeed + c * 10007 + difficulty * 97 + i * 13) >>> 0;
        const task = generateTaskForMathSkillCode(code, difficulty, seed);
        tasks.push({ ...task, id: `pool-${code}-L${difficulty}-${i}-${task.id}` });
      }
    }
  }
  return tasks;
}

export function tierForSkillId(skillId: string): MathWeightTier | undefined {
  return getMathSkillWeightBySkillId(skillId)?.tier;
}

export function trainingWeightForSkillId(skillId: string): number {
  return getMathSkillWeightBySkillId(skillId)?.trainingWeight ?? 1;
}

/** Порядок skillId для cold-start adaptive: выше trainingWeight раньше. */
export function orderSkillIdsByTrainingWeight(skillIds: readonly string[]): string[] {
  return [...skillIds].sort((a, b) => {
    const wa = trainingWeightForSkillId(a);
    const wb = trainingWeightForSkillId(b);
    if (wb !== wa) return wb - wa;
    return a.localeCompare(b);
  });
}

export function assertNoMathSkillBeyondM35(): void {
  if (MATH_SKILLS.length !== 35) {
    throw new Error(`taxonomy skills ${MATH_SKILLS.length} !== 35`);
  }
  for (const skill of MATH_SKILLS) {
    if (!hasGeneratorForSkillCode(skill.code)) {
      throw new Error(`Нет генератора для ${skill.code}`);
    }
    getMathSkillWeight(skill.code);
  }
}
