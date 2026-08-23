/**
 * Генератор M15: стоимость / покупки.
 * Контракт: M15_GENERATOR_SPEC.md
 * Денежный навык; не пересекается с M29 (общие текстовые задачи).
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

export const M15_SKILL_ID = 'math.quantities.cost.calculate' as const;
export const M15_TOPIC_ID = 'math.quantities.cost' as const;
export const M15_GENERATOR_ID = 'gen.math.quantities.cost' as const;

export type CostSubtype =
  | 'total_cost'
  | 'find_price'
  | 'find_qty'
  | 'change'
  | 'rub_kop'
  | 'mixed_cost'
  | 'how_many';

export type CostFeature =
  | 'mul_small'
  | 'typical'
  | 'change'
  | 'two_purchases'
  | 'mixed_cost'
  | 'change_after_purchase'
  | 'how_many_buy'
  | 'compare_cost'
  | 'kop';

export type M15GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: CostSubtype };
export type M15SeriesOptions = { seed: number; countPerLevel?: number };

export type M15GeneratorParams = {
  price: number;
  qty: number;
  total: number;
  subtype: CostSubtype;
  features: CostFeature[];
  seed: number;
  price2?: number;
  qty2?: number;
  paid?: number;
};

const ITEMS = ['тетрадь', 'ручка', 'карандаш', 'линейка', 'ластик', 'блокнот', 'альбом', 'пенал'] as const;

const TITLES: Record<CostSubtype, string> = {
  total_cost: 'Стоимость = цена × количество',
  find_price: 'Найти цену',
  find_qty: 'Найти количество',
  change: 'Сдача',
  rub_kop: 'Рубли и копейки',
  mixed_cost: 'Несколько покупок',
  how_many: 'Сколько можно купить',
};

const L1S: CostSubtype[] = ['total_cost'];
const L2S: CostSubtype[] = ['total_cost', 'find_price', 'find_qty', 'rub_kop'];
/** Ротация L3: ~30% two_purchases, ~30% mixed, ~20% change_after, ~20% how_many. */
const L3_ROTATION: CostSubtype[] = [
  'total_cost',
  'mixed_cost',
  'change',
  'how_many',
  'mixed_cost',
  'total_cost',
  'change',
  'mixed_cost',
  'how_many',
  'total_cost',
];
const L3S: CostSubtype[] = ['total_cost', 'mixed_cost', 'change', 'how_many'];

export function costFingerprint(p: M15GeneratorParams): string {
  return [
    p.subtype,
    p.price,
    p.qty,
    p.total,
    p.price2 ?? '',
    p.qty2 ?? '',
    p.paid ?? '',
    p.features.join(','),
  ].join('|');
}

export function isValidM15Level(features: CostFeature[], subtype: CostSubtype, difficulty: Level): boolean {
  if (difficulty === 1) {
    return features.includes('mul_small') && subtype === 'total_cost';
  }
  if (difficulty === 2) {
    return (
      features.includes('typical') &&
      !features.includes('two_purchases') &&
      !features.includes('mixed_cost') &&
      !features.includes('change_after_purchase') &&
      subtype !== 'change' &&
      subtype !== 'mixed_cost' &&
      subtype !== 'how_many'
    );
  }
  if (subtype === 'change') {
    return features.includes('change_after_purchase') || features.includes('change');
  }
  if (subtype === 'mixed_cost') {
    return features.includes('mixed_cost');
  }
  if (subtype === 'how_many') {
    return features.includes('how_many_buy');
  }
  if (subtype === 'total_cost') {
    return features.includes('two_purchases') || features.includes('compare_cost');
  }
  return false;
}

