/**
 * Генератор M14: единицы площади (без формулы фигуры).
 * Контракт: M14_GENERATOR_SPEC.md
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
  uniqueDistractorsFromModels,
  type Level,
} from './generatorScaffold';

export const M14_SKILL_ID = 'math.quantities.area.convert' as const;
export const M14_TOPIC_ID = 'math.quantities.area' as const;
export const M14_GENERATOR_ID = 'gen.math.quantities.area' as const;

export type AreaSubtype = 'choose_unit' | 'relation' | 'convert' | 'compare';
export type AreaFeature = 'cm2' | 'dm2' | 'm2' | 'coeff_100' | 'coeff_10000' | 'compound' | 'trap_10';

export type M14GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: AreaSubtype };
export type M14SeriesOptions = { seed: number; countPerLevel?: number };

export type M14GeneratorParams = {
  valueCm2: number;
  subtype: AreaSubtype;
  features: AreaFeature[];
  fromUnit: string;
  toUnit: string;
  seed: number;
  promptKey?: string;
};

const TITLES: Record<AreaSubtype, string> = {
  choose_unit: 'Выбор единицы площади',
  relation: 'Соотношение единиц площади',
  convert: 'Перевод единиц площади',
  compare: 'Сравнение площадей',
};

const L1S: AreaSubtype[] = ['choose_unit', 'relation'];
const L2S: AreaSubtype[] = ['convert'];
const L3S: AreaSubtype[] = ['convert', 'compare'];

const CHOOSE = [
  { key: 'notebook', q: 'В каких единицах удобно измерить площадь обложки тетради?', correct: 'дм²', wrong: ['см', 'мм²', 'кг'] },
  { key: 'board', q: 'В каких единицах измеряют площадь классной доски?', correct: 'м²', wrong: ['см', 'дм', 'г'] },
  { key: 'sticker', q: 'Площадь маленькой наклейки удобнее измерять в …', correct: 'см²', wrong: ['см', 'мм', 'кг'] },
  { key: 'desk', q: 'Площадь парты удобнее измерять в …', correct: 'дм²', wrong: ['см', 'м', 'кг'] },
  { key: 'room', q: 'Площадь комнаты обычно измеряют в …', correct: 'м²', wrong: ['см²', 'см', 'мин'] },
  { key: 'stamp', q: 'Площадь почтовой марки удобнее измерять в …', correct: 'см²', wrong: ['см', 'дм', 'т'] },
  { key: 'floor', q: 'Площадь пола в классе обычно измеряют в …', correct: 'м²', wrong: ['мм²', 'см', 'л'] },
  { key: 'card', q: 'Площадь открытки удобнее измерять в …', correct: 'дм²', wrong: ['см', 'м', 'г'] },
  { key: 'photo', q: 'Площадь небольшой фотографии удобнее указать в …', correct: 'см²', wrong: ['см', 'мм', 'мин'] },
  { key: 'yard', q: 'Площадь школьного двора измеряют в …', correct: 'м²', wrong: ['см²', 'мм', 'г'] },
  { key: 'eraser', q: 'Площадь грани ластика удобнее измерять в …', correct: 'см²', wrong: ['см', 'кг', 'ч'] },
  { key: 'window', q: 'Площадь оконного стекла обычно измеряют в …', correct: 'м²', wrong: ['см', 'мм', 'мин'] },
];

const RELATIONS = [
  { key: 'm2_dm2', q: 'Сколько дм² в 1 м²?', answer: 100, features: ['m2', 'dm2', 'coeff_100'] as AreaFeature[], from: 'м²', to: 'дм²' },
  { key: 'dm2_cm2', q: 'Сколько см² в 1 дм²?', answer: 100, features: ['dm2', 'cm2', 'coeff_100'] as AreaFeature[], from: 'дм²', to: 'см²' },
  { key: 'm2_cm2', q: 'Сколько см² в 1 м²?', answer: 10000, features: ['m2', 'cm2', 'coeff_10000'] as AreaFeature[], from: 'м²', to: 'см²' },
  { key: '2m2_dm2', q: 'Сколько дм² в 2 м²?', answer: 200, features: ['m2', 'dm2', 'coeff_100'] as AreaFeature[], from: 'м²', to: 'дм²' },
  { key: '3dm2_cm2', q: 'Сколько см² в 3 дм²?', answer: 300, features: ['dm2', 'cm2', 'coeff_100'] as AreaFeature[], from: 'дм²', to: 'см²' },
  { key: '4m2_dm2', q: 'Сколько дм² в 4 м²?', answer: 400, features: ['m2', 'dm2', 'coeff_100'] as AreaFeature[], from: 'м²', to: 'дм²' },
  { key: '5dm2_cm2', q: 'Сколько см² в 5 дм²?', answer: 500, features: ['dm2', 'cm2', 'coeff_100'] as AreaFeature[], from: 'дм²', to: 'см²' },
  { key: '2m2_cm2', q: 'Сколько см² в 2 м²?', answer: 20000, features: ['m2', 'cm2', 'coeff_10000'] as AreaFeature[], from: 'м²', to: 'см²' },
];

export function areaFingerprint(p: M14GeneratorParams): string {
  return `${p.subtype}|${p.promptKey ?? ''}|${p.valueCm2}|${p.fromUnit}|${p.toUnit}|${p.features.join(',')}`;
}

export function dm2ToCm2(dm2: number): number {
  return dm2 * 100;
}

export function m2ToCm2(m2: number): number {
  return m2 * 10000;
}

export function m2ToDm2(m2: number): number {
  return m2 * 100;
}

export function looksLikeFigureArea(question: string): boolean {
  return /\d+\s*[×xх]\s*\d+/i.test(question) || /площадь прямоугольник|S\s*=/i.test(question);
}

export function isValidM14Level(features: AreaFeature[], subtype: AreaSubtype, difficulty: Level): boolean {
  if (difficulty === 1) return subtype === 'choose_unit' || subtype === 'relation';
  if (difficulty === 2) return subtype === 'convert' && !features.includes('compound');
  return features.includes('compound') || subtype === 'compare' || features.includes('coeff_10000');
}

export function generateM14Task(options: M14GenerateOptions): Task {
  rejectAdvancedLevels('M14', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
  const subtype =
    options.subtype && allowed.includes(options.subtype) ? options.subtype : pickOne(rng, allowed);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (subtype === 'choose_unit') {
      const item = pickOne(rng, CHOOSE);
      if (looksLikeFigureArea(item.q)) continue;
      const params: M14GeneratorParams = {
        valueCm2: 0,
        subtype: 'choose_unit',
        features: item.correct === 'см²' ? ['cm2'] : item.correct === 'дм²' ? ['dm2'] : ['m2'],
        fromUnit: item.correct,
        toUnit: item.correct,
        seed: options.seed,
        promptKey: item.key,
      };
      if (!isValidM14Level(params.features, subtype, difficulty)) continue;
      return baseTask({
        id: `generated-m14-1-choose-${item.key}-${options.seed}`,
        section: 'Величины',
        topic: 'Площадь',
        skill: TITLES.choose_unit,
        topicId: M14_TOPIC_ID,
        skillId: M14_SKILL_ID,
        difficulty: 1,
        taskType: 'singleChoice',
        question: item.q,
        correctAnswer: item.correct,
        answers: buildChoiceAnswers(item.correct, item.wrong, rng),
        explanation: `Подходящая единица площади — ${item.correct}.`,
        generatorId: M14_GENERATOR_ID,
        generatorParams: params,
      });
    }

    if (subtype === 'relation' && difficulty === 1) {
      const item = pickOne(rng, RELATIONS);
      const d = uniqueDistractorsFromModels(
        item.answer,
        [item.answer === 10000 ? 1000 : 10, item.answer / 10, item.answer * 10, 1000, 10, 100],
        rng,
        3,
      );
      if (d.length !== 3) continue;
      const params: M14GeneratorParams = {
        valueCm2: item.from === 'м²' ? m2ToCm2(1) : dm2ToCm2(1),
        subtype: 'relation',
        features: item.features,
        fromUnit: item.from,
        toUnit: item.to,
        seed: options.seed,
        promptKey: item.key,
      };
      if (!isValidM14Level(params.features, subtype, difficulty)) continue;
      return baseTask({
        id: `generated-m14-1-rel-${item.key}-${options.seed}`,
        section: 'Величины',
        topic: 'Площадь',
        skill: TITLES.relation,
        topicId: M14_TOPIC_ID,
        skillId: M14_SKILL_ID,
        difficulty: 1,
        taskType: 'singleChoice',
        question: item.q,
        correctAnswer: String(item.answer),
        answers: buildChoiceAnswers(item.answer, d, rng),
        explanation: `${item.q.replace('Сколько', 'В')} — ${item.answer}.`,
        generatorId: M14_GENERATOR_ID,
        generatorParams: params,
        hint2: 'Для площади коэффициенты 100 и 10 000, не путай с длиной (10).',
      });
    }

    if (difficulty === 2) {
      const mode = pickOne(rng, ['dm2_cm2', 'm2_dm2', 'm2_cm2', 'cm2_dm2'] as const);
      if (mode === 'dm2_cm2') {
        const dm2 = randomInt(rng, 2, 9);
        const answer = dm2ToCm2(dm2);
        const params: M14GeneratorParams = {
          valueCm2: answer,
          subtype: 'convert',
          features: ['cm2', 'dm2', 'coeff_100', 'trap_10'],
          fromUnit: 'дм²',
          toUnit: 'см²',
          seed: options.seed,
        };
        const d = uniqueDistractorsFromModels(answer, [dm2 * 10, dm2, answer + 100, dm2 * 1000], rng, 3);
        if (d.length !== 3) continue;
        return baseTask({
          id: `generated-m14-2-${dm2}dm2`,
          section: 'Величины',
          topic: 'Площадь',
          skill: TITLES.convert,
          topicId: M14_TOPIC_ID,
          skillId: M14_SKILL_ID,
          difficulty: 2,
          taskType: 'singleChoice',
          question: `Сколько см² в ${dm2} дм²?`,
          correctAnswer: String(answer),
          answers: buildChoiceAnswers(answer, d, rng),
          explanation: `1 дм² = 100 см², поэтому ${dm2} дм² = ${answer} см².`,
          generatorId: M14_GENERATOR_ID,
          generatorParams: params,
          hint2: 'Не путай коэффициент 10 (для длины) с 100 (для площади).',
        });
      }
      if (mode === 'cm2_dm2') {
        const dm2 = randomInt(rng, 2, 8);
        const cm2 = dm2ToCm2(dm2);
        const answer = dm2;
        const params: M14GeneratorParams = {
          valueCm2: cm2,
          subtype: 'convert',
          features: ['cm2', 'dm2', 'coeff_100', 'trap_10'],
          fromUnit: 'см²',
          toUnit: 'дм²',
          seed: options.seed,
        };
        const d = uniqueDistractorsFromModels(answer, [cm2, dm2 * 10, Math.floor(cm2 / 10), dm2 + 1], rng, 3);
        if (d.length !== 3) continue;
        return baseTask({
          id: `generated-m14-2-${cm2}cm2`,
          section: 'Величины',
          topic: 'Площадь',
          skill: TITLES.convert,
          topicId: M14_TOPIC_ID,
          skillId: M14_SKILL_ID,
          difficulty: 2,
          taskType: 'singleChoice',
          question: `Сколько дм² в ${cm2} см²?`,
          correctAnswer: String(answer),
          answers: buildChoiceAnswers(answer, d, rng),
          explanation: `100 см² = 1 дм², поэтому ${cm2} см² = ${answer} дм².`,
          generatorId: M14_GENERATOR_ID,
          generatorParams: params,
        });
      }
      if (mode === 'm2_cm2') {
        const m2 = randomInt(rng, 1, 4);
        const answer = m2ToCm2(m2);
        const params: M14GeneratorParams = {
          valueCm2: answer,
          subtype: 'convert',
          features: ['m2', 'cm2', 'coeff_10000', 'trap_10'],
          fromUnit: 'м²',
          toUnit: 'см²',
          seed: options.seed,
        };
        const d = uniqueDistractorsFromModels(answer, [m2 * 100, m2 * 1000, m2 * 10, answer + 1000], rng, 3);
        if (d.length !== 3) continue;
        return baseTask({
          id: `generated-m14-2-${m2}m2cm`,
          section: 'Величины',
          topic: 'Площадь',
          skill: TITLES.convert,
          topicId: M14_TOPIC_ID,
          skillId: M14_SKILL_ID,
          difficulty: 2,
          taskType: 'singleChoice',
          question: `Сколько см² в ${m2} м²?`,
          correctAnswer: String(answer),
          answers: buildChoiceAnswers(answer, d, rng),
          explanation: `1 м² = 10 000 см², поэтому ${m2} м² = ${answer} см².`,
          generatorId: M14_GENERATOR_ID,
          generatorParams: params,
          hint2: '1 м² = 10 000 см² (не 1000 и не 100).',
        });
      }
      const m2 = randomInt(rng, 2, 8);
      const answer = m2ToDm2(m2);
      const params: M14GeneratorParams = {
        valueCm2: m2ToCm2(m2),
        subtype: 'convert',
        features: ['m2', 'dm2', 'coeff_100'],
        fromUnit: 'м²',
        toUnit: 'дм²',
        seed: options.seed,
      };
      const d = uniqueDistractorsFromModels(answer, [m2 * 10, m2, answer + 100, m2 * 1000], rng, 3);
      if (d.length !== 3) continue;
      return baseTask({
        id: `generated-m14-2-${m2}m2`,
        section: 'Величины',
        topic: 'Площадь',
        skill: TITLES.convert,
        topicId: M14_TOPIC_ID,
        skillId: M14_SKILL_ID,
        difficulty: 2,
        taskType: 'singleChoice',
        question: `Сколько дм² в ${m2} м²?`,
        correctAnswer: String(answer),
        answers: buildChoiceAnswers(answer, d, rng),
        explanation: `1 м² = 100 дм², поэтому ${m2} м² = ${answer} дм².`,
        generatorId: M14_GENERATOR_ID,
        generatorParams: params,
      });
    }

    // L3
    if (subtype === 'compare') {
      const dm2 = randomInt(rng, 1, 4);
      const cm2 = randomInt(rng, 10, 90);
      const left = dm2ToCm2(dm2);
      const answer = Math.abs(left - cm2);
      const params: M14GeneratorParams = {
        valueCm2: answer,
        subtype: 'compare',
        features: ['compound', 'cm2', 'dm2', 'trap_10'],
        fromUnit: 'дм²',
        toUnit: 'см²',
        seed: options.seed,
        promptKey: `cmp-${dm2}-${cm2}`,
      };
      const d = uniqueDistractorsFromModels(
        answer,
        [Math.max(left, cm2), Math.min(left, cm2), dm2 * 10 + cm2, left + cm2, Math.abs(dm2 - cm2)],
        rng,
        3,
      );
      if (d.length !== 3) continue;
      const question =
        left >= cm2
          ? `На сколько см² ${dm2} дм² больше, чем ${cm2} см²?`
          : `На сколько см² ${cm2} см² больше, чем ${dm2} дм²?`;
      return baseTask({
        id: `generated-m14-3-cmp-${dm2}-${cm2}`,
        section: 'Величины',
        topic: 'Площадь',
        skill: TITLES.compare,
        topicId: M14_TOPIC_ID,
        skillId: M14_SKILL_ID,
        difficulty: 3,
        taskType: 'singleChoice',
        question,
        correctAnswer: String(answer),
        answers: buildChoiceAnswers(answer, d, rng),
        explanation: `${dm2} дм² = ${left} см². Разница ${answer} см².`,
        generatorId: M14_GENERATOR_ID,
        generatorParams: params,
      });
    }

    // compound convert or m² mix
    if (rng() < 0.35) {
      const m2 = randomInt(rng, 1, 3);
      const dm2 = randomInt(rng, 1, 9);
      const answer = m2ToDm2(m2) + dm2;
      const params: M14GeneratorParams = {
        valueCm2: m2ToCm2(m2) + dm2ToCm2(dm2),
        subtype: 'convert',
        features: ['compound', 'm2', 'dm2', 'coeff_100'],
        fromUnit: 'м²',
        toUnit: 'дм²',
        seed: options.seed,
        promptKey: `cmpd-m-${m2}-${dm2}`,
      };
      return baseTask({
        id: `generated-m14-3-${m2}m2-${dm2}dm2`,
        section: 'Величины',
        topic: 'Площадь',
        skill: TITLES.convert,
        topicId: M14_TOPIC_ID,
        skillId: M14_SKILL_ID,
        difficulty: 3,
        taskType: 'numberAnswer',
        question: `Сколько дм² в ${m2} м² и ${dm2} дм² вместе?`,
        correctAnswer: answer,
        explanation: `${m2}×100 + ${dm2} = ${answer} дм².`,
        generatorId: M14_GENERATOR_ID,
        generatorParams: params,
        hint2: '1 м² = 100 дм².',
      });
    }

    const dm2 = randomInt(rng, 1, 5);
    const cm2 = randomInt(rng, 1, 99);
    const answer = dm2ToCm2(dm2) + cm2;
    const params: M14GeneratorParams = {
      valueCm2: answer,
      subtype: 'convert',
      features: ['compound', 'cm2', 'dm2', 'coeff_100', 'trap_10'],
      fromUnit: 'дм²',
      toUnit: 'см²',
      seed: options.seed,
      promptKey: `cmpd-${dm2}-${cm2}`,
    };
    return baseTask({
      id: `generated-m14-3-${dm2}dm2-${cm2}`,
      section: 'Величины',
      topic: 'Площадь',
      skill: TITLES.convert,
      topicId: M14_TOPIC_ID,
      skillId: M14_SKILL_ID,
      difficulty: 3,
      taskType: 'numberAnswer',
      question: `Сколько см² в ${dm2} дм² и ${cm2} см²?`,
      correctAnswer: answer,
      explanation: `${dm2}×100 + ${cm2} = ${answer} см².`,
      generatorId: M14_GENERATOR_ID,
      generatorParams: params,
      hint2: '1 дм² = 100 см².',
    });
  }

  throw new Error(`M14: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM14Series(options: M14SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
      if (difficulty === 1) {
        const useRelation = index % 2 === 1;
        if (useRelation) {
          const item = RELATIONS[(seed + index * 3) % RELATIONS.length]!;
          const rng = createSeededRng((seed + index * 17) >>> 0);
          const d = uniqueDistractorsFromModels(
            item.answer,
            [item.answer === 10000 || item.answer === 20000 ? 1000 : 10, Math.floor(item.answer / 10), item.answer * 10, 1000, 10, 100],
            rng,
            3,
          );
          const params: M14GeneratorParams = {
            valueCm2: item.from === 'м²' ? m2ToCm2(1) : dm2ToCm2(1),
            subtype: 'relation',
            features: item.features,
            fromUnit: item.from,
            toUnit: item.to,
            seed,
            promptKey: `${item.key}-${index}`,
          };
          return baseTask({
            id: `generated-m14-1-rel-${item.key}-${seed}-${index}`,
            section: 'Величины',
            topic: 'Площадь',
            skill: TITLES.relation,
            topicId: M14_TOPIC_ID,
            skillId: M14_SKILL_ID,
            difficulty: 1,
            taskType: 'singleChoice',
            question: item.q,
            correctAnswer: String(item.answer),
            answers: buildChoiceAnswers(item.answer, d, rng),
            explanation: `Ответ: ${item.answer}.`,
            generatorId: M14_GENERATOR_ID,
            generatorParams: params,
            hint2: 'Для площади коэффициенты 100 и 10 000, не путай с длиной (10).',
          });
        }
        const item = CHOOSE[(seed + index * 5) % CHOOSE.length]!;
        const rng = createSeededRng((seed + index * 19) >>> 0);
        const params: M14GeneratorParams = {
          valueCm2: 0,
          subtype: 'choose_unit',
          features: item.correct === 'см²' ? ['cm2'] : item.correct === 'дм²' ? ['dm2'] : ['m2'],
          fromUnit: item.correct,
          toUnit: item.correct,
          seed,
          promptKey: `${item.key}-${index}`,
        };
        return baseTask({
          id: `generated-m14-1-choose-${item.key}-${seed}-${index}`,
          section: 'Величины',
          topic: 'Площадь',
          skill: TITLES.choose_unit,
          topicId: M14_TOPIC_ID,
          skillId: M14_SKILL_ID,
          difficulty: 1,
          taskType: 'singleChoice',
          question: item.q,
          correctAnswer: item.correct,
          answers: buildChoiceAnswers(item.correct, item.wrong, rng),
          explanation: `Подходящая единица площади — ${item.correct}.`,
          generatorId: M14_GENERATOR_ID,
          generatorParams: params,
        });
      }
      return generateM14Task({ difficulty, seed, subtype: allowed[index % allowed.length] });
    },
    (task) => areaFingerprint(task.generatorParams as M14GeneratorParams),
    'M14',
  );
}
