/**
 * Wiring: ENGLISH_SKILL_WEIGHTS → recommendEnglishSessionSkillMix → Task.
 */
import type { Difficulty, Task } from '../../types';
import type { EnglishSkillCode } from '../../data/taxonomy/english';
import { ENGLISH_SKILLS } from '../../data/taxonomy/english';
import { ENGLISH_GENERATORS, generateEnglishTask, REASONING_SUBTYPES } from './generators/skillGenerators';
import {
  getEnglishSkillWeight,
  getEnglishSkillWeightBySkillId,
  recommendEnglishSessionSkillMix,
  type EnglishWeightTier,
} from './englishTrainingWeights';
import { shuffle } from '../../utils/shuffle';

type Level = 1 | 2 | 3;

function asLevel(difficulty: Difficulty): Level {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  return 3;
}

export function hasGeneratorForEnglishSkillCode(code: string): code is EnglishSkillCode {
  return Object.prototype.hasOwnProperty.call(ENGLISH_GENERATORS, code);
}

export function generateTaskForEnglishSkillCode(code: EnglishSkillCode, difficulty: Difficulty, seed: number): Task {
  const level = asLevel(difficulty);
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return generateEnglishTask(code, { difficulty: level, seed: (seed + attempt * 104729) >>> 0 });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Не удалось сгенерировать ${code} L${level}: ${String(lastError)}`);
}

export function selectWeightedEnglishSessionTasks(
  count: number,
  options?: { seed?: number; shuffleOrder?: boolean },
): Task[] {
  if (count <= 0) return [];
  const baseSeed = (options?.seed ?? Date.now()) >>> 0;
  const mix = recommendEnglishSessionSkillMix(count, baseSeed);
  const tasks: Task[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < mix.length; index += 1) {
    const code = mix[index]!;
    const difficulty: Level =
      code === 'E18' || code === 'E14' || code === 'E08'
        ? (((baseSeed + index) % 2) + 2) as Level
        : ((((baseSeed + index) % 3) + 1) as Level);
    const slotSeed = (baseSeed + index * 7919) >>> 0;
    let task: Task | null = null;
    for (let attempt = 0; attempt < 40 && !task; attempt += 1) {
      try {
        if (code === 'E18') {
          task = generateEnglishTask(code, {
            difficulty,
            seed: (slotSeed + attempt * 104729) >>> 0,
            subtype: REASONING_SUBTYPES[(baseSeed + index) % REASONING_SUBTYPES.length],
          });
        } else {
          task = generateTaskForEnglishSkillCode(code, difficulty, (slotSeed + attempt * 104729) >>> 0);
        }
      } catch {
        task = null;
      }
    }
    if (!task) task = generateTaskForEnglishSkillCode(code, difficulty, slotSeed);
    if (seenIds.has(task.id)) task = { ...task, id: `${task.id}-slot${index}` };
    seenIds.add(task.id);
    tasks.push(task);
  }

  return options?.shuffleOrder === false ? tasks : shuffle(tasks);
}

export function buildEnglishTrainingPool(options?: { perLevel?: number; seed?: number }): Task[] {
  const perLevel = options?.perLevel ?? 2;
  const baseSeed = (options?.seed ?? 20270824) >>> 0;
  const codes = Object.keys(ENGLISH_GENERATORS) as EnglishSkillCode[];
  if (codes.length !== 18) throw new Error(`Ожидалось 18 генераторов, получено ${codes.length}`);
  const tasks: Task[] = [];
  for (let c = 0; c < codes.length; c += 1) {
    const code = codes[c]!;
    for (const difficulty of [1, 2, 3] as const) {
      for (let i = 0; i < perLevel; i += 1) {
        const seed = (baseSeed + c * 10007 + difficulty * 7919 + i * 104729) >>> 0;
        const task = generateTaskForEnglishSkillCode(code, difficulty, seed);
        tasks.push({ ...task, id: `pool-${code}-L${difficulty}-${i}-${task.id}` });
      }
    }
  }
  return tasks;
}

export function trainingWeightForEnglishSkillId(skillId: string): number {
  return getEnglishSkillWeightBySkillId(skillId)?.trainingWeight ?? 1;
}

export function orderEnglishSkillIdsByTrainingWeight(skillIds: readonly string[]): string[] {
  return [...skillIds].sort((a, b) => {
    const wa = trainingWeightForEnglishSkillId(a);
    const wb = trainingWeightForEnglishSkillId(b);
    if (wb !== wa) return wb - wa;
    return a.localeCompare(b);
  });
}

export function tierForEnglishSkillId(skillId: string): EnglishWeightTier | undefined {
  return getEnglishSkillWeightBySkillId(skillId)?.tier;
}

export function assertNoEnglishSkillBeyondE18(): void {
  if (ENGLISH_SKILLS.length !== 18) throw new Error(`taxonomy skills ${ENGLISH_SKILLS.length} !== 18`);
  for (const skill of ENGLISH_SKILLS) {
    if (!hasGeneratorForEnglishSkillCode(skill.code)) throw new Error(`Нет генератора для ${skill.code}`);
    getEnglishSkillWeight(skill.code);
  }
}
