/**
 * Общие хелперы для генераторов M09–M35.
 * Не изменяет поведение M03–M08.
 */
import type { Difficulty, Task, TaskType } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export { createSeededRng, pickOne, randomInt, shuffleSeeded };
export type { SeededRng };

export type Level = 1 | 2 | 3;

export function rejectAdvancedLevels(code: string, difficulty: Difficulty): asserts difficulty is Level {
  if (difficulty === 4 || difficulty === 5) {
    throw new Error(
      `Генератор ${code} пока не создаёт уровни 4–5: L4 — формат ВПР, L5 — расширенная проверка.`,
    );
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
    if (value === null || value === undefined) {
      continue;
    }
    const text = String(value);
    if (text === correctText || pool.includes(text) || text.length === 0) {
      continue;
    }
    pool.push(text);
  }
  const shuffled = shuffleSeeded(pool, rng);
  return shuffled.slice(0, count);
}

export function buildChoiceAnswers(
  correct: number | string,
  distractors: string[],
  rng: SeededRng,
): string[] {
  if (distractors.length !== 3) {
    throw new Error(`Нужно ровно 3 дистрактора, получено ${distractors.length}`);
  }
  return shuffleSeeded([String(correct), ...distractors], rng);
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
        if (seen.has(fp)) {
          continue;
        }
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
  correctAnswer: string | number;
  answers?: string[];
  explanation: string;
  generatorId: string;
  generatorParams: Record<string, unknown>;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  /** SVG или data-URI; поле Task.image (UI может подключить позже). */
  image?: string;
}): Task {
  return {
    id: args.id,
    subject: 'mathematics',
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
    hint1: args.hint1 ?? 'Внимательно прочитай условие.',
    hint2: args.hint2 ?? 'Выбери нужное действие или перевод единиц.',
    hint3: args.hint3 ?? `Ответ: ${args.correctAnswer}.`,
    sourceType: 'generated',
    generatorId: args.generatorId,
    generatorParams: args.generatorParams,
    image: args.image,
  };
}

/** SVG → data URI для Task.image (детерминированно, без сети). */
export function svgToDataUri(svg: string): string {
  const compact = svg.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(compact)}`;
}
