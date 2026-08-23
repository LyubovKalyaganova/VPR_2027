/**
 * Wiring: RUSSIAN_SKILL_WEIGHTS → recommendRussianSessionSkillMix → Task для сессии.
 */
import type { Difficulty, Task } from '../../types';
import type { RussianSkillCode } from '../../data/taxonomy/russian';
import { RUSSIAN_SKILLS } from '../../data/taxonomy/russian';
import { RUSSIAN_GENERATORS, generateRussianTask } from './generators/skillGenerators';
import {
  getRussianSkillWeight,
  getRussianSkillWeightBySkillId,
  recommendRussianSessionSkillMix,
  type RussianWeightTier,
} from './russianTrainingWeights';
import { shuffle } from '../../utils/shuffle';

type Level = 1 | 2 | 3;

function asLevel(difficulty: Difficulty): Level {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

export function hasGeneratorForRussianSkillCode(code: string): code is RussianSkillCode {
  return Object.prototype.hasOwnProperty.call(RUSSIAN_GENERATORS, code);
}

export function generateTaskForRussianSkillCode(code: RussianSkillCode, difficulty: Difficulty, seed: number): Task {
  const level = asLevel(difficulty);
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return generateRussianTask(code, { difficulty: level, seed: (seed + attempt * 104729) >>> 0 });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Не удалось сгенерировать ${code} L${level}: ${String(lastError)}`);
}

export function generateTaskForRussianSkillId(skillId: string, difficulty: Difficulty, seed: number): Task {
  const row = getRussianSkillWeightBySkillId(skillId);
  if (!row) throw new Error(`Неизвестный skillId: ${skillId}`);
  return generateTaskForRussianSkillCode(row.code, difficulty, seed);
}

export function selectWeightedRussianSessionTasks(
  count: number,
  options?: { seed?: number; shuffleOrder?: boolean },
): Task[] {
  if (count <= 0) return [];
  const baseSeed = (options?.seed ?? Date.now()) >>> 0;
  const mix = recommendRussianSessionSkillMix(count, baseSeed);
  const tasks: Task[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < mix.length; index += 1) {
    const code = mix[index]!;
    const difficulty: Level =
      code === 'R23' || code === 'R19' || code === 'R18'
        ? (((baseSeed + index) % 2) + 2) as Level
        : ((((baseSeed + index) % 3) + 1) as Level);
    const slotSeed = (baseSeed + index * 7919) >>> 0;
    let task: Task | null = null;
    for (let attempt = 0; attempt < 40 && !task; attempt += 1) {
      try {
        if (code === 'R23' && difficulty >= 2) {
          const modes = ['find_error', 'first_step', 'next_step', 'choose_sequence'] as const;
          task = generateRussianTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: modes[(baseSeed + index) % modes.length],
          });
        } else if (code === 'R18') {
          const subs = ['theme', 'main_idea', 'heading', 'theme_vs_main'] as const;
          task = generateRussianTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: subs[(baseSeed + index) % subs.length],
          });
        } else {
          task = generateTaskForRussianSkillCode(code, difficulty, (slotSeed + attempt * 104729) >>> 0);
        }
      } catch {
        task = null;
      }
    }
    if (!task) task = generateTaskForRussianSkillCode(code, difficulty, slotSeed);
    if (seenIds.has(task.id)) task = { ...task, id: `${task.id}-slot${index}` };
    seenIds.add(task.id);
    tasks.push(task);
  }

  return options?.shuffleOrder === false ? tasks : shuffle(tasks);
}

export function buildRussianTrainingPool(options?: { perLevel?: number; seed?: number }): Task[] {
  const perLevel = options?.perLevel ?? 2;
  const baseSeed = (options?.seed ?? 20270823) >>> 0;
  const codes = Object.keys(RUSSIAN_GENERATORS) as RussianSkillCode[];
  if (codes.length !== 25) throw new Error(`Ожидалось 25 генераторов, получено ${codes.length}`);
  const tasks: Task[] = [];
  for (let c = 0; c < codes.length; c += 1) {
    const code = codes[c]!;
    for (const difficulty of [1, 2, 3] as const) {
      for (let i = 0; i < perLevel; i += 1) {
        const seed = (baseSeed + c * 10007 + difficulty * 7919 + i * 104729) >>> 0;
        const task = generateTaskForRussianSkillCode(code, difficulty, seed);
        tasks.push({ ...task, id: `pool-${code}-L${difficulty}-${i}-${task.id}` });
      }
    }
  }
  return tasks;
}

export function tierForRussianSkillId(skillId: string): RussianWeightTier | undefined {
  return getRussianSkillWeightBySkillId(skillId)?.tier;
}

export function trainingWeightForRussianSkillId(skillId: string): number {
  return getRussianSkillWeightBySkillId(skillId)?.trainingWeight ?? 1;
}

export function orderRussianSkillIdsByTrainingWeight(skillIds: readonly string[]): string[] {
  return [...skillIds].sort((a, b) => {
    const wa = trainingWeightForRussianSkillId(a);
    const wb = trainingWeightForRussianSkillId(b);
    if (wb !== wa) return wb - wa;
    return a.localeCompare(b);
  });
}

export function assertNoRussianSkillBeyondR25(): void {
  if (RUSSIAN_SKILLS.length !== 25) throw new Error(`taxonomy skills ${RUSSIAN_SKILLS.length} !== 25`);
  for (const skill of RUSSIAN_SKILLS) {
    if (!hasGeneratorForRussianSkillCode(skill.code)) throw new Error(`Нет генератора для ${skill.code}`);
    getRussianSkillWeight(skill.code);
  }
}
