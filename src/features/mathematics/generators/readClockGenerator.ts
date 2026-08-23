/**
 * Генератор M10: чтение часов по циферблату (SVG).
 * Контракт: M10_GENERATOR_SPEC.md (P0: без digital-echo).
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  randomInt,
  rejectAdvancedLevels,
  svgToDataUri,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';
import { svgClock } from './visualSvg';

export const M10_SKILL_ID = 'math.quantities.time.read_clock' as const;
export const M10_TOPIC_ID = 'math.quantities.time' as const;
export const M10_GENERATOR_ID = 'gen.math.quantities.read_clock' as const;

export type ClockSubtype = 'analog_clock' | 'without_phrase' | 'next_hour';
export type ClockFeature =
  | 'whole_hour'
  | 'half_hour'
  | 'multiple_of_5'
  | 'not_multiple_of_5'
  | 'bez_chetverti'
  | 'has_svg';

export type M10GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: ClockSubtype };
export type M10SeriesOptions = { seed: number; countPerLevel?: number };

export type M10GeneratorParams = {
  hours: number;
  minutes: number;
  subtype: ClockSubtype;
  features: ClockFeature[];
  display: string;
  seed: number;
  hasVisual: true;
};

const SUBTYPE_TITLES: Record<ClockSubtype, string> = {
  analog_clock: 'Время по циферблату',
  without_phrase: 'Формулировка «без …»',
  next_hour: 'До следующего часа',
};

const L1: ClockSubtype[] = ['analog_clock'];
const L2: ClockSubtype[] = ['analog_clock', 'without_phrase'];
const L3: ClockSubtype[] = ['analog_clock', 'without_phrase', 'next_hour'];

export function formatTime(hours: number, minutes: number): string {
  const h = ((hours % 12) + 12) % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')}`;
}

export function clockFingerprint(hours: number, minutes: number, subtype: ClockSubtype): string {
  return `${subtype}|${hours}:${minutes}`;
}

export function isValidM10Level(
  hours: number,
  minutes: number,
  difficulty: Level,
  subtype: ClockSubtype,
): boolean {
  if (minutes < 0 || minutes > 59 || hours < 1 || hours > 12) return false;
  if (difficulty === 1) return minutes === 0 || minutes === 30;
  if (difficulty === 2) {
    if (subtype === 'without_phrase') return [35, 40, 50, 55].includes(minutes);
    return minutes % 5 === 0 && minutes !== 0 && minutes !== 30;
  }
  if (subtype === 'next_hour') return minutes % 5 !== 0;
  if (subtype === 'without_phrase') return minutes === 45 || (minutes > 30 && minutes % 5 !== 0);
  return minutes % 5 !== 0 || minutes === 45;
}

export function questionLeaksDigitalTime(question: string, hours: number, minutes: number): boolean {
  const display = formatTime(hours, minutes);
  const padded = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return question.includes(display) || question.includes(padded) || /электронн/i.test(question);
}

function withoutQuestion(hours: number, minutes: number): string | null {
  if (minutes === 45) {
    const next = hours === 12 ? 1 : hours + 1;
    return `Который час, если сейчас «без четверти ${next}»?`;
  }
  if (minutes > 30 && minutes < 60) {
    const to = 60 - minutes;
    const next = hours === 12 ? 1 : hours + 1;
    return `Который час, если сейчас «без ${to} минут ${next}»?`;
  }
  return null;
}

function distractorsFor(hours: number, minutes: number, rng: SeededRng): string[] {
  const correct = formatTime(hours, minutes);
  const mark = Math.min(12, Math.max(1, Math.round(minutes / 5) || 12));
  const models = [
    formatTime(hours, (minutes + 5) % 60),
    formatTime(hours, (minutes + 55) % 60),
    formatTime(hours === 12 ? 1 : hours + 1, minutes),
    formatTime(hours === 1 ? 12 : hours - 1, minutes),
    formatTime(mark, Math.min(55, ((hours % 12) || 12) * 5 % 60)),
    formatTime(hours, minutes === 0 ? 30 : 0),
  ];
  return uniqueDistractorsFromModels(correct, models, rng, 3);
}

function featuresOf(minutes: number): ClockFeature[] {
  const features: ClockFeature[] = ['has_svg'];
  if (minutes === 0) features.push('whole_hour');
  if (minutes === 30) features.push('half_hour');
  if (minutes % 5 === 0) features.push('multiple_of_5');
  else features.push('not_multiple_of_5');
  if (minutes === 45) features.push('bez_chetverti');
  return features;
}

function pickTime(rng: SeededRng, difficulty: Level, subtype: ClockSubtype): { hours: number; minutes: number } {
  const hours = randomInt(rng, 1, 12);
  if (difficulty === 1) return { hours, minutes: pickOne(rng, [0, 30]) };
  if (difficulty === 2) {
    if (subtype === 'without_phrase') return { hours, minutes: pickOne(rng, [35, 40, 50, 55]) };
    return { hours, minutes: pickOne(rng, [5, 10, 15, 20, 25, 35, 40, 45, 50, 55]) };
  }
  if (subtype === 'without_phrase') {
    if (rng() < 0.5) return { hours, minutes: 45 };
    let minutes = randomInt(rng, 31, 59);
    while (minutes % 5 === 0) minutes = randomInt(rng, 31, 59);
    return { hours, minutes };
  }
  let minutes = randomInt(rng, 1, 59);
  while (minutes % 5 === 0) minutes = randomInt(rng, 1, 59);
  return { hours, minutes };
}

export function generateM10Task(options: M10GenerateOptions): Task {
  rejectAdvancedLevels('M10', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const allowed = difficulty === 1 ? L1 : difficulty === 2 ? L2 : L3;
  const subtype =
    options.subtype && allowed.includes(options.subtype) ? options.subtype : pickOne(rng, allowed);

  for (let i = 0; i < 120; i += 1) {
    const { hours, minutes } = pickTime(rng, difficulty, subtype);
    if (!isValidM10Level(hours, minutes, difficulty, subtype)) continue;

    const display = formatTime(hours, minutes);
    const image = svgToDataUri(svgClock(hours, minutes));
    const features = featuresOf(minutes);
    const params: M10GeneratorParams = {
      hours,
      minutes,
      subtype,
      features,
      display,
      seed: options.seed,
      hasVisual: true,
    };

    if (subtype === 'next_hour') {
      const left = 60 - minutes;
      const question = 'Сколько минут осталось до следующего часа по циферблату?';
      if (questionLeaksDigitalTime(question, hours, minutes)) continue;
      return baseTask({
        id: `generated-m10-${difficulty}-next-${hours}-${minutes}`,
        section: 'Величины',
        topic: 'Время',
        skill: SUBTYPE_TITLES.next_hour,
        topicId: M10_TOPIC_ID,
        skillId: M10_SKILL_ID,
        difficulty,
        taskType: 'imageTask',
        question,
        correctAnswer: left,
        explanation: `На циферблате ${display}. До часа осталось ${left} мин.`,
        generatorId: M10_GENERATOR_ID,
        generatorParams: params,
        image,
      });
    }

    if (subtype === 'without_phrase') {
      const q = withoutQuestion(hours, minutes);
      if (!q) continue;
      const question = difficulty === 3 ? `${q} Запиши время в формате Ч:ММ.` : q;
      if (questionLeaksDigitalTime(question, hours, minutes)) continue;
      if (difficulty === 3) {
        return baseTask({
          id: `generated-m10-3-bez-${hours}-${minutes}`,
          section: 'Величины',
          topic: 'Время',
          skill: SUBTYPE_TITLES.without_phrase,
          topicId: M10_TOPIC_ID,
          skillId: M10_SKILL_ID,
          difficulty: 3,
          taskType: 'imageTask',
          question,
          correctAnswer: display,
          explanation: `Верное время: ${display}.`,
          generatorId: M10_GENERATOR_ID,
          generatorParams: params,
          image,
        });
      }
      const distractors = distractorsFor(hours, minutes, rng);
      if (distractors.length !== 3) continue;
      return baseTask({
        id: `generated-m10-${difficulty}-bez-${hours}-${minutes}`,
        section: 'Величины',
        topic: 'Время',
        skill: SUBTYPE_TITLES.without_phrase,
        topicId: M10_TOPIC_ID,
        skillId: M10_SKILL_ID,
        difficulty,
        taskType: 'imageTask',
        question,
        correctAnswer: display,
        answers: buildChoiceAnswers(display, distractors, rng),
        explanation: `Верное время: ${display}.`,
        generatorId: M10_GENERATOR_ID,
        generatorParams: params,
        image,
      });
    }

    // analog_clock
    const question =
      difficulty === 3
        ? 'Которое время показывают часы? Запиши в формате Ч:ММ.'
        : 'Которое время показывают часы?';
    if (questionLeaksDigitalTime(question, hours, minutes)) continue;
    if (difficulty === 3) {
      return baseTask({
        id: `generated-m10-3-analog-${hours}-${minutes}`,
        section: 'Величины',
        topic: 'Время',
        skill: SUBTYPE_TITLES.analog_clock,
        topicId: M10_TOPIC_ID,
        skillId: M10_SKILL_ID,
        difficulty: 3,
        taskType: 'imageTask',
        question,
        correctAnswer: display,
        explanation: `Верное время: ${display}.`,
        generatorId: M10_GENERATOR_ID,
        generatorParams: params,
        image,
      });
    }
    const distractors = distractorsFor(hours, minutes, rng);
    if (distractors.length !== 3) continue;
    return baseTask({
      id: `generated-m10-${difficulty}-analog-${hours}-${minutes}`,
      section: 'Величины',
      topic: 'Время',
      skill: SUBTYPE_TITLES.analog_clock,
      topicId: M10_TOPIC_ID,
      skillId: M10_SKILL_ID,
      difficulty,
      taskType: 'imageTask',
      question,
      correctAnswer: display,
      answers: buildChoiceAnswers(display, distractors, rng),
      explanation: `Верное время: ${display}.`,
      generatorId: M10_GENERATOR_ID,
      generatorParams: params,
      image,
      hint2: 'Минутная стрелка: каждое деление — 5 минут.',
    });
  }
  throw new Error(`M10: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM10Series(options: M10SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const allowed = difficulty === 1 ? L1 : difficulty === 2 ? L2 : L3;
      return generateM10Task({ difficulty, seed, subtype: allowed[index % allowed.length] });
    },
    (task) => {
      const p = task.generatorParams as M10GeneratorParams;
      return clockFingerprint(p.hours, p.minutes, p.subtype);
    },
    'M10',
  );
}