function pack(
  difficulty: Level,
  seed: number,
  subtype: CostSubtype,
  params: M15GeneratorParams,
  question: string,
  answer: number,
  explanation: string,
  rng: SeededRng,
  models: number[],
): Task | null {
  if (!isValidM15Level(params.features, subtype, difficulty)) return null;
  if (answer <= 0 || !Number.isInteger(answer)) return null;
  if (difficulty < 3) {
    const d = uniqueDistractorsFromModels(answer, models, rng, 3);
    if (d.length !== 3) return null;
    return baseTask({
      id: `generated-m15-${difficulty}-${subtype}-${answer}-${seed}`,
      section: 'Величины',
      topic: 'Стоимость',
      skill: TITLES[subtype],
      topicId: M15_TOPIC_ID,
      skillId: M15_SKILL_ID,
      difficulty,
      taskType: 'singleChoice',
      question,
      correctAnswer: String(answer),
      answers: buildChoiceAnswers(answer, d, rng),
      explanation,
      generatorId: M15_GENERATOR_ID,
      generatorParams: params,
      hint2: 'Стоимость = цена × количество; сдача = дали − стоимость покупки.',
    });
  }
  return baseTask({
    id: `generated-m15-3-${subtype}-${answer}-${seed}`,
    section: 'Величины',
    topic: 'Стоимость',
    skill: TITLES[subtype],
    topicId: M15_TOPIC_ID,
    skillId: M15_SKILL_ID,
    difficulty: 3,
    taskType: 'numberAnswer',
    question,
    correctAnswer: answer,
    explanation,
    generatorId: M15_GENERATOR_ID,
    generatorParams: params,
    hint2: 'Сначала найди стоимость покупки, затем ответь на вопрос.',
  });
}

function itemLabel(item: string): string {
  return `${item[0]?.toUpperCase() ?? ''}${item.slice(1)}`;
}

