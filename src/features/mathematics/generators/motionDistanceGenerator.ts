/**
 * Генератор M30: нахождение расстояния (s = v × t).
 * Контракт: M30_GENERATOR_SPEC.md
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

export const M30_SKILL_ID = 'math.word_problems.motion.distance' as const;
export const M30_TOPIC_ID = 'math.word_problems.motion' as const;
export const M30_GENERATOR_ID = 'gen.math.word_problems.motion.distance' as const;

export type M30Subtype =
  | 'direct_hours'
  | 'typical_hours'
  | 'half_hour'
  | 'time_convert'
  | 'length_convert';

export type M30Feature =
  | 'integer_hours'
  | 'half_hour'
  | 'needs_time_convert'
  | 'needs_length_convert'
  | 'answer_km'
  | 'answer_m';

export type M30GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: M30Subtype;
};

export type M30SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M30GeneratorParams = {
  speedKmh: number;
  timeHoursExact: number;
  distanceKm: number;
  distanceAnswer: number;
  answerUnit: 'km' | 'm';
  subtype: M30Subtype;
  features: M30Feature[];
  seed: number;
  storyKind: string;
  actor: string;
  timeMinutes?: number;
};

type Built = {
  speedKmh: number;
  timeHoursExact: number;
  distanceKm: number;
  distanceAnswer: number;
  answerUnit: 'km' | 'm';
  subtype: M30Subtype;
  features: M30Feature[];
  storyKind: string;
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

function allowedSubtypes(difficulty: Level): M30Subtype[] {
  if (difficulty === 1) return ['direct_hours'];
  if (difficulty === 2) return ['typical_hours', 'half_hour'];
  return ['time_convert', 'length_convert'];
}

function resolveSubtype(difficulty: Level, requested: M30Subtype | undefined, rng: SeededRng): M30Subtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) return requested;
  return pickOne(rng, allowed);
}

export function computeDistanceKm(speedKmh: number, timeHoursExact: number): number {
  return speedKmh * timeHoursExact;
}

export function isValidM30Level(
  params: {
    timeHoursExact: number;
    features: readonly M30Feature[];
    subtype: M30Subtype;
  },
  difficulty: Level,
): boolean {
  const hasConvert =
    params.features.includes('needs_time_convert') || params.features.includes('needs_length_convert');
  const half = params.features.includes('half_hour');
  const integerHours = Number.isInteger(params.timeHoursExact) && params.timeHoursExact >= 1;

  if (difficulty === 1) {
    return (
      params.subtype === 'direct_hours' &&
      !hasConvert &&
      !half &&
      integerHours &&
      params.features.includes('integer_hours')
    );
  }
  if (difficulty === 2) {
    if (hasConvert) return false;
    if (params.subtype === 'half_hour') return half && !integerHours;
    if (params.subtype === 'typical_hours') return integerHours && !half;
    return false;
  }
  return hasConvert && (params.subtype === 'time_convert' || params.subtype === 'length_convert');
}

function isTooEasy(
  params: {
    timeHoursExact: number;
    features: readonly M30Feature[];
    subtype: M30Subtype;
  },
  difficulty: Level,
): boolean {
  if (difficulty === 2) return isValidM30Level(params, 1);
  if (difficulty === 3) return isValidM30Level(params, 1) || isValidM30Level(params, 2);
  return false;
}

function verbFor(actor: string): string {
  return actor === 'пешеход' ? 'шёл' : 'ехал';
}

function buildStory(
  rng: SeededRng,
  actor: string,
  speedText: string,
  timeText: string,
  askUnit: 'км' | 'м',
): { question: string; storyKind: string } {
  const kind = pickOne(rng, ['went', 'rode', 'moved'] as const);
  const question = `${actor[0]!.toUpperCase()}${actor.slice(1)} ${verbFor(actor)} со скоростью ${speedText} ${timeText.includes('минут') || timeText.includes('пол') ? `в течение ${timeText}` : timeText}. Какое расстояние он преодолел? Ответ дай в ${askUnit}.`;
  return { question, storyKind: kind };
}

function hoursPhrase(n: number): string {
  if (n === 1) return '1 час';
  if (n >= 2 && n <= 4) return `${n} часа`;
  return `${n} часов`;
}

function buildL1(rng: SeededRng): Built | null {
  const { actor, speedKmh } = pickActorSpeed(rng, ACTORS.filter((a) => a.name !== 'поезд' || true));
  const timeHoursExact = pickOne(rng, [1, 2, 3]);
  const distanceKm = computeDistanceKm(speedKmh, timeHoursExact);
  if (distanceKm > 300 || distanceKm < 4) return null;
  const { question, storyKind } = buildStory(
    rng,
    actor,
    `${speedKmh} км/ч`,
    `${timeHoursExact === 1 ? '1 час' : hoursPhrase(timeHoursExact)}`,
    'км',
  );
  return {
    speedKmh,
    timeHoursExact,
    distanceKm,
    distanceAnswer: distanceKm,
    answerUnit: 'km',
    subtype: 'direct_hours',
    features: ['integer_hours', 'answer_km'],
    storyKind,
    actor,
    question,
    explanation: `Расстояние: ${speedKmh} × ${timeHoursExact} = ${distanceKm} км.`,
  };
}

function buildL2(rng: SeededRng, subtype: M30Subtype): Built | null {
  if (subtype === 'half_hour') {
    const { actor, speedKmh } = pickActorSpeed(
      rng,
      ACTORS.filter((a) => a.speeds.some((s) => (s * 0.5) % 1 === 0 || (s * 1.5) % 1 === 0)),
    );
    const halfKind = pickOne(rng, ['half', 'one_half'] as const);
    const timeHoursExact = halfKind === 'half' ? 0.5 : 1.5;
    if ((speedKmh * timeHoursExact) % 1 !== 0) return null;
    const distanceKm = computeDistanceKm(speedKmh, timeHoursExact);
    const timeText = halfKind === 'half' ? 'полчаса' : 'полтора часа';
    const { question, storyKind } = buildStory(rng, actor, `${speedKmh} км/ч`, timeText, 'км');
    return {
      speedKmh,
      timeHoursExact,
      distanceKm,
      distanceAnswer: distanceKm,
      answerUnit: 'km',
      subtype: 'half_hour',
      features: ['half_hour', 'answer_km'],
      storyKind,
      actor,
      question,
      explanation: `Время = ${timeHoursExact} ч. Расстояние: ${speedKmh} × ${timeHoursExact} = ${distanceKm} км.`,
    };
  }

  const { actor, speedKmh } = pickActorSpeed(
    rng,
    ACTORS.filter((a) => ['велосипедист', 'автобус', 'автомобиль', 'мотоциклист'].includes(a.name)),
  );
  const timeHoursExact = pickOne(rng, [2, 3, 4, 5]);
  const distanceKm = computeDistanceKm(speedKmh, timeHoursExact);
  if (distanceKm > 450) return null;
  const { question, storyKind } = buildStory(
    rng,
    actor,
    `${speedKmh} км/ч`,
    hoursPhrase(timeHoursExact),
    'км',
  );
  return {
    speedKmh,
    timeHoursExact,
    distanceKm,
    distanceAnswer: distanceKm,
    answerUnit: 'km',
    subtype: 'typical_hours',
    features: ['integer_hours', 'answer_km'],
    storyKind,
    actor,
    question,
    explanation: `Расстояние: ${speedKmh} × ${timeHoursExact} = ${distanceKm} км.`,
  };
}

function buildL3(rng: SeededRng, subtype: M30Subtype): Built | null {
  if (subtype === 'time_convert') {
    const { actor, speedKmh } = pickActorSpeed(rng);
    // Нетривиальный перевод: не «ровно N часов» через 60/120 без остатка ощущения — допускаем 30/45/90/150
    const timeMinutes = pickOne(rng, [30, 45, 90, 150]);
    const timeHoursExact = timeMinutes / 60;
    const distanceKm = computeDistanceKm(speedKmh, timeHoursExact);
    if (!Number.isInteger(distanceKm) || distanceKm <= 0) return null;
    const { question, storyKind } = buildStory(
      rng,
      actor,
      `${speedKmh} км/ч`,
      `${timeMinutes} минут`,
      'км',
    );
    return {
      speedKmh,
      timeHoursExact,
      distanceKm,
      distanceAnswer: distanceKm,
      answerUnit: 'km',
      subtype: 'time_convert',
      features: ['needs_time_convert', 'answer_km'],
      storyKind,
      actor,
      question,
      explanation: `Сначала ${timeMinutes} мин = ${timeHoursExact} ч. Затем ${speedKmh} × ${timeHoursExact} = ${distanceKm} км.`,
      timeMinutes,
    };
  }

  const { actor, speedKmh } = pickActorSpeed(
    rng,
    ACTORS.filter((a) => a.name === 'пешеход' || a.name === 'велосипедист'),
  );
  const timeHoursExact = pickOne(rng, [1, 2, 3]);
  const distanceKm = computeDistanceKm(speedKmh, timeHoursExact);
  const distanceAnswer = distanceKm * 1000;
  const { question, storyKind } = buildStory(
    rng,
    actor,
    `${speedKmh} км/ч`,
    `${timeHoursExact === 1 ? '1 час' : hoursPhrase(timeHoursExact)}`,
    'м',
  );
  return {
    speedKmh,
    timeHoursExact,
    distanceKm,
    distanceAnswer,
    answerUnit: 'm',
    subtype: 'length_convert',
    features: ['needs_length_convert', 'integer_hours', 'answer_m'],
    storyKind,
    actor,
    question,
    explanation: `Сначала ${speedKmh} × ${timeHoursExact} = ${distanceKm} км = ${distanceAnswer} м.`,
  };
}

function buildCase(rng: SeededRng, difficulty: Level, subtype: M30Subtype): Built | null {
  if (difficulty === 1) return buildL1(rng);
  if (difficulty === 2) return buildL2(rng, subtype);
  return buildL3(rng, subtype);
}

function distractorsFor(built: Built, rng: SeededRng): string[] {
  const models: Array<number | null> = [
    built.speedKmh + built.timeHoursExact,
    built.speedKmh,
    Math.round(built.timeHoursExact),
    built.distanceKm !== built.distanceAnswer ? built.distanceKm : null,
    built.timeMinutes != null ? built.speedKmh * built.timeMinutes : null,
    built.distanceAnswer + built.speedKmh,
    built.distanceAnswer > built.speedKmh ? built.distanceAnswer - built.speedKmh : null,
    built.distanceAnswer + 10,
    built.distanceAnswer > 10 ? built.distanceAnswer - 10 : null,
  ];
  return uniqueDistractorsFromModels(built.distanceAnswer, models, rng, 3);
}

function toTask(built: Built, difficulty: Level, seed: number, rng: SeededRng): Task {
  const levelParams = {
    timeHoursExact: built.timeHoursExact,
    features: built.features,
    subtype: built.subtype,
  };
  if (!isValidM30Level(levelParams, difficulty) || isTooEasy(levelParams, difficulty)) {
    throw new Error(`M30: структура не для L${difficulty}`);
  }
  if (!isRealisticActorSpeed(built.actor, built.speedKmh)) {
    throw new Error('M30: нереалистичная скорость');
  }
  const recomputedKm = computeDistanceKm(built.speedKmh, built.timeHoursExact);
  if (recomputedKm !== built.distanceKm) throw new Error('M30: distanceKm не сходится');
  const expectedAnswer = built.answerUnit === 'km' ? recomputedKm : recomputedKm * 1000;
  if (expectedAnswer !== built.distanceAnswer) throw new Error('M30: distanceAnswer не сходится');

  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const distractors = taskType === 'singleChoice' ? distractorsFor(built, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error('M30: не собраны дистракторы');
  }

  return baseTask({
    id: `generated-m30-${difficulty}-${built.subtype}-${built.speedKmh}-${built.timeHoursExact}-${built.answerUnit}`,
    section: 'Текстовые задачи',
    topic: 'Задачи на движение',
    skill: 'Нахождение расстояния',
    topicId: M30_TOPIC_ID,
    skillId: M30_SKILL_ID,
    difficulty,
    taskType,
    question: built.question,
    correctAnswer: taskType === 'numberAnswer' ? built.distanceAnswer : String(built.distanceAnswer),
    answers:
      taskType === 'singleChoice' ? buildChoiceAnswers(built.distanceAnswer, distractors, rng) : undefined,
    explanation: built.explanation,
    generatorId: M30_GENERATOR_ID,
    generatorParams: {
      speedKmh: built.speedKmh,
      timeHoursExact: built.timeHoursExact,
      distanceKm: built.distanceKm,
      distanceAnswer: built.distanceAnswer,
      answerUnit: built.answerUnit,
      subtype: built.subtype,
      features: built.features,
      seed,
      storyKind: built.storyKind,
      actor: built.actor,
      timeMinutes: built.timeMinutes,
    } satisfies M30GeneratorParams,
    hint1: 'Расстояние = скорость × время.',
    hint2: 'Проверь единицы: часы и километры должны быть согласованы.',
    hint3: `Ответ: ${built.distanceAnswer}.`,
  });
}

export function fingerprintM30(task: Task): string {
  const p = task.generatorParams as M30GeneratorParams;
  return `${p.subtype}|${p.actor}|${p.speedKmh}|${p.timeHoursExact}|${p.answerUnit}|${p.distanceAnswer}`;
}

export function generateM30Task(options: M30GenerateOptions): Task {
  rejectAdvancedLevels('M30', options.difficulty);
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
  throw new Error(`M30: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM30Series(options: M30SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      const subtype = subtypes[index % subtypes.length];
      return generateM30Task({ difficulty, seed, subtype });
    },
    fingerprintM30,
    'M30',
  );
}
