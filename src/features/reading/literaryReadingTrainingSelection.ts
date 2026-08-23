/**
 * Wiring: READING_SKILL_WEIGHTS → recommendReadingSessionSkillMix → Task.
 */
import type { Difficulty, Task } from '../../types';
import type { ReadingSkillCode } from '../../data/taxonomy/literaryReading';
import { READING_SKILLS } from '../../data/taxonomy/literaryReading';
import { READING_GENERATORS, generateReadingTask } from './generators/skillGenerators';
import {
  getReadingSkillWeight,
  getReadingSkillWeightBySkillId,
  recommendReadingSessionSkillMix,
  type ReadingWeightTier,
} from './literaryReadingTrainingWeights';
import { shuffle } from '../../utils/shuffle';

type Level = 1 | 2 | 3;

function asLevel(difficulty: Difficulty): Level {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

export function hasGeneratorForReadingSkillCode(code: string): code is ReadingSkillCode {
  return Object.prototype.hasOwnProperty.call(READING_GENERATORS, code);
}

export function generateTaskForReadingSkillCode(code: ReadingSkillCode, difficulty: Difficulty, seed: number): Task {
  const level = asLevel(difficulty);
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return generateReadingTask(code, { difficulty: level, seed: (seed + attempt * 104729) >>> 0 });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Не удалось сгенерировать ${code} L${level}: ${String(lastError)}`);
}

export function selectWeightedReadingSessionTasks(
  count: number,
  options?: { seed?: number; shuffleOrder?: boolean },
): Task[] {
  if (count <= 0) return [];
  const baseSeed = (options?.seed ?? Date.now()) >>> 0;
  const mix = recommendReadingSessionSkillMix(count, baseSeed);
  const tasks: Task[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < mix.length; index += 1) {
    const code = mix[index]!;
    const difficulty: Level =
      code === 'L24' || code === 'L03' || code === 'L13' || code === 'L12'
        ? (((baseSeed + index) % 2) + 2) as Level
        : ((((baseSeed + index) % 3) + 1) as Level);
    const slotSeed = (baseSeed + index * 7919) >>> 0;
    let task: Task | null = null;
    for (let attempt = 0; attempt < 40 && !task; attempt += 1) {
      try {
        if (code === 'L24') {
          const modes = ['find_error', 'first_step', 'next_step', 'choose_sequence', 'justify_choice'] as const;
          task = generateReadingTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: modes[(baseSeed + index) % modes.length],
          });
        } else if (code === 'L09') {
          task = generateReadingTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: 'order_events',
          });
        } else {
          task = generateTaskForReadingSkillCode(code, difficulty, (slotSeed + attempt * 104729) >>> 0);
        }
      } catch {
        task = null;
      }
    }
    if (!task) task = generateTaskForReadingSkillCode(code, difficulty, slotSeed);
    if (seenIds.has(task.id)) task = { ...task, id: `${task.id}-slot${index}` };
    seenIds.add(task.id);
    tasks.push(task);
  }

  return options?.shuffleOrder === false ? tasks : shuffle(tasks);
}

export function buildReadingTrainingPool(options?: { perLevel?: number; seed?: number }): Task[] {
  const perLevel = options?.perLevel ?? 2;
  const baseSeed = (options?.seed ?? 20270823) >>> 0;
  const codes = Object.keys(READING_GENERATORS) as ReadingSkillCode[];
  if (codes.length !== 24) throw new Error(`Ожидалось 24 генератора, получено ${codes.length}`);
  const tasks: Task[] = [];
  for (let c = 0; c < codes.length; c += 1) {
    const code = codes[c]!;
    for (const difficulty of [1, 2, 3] as const) {
      for (let i = 0; i < perLevel; i += 1) {
        const seed = (baseSeed + c * 10007 + difficulty * 7919 + i * 104729) >>> 0;
        const task = generateTaskForReadingSkillCode(code, difficulty, seed);
        tasks.push({ ...task, id: `pool-${code}-L${difficulty}-${i}-${task.id}` });
      }
    }
  }
  return tasks;
}

export function trainingWeightForReadingSkillId(skillId: string): number {
  return getReadingSkillWeightBySkillId(skillId)?.trainingWeight ?? 1;
}

export function orderReadingSkillIdsByTrainingWeight(skillIds: readonly string[]): string[] {
  return [...skillIds].sort((a, b) => {
    const wa = trainingWeightForReadingSkillId(a);
    const wb = trainingWeightForReadingSkillId(b);
    if (wb !== wa) return wb - wa;
    return a.localeCompare(b);
  });
}

export function tierForReadingSkillId(skillId: string): ReadingWeightTier | undefined {
  return getReadingSkillWeightBySkillId(skillId)?.tier;
}

export function assertNoReadingSkillBeyondL24(): void {
  if (READING_SKILLS.length !== 24) throw new Error(`taxonomy skills ${READING_SKILLS.length} !== 24`);
  for (const skill of READING_SKILLS) {
    if (!hasGeneratorForReadingSkillCode(skill.code)) throw new Error(`Нет генератора для ${skill.code}`);
    getReadingSkillWeight(skill.code);
  }
}

export const selectWeightedLiteraryReadingSessionTasks = selectWeightedReadingSessionTasks;
export const buildLiteraryReadingTrainingPool = buildReadingTrainingPool;
export const orderLiteraryReadingSkillIdsByTrainingWeight = orderReadingSkillIdsByTrainingWeight;
