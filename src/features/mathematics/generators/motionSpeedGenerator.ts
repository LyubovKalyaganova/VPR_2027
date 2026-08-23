/**
 * Генератор M32: нахождение скорости (v = s : t).
 * Контракт: M32_GENERATOR_SPEC.md
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';

export const M32_SKILL_ID = 'math.word_problems.motion.speed' as const;
export const M32_TOPIC_ID = 'math.word_problems.motion' as const;
export const M32_GENERATOR_ID = 'gen.math.word_problems.motion.speed' as const;

export type M32Subtype = 'exact_division' | 'typical' | 'time_convert';
export type M32Feature = 'exact_division' | 'needs_time_convert' | 'integer_hours';

export type M32GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: M32Subtype };
export type M32SeriesOptions = { seed: number; countPerLevel?: number };

export type M32GeneratorParams = {
  distanceKm: number;
  timeHoursExact: number;
  speedKmh: number;
  subtype: M32Subtype;
  features: M32Feature[];
  seed: number;
  actor: string;
  timeMinutes?: number;
};

type Built = {
  distanceKm: number;
  timeHoursExact: number;
  speedKmh: number;
  subtype: M32Subtype;
  features: M32Feature[];
  actor: string;
  question: string;
  explanation: string;
  timeMinutes?: number;
};

type ActorSpec = { name: string; speeds: number[] };

const ACTORS: ActorSpec[] = [
  { name: 'пешеход', speeds: [4, 5, 6] },
  { name: 'велосипедист', speeds: [12, 15, 18, 20, 24, 25] },
  { name: 'мотоциклист', speeds: [40, 50, 60, 70, 80] },
  { name: 'автомобиль', speeds: [40, 50, 60, 70, 80, 90] },
  { name: 'автобус', speeds: [40, 45, 50, 55, 60, 70] },
  { name: 'поезд', speeds: [60, 80, 90, 100, 120] },
];

const MAX_ATTEMPTS = 120;

function pickActorSpeed(rng: SeededRng, pool?: ActorSpec[]): { actor: string; speedKmh: number } {
  const list = pool ?? ACTORS;
  const spec = pickOne(rng, list);
  return { actor: spec.name, speedKmh: pickOne(rng, spec.speeds) };
}

export function isRealisticActorSpeed(actor: string, speedKmh: number): boolean {
  const spec = ACTORS.find((a) => a.name === actor);
  return Boolean(spec && spec.speeds.includes(speedKmh));
}

export function computeSpeedKmh(distanceKm: number, timeHoursExact: number): number | null {
  if (timeHoursExact <= 0) return null;
  const speed = distanceKm / timeHoursExact;
  if (!Number.isInteger(speed) || speed <= 0) return null;
  return speed;
}

export function isValidM32Level(
  params: { features: readonly M32Feature[]; subtype: M32Subtype },
  difficulty: Level,
): boolean {
  const convert = params.features.includes('needs_time_convert');
  if (difficulty === 1) {
    return params.subtype === 'exact_division' && !convert && params.features.includes('integer_hours');
  }
  if (difficulty === 2) {
    return params.subtype === 'typical' && !convert && params.features.includes('integer_hours');
  }
  return params.subtype === 'time_convert' && convert;
}

function asksForDistance(question: string): boolean {
  return /какое расстояние|сколько км.*преодол|найди расстояние/i.test(question);
}

function asksForTime(question: string): boolean {
  return /сколько часов|сколько минут.*поездк|длилась поездка/i.test(question);
}

function hoursWord(n: number): string {
  if (n === 1) return 'час';
  if (n >= 2 && n <= 4) return 'часа';
  return 'часов';
}

function travelVerb(actor: string): string {
  return actor === 'пешеход' ? 'прошёл' : 'проехал';
}

function buildL1(rng: SeededRng): Built | null {
  const { actor, speedKmh } = pickActorSpeed(rng);
  const timeHoursExact = pickOne(rng, [2, 3]);
  const distanceKm = speedKmh * timeHoursExact;
  return {
    distanceKm,
    timeHoursExact,
    speedKmh,
    subtype: 'exact_division',
    features: ['exact_division', 'integer_hours'],
    actor,
    question: `${actor[0]!.toUpperCase()}${actor.slice(1)} ${travelVerb(actor)} ${distanceKm} км за ${timeHoursExact} ${hoursWord(timeHoursExact)}. Какова была скорость в км/ч?`,
    explanation: `Скорость: ${distanceKm} : ${timeHoursExact} = ${speedKmh} км/ч.`,
  };
}

function buildL2(rng: SeededRng): Built | null {
  const { actor, speedKmh } = pickActorSpeed(
    rng,
    ACTORS.filter((a) => a.name !== 'пешеход'),
  );
  const timeHoursExact = pickOne(rng, [3, 4, 5, 6]);
  const distanceKm = speedKmh * timeHoursExact;
  if (distanceKm > 600 || distanceKm < 60) return null;
  return {
    distanceKm,
    timeHoursExact,
    speedKmh,
    subtype: 'typical',
    features: ['exact_division', 'integer_hours'],
    actor,
    question: `${actor[0]!.toUpperCase()}${actor.slice(1)} преодолел ${distanceKm} км за ${timeHoursExact} ${hoursWord(timeHoursExact)}. Найди скорость движения (км/ч).`,
    explanation: `Скорость: ${distanceKm} : ${timeHoursExact} = ${speedKmh} км/ч.`,
  };
}

function buildL3(rng: SeededRng): Built | null {
  const { actor, speedKmh } = pickActorSpeed(rng);
  const timeMinutes = pickOne(rng, [30, 45, 90, 150]);
  const timeHoursExact = timeMinutes / 60;
  const distanceKm = speedKmh * timeHoursExact;
  if (!Number.isInteger(distanceKm)) return null;
  return {
    distanceKm,
    timeHoursExact,
    speedKmh,
    subtype: 'time_convert',
    features: ['exact_division', 'needs_time_convert'],
    timeMinutes,
    actor,
    question: `${actor[0]!.toUpperCase()}${actor.slice(1)} ${travelVerb(actor)} ${distanceKm} км за ${timeMinutes} минут. Какова скорость в км/ч?`,
    explanation: `Сначала ${timeMinutes} мин = ${timeHoursExact} ч. Затем ${distanceKm} : ${timeHoursExact} = ${speedKmh} км/ч.`,
  };
}

function buildCase(rng: SeededRng, difficulty: Level): Built | null {
  if (difficulty === 1) return buildL1(rng);
  if (difficulty === 2) return buildL2(rng);
  return buildL3(rng);
}

function distractorsFor(built: Built, rng: SeededRng): string[] {
  return uniqueDistractorsFromModels(
    built.speedKmh,
    [
      built.distanceKm * built.timeHoursExact,
      built.distanceKm - built.timeHoursExact,
      built.distanceKm,
      Math.round(built.timeHoursExact),
      built.timeMinutes != null ? Math.round(built.distanceKm / built.timeMinutes) : null,
      built.speedKmh + 10,
      built.speedKmh > 10 ? built.speedKmh - 10 : null,
      built.speedKmh + 5,
    ],
    rng,
    3,
  );
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  const recomputed = computeSpeedKmh(built.distanceKm, built.timeHoursExact);
  if (recomputed === null || recomputed !== built.speedKmh) {
    throw new Error('M32: скорость не сходится');
  }
  const levelParams = { features: built.features, subtype: built.subtype };
  if (!isValidM32Level(levelParams, difficulty)) throw new Error(`M32: невалидный L${difficulty}`);
  if (!isRealisticActorSpeed(built.actor, built.speedKmh)) {
    throw new Error('M32: нереалистичная скорость');
  }
  if (asksForDistance(built.question) || asksForTime(built.question)) {
    throw new Error('M32: cross-skill leakage');
  }
  if (built.timeHoursExact <= 0 || built.speedKmh <= 0) {
    throw new Error('M32: невозможные параметры');
  }

  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const distractors = taskType === 'singleChoice' ? distractorsFor(built, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error('M32: дистракторы');
  }

  return baseTask({
    id: `generated-m32-${difficulty}-${built.subtype}-${built.distanceKm}-${built.timeHoursExact}`,
    section: 'Текстовые задачи',
    topic: 'Задачи на движение',
    skill: 'Нахождение скорости в движении',
    topicId: M32_TOPIC_ID,
    skillId: M32_SKILL_ID,
    difficulty,
    taskType,
    question: built.question,
    correctAnswer: taskType === 'numberAnswer' ? built.speedKmh : String(built.speedKmh),
    answers: taskType === 'singleChoice' ? buildChoiceAnswers(built.speedKmh, distractors, rng) : undefined,
    explanation: built.explanation,
    generatorId: M32_GENERATOR_ID,
    generatorParams: {
      distanceKm: built.distanceKm,
      timeHoursExact: built.timeHoursExact,
      speedKmh: built.speedKmh,
      subtype: built.subtype,
      features: built.features,
      seed,
      actor: built.actor,
      timeMinutes: built.timeMinutes,
    } satisfies M32GeneratorParams,
    hint1: 'Скорость = расстояние : время.',
    hint2: 'Переведи время в часы, если даны минуты.',
    hint3: `Ответ: ${built.speedKmh}.`,
  });
}

export function fingerprintM32(task: Task): string {
  const p = task.generatorParams as M32GeneratorParams;
  return `${p.subtype}|${p.actor}|${p.distanceKm}|${p.timeHoursExact}|${p.speedKmh}`;
}

export function generateM32Task(options: M32GenerateOptions): Task {
  rejectAdvancedLevels('M32', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const built = buildCase(rng, difficulty);
    if (!built) continue;
    try {
      return toTask(built, difficulty, options.seed, rng);
    } catch {
      // retry
    }
  }
  throw new Error(`M32: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM32Series(options: M32SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed }) => generateM32Task({ difficulty, seed }),
    fingerprintM32,
    'M32',
  );
}
