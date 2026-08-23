/**
 * Общие хелперы для генераторов L01–L24.
 */
import type { Difficulty, Task, TaskType } from '../../../types';
import {
  createSeededRng,
  pickOne,
  randomInt,
  shuffleSeeded,
  type SeededRng,
} from '../../mathematics/generators/seededRng';

export { createSeededRng, pickOne, randomInt, shuffleSeeded };
export type { SeededRng };

export type Level = 1 | 2 | 3;

export function rejectAdvancedLevels(code: string, difficulty: Difficulty): asserts difficulty is Level {
  if (difficulty === 4 || difficulty === 5) {
    throw new Error(`Генератор ${code} пока не создаёт уровни 4–5.`);
  }
  if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) {
    throw new Error(`Генератор ${code}: неподдерживаемый уровень ${difficulty}`);
  }
}

export function uniqueDistractorsFromModels(
  correct: number | string,
  models: Array<number | string | null | undefined>,
  rng: SeededRng,
  count = 3,
): string[] {
  const correctText = String(correct);
  const pool: string[] = [];
  for (const value of models) {
    if (value === null || value === undefined) continue;
    const text = String(value);
    if (text === correctText || pool.includes(text) || text.length === 0) continue;
    pool.push(text);
  }
  return shuffleSeeded(pool, rng).slice(0, count);
}

export function buildChoiceAnswers(correct: number | string, distractors: string[], rng: SeededRng): string[] {
  const pad = ['—', 'не знаю', 'другое', 'нет', '0'];
  const pool = [...distractors];
  while (pool.length < 3) {
    const filler = pickOne(
      rng,
      pad.filter((p) => String(correct) !== p && !pool.includes(p)),
    );
    pool.push(filler);
  }
  return shuffleSeeded([String(correct), ...pool.slice(0, 3)], rng);
}

export function makeSeries<T extends Task>(
  options: { seed: number; countPerLevel?: number },
  generateOne: (args: { difficulty: Level; seed: number; index: number }) => T,
  fingerprintOf: (task: T) => string,
  code: string,
): T[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: T[] = [];
  const seen = new Set<string>();
  let salt = 0;
  for (const difficulty of [1, 2, 3] as const) {
    let produced = 0;
    let guard = 0;
    while (produced < countPerLevel && guard < countPerLevel * 60) {
      guard += 1;
      const seed = (options.seed + difficulty * 1009 + produced * 137 + salt * 19) >>> 0;
      salt += 1;
      try {
        const task = generateOne({ difficulty, seed, index: produced });
        const fp = fingerprintOf(task);
        if (seen.has(fp)) continue;
        seen.add(fp);
        tasks.push(task);
        produced += 1;
      } catch {
        // retry
      }
    }
    if (produced < countPerLevel) {
      throw new Error(`${code} series: не удалось набрать ${countPerLevel} заданий L${difficulty}`);
    }
  }
  return tasks;
}

export function baseTask(args: {
  id: string;
  section: string;
  topic: string;
  skill: string;
  topicId: string;
  skillId: string;
  difficulty: Level;
  taskType: TaskType;
  question: string;
  correctAnswer: string | string[] | number;
  answers?: string[];
  explanation: string;
  generatorId: string;
  generatorParams: Record<string, unknown>;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  image?: string;
  passage?: string;
  items?: string[];
  matchingLeft?: string[];
  matchingRight?: string[];
  acceptableAnswers?: string[];
}): Task {
  return {
    id: args.id,
    subject: 'reading',
    section: args.section,
    topic: args.topic,
    skill: args.skill,
    topicId: args.topicId,
    skillId: args.skillId,
    difficulty: args.difficulty,
    vprVersion: 2027,
    taskType: args.taskType,
    question: args.question,
    answers: args.answers,
    correctAnswer: args.correctAnswer,
    explanation: args.explanation,
    hint1: args.hint1 ?? 'Внимательно прочитай текст и вопрос.',
    hint2: args.hint2 ?? 'Найди в тексте подтверждение ответа.',
    hint3:
      args.hint3 ??
      `Ответ: ${Array.isArray(args.correctAnswer) ? args.correctAnswer.join(', ') : args.correctAnswer}.`,
    sourceType: 'generated',
    generatorId: args.generatorId,
    generatorParams: args.generatorParams,
    image: args.image,
    passage: args.passage,
    items: args.items,
    matchingLeft: args.matchingLeft,
    matchingRight: args.matchingRight,
    acceptableAnswers: args.acceptableAnswers,
  };
}
