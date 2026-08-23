/**
 * Генератор M31: нахождение времени движения (t = s : v).
 * Контракт: M31_GENERATOR_SPEC.md
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

export const M31_SKILL_ID = 'math.word_problems.motion.time' as const;
export const M31_TOPIC_ID = 'math.word_problems.motion' as const;
export const M31_GENERATOR_ID = 'gen.math.word_problems.motion.time' as const;

export type M31Subtype = 'exact_hours' | 'typical_hours' | 'answer_minutes' | 'mixed_units';
export type M31Feature = 'exact_division' | 'needs_unit_convert' | 'answer_hours' | 'answer_minutes';

export type M31GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: M31Subtype };
export type M31SeriesOptions = { seed: number; countPerLevel?: number };

export type M31GeneratorParams = {
  distanceKm: number;
  speedKmh: number;
  timeHoursExact: number;
  timeAnswer: number;
  answerUnit: 'h' | 'min';
  subtype: M31Subtype;
  features: M31Feature[];
  seed: number;
  actor: string;
};

type Built = {
  distanceKm: number;
  speedKmh: number;
  timeHoursExact: number;
  timeAnswer: number;
  answerUnit: 'h' | 'min';
  subtype: M31Subtype;
  features: M31Feature[];
  actor: string;
  question: string;
  explanation: string;
};

type ActorSpec = { name: string; speeds: number[] };

const ACTORS: ActorSpec[] = [
  { name: 'пешеход', speeds: [4, 5, 6] },
  { name: 'велосипедист', speeds: [12, 15, 18, 20, 24, 25] },
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

function allowedSubtypes(difficulty: Level): M31Subtype[] {
  if (difficulty === 1) return ['exact_hours'];
  if (difficulty === 2) return ['typical_hours'];
  return ['answer_minutes', 'mixed_units'];
}

function resolveSubtype(difficulty: Level, requested: M31Subtype | undefined, rng: SeededRng): M31Subtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function computeTimeHours(distanceKm: number, speedKmh: number): number | null {
  if (speedKmh <= 0 || distanceKm <= 0) return null;
  const t = distanceKm / speedKmh;
  // допускаем целые и половинные часы (0.5, 1.5, 2.5…)
  if (!Number.isFinite(t) || t <= 0) return null;
  if (!Number.isInteger(t * 2)) return null;
  return t;
}

export function isValidM31Level(
  params: { features: readonly M31Feature[]; subtype: M31Subtype; timeHoursExact: number },
  difficulty: Level,
): boolean {
  const convert = params.features.includes('needs_unit_convert');
  if (difficulty === 1) {
    return params.subtype === 'exact_hours' && !convert && Number.isInteger(params.timeHoursExact);
  }
  if (difficulty === 2) {
    return params.subtype === 'typical_hours' && !convert && Number.isInteger(params.timeHoursExact);
  }
  return convert && (params.subtype === 'answer_minutes' || params.subtype === 'mixed_units');
}

function asksForDistance(question: string): boolean {
  return /какое расстояние|сколько км.*преодол|найди расстояние/i.test(question);
}

function asksForSpeed(question: string): boolean {
  return /какова.*скорость|найди скорость|скорость в км\/ч/i.test(question);
}

function travelVerb(actor: string): string {
  return actor === 'пешеход' ? 'прошёл' : 'проехал';
}

function overcomeVerb(actor: string): string {
  return actor === 'пешеход' ? 'преодолел путь' : 'преодолел путь';
}

function buildL1(rng: SeededRng): Built | null {
  const { actor, speedKmh } = pickActorSpeed(rng);
  const timeHoursExact = pickOne(rng, [2, 3]);
  const distanceKm = speedKmh * timeHoursExact;
  return {
    distanceKm,
    speedKmh,
    timeHoursExact,
    timeAnswer: timeHoursExact,
    answerUnit: 'h',
    subtype: 'exact_hours',
    features: ['exact_division', 'answer_hours'],
    actor,
    question: `${actor[0]!.toUpperCase()}${actor.slice(1)} ${travelVerb(actor)} ${distanceKm} км со скоростью ${speedKmh} км/ч. Сколько часов длилась поездка?`,
    explanation: `Время: ${distanceKm} : ${speedKmh} = ${timeHoursExact} ч.`,
  };
}

function buildL2(rng: SeededRng): Built | null {
  // Структурно сложнее L1: больше часов и «некруглые» скорости актёра (12,15,18,45…)
  const { actor, speedKmh } = pickActorSpeed(
    rng,
    ACTORS.filter((a) => a.name !== 'пешеход'),
  );
  const timeHoursExact = pickOne(rng, [3, 4, 5, 6]);
  const distanceKm = speedKmh * timeHoursExact;
  if (distanceKm > 600 || distanceKm < 60) return null;
  return {
    distanceKm,
    speedKmh,
    timeHoursExact,
    timeAnswer: timeHoursExact,
    answerUnit: 'h',
    subtype: 'typical_hours',
    features: ['exact_division', 'answer_hours'],
    actor,
    question: `${actor[0]!.toUpperCase()}${actor.slice(1)} ${overcomeVerb(actor)} ${distanceKm} км, двигаясь со скоростью ${speedKmh} км/ч. Сколько часов он был в пути?`,
    explanation: `Время: ${distanceKm} : ${speedKmh} = ${timeHoursExact} ч.`,
  };
}

function buildL3(rng: SeededRng, subtype: M31Subtype): Built | null {
  const { actor, speedKmh } = pickActorSpeed(rng);
  if (subtype === 'answer_minutes') {
    // Предпочтительно нецелые часы → перевод в минуты содержателен
    const timeHoursExact = pickOne(rng, [0.5, 1.5, 2.5]);
    const distanceKm = speedKmh * timeHoursExact;
    if (!Number.isInteger(distanceKm)) return null;
    const timeAnswer = timeHoursExact * 60;
    if (!Number.isInteger(timeAnswer)) return null;
    return {
      distanceKm,
      speedKmh,
      timeHoursExact,
      timeAnswer,
      answerUnit: 'min',
      subtype: 'answer_minutes',
      features: ['exact_division', 'needs_unit_convert', 'answer_minutes'],
      actor,
      question: `${actor[0]!.toUpperCase()}${actor.slice(1)} ${travelVerb(actor)} ${distanceKm} км со скоростью ${speedKmh} км/ч. Сколько минут длилась поездка?`,
      explanation: `Сначала ${distanceKm} : ${speedKmh} = ${timeHoursExact} ч = ${timeAnswer} мин.`,
    };
  }

  const timeHoursExact = pickOne(rng, [2, 3, 4]);
  const distanceKm = speedKmh * timeHoursExact;
  const distanceM = distanceKm * 1000;
  return {
    distanceKm,
    speedKmh,
    timeHoursExact,
    timeAnswer: timeHoursExact,
    answerUnit: 'h',
    subtype: 'mixed_units',
    features: ['exact_division', 'needs_unit_convert', 'answer_hours'],
    actor,
    question: `${actor[0]!.toUpperCase()}${actor.slice(1)} ${travelVerb(actor)} ${distanceM} м со скоростью ${speedKmh} км/ч. Сколько часов длилась поездка?`,
    explanation: `Сначала ${distanceM} м = ${distanceKm} км. Затем ${distanceKm} : ${speedKmh} = ${timeHoursExact} ч.`,
  };
}

function buildCase(rng: SeededRng, difficulty: Level, subtype: M31Subtype): Built | null {
  if (difficulty === 1) return buildL1(rng);
  if (difficulty === 2) return buildL2(rng);
  return buildL3(rng, subtype);
}

function distractorsFor(built: Built, rng: SeededRng): string[] {
  return uniqueDistractorsFromModels(
    built.timeAnswer,
    [
      built.distanceKm * built.speedKmh,
      built.distanceKm - built.speedKmh,
      built.distanceKm,
      built.speedKmh,
      built.answerUnit === 'min' ? built.timeHoursExact : built.timeHoursExact * 60,
      built.timeAnswer + 1,
      built.timeAnswer > 1 ? built.timeAnswer - 1 : null,
      built.timeAnswer + 2,
    ],
    rng,
    3,
  );
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  const recomputed = computeTimeHours(built.distanceKm, built.speedKmh);
  if (recomputed === null || recomputed !== built.timeHoursExact) {
    throw new Error('M31: время не сходится');
  }
  const expected = built.answerUnit === 'h' ? recomputed : recomputed * 60;
  if (expected !== built.timeAnswer) throw new Error('M31: timeAnswer не сходится');
  const levelParams = {
    features: built.features,
    subtype: built.subtype,
    timeHoursExact: built.timeHoursExact,
  };
  if (!isValidM31Level(levelParams, difficulty)) throw new Error(`M31: невалидный L${difficulty}`);
  if (difficulty === 3 && !built.features.includes('needs_unit_convert')) {
    throw new Error('M31 L3 без перевода');
  }
  if (!isRealisticActorSpeed(built.actor, built.speedKmh)) {
    throw new Error('M31: нереалистичная скорость');
  }
  if (asksForDistance(built.question) || asksForSpeed(built.question)) {
    throw new Error('M31: cross-skill leakage');
  }
  if (built.speedKmh <= 0) throw new Error('M31: zero speed');

  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const distractors = taskType === 'singleChoice' ? distractorsFor(built, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error('M31: дистракторы');
  }

  return baseTask({
    id: `generated-m31-${difficulty}-${built.subtype}-${built.distanceKm}-${built.speedKmh}-${built.answerUnit}`,
    section: 'Текстовые задачи',
    topic: 'Задачи на движение',
    skill: 'Нахождение времени в движении',
    topicId: M31_TOPIC_ID,
    skillId: M31_SKILL_ID,
    difficulty,
    taskType,
    question: built.question,
    correctAnswer: taskType === 'numberAnswer' ? built.timeAnswer : String(built.timeAnswer),
    answers: taskType === 'singleChoice' ? buildChoiceAnswers(built.timeAnswer, distractors, rng) : undefined,
    explanation: built.explanation,
    generatorId: M31_GENERATOR_ID,
    generatorParams: {
      distanceKm: built.distanceKm,
      speedKmh: built.speedKmh,
      timeHoursExact: built.timeHoursExact,
      timeAnswer: built.timeAnswer,
      answerUnit: built.answerUnit,
      subtype: built.subtype,
      features: built.features,
      seed,
      actor: built.actor,
    } satisfies M31GeneratorParams,
    hint1: 'Время движения = расстояние : скорость.',
    hint2: 'Следи за единицами (часы или минуты).',
    hint3: `Ответ: ${built.timeAnswer}.`,
  });
}

export function fingerprintM31(task: Task): string {
  const p = task.generatorParams as M31GeneratorParams;
  return `${p.subtype}|${p.actor}|${p.distanceKm}|${p.speedKmh}|${p.answerUnit}|${p.timeAnswer}`;
}

export function generateM31Task(options: M31GenerateOptions): Task {
  rejectAdvancedLevels('M31', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const subtype = resolveSubtype(difficulty, options.subtype, rng);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const built = buildCase(rng, difficulty, subtype);
    if (!built) continue;
    try {
      return toTask(built, difficulty, options.seed, rng);
    } catch {
      // retry
    }
  }
  throw new Error(`M31: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM31Series(options: M31SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM31Task({ difficulty, seed, subtype: subtypes[index % subtypes.length] });
    },
    fingerprintM31,
    'M31',
  );
}
