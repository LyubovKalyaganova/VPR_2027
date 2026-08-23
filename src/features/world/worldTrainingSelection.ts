/**
 * Wiring: WORLD_SKILL_WEIGHTS → recommendWorldSessionSkillMix → Task для сессии.
 */
import type { Difficulty, Task } from '../../types';
import type { WorldSkillCode } from '../../data/taxonomy/world';
import { WORLD_SKILLS } from '../../data/taxonomy/world';
import { WORLD_GENERATORS, generateWorldTask } from './generators/skillGenerators';
import {
  getWorldSkillWeight,
  getWorldSkillWeightBySkillId,
  recommendWorldSessionSkillMix,
  type WorldWeightTier,
} from './worldTrainingWeights';
import { shuffle } from '../../utils/shuffle';

type Level = 1 | 2 | 3;

function asLevel(difficulty: Difficulty): Level {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

export function hasGeneratorForWorldSkillCode(code: string): code is WorldSkillCode {
  return Object.prototype.hasOwnProperty.call(WORLD_GENERATORS, code);
}

export function generateTaskForWorldSkillCode(code: WorldSkillCode, difficulty: Difficulty, seed: number): Task {
  const level = asLevel(difficulty);
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return generateWorldTask(code, { difficulty: level, seed: (seed + attempt * 104729) >>> 0 });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Не удалось сгенерировать ${code} L${level}: ${String(lastError)}`);
}

export function generateTaskForWorldSkillId(skillId: string, difficulty: Difficulty, seed: number): Task {
  const row = getWorldSkillWeightBySkillId(skillId);
  if (!row) throw new Error(`Неизвестный skillId: ${skillId}`);
  return generateTaskForWorldSkillCode(row.code, difficulty, seed);
}

export function selectWeightedWorldSessionTasks(
  count: number,
  options?: { seed?: number; shuffleOrder?: boolean },
): Task[] {
  if (count <= 0) return [];
  const baseSeed = (options?.seed ?? Date.now()) >>> 0;
  const mix = recommendWorldSessionSkillMix(count, baseSeed);
  const tasks: Task[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < mix.length; index += 1) {
    const code = mix[index]!;
    const difficulty: Level =
      code === 'W25' || code === 'W09' || code === 'W14'
        ? (((baseSeed + index) % 2) + 2) as Level
        : ((((baseSeed + index) % 3) + 1) as Level);
    const slotSeed = (baseSeed + index * 7919) >>> 0;
    let task: Task | null = null;
    for (let attempt = 0; attempt < 40 && !task; attempt += 1) {
      try {
        if (code === 'W25' && difficulty >= 2) {
          const modes = ['find_error', 'first_step', 'next_step', 'choose_sequence', 'cause_effect'] as const;
          task = generateWorldTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: modes[(baseSeed + index) % modes.length],
          });
        } else if (code === 'W04') {
          const subs = ['build_chain', 'order_chain', 'classify_feeding', 'find_error_chain'] as const;
          task = generateWorldTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: subs[(baseSeed + index) % subs.length],
          });
        } else if (code === 'W02') {
          const subs = ['label_zone', 'pick_fauna', 'pick_flora', 'map_legend'] as const;
          task = generateWorldTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: subs[(baseSeed + index) % subs.length],
          });
        } else {
          task = generateTaskForWorldSkillCode(code, difficulty, (slotSeed + attempt * 104729) >>> 0);
        }
      } catch {
        task = null;
      }
    }
    if (!task) task = generateTaskForWorldSkillCode(code, difficulty, slotSeed);
    if (seenIds.has(task.id)) task = { ...task, id: `${task.id}-slot${index}` };
    seenIds.add(task.id);
    tasks.push(task);
  }

  return options?.shuffleOrder === false ? tasks : shuffle(tasks);
}

export function buildWorldTrainingPool(options?: { perLevel?: number; seed?: number }): Task[] {
  const perLevel = options?.perLevel ?? 2;
  const baseSeed = (options?.seed ?? 20270823) >>> 0;
  const codes = Object.keys(WORLD_GENERATORS) as WorldSkillCode[];
  if (codes.length !== 25) throw new Error(`Ожидалось 25 генераторов, получено ${codes.length}`);
  const tasks: Task[] = [];
  for (let c = 0; c < codes.length; c += 1) {
    const code = codes[c]!;
    for (const difficulty of [1, 2, 3] as const) {
      for (let i = 0; i < perLevel; i += 1) {
        const seed = (baseSeed + c * 10007 + difficulty * 7919 + i * 104729) >>> 0;
        const task = generateTaskForWorldSkillCode(code, difficulty, seed);
        tasks.push({ ...task, id: `pool-${code}-L${difficulty}-${i}-${task.id}` });
      }
    }
  }
  return tasks;
}

export function tierForWorldSkillId(skillId: string): WorldWeightTier | undefined {
  return getWorldSkillWeightBySkillId(skillId)?.tier;
}

export function trainingWeightForWorldSkillId(skillId: string): number {
  return getWorldSkillWeightBySkillId(skillId)?.trainingWeight ?? 1;
}

export function orderWorldSkillIdsByTrainingWeight(skillIds: readonly string[]): string[] {
  return [...skillIds].sort((a, b) => {
    const wa = trainingWeightForWorldSkillId(a);
    const wb = trainingWeightForWorldSkillId(b);
    if (wb !== wa) return wb - wa;
    return a.localeCompare(b);
  });
}

export function assertNoWorldSkillBeyondW25(): void {
  if (WORLD_SKILLS.length !== 25) throw new Error(`taxonomy skills ${WORLD_SKILLS.length} !== 25`);
  for (const skill of WORLD_SKILLS) {
    if (!hasGeneratorForWorldSkillCode(skill.code)) throw new Error(`Нет генератора для ${skill.code}`);
    getWorldSkillWeight(skill.code);
  }
}
