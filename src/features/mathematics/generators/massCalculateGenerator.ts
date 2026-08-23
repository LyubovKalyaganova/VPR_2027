/**
 * Генератор M12: масса кг/г.
 * Контракт: M12_GENERATOR_SPEC.md
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
  type SeededRng,
} from './generatorScaffold';

export const M12_SKILL_ID = 'math.quantities.mass.calculate' as const;
export const M12_TOPIC_ID = 'math.quantities.mass' as const;
export const M12_GENERATOR_ID = 'gen.math.quantities.mass' as const;

export type MassSubtype = 'convert' | 'compare' | 'add_sub' | 'compound';
export type MassFeature = 'to_g' | 'to_kg' | 'add' | 'sub' | 'compound' | 'wrong_100g';

export type M12GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: MassSubtype };
export type M12SeriesOptions = { seed: number; countPerLevel?: number };

export type M12GeneratorParams = {
  kg: number;
  g: number;
  totalGrams: number;
  subtype: MassSubtype;
  features: MassFeature[];
  seed: number;
};

const TITLES: Record<MassSubtype, string> = {
  convert: 'Перевод кг ↔ г',
  compare: 'Сравнение масс',
  add_sub: 'Сложение и вычитание масс',
  compound: 'Составная запись массы',
};

const L1S: MassSubtype[] = ['convert'];
const L2S: MassSubtype[] = ['convert', 'compare', 'add_sub'];
const L3S: MassSubtype[] = ['compound', 'add_sub'];

export function kgGToGrams(kg: number, g: number): number {
  return kg * 1000 + g;
}

export function massFingerprint(p: M12GeneratorParams): string {
  return `${p.subtype}|${p.kg}|${p.g}|${p.totalGrams}|${p.features.join(',')}`;
}

export function isValidM12Level(features: MassFeature[], difficulty: Level): boolean {
  const compound = features.includes('compound');
  if (difficulty === 1) return !compound && (features.includes('to_g') || features.includes('to_kg'));
  if (difficulty === 2) return !compound;
  return compound || features.includes('add') || features.includes('sub');
}

function choiceOrNumber(
  difficulty: Level,
  seed: number,
  subtype: MassSubtype,
  params: M12GeneratorParams,
  question: string,
  answer: number,
  explanation: string,
  rng: SeededRng,
  models: number[],
): Task | null {
  if (difficulty < 3) {
    const d = uniqueDistractorsFromModels(answer, models, rng, 3);
    if (d.length !== 3) return null;
    return baseTask({
      id: `generated-m12-${difficulty}-${subtype}-${answer}-${seed}`,
      section: 'Величины',
      topic: 'Масса',
      skill: TITLES[subtype],
      topicId: M12_TOPIC_ID,
      skillId: M12_SKILL_ID,
      difficulty,
      taskType: 'singleChoice',
      question,
      correctAnswer: String(answer),
      answers: buildChoiceAnswers(answer, d, rng),
      explanation,
      generatorId: M12_GENERATOR_ID,
      generatorParams: params,
      hint2: '1 кг = 1000 г.',
    });
  }
  return baseTask({
    id: `generated-m12-3-${subtype}-${answer}-${seed}`,
    section: 'Величины',
    topic: 'Масса',
    skill: TITLES[subtype],
    topicId: M12_TOPIC_ID,
    skillId: M12_SKILL_ID,
    difficulty: 3,
    taskType: 'numberAnswer',
    question,
    correctAnswer: answer,
    explanation,
    generatorId: M12_GENERATOR_ID,
    generatorParams: params,
    hint2: '1 кг = 1000 г.',
  });
}

function build(rng: SeededRng, difficulty: Level, subtype: MassSubtype, seed: number): Task | null {
  if (difficulty === 1) {
    const toG = rng() < 0.5;
    if (toG) {
      const kg = randomInt(rng, 2, 9);
      const answer = kg * 1000;
      const params: M12GeneratorParams = {
        kg,
        g: 0,
        totalGrams: answer,
        subtype: 'convert',
        features: ['to_g'],
        seed,
      };
      return choiceOrNumber(
        difficulty,
        seed,
        'convert',
        params,
        `Сколько граммов в ${kg} кг?`,
        answer,
        `${kg} кг = ${answer} г.`,
        rng,
        [kg * 100, kg * 10, answer + 1000, kg],
      );
    }
    const kg = randomInt(rng, 2, 9);
    const grams = kg * 1000;
    const params: M12GeneratorParams = {
      kg,
      g: 0,
      totalGrams: grams,
      subtype: 'convert',
      features: ['to_kg'],
      seed,
    };
    return choiceOrNumber(
      difficulty,
      seed,
      'convert',
      params,
      `Сколько килограммов в ${grams} г?`,
      kg,
      `${grams} г = ${kg} кг.`,
      rng,
      [kg * 10, grams / 100, kg + 1, kg - 1],
    );
  }

  if (difficulty === 2) {
    if (subtype === 'compare') {
      const kg = randomInt(rng, 1, 3);
      const g = randomInt(rng, 100, 900);
      // что больше: kg кг или g г? — ответ 1 если кг больше, иначе граммы как текст сложно
      // Сравниваем в граммах: вопрос "Сколько граммов в N кг?" уже convert.
      // Сравнение: "Что больше: 1 кг или 300 г?" → ответ "1 кг" as choice - but correctAnswer number?
      // PROJECT_DECISION: ответ — большая масса в граммах
      const left = kg * 1000;
      const right = g;
      const answer = Math.max(left, right);
      const params: M12GeneratorParams = {
        kg,
        g,
        totalGrams: answer,
        subtype: 'compare',
        features: ['to_g'],
        seed,
      };
      return choiceOrNumber(
        difficulty,
        seed,
        'compare',
        params,
        `Что больше (ответь в граммах): ${kg} кг или ${g} г?`,
        answer,
        `${kg} кг = ${left} г; сравниваем с ${g} г.`,
        rng,
        [Math.min(left, right), kg * 100 + g, left + right, g * 10],
      );
    }
    if (subtype === 'add_sub') {
      const a = pickOne(rng, [200, 250, 300, 400, 500, 750]);
      const b = pickOne(rng, [100, 150, 200, 250, 300]);
      const add = rng() < 0.5;
      const answer = add ? a + b : a - b;
      if (answer <= 0) return null;
      const params: M12GeneratorParams = {
        kg: 0,
        g: answer,
        totalGrams: answer,
        subtype: 'add_sub',
        features: [add ? 'add' : 'sub'],
        seed,
      };
      return choiceOrNumber(
        difficulty,
        seed,
        'add_sub',
        params,
        add ? `${a} г + ${b} г = ? г` : `${a} г − ${b} г = ? г`,
        answer,
        `Ответ: ${answer} г.`,
        rng,
        [a + b + (add ? 100 : 0), Math.abs(a - b), a * b, a + b - 50],
      );
    }
    // convert L2 with non-round: 2 кг 0 г already L1; use 2500 г = 2 кг 500 г as answer grams of part
    const kg = randomInt(rng, 1, 5);
    const extra = pickOne(rng, [250, 500, 750]);
    const total = kg * 1000 + extra;
    const params: M12GeneratorParams = {
      kg,
      g: extra,
      totalGrams: total,
      subtype: 'convert',
      features: ['to_g'],
      seed,
    };
    // still not compound feature — single number 2.5 kg style as "2 кг и ещё 500 г уже даны раздельно в вопросе как перевод 2500"
    return choiceOrNumber(
      difficulty,
      seed,
      'convert',
      params,
      `Сколько граммов в ${kg} кг и ${extra} г вместе?`,
      total,
      `${kg}×1000 + ${extra} = ${total}.`,
      rng,
      [kg * 100 + extra, kg * 1000, extra * 10, total + 100],
    );
  }

  // L3 compound
  const kg1 = randomInt(rng, 1, 4);
  const g1 = randomInt(rng, 50, 900);
  if (subtype === 'compound' || rng() < 0.5) {
    const total = kgGToGrams(kg1, g1);
    const params: M12GeneratorParams = {
      kg: kg1,
      g: g1,
      totalGrams: total,
      subtype: 'compound',
      features: ['compound', 'to_g', 'wrong_100g'],
      seed,
    };
    return choiceOrNumber(
      difficulty,
      seed,
      'compound',
      params,
      `Сколько граммов в ${kg1} кг ${g1} г?`,
      total,
      `${kg1}×1000 + ${g1} = ${total} г.`,
      rng,
      [Number(`${kg1}${g1}`), kg1 * 100 + g1, total + 100, kg1 * 1000],
    );
  }
  const kg2 = randomInt(rng, 1, 3);
  const g2 = randomInt(rng, 50, 800);
  const total1 = kgGToGrams(kg1, g1);
  const total2 = kgGToGrams(kg2, g2);
  const add = total1 >= total2 ? rng() < 0.6 : true;
  const answer = add ? total1 + total2 : total1 - total2;
  if (answer <= 0) return null;
  const params: M12GeneratorParams = {
    kg: kg1,
    g: g1,
    totalGrams: answer,
    subtype: 'add_sub',
    features: ['compound', add ? 'add' : 'sub'],
    seed,
  };
  return choiceOrNumber(
    difficulty,
    seed,
    'add_sub',
    params,
    add
      ? `${kg1} кг ${g1} г + ${kg2} кг ${g2} г = ? г`
      : `${kg1} кг ${g1} г − ${kg2} кг ${g2} г = ? г`,
    answer,
    `Ответ: ${answer} г.`,
    rng,
    [total1 + total2, Math.abs(total1 - total2), Number(`${kg1}${g1}`), answer + 1000],
  );
}

export function generateM12Task(options: M12GenerateOptions): Task {
  rejectAdvancedLevels('M12', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
  const subtype =
    options.subtype && allowed.includes(options.subtype) ? options.subtype : pickOne(rng, allowed);
  for (let i = 0; i < 80; i += 1) {
    const task = build(rng, difficulty, subtype, options.seed);
    if (task && isValidM12Level((task.generatorParams as M12GeneratorParams).features, difficulty)) {
      return task;
    }
  }
  throw new Error(`M12: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM12Series(options: M12SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
      return generateM12Task({ difficulty, seed, subtype: allowed[index % allowed.length] });
    },
    (task) => massFingerprint(task.generatorParams as M12GeneratorParams),
    'M12',
  );
}