function build(rng: SeededRng, difficulty: Level, subtype: CostSubtype, seed: number): Task | null {
  const item = pickOne(rng, [...ITEMS]);

  if (difficulty === 1) {
    const price = randomInt(rng, 3, 12);
    const qty = randomInt(rng, 2, 5);
    const total = price * qty;
    const params: M15GeneratorParams = {
      price,
      qty,
      total,
      subtype: 'total_cost',
      features: ['mul_small'],
      seed,
    };
    const variants = [
      `${itemLabel(item)} стоит ${price} р. Купили ${qty} шт. Сколько рублей заплатили?`,
      `Одна ${item} стоит ${price} рублей. Сколько стоят ${qty} шт.?`,
      `Купили ${qty} шт. товара по ${price} р. Какова стоимость покупки?`,
    ];
    return pack(
      difficulty,
      seed,
      'total_cost',
      params,
      pickOne(rng, variants),
      total,
      `${price} × ${qty} = ${total} р.`,
      rng,
      [price + qty, price * (qty + 1), total + price, qty * 10, price * (qty - 1) || price],
    );
  }

  if (difficulty === 2) {
    if (subtype === 'find_price') {
      const qty = randomInt(rng, 2, 8);
      const price = randomInt(rng, 4, 15);
      const total = price * qty;
      const params: M15GeneratorParams = {
        price,
        qty,
        total,
        subtype: 'find_price',
        features: ['typical'],
        seed,
      };
      return pack(
        difficulty,
        seed,
        'find_price',
        params,
        `За ${qty} одинаковых товаров заплатили ${total} р. Сколько стоит один товар?`,
        price,
        `${total} : ${qty} = ${price} р.`,
        rng,
        [total - qty, total + qty, price + 1, qty, Math.floor(total / (qty + 1))],
      );
    }
    if (subtype === 'find_qty') {
      const qty = randomInt(rng, 2, 9);
      const price = randomInt(rng, 3, 12);
      const total = price * qty;
      const params: M15GeneratorParams = {
        price,
        qty,
        total,
        subtype: 'find_qty',
        features: ['typical'],
        seed,
      };
      return pack(
        difficulty,
        seed,
        'find_qty',
        params,
        `${itemLabel(item)} стоит ${price} р. Заплатили ${total} р. Сколько штук купили?`,
        qty,
        `${total} : ${price} = ${qty}.`,
        rng,
        [price, total - price, qty + 1, total, qty - 1 || qty + 2],
      );
    }
    if (subtype === 'rub_kop') {
      const rub = randomInt(rng, 1, 9);
      const kop = pickOne(rng, [10, 20, 25, 50, 75]);
      const answer = rub * 100 + kop;
      const params: M15GeneratorParams = {
        price: answer,
        qty: 1,
        total: answer,
        subtype: 'rub_kop',
        features: ['typical', 'kop'],
        seed,
      };
      return pack(
        difficulty,
        seed,
        'rub_kop',
        params,
        `Сколько копеек в ${rub} р. ${kop} к.?`,
        answer,
        `${rub} × 100 + ${kop} = ${answer} к.`,
        rng,
        [rub * 10 + kop, rub + kop, answer + 10, rub * 100, answer - kop],
      );
    }
    const price = randomInt(rng, 5, 20);
    const qty = randomInt(rng, 2, 8);
    const total = price * qty;
    const params: M15GeneratorParams = {
      price,
      qty,
      total,
      subtype: 'total_cost',
      features: ['typical'],
      seed,
    };
    return pack(
      difficulty,
      seed,
      'total_cost',
      params,
      `${itemLabel(item)} стоит ${price} р. Купили ${qty} шт. Какова стоимость покупки?`,
      total,
      `${price} × ${qty} = ${total} р.`,
      rng,
      [price + qty, total + 10, price * (qty + 1), price * (qty - 1) || total + price],
    );
  }

  // ——— L3 ———
  if (subtype === 'change') {
    const price = randomInt(rng, 12, 45);
    const qty = randomInt(rng, 2, 5);
    const cost = price * qty;
    const paid = pickOne(
      rng,
      [100, 200, 500, 1000].filter((g) => g > cost + 10),
    );
    if (!paid) return null;
    const change = paid - cost;
    if (qty < 2) return null;
    const params: M15GeneratorParams = {
      price,
      qty,
      total: change,
      paid,
      subtype: 'change',
      features: ['change_after_purchase', 'change', 'typical'],
      seed,
    };
    return pack(
      difficulty,
      seed,
      'change',
      params,
      `${itemLabel(item)} стоит ${price} р. Купили ${qty} шт. и заплатили ${paid} р. Какая сдача?`,
      change,
      `Стоимость: ${price} × ${qty} = ${cost} р. Сдача: ${paid} − ${cost} = ${change} р.`,
      rng,
      [paid - price, cost, paid - qty, change + price, paid - price * (qty - 1)],
    );
  }

  if (subtype === 'mixed_cost') {
    const price = randomInt(rng, 8, 35);
    const qty = randomInt(rng, 2, 5);
    const price2 = randomInt(rng, 10, 60);
    const part = price * qty;
    const total = part + price2;
    const item2 = pickOne(
      rng,
      ITEMS.filter((x) => x !== item),
    );
    const params: M15GeneratorParams = {
      price,
      qty,
      price2,
      qty2: 1,
      total,
      subtype: 'mixed_cost',
      features: ['mixed_cost', 'typical'],
      seed,
    };
    return pack(
      difficulty,
      seed,
      'mixed_cost',
      params,
      `Купили ${qty} шт. (${item}) по ${price} р. и ещё ${item2} за ${price2} р. Сколько стоит вся покупка?`,
      total,
      `${price} × ${qty} = ${part}; ${part} + ${price2} = ${total} р.`,
      rng,
      [part, price + price2, price * qty + price, total - price, qty * price2],
    );
  }

  if (subtype === 'how_many') {
    const price = randomInt(rng, 8, 25);
    const money = price * randomInt(rng, 3, 9) + randomInt(rng, 1, price - 1);
    const qty = Math.floor(money / price);
    if (qty < 2) return null;
    const params: M15GeneratorParams = {
      price,
      qty,
      total: qty,
      paid: money,
      subtype: 'how_many',
      features: ['how_many_buy', 'typical'],
      seed,
    };
    return pack(
      difficulty,
      seed,
      'how_many',
      params,
      `${itemLabel(item)} стоит ${price} р. Есть ${money} р. Сколько таких штук можно купить?`,
      qty,
      `${money} : ${price} = ${qty} (остаток ${money % price} р.).`,
      rng,
      [qty + 1, qty - 1 || qty + 2, money - price, price, Math.ceil(money / price)],
    );
  }

  // total_cost L3 → two_purchases или сравнение
  if (rng() < 0.55) {
    const p1 = randomInt(rng, 15, 55);
    const q1 = randomInt(rng, 2, 4);
    const p2 = randomInt(rng, 12, 50);
    const q2 = randomInt(rng, 1, 3);
    const c1 = p1 * q1;
    const c2 = p2 * q2;
    const total = c1 + c2;
    const params: M15GeneratorParams = {
      price: p1,
      qty: q1,
      price2: p2,
      qty2: q2,
      total,
      subtype: 'total_cost',
      features: ['two_purchases', 'typical'],
      seed,
    };
    return pack(
      difficulty,
      seed,
      'total_cost',
      params,
      `Купили ${q1} тетради по ${p1} р. и ${q2} ручки по ${p2} р. Сколько стоит вся покупка?`,
      total,
      `${p1} × ${q1} = ${c1}; ${p2} × ${q2} = ${c2}; ${c1} + ${c2} = ${total} р.`,
      rng,
      [c1, c2, p1 + p2, c1 + p2, total - c1],
    );
  }

  const aPrice = randomInt(rng, 10, 40);
  const aQty = randomInt(rng, 2, 5);
  const bPrice = randomInt(rng, 10, 40);
  const bQty = randomInt(rng, 2, 5);
  const costA = aPrice * aQty;
  const costB = bPrice * bQty;
  if (costA === costB) return null;
  const answer = Math.abs(costA - costB);
  const params: M15GeneratorParams = {
    price: aPrice,
    qty: aQty,
    price2: bPrice,
    qty2: bQty,
    total: answer,
    subtype: 'total_cost',
    features: ['two_purchases', 'compare_cost', 'typical'],
    seed,
  };
  return pack(
    difficulty,
    seed,
    'total_cost',
    params,
    `Первая покупка: ${aQty} шт. по ${aPrice} р. Вторая: ${bQty} шт. по ${bPrice} р. На сколько рублей одна покупка дороже другой?`,
    answer,
    `${aPrice} × ${aQty} = ${costA}; ${bPrice} × ${bQty} = ${costB}; |${costA} − ${costB}| = ${answer} р.`,
    rng,
    [costA, costB, costA + costB, Math.abs(aPrice - bPrice), answer + aQty],
  );
}

export function generateM15Task(options: M15GenerateOptions): Task {
  rejectAdvancedLevels('M15', options.difficulty);
  const difficulty = options.difficulty;
  const rng = createSeededRng(options.seed >>> 0);
  const allowed = difficulty === 1 ? L1S : difficulty === 2 ? L2S : L3S;
  const subtype =
    options.subtype && allowed.includes(options.subtype) ? options.subtype : pickOne(rng, allowed);
  for (let i = 0; i < 100; i += 1) {
    const task = build(rng, difficulty, subtype, options.seed);
    if (task) return task;
  }
  throw new Error(`M15: не удалось сгенерировать L${difficulty} (seed=${options.seed})`);
}

export function generateM15Series(options: M15SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      if (difficulty === 3) {
        return generateM15Task({ difficulty, seed, subtype: L3_ROTATION[index % L3_ROTATION.length] });
      }
      const allowed = difficulty === 1 ? L1S : L2S;
      return generateM15Task({ difficulty, seed, subtype: allowed[index % allowed.length] });
    },
    (task) => costFingerprint(task.generatorParams as M15GeneratorParams),
    'M15',
  );
}
