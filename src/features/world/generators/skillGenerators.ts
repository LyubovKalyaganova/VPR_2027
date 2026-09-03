/**
 * Генераторы W01–W25 для окружающего мира (ВПР-2027, 4 класс).
 */
import type { Difficulty, Task } from '../../../types';
import type { WorldSkillCode } from '../../../data/taxonomy/world';
import { getWorldSkillByCode } from '../../../data/taxonomy/world';
import {
  DEFAULT_DEMO_REGION,
  REASONING_SUBTYPES,
  W01_WEATHER,
  W02_ZONES,
  W03_ZONE_STATEMENTS,
  W04_FOOD_CHAINS,
  W05_ORGANS,
  W06_HEALTH,
  W07_SAFETY,
  W08_EXPERIMENTS,
  W09_CONCLUSIONS,
  W10_ECONOMY,
  W11_HISTORY,
  W12_TIMELINE,
  W13_REGION_FACTS,
  W14_REGION_SPEECH,
  W15_CAUSE_EFFECT,
  W16_ECOLOGY,
  W17_CLASSIFICATION,
  W18_GEOGRAPHY,
  W19_CIVIC,
  W20_HIST_MAP,
  W21_HERITAGE,
  W22_ONLINE_SAFETY,
  W23_EARTH_SUN,
  W24_METHODS,
  W25_REASONING,
  type NaturalZone,
} from './contentBanks';
import {
  baseTask,
  bodySvg,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  shuffleSeeded,
  svgToDataUri,
  timelineSvg,
  uniqueDistractorsFromModels,
  weatherTableSvg,
  zoneMapSvg,
  type Level,
  type SeededRng,
} from './generatorScaffold';
import { buildUniqueMatching } from '../../../utils/uniqueMatching';

type GenOpts = { difficulty: Difficulty; seed: number; subtype?: string };

/** Неверные пары орган–функция (не в contentBanks). */
const W05_BODY_ERRORS: Array<{ wrong: string; correct: string }> = [
  { wrong: 'Сердце обеспечивает дыхание', correct: 'Лёгкие обеспечивают дыхание' },
  { wrong: 'Лёгкие перекачивают кровь', correct: 'Сердце перекачивает кровь по телу' },
  { wrong: 'Желудок управляет мышлением', correct: 'Мозг управляет работой органов и мышлением' },
  { wrong: 'Печень защищает тело снаружи', correct: 'Кожа защищает тело и помогает регулировать температуру' },
  { wrong: 'Почки обеспечивают дыхание', correct: 'Почки выводят лишнюю воду и вредные вещества' },
];

const W25_MODES = [...REASONING_SUBTYPES, 'cause_effect'] as const;

function meta(code: WorldSkillCode) {
  const skill = getWorldSkillByCode(code);
  return {
    code,
    skillId: skill.id,
    topicId: skill.topicId,
    section: skill.sectionId.split('.').slice(1).join(' / ') || 'Окружающий мир',
    topic: skill.title.split(':')[0]?.trim() ?? skill.title,
    skill: skill.title,
    generatorId: `gen.world.${code.toLowerCase()}`,
  };
}

function taskId(code: WorldSkillCode, difficulty: Level, seed: number, index: number): string {
  return `${code.toLowerCase()}-L${difficulty}-s${seed}-i${index}`;
}

function fingerprint(task: Task): string {
  const p = task.generatorParams ?? {};
  return `${task.skillId}|${task.difficulty}|${p.subtype ?? ''}|${p.key ?? ''}|${task.id}`;
}

function shuffleOrder<T extends string>(rng: SeededRng, items: readonly T[]): T[] {
  const copy = [...items] as T[];
  let shuffled = shuffleSeeded(copy, rng);
  if (shuffled.join('|') === items.join('|') && items.length > 1) {
    shuffled = shuffleSeeded([...items].reverse() as T[], rng);
  }
  return shuffled;
}

function buildMatching(pairs: Array<{ left: string; right: string }>, rng: SeededRng) {
  return buildUniqueMatching(pairs, rng);
}

function pickSubtype<T extends string>(options: GenOpts, rng: SeededRng, allowed: readonly T[]): T {
  return (options.subtype as T | undefined) ?? pickOne(rng, allowed);
}

function uniqueZones(): NaturalZone[] {
  const map = new Map<string, NaturalZone>();
  for (const z of W02_ZONES) {
    if (!map.has(z.name)) map.set(z.name, z);
  }
  return [...map.values()];
}

// ─── W01 ───────────────────────────────────────────────────────────────────
export const W01_SKILL_ID = 'world.nature.weather' as const;
export const W01_TOPIC_ID = 'world.nature.weather' as const;
export const W01_GENERATOR_ID = 'gen.world.w01' as const;
export type W01Subtype = 'warmest_day' | 'windiest_day' | 'weather_trend';

export function generateW01Task(options: GenOpts): Task {
  const m = meta('W01');
  rejectAdvancedLevels('W01', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const days = W01_WEATHER;
  const subtypes: W01Subtype[] =
    level === 1 ? ['warmest_day'] : level === 2 ? ['warmest_day', 'windiest_day'] : ['warmest_day', 'windiest_day', 'weather_trend'];
  const subtype = pickSubtype(options, rng, subtypes);
  const image = svgToDataUri(weatherTableSvg(days));

  let correct: string;
  let question: string;
  let pool: string[];

  if (subtype === 'warmest_day') {
    const warmest = days.reduce((a, b) => (b.temp > a.temp ? b : a));
    correct = warmest.day;
    question = 'По таблице определи самый тёплый день недели:';
    pool = days.map((d) => d.day);
  } else if (subtype === 'windiest_day') {
    const windiest = days.reduce((a, b) => (b.wind > a.wind ? b : a));
    correct = windiest.day;
    question = 'По таблице определи день с самым сильным ветром:';
    pool = days.map((d) => d.day);
  } else {
    const entry = days[options.seed % days.length]!;
    correct = entry.answer;
    question = entry.question;
    pool = [...days.map((d) => d.day), ...days.map((d) => d.answer), '0', '1', '3', '☀️', '🌧️'];
  }

  const distractors = uniqueDistractorsFromModels(correct, pool, rng);
  return baseTask({
    id: taskId('W01', level, options.seed, 0),
    ...m,
    topicId: W01_TOPIC_ID,
    skillId: W01_SKILL_ID,
    generatorId: W01_GENERATOR_ID,
    difficulty: level,
    taskType: 'imageTask',
    question,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Изучи символы погоды, температуру и силу ветра в таблице.',
    image,
    generatorParams: { subtype, key: `${subtype}-${correct}-${options.seed}` },
  });
}

export function generateW01Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW01Task({ difficulty, seed: seed + index }), fingerprint, 'W01');
}

// ─── W02 ───────────────────────────────────────────────────────────────────
export const W02_SKILL_ID = 'world.nature.map_zones' as const;
export const W02_TOPIC_ID = 'world.nature.zones' as const;
export const W02_GENERATOR_ID = 'gen.world.w02' as const;
export type W02Subtype = 'label_zone' | 'pick_fauna' | 'pick_flora' | 'map_legend';

export function generateW02Task(options: GenOpts): Task {
  const m = meta('W02');
  rejectAdvancedLevels('W02', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const zones = uniqueZones();
  const zone = pickOne(rng, zones);
  const subtypes: W02Subtype[] =
    level === 1 ? ['label_zone'] : level === 2 ? ['label_zone', 'pick_fauna', 'pick_flora'] : ['label_zone', 'pick_fauna', 'pick_flora', 'map_legend'];
  const subtype = pickSubtype(options, rng, subtypes);
  const image = svgToDataUri(zoneMapSvg());

  if (subtype === 'label_zone') {
    const pairs = zones.slice(0, 4).map((z) => ({ left: z.letter, right: z.name }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('W02', level, options.seed, 0),
      ...m,
      topicId: W02_TOPIC_ID,
      skillId: W02_SKILL_ID,
      generatorId: W02_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини букву на карте с названием природной зоны:',
      ...match,
      explanation: 'Каждая буква обозначает свою природную зону России.',
      image,
      generatorParams: { subtype, key: `zones-${options.seed}` },
    });
  }

  if (subtype === 'pick_fauna' || subtype === 'pick_flora') {
    const correct = pickOne(rng, subtype === 'pick_fauna' ? zone.fauna : zone.flora);
    const pool = zones.flatMap((z) => [...z.fauna, ...z.flora, z.name]);
    const distractors = uniqueDistractorsFromModels(correct, pool, rng);
    return baseTask({
      id: taskId('W02', level, options.seed, 0),
      ...m,
      topicId: W02_TOPIC_ID,
      skillId: W02_SKILL_ID,
      generatorId: W02_GENERATOR_ID,
      difficulty: level,
      taskType: 'imageTask',
      question:
        subtype === 'pick_fauna'
          ? `Какое животное характерно для зоны «${zone.name}» (обозначена «${zone.letter}»)?`
          : `Какое растение характерно для зоны «${zone.name}»?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `В зоне «${zone.name}» типичны: ${(subtype === 'pick_fauna' ? zone.fauna : zone.flora).join(', ')}.`,
      image,
      generatorParams: { subtype, key: `${zone.name}-${correct}` },
    });
  }

  const correct = zone.name;
  const distractors = uniqueDistractorsFromModels(
    correct,
    zones.map((z) => z.name),
    rng,
  );
  return baseTask({
    id: taskId('W02', level, options.seed, 0),
    ...m,
    topicId: W02_TOPIC_ID,
    skillId: W02_SKILL_ID,
    generatorId: W02_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Что означает зона «${zone.letter}» на схеме?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Буква «${zone.letter}» — зона «${zone.name}».`,
    image,
    generatorParams: { subtype: 'map_legend', key: zone.letter },
  });
}

export function generateW02Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW02Task({ difficulty, seed: seed + index }), fingerprint, 'W02');
}

// ─── W03 ───────────────────────────────────────────────────────────────────
export const W03_SKILL_ID = 'world.nature.zone_life' as const;
export const W03_TOPIC_ID = 'world.nature.zones' as const;
export const W03_GENERATOR_ID = 'gen.world.w03' as const;
export type W03Subtype = 'true_false' | 'best_statement' | 'compare_zones';

export function generateW03Task(options: GenOpts): Task {
  const m = meta('W03');
  rejectAdvancedLevels('W03', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: W03Subtype[] =
    level === 1 ? ['true_false'] : level === 2 ? ['true_false', 'best_statement'] : ['true_false', 'best_statement', 'compare_zones'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'compare_zones') {
    const zones = uniqueZones();
    const a = pickOne(rng, zones);
    const b = pickOne(
      rng,
      zones.filter((z) => z.name !== a.name),
    );
    const correct = `В зоне «${a.name}» и «${b.name}» разная флора и фауна`;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [
        `В ${a.name} и ${b.name} одинаковые условия`,
        `В ${b.name} нет животных`,
        `Зоны не отличаются`,
        `В обеих зонах растут пальмы`,
      ],
      rng,
    );
    return baseTask({
      id: taskId('W03', level, options.seed, 0),
      ...m,
      topicId: W03_TOPIC_ID,
      skillId: W03_SKILL_ID,
      generatorId: W03_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Сравни зоны «${a.name}» и «${b.name}». Выбери верное утверждение:`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: 'Природные зоны отличаются растительностью, климатом и животным миром.',
      generatorParams: { subtype, key: `${a.name}-${b.name}` },
    });
  }

  const stmt = pickOne(rng, W03_ZONE_STATEMENTS);
  if (subtype === 'true_false') {
    const correct = stmt.isTrue ? 'верно' : 'неверно';
    const distractors = uniqueDistractorsFromModels(correct, ['верно', 'неверно', 'частично', 'нет данных'], rng);
    return baseTask({
      id: taskId('W03', level, options.seed, 0),
      ...m,
      topicId: W03_TOPIC_ID,
      skillId: W03_SKILL_ID,
      generatorId: W03_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Верно ли утверждение о зоне «${stmt.zone}»?\n«${stmt.statement}»`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: stmt.explanation,
      generatorParams: { subtype, key: stmt.statement },
    });
  }

  const trueOnes = W03_ZONE_STATEMENTS.filter((s) => s.zone === stmt.zone && s.isTrue);
  const falseOnes = W03_ZONE_STATEMENTS.filter((s) => s.zone === stmt.zone && !s.isTrue);
  const correctStmt = trueOnes.length > 0 ? pickOne(rng, trueOnes) : stmt;
  const correct = correctStmt.statement;
  const wrongPool = [
    ...falseOnes.map((s) => s.statement),
    ...W03_ZONE_STATEMENTS.filter((s) => !s.isTrue).map((s) => s.statement),
    'В этой зоне нет растений',
  ];
  const distractors = uniqueDistractorsFromModels(correct, wrongPool, rng);
  return baseTask({
    id: taskId('W03', level, options.seed, 0),
    ...m,
    topicId: W03_TOPIC_ID,
    skillId: W03_SKILL_ID,
    generatorId: W03_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери верное утверждение о зоне «${correctStmt.zone}»:`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: correctStmt.explanation,
    generatorParams: { subtype: 'best_statement', key: correctStmt.zone },
  });
}

export function generateW03Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW03Task({ difficulty, seed: seed + index }), fingerprint, 'W03');
}

// ─── W04 ───────────────────────────────────────────────────────────────────
export const W04_SKILL_ID = 'world.nature.food_chain' as const;
export const W04_TOPIC_ID = 'world.nature.food_chain' as const;
export const W04_GENERATOR_ID = 'gen.world.w04' as const;
export type W04Subtype = 'build_chain' | 'order_chain' | 'classify_feeding' | 'find_error_chain';

export function generateW04Task(options: GenOpts): Task {
  const m = meta('W04');
  rejectAdvancedLevels('W04', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const chain = pickOne(rng, W04_FOOD_CHAINS);
  const subtypes: W04Subtype[] =
    level === 1
      ? ['order_chain']
      : level === 2
        ? ['order_chain', 'classify_feeding']
        : ['build_chain', 'order_chain', 'classify_feeding', 'find_error_chain'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'order_chain') {
    const shuffled = shuffleOrder(rng, chain.organisms);
    return baseTask({
      id: taskId('W04', level, options.seed, 0),
      ...m,
      topicId: W04_TOPIC_ID,
      skillId: W04_SKILL_ID,
      generatorId: W04_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: 'Расставь звенья цепи питания от растения к хищнику:',
      items: shuffled,
      correctAnswer: [...chain.organisms],
      explanation: 'Цепь питания начинается с растения — производителя.',
      generatorParams: { subtype, key: chain.organisms.join('-') },
    });
  }

  if (subtype === 'classify_feeding') {
    const organism = pickOne(rng, chain.organisms);
    const correct = chain.groups[organism] ?? 'потребитель';
    const distractors = uniqueDistractorsFromModels(
      correct,
      ['растение', 'травоядное', 'хищник', 'падальщик', 'производитель', 'потребитель'],
      rng,
    );
    return baseTask({
      id: taskId('W04', level, options.seed, 0),
      ...m,
      topicId: W04_TOPIC_ID,
      skillId: W04_SKILL_ID,
      generatorId: W04_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `К какой группе по типу питания относится «${organism}»?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: 'Животных и растения группируют по роли в цепи питания.',
      generatorParams: { subtype, key: organism },
    });
  }

  if (subtype === 'find_error_chain') {
    const broken = [...chain.organisms];
    if (broken.length >= 2) {
      const i = 0;
      const j = broken.length - 1;
      const tmp = broken[i]!;
      broken[i] = broken[j]!;
      broken[j] = tmp;
    }
    const correct = `Неверный порядок: ${broken.join(' → ')}`;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [`Цепь верна: ${chain.organisms.join(' → ')}`, 'нет ошибки', 'все звенья лишние'],
      rng,
    );
    return baseTask({
      id: taskId('W04', level, options.seed, 0),
      ...m,
      topicId: W04_TOPIC_ID,
      skillId: W04_SKILL_ID,
      generatorId: W04_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Найди ошибку в цепи питания:\n${broken.join(' → ')}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Верная цепь: ${chain.organisms.join(' → ')}.`,
      generatorParams: { subtype, key: broken.join('|') },
    });
  }

  const pairs = chain.organisms.slice(0, -1).map((left, i) => ({
    left,
    right: chain.organisms[i + 1]!,
  }));
  const match = buildMatching(pairs, rng);
  return baseTask({
    id: taskId('W04', level, options.seed, 0),
    ...m,
    topicId: W04_TOPIC_ID,
    skillId: W04_SKILL_ID,
    generatorId: W04_GENERATOR_ID,
    difficulty: level,
    taskType: 'matching',
    question: 'Соедини: кто кого съедает (слева — еда, справа — кто ест):',
    ...match,
    explanation: 'Стрелка в цепи питания идёт от съеденного к тому, кто ест.',
    generatorParams: { subtype: 'build_chain', key: chain.organisms.join('|') },
  });
}

export function generateW04Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW04Task({ difficulty, seed: seed + index }), fingerprint, 'W04');
}

// ─── W05 ───────────────────────────────────────────────────────────────────
export const W05_SKILL_ID = 'world.nature.body_structure' as const;
export const W05_TOPIC_ID = 'world.nature.human_body' as const;
export const W05_GENERATOR_ID = 'gen.world.w05' as const;
export type W05Subtype = 'label_organ' | 'system_function' | 'find_error_body';

export function generateW05Task(options: GenOpts): Task {
  const m = meta('W05');
  rejectAdvancedLevels('W05', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const organ = pickOne(rng, W05_ORGANS);
  const subtypes: W05Subtype[] =
    level === 1 ? ['label_organ'] : level === 2 ? ['label_organ', 'system_function'] : ['label_organ', 'system_function', 'find_error_body'];
  const subtype = pickSubtype(options, rng, subtypes);
  const image = svgToDataUri(bodySvg());

  if (subtype === 'find_error_body') {
    const err = pickOne(rng, W05_BODY_ERRORS);
    const distractors = uniqueDistractorsFromModels(err.wrong, [err.correct, 'орган работает правильно', 'нет ошибки'], rng);
    return baseTask({
      id: taskId('W05', level, options.seed, 0),
      ...m,
      topicId: W05_TOPIC_ID,
      skillId: W05_SKILL_ID,
      generatorId: W05_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: 'Найди неверное утверждение о теле человека:',
      answers: buildChoiceAnswers(err.wrong, distractors, rng),
      correctAnswer: err.wrong,
      explanation: err.correct,
      image,
      generatorParams: { subtype, key: err.wrong },
    });
  }

  if (subtype === 'label_organ') {
    const byPos = new Map<number, (typeof W05_ORGANS)[number]>();
    for (const o of W05_ORGANS) {
      if (!byPos.has(o.position)) byPos.set(o.position, o);
    }
    const pairs = [...byPos.values()].map((o) => ({ left: String(o.position), right: o.name }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('W05', level, options.seed, 0),
      ...m,
      topicId: W05_TOPIC_ID,
      skillId: W05_SKILL_ID,
      generatorId: W05_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини номер на схеме с названием органа:',
      ...match,
      explanation: 'Каждый орган выполняет свою функцию в организме.',
      image,
      generatorParams: { subtype, key: 'organs' },
    });
  }

  const pairs = shuffleSeeded([...W05_ORGANS], rng)
    .slice(0, 3)
    .map((o) => ({ left: o.name, right: o.function }));
  const match = buildMatching(pairs, rng);
  return baseTask({
    id: taskId('W05', level, options.seed, 0),
    ...m,
    topicId: W05_TOPIC_ID,
    skillId: W05_SKILL_ID,
    generatorId: W05_GENERATOR_ID,
    difficulty: level,
    taskType: 'matching',
    question: 'Соедини орган и его функцию:',
    ...match,
    explanation: `${organ.name} — ${organ.function}.`,
    image,
    generatorParams: { subtype: 'system_function', key: organ.name },
  });
}

export function generateW05Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW05Task({ difficulty, seed: seed + index }), fingerprint, 'W05');
}

// ─── W06 ───────────────────────────────────────────────────────────────────
export const W06_SKILL_ID = 'world.nature.health' as const;
export const W06_TOPIC_ID = 'world.nature.human_body' as const;
export const W06_GENERATOR_ID = 'gen.world.w06' as const;
export type W06Subtype = 'harm_habit' | 'organ_function' | 'healthy_choice';

const W06_CATEGORY_TO_SUBTYPE: Record<(typeof W06_HEALTH)[number]['category'], W06Subtype> = {
  harmful: 'harm_habit',
  organ: 'organ_function',
  healthy: 'healthy_choice',
};

export function generateW06Task(options: GenOpts): Task {
  const m = meta('W06');
  rejectAdvancedLevels('W06', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const wanted: W06Subtype[] =
    level === 1 ? ['harm_habit'] : level === 2 ? ['harm_habit', 'healthy_choice'] : ['harm_habit', 'organ_function', 'healthy_choice'];
  const subtype = pickSubtype(options, rng, wanted);
  const category = (Object.entries(W06_CATEGORY_TO_SUBTYPE).find(([, s]) => s === subtype)?.[0] ?? 'harmful') as (typeof W06_HEALTH)[number]['category'];
  const poolItems = W06_HEALTH.filter((h) => h.category === category);
  const item = pickOne(rng, poolItems.length > 0 ? poolItems : W06_HEALTH);
  const correct = item.text;
  const distractors = uniqueDistractorsFromModels(
    correct,
    W06_HEALTH.filter((h) => h.category !== item.category).map((h) => h.text),
    rng,
  );
  const question =
    subtype === 'harm_habit'
      ? 'Что вредит здоровью?'
      : subtype === 'organ_function'
        ? `Что верно об органе «${item.text}»? Выбери название органа:`
        : 'Что относится к здоровому образу жизни?';
  return baseTask({
    id: taskId('W06', level, options.seed, 0),
    ...m,
    topicId: W06_TOPIC_ID,
    skillId: W06_SKILL_ID,
    generatorId: W06_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: subtype === 'organ_function' ? `Выбери орган: ${item.detail}` : question,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `${item.text}: ${item.detail}.`,
    generatorParams: { subtype, key: item.text },
  });
}

export function generateW06Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW06Task({ difficulty, seed: seed + index }), fingerprint, 'W06');
}

// ─── W07 ───────────────────────────────────────────────────────────────────
export const W07_SKILL_ID = 'world.safety.public' as const;
export const W07_TOPIC_ID = 'world.safety.public' as const;
export const W07_GENERATOR_ID = 'gen.world.w07' as const;
export type W07Subtype = 'traffic' | 'public_place' | 'bike_scooter' | 'choose_rule';

const W07_CONTEXT_TO_SUBTYPE: Record<(typeof W07_SAFETY)[number]['context'], Exclude<W07Subtype, 'choose_rule'>> = {
  traffic: 'traffic',
  public: 'public_place',
  bike: 'bike_scooter',
};

export function generateW07Task(options: GenOpts): Task {
  const m = meta('W07');
  rejectAdvancedLevels('W07', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: W07Subtype[] =
    level === 1
      ? ['traffic', 'public_place']
      : level === 2
        ? ['traffic', 'public_place', 'bike_scooter']
        : ['traffic', 'public_place', 'bike_scooter', 'choose_rule'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'choose_rule') {
    const rules = W07_SAFETY.slice(0, 4).map((r) => r.correct);
    const shuffled = shuffleOrder(rng, rules);
    return baseTask({
      id: taskId('W07', level, options.seed, 0),
      ...m,
      topicId: W07_TOPIC_ID,
      skillId: W07_SKILL_ID,
      generatorId: W07_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: 'Расставь правила безопасности (сначала — правила на дороге, затем — в общественных местах):',
      items: shuffled,
      correctAnswer: rules,
      explanation: 'Правила безопасности помогают избежать травм.',
      generatorParams: { subtype, key: rules.join('|') },
    });
  }

  const context = (Object.entries(W07_CONTEXT_TO_SUBTYPE).find(([, s]) => s === subtype)?.[0] ?? 'traffic') as (typeof W07_SAFETY)[number]['context'];
  const items = W07_SAFETY.filter((s) => s.context === context);
  const item = pickOne(rng, items.length > 0 ? items : W07_SAFETY);
  const distractors = uniqueDistractorsFromModels(
    item.correct,
    [item.wrong, ...W07_SAFETY.filter((s) => s !== item).map((s) => s.wrong)],
    rng,
  );
  return baseTask({
    id: taskId('W07', level, options.seed, 0),
    ...m,
    topicId: W07_TOPIC_ID,
    skillId: W07_SKILL_ID,
    generatorId: W07_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Как поступить правильно?\nСитуация: ${item.situation}`,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: 'Соблюдай правила безопасности в городе и общественных местах.',
    generatorParams: { subtype, key: item.situation },
  });
}

export function generateW07Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW07Task({ difficulty, seed: seed + index }), fingerprint, 'W07');
}

// ─── W08 ───────────────────────────────────────────────────────────────────
export const W08_SKILL_ID = 'world.nature.experiment_read' as const;
export const W08_TOPIC_ID = 'world.nature.experiment' as const;
export const W08_GENERATOR_ID = 'gen.world.w08' as const;
export type W08Subtype = 'read_experiment' | 'compare_objects' | 'extract_fact';

export function generateW08Task(options: GenOpts): Task {
  const m = meta('W08');
  rejectAdvancedLevels('W08', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W08_EXPERIMENTS);
  const subtypes: W08Subtype[] =
    level === 1 ? ['extract_fact'] : level === 2 ? ['extract_fact', 'read_experiment'] : ['extract_fact', 'read_experiment', 'compare_objects'];
  const subtype = pickSubtype(options, rng, subtypes);
  const fact = pickOne(rng, item.facts);

  if (subtype === 'extract_fact' && level === 1) {
    return baseTask({
      id: taskId('W08', level, options.seed, 0),
      ...m,
      topicId: W08_TOPIC_ID,
      skillId: W08_SKILL_ID,
      generatorId: W08_GENERATOR_ID,
      difficulty: level,
      taskType: 'shortAnswer',
      question: `Прочитай описание опыта «${item.title}» и напиши один факт из результатов.\n\n${item.text}`,
      correctAnswer: fact,
      acceptableAnswers: [fact, fact.toLowerCase(), ...item.facts],
      explanation: 'Ответ следует из описания опыта.',
      passage: item.text,
      generatorParams: { subtype, key: `${item.title}-${fact}` },
    });
  }

  const distractors = uniqueDistractorsFromModels(
    fact,
    [
      ...W08_EXPERIMENTS.filter((e) => e !== item).flatMap((e) => e.facts),
      'опыт не удался',
      'результатов нет',
    ],
    rng,
  );
  const question =
    subtype === 'compare_objects'
      ? `По опыту «${item.title}» выбери верное сравнение результатов:`
      : `Что следует из описания опыта «${item.title}»?`;
  return baseTask({
    id: taskId('W08', level, options.seed, 0),
    ...m,
    topicId: W08_TOPIC_ID,
    skillId: W08_SKILL_ID,
    generatorId: W08_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `${question}\n\n${item.text}`,
    answers: buildChoiceAnswers(fact, distractors, rng),
    correctAnswer: fact,
    explanation: 'Внимательно прочитай описание опыта и найди ответ в тексте.',
    passage: item.text,
    generatorParams: { subtype, key: `${item.title}-${fact}` },
  });
}

export function generateW08Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW08Task({ difficulty, seed: seed + index }), fingerprint, 'W08');
}

// ─── W09 ───────────────────────────────────────────────────────────────────
export const W09_SKILL_ID = 'world.nature.experiment_conclusion' as const;
export const W09_TOPIC_ID = 'world.nature.experiment' as const;
export const W09_GENERATOR_ID = 'gen.world.w09' as const;
export type W09Subtype = 'draw_conclusion' | 'reject_wrong_conclusion' | 'cause_effect';

export function generateW09Task(options: GenOpts): Task {
  const m = meta('W09');
  rejectAdvancedLevels('W09', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W09_CONCLUSIONS);
  const subtypes: W09Subtype[] =
    level === 1
      ? ['draw_conclusion']
      : level === 2
        ? ['draw_conclusion', 'reject_wrong_conclusion']
        : ['draw_conclusion', 'reject_wrong_conclusion', 'cause_effect'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'reject_wrong_conclusion') {
    const wrong = pickOne(rng, item.wrong);
    const distractors = uniqueDistractorsFromModels(wrong, [item.correct, ...item.wrong.filter((w) => w !== wrong)], rng);
    return baseTask({
      id: taskId('W09', level, options.seed, 0),
      ...m,
      topicId: W09_TOPIC_ID,
      skillId: W09_SKILL_ID,
      generatorId: W09_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какой вывод НЕверен?\nОпыт: ${item.experiment}`,
      answers: buildChoiceAnswers(wrong, distractors, rng),
      correctAnswer: wrong,
      explanation: `Верный вывод: ${item.correct}.`,
      passage: item.experiment,
      generatorParams: { subtype, key: wrong },
    });
  }

  const distractors = uniqueDistractorsFromModels(item.correct, item.wrong, rng);
  return baseTask({
    id: taskId('W09', level, options.seed, 0),
    ...m,
    topicId: W09_TOPIC_ID,
    skillId: W09_SKILL_ID,
    generatorId: W09_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      subtype === 'cause_effect'
        ? `Какая причинно-следственная связь следует из опыта?\n${item.experiment}`
        : `Сделай вывод по результатам наблюдения:\n${item.experiment}`,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: `Вывод: ${item.correct}.`,
    passage: item.experiment,
    generatorParams: { subtype, key: item.experiment.slice(0, 40) },
  });
}

export function generateW09Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW09Task({ difficulty, seed: seed + index }), fingerprint, 'W09');
}

// ─── W10 ───────────────────────────────────────────────────────────────────
export const W10_SKILL_ID = 'world.society.economy' as const;
export const W10_TOPIC_ID = 'world.society.economy' as const;
export const W10_GENERATOR_ID = 'gen.world.w10' as const;
export type W10Subtype = 'match_sector' | 'match_profession' | 'social_importance' | 'explain_labor';

export function generateW10Task(options: GenOpts): Task {
  const m = meta('W10');
  rejectAdvancedLevels('W10', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const uniqueSectors = [...new Map(W10_ECONOMY.map((s) => [s.sector, s])).values()];
  const sector = pickOne(rng, uniqueSectors);
  const subtypes: W10Subtype[] =
    level === 1
      ? ['match_profession']
      : level === 2
        ? ['match_sector', 'match_profession']
        : ['match_sector', 'match_profession', 'social_importance', 'explain_labor'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'match_sector' || subtype === 'match_profession') {
    const slice = uniqueSectors.slice(0, 3);
    const pairs =
      subtype === 'match_sector'
        ? slice.map((s) => ({ left: s.sector, right: s.professions[0]! }))
        : slice.map((s) => ({ left: s.professions[0]!, right: s.sector }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('W10', level, options.seed, 0),
      ...m,
      topicId: W10_TOPIC_ID,
      skillId: W10_SKILL_ID,
      generatorId: W10_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: subtype === 'match_sector' ? 'Соедини отрасль экономики и типичную профессию:' : 'Соедини профессию и отрасль:',
      ...match,
      explanation: 'Каждая отрасль связана со своими профессиями.',
      generatorParams: { subtype, key: `economy-${options.seed}` },
    });
  }

  if (subtype === 'social_importance') {
    const correct = sector.description;
    const distractors = uniqueDistractorsFromModels(
      correct,
      uniqueSectors.filter((s) => s.sector !== sector.sector).map((s) => s.description),
      rng,
    );
    return baseTask({
      id: taskId('W10', level, options.seed, 0),
      ...m,
      topicId: W10_TOPIC_ID,
      skillId: W10_SKILL_ID,
      generatorId: W10_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Почему важна отрасль «${sector.sector}»?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `${sector.sector}: ${sector.description}.`,
      generatorParams: { subtype, key: sector.sector },
    });
  }

  const correct = pickOne(rng, sector.professions);
  const distractors = uniqueDistractorsFromModels(
    correct,
    uniqueSectors.filter((s) => s.sector !== sector.sector).flatMap((s) => s.professions),
    rng,
  );
  return baseTask({
    id: taskId('W10', level, options.seed, 0),
    ...m,
    topicId: W10_TOPIC_ID,
    skillId: W10_SKILL_ID,
    generatorId: W10_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какая профессия относится к отрасли «${sector.sector}»?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `${sector.sector}: ${sector.professions.join(', ')}.`,
    generatorParams: { subtype: 'explain_labor', key: sector.sector },
  });
}

export function generateW10Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW10Task({ difficulty, seed: seed + index }), fingerprint, 'W10');
}

// ─── W11 ───────────────────────────────────────────────────────────────────
export const W11_SKILL_ID = 'world.society.history_match' as const;
export const W11_TOPIC_ID = 'world.society.history' as const;
export const W11_GENERATOR_ID = 'gen.world.w11' as const;
export type W11Subtype = 'person_event' | 'date_century' | 'period_match';

export function generateW11Task(options: GenOpts): Task {
  const m = meta('W11');
  rejectAdvancedLevels('W11', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: W11Subtype[] =
    level === 1 ? ['person_event'] : level === 2 ? ['person_event', 'date_century'] : ['person_event', 'date_century', 'period_match'];
  const subtype = pickSubtype(options, rng, subtypes);
  const slice = shuffleSeeded([...W11_HISTORY], rng).slice(0, 3);

  if (subtype === 'person_event') {
    const match = buildMatching(
      slice.map((h) => ({ left: h.person, right: h.event })),
      rng,
    );
    return baseTask({
      id: taskId('W11', level, options.seed, 0),
      ...m,
      topicId: W11_TOPIC_ID,
      skillId: W11_SKILL_ID,
      generatorId: W11_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини историческую личность и событие:',
      ...match,
      explanation: 'Каждая личность связана с важным событием истории.',
      generatorParams: { subtype, key: 'history-person' },
    });
  }

  if (subtype === 'date_century') {
    const match = buildMatching(
      slice.map((h) => ({ left: h.event, right: h.century })),
      rng,
    );
    return baseTask({
      id: taskId('W11', level, options.seed, 0),
      ...m,
      topicId: W11_TOPIC_ID,
      skillId: W11_SKILL_ID,
      generatorId: W11_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини событие и век:',
      ...match,
      explanation: 'События относятся к определённым векам.',
      generatorParams: { subtype, key: 'history-century' },
    });
  }

  const hist = pickOne(rng, W11_HISTORY);
  const match = buildMatching(
    slice.map((h) => ({ left: h.person, right: h.century })),
    rng,
  );
  return baseTask({
    id: taskId('W11', level, options.seed, 0),
    ...m,
    topicId: W11_TOPIC_ID,
    skillId: W11_SKILL_ID,
    generatorId: W11_GENERATOR_ID,
    difficulty: level,
    taskType: 'matching',
    question: 'Соедини личность и исторический период (век):',
    ...match,
    explanation: `${hist.person} — ${hist.century} (${hist.date}).`,
    generatorParams: { subtype: 'period_match', key: hist.person },
  });
}

export function generateW11Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW11Task({ difficulty, seed: seed + index }), fingerprint, 'W11');
}

// ─── W12 ───────────────────────────────────────────────────────────────────
export const W12_SKILL_ID = 'world.society.timeline' as const;
export const W12_TOPIC_ID = 'world.society.history' as const;
export const W12_GENERATOR_ID = 'gen.world.w12' as const;
export type W12Subtype = 'place_on_timeline' | 'order_events' | 'find_error_timeline';

export function generateW12Task(options: GenOpts): Task {
  const m = meta('W12');
  rejectAdvancedLevels('W12', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: W12Subtype[] =
    level === 1
      ? ['order_events']
      : level === 2
        ? ['order_events', 'place_on_timeline']
        : ['order_events', 'place_on_timeline', 'find_error_timeline'];
  const subtype = pickSubtype(options, rng, subtypes);
  const image = svgToDataUri(timelineSvg());
  const selected = shuffleSeeded([...W12_TIMELINE], rng)
    .slice(0, 4)
    .sort((a, b) => a.century - b.century);
  const labels = selected.map((e) => e.label);

  if (subtype === 'order_events') {
    const shuffled = shuffleOrder(rng, labels);
    return baseTask({
      id: taskId('W12', level, options.seed, 0),
      ...m,
      topicId: W12_TOPIC_ID,
      skillId: W12_SKILL_ID,
      generatorId: W12_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: 'Расставь события на ленте времени от более раннего к более позднему:',
      items: shuffled,
      correctAnswer: [...labels],
      explanation: 'На ленте времени слева — более ранние события.',
      image,
      generatorParams: { subtype, key: labels.join('|') },
    });
  }

  if (subtype === 'find_error_timeline') {
    const broken = [...labels].reverse();
    const correct = `Неверный порядок: ${broken.join(' → ')}`;
    const distractors = uniqueDistractorsFromModels(
      correct,
      [`Порядок верный: ${labels.join(' → ')}`, 'нет ошибки', 'события одновременны'],
      rng,
    );
    return baseTask({
      id: taskId('W12', level, options.seed, 0),
      ...m,
      topicId: W12_TOPIC_ID,
      skillId: W12_SKILL_ID,
      generatorId: W12_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Найди ошибку в последовательности:\n${broken.join(' → ')}`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Верный порядок: ${labels.join(' → ')}.`,
      image,
      generatorParams: { subtype, key: broken.join('|') },
    });
  }

  const positions = ['I', 'II', 'III'] as const;
  const pairs = selected.slice(0, 3).map((ev, i) => ({ left: ev.label, right: positions[i]! }));
  const match = buildMatching(pairs, rng);
  return baseTask({
    id: taskId('W12', level, options.seed, 0),
    ...m,
    topicId: W12_TOPIC_ID,
    skillId: W12_SKILL_ID,
    generatorId: W12_GENERATOR_ID,
    difficulty: level,
    taskType: 'matching',
    question: 'Размести события на ленте времени (I — раньше, III — позже):',
    ...match,
    explanation: 'Слева на ленте — более ранние события.',
    image,
    generatorParams: { subtype: 'place_on_timeline', key: labels[0] ?? 'tl' },
  });
}

export function generateW12Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW12Task({ difficulty, seed: seed + index }), fingerprint, 'W12');
}

// ─── W13 ───────────────────────────────────────────────────────────────────
export const W13_SKILL_ID = 'world.society.region_facts' as const;
export const W13_TOPIC_ID = 'world.society.region' as const;
export const W13_GENERATOR_ID = 'gen.world.w13' as const;
export type W13Subtype = 'city_facts' | 'landmark' | 'nature_feature' | 'economy_local';

const W13_CATEGORY_TO_SUBTYPE: Record<(typeof W13_REGION_FACTS)[number]['category'], W13Subtype> = {
  city: 'city_facts',
  landmark: 'landmark',
  nature: 'nature_feature',
  economy: 'economy_local',
};

export function generateW13Task(options: GenOpts): Task {
  const m = meta('W13');
  rejectAdvancedLevels('W13', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const subtypes: W13Subtype[] =
    level === 1
      ? ['city_facts']
      : level === 2
        ? ['city_facts', 'landmark']
        : ['city_facts', 'landmark', 'nature_feature', 'economy_local'];
  const subtype = pickSubtype(options, rng, subtypes);
  const category = (Object.entries(W13_CATEGORY_TO_SUBTYPE).find(([, s]) => s === subtype)?.[0] ?? 'city') as (typeof W13_REGION_FACTS)[number]['category'];
  const facts = W13_REGION_FACTS.filter((f) => f.category === category);
  const item = pickOne(rng, facts.length > 0 ? facts : W13_REGION_FACTS);

  if (level === 1 && subtype === 'city_facts' && rng() > 0.45) {
    return baseTask({
      id: taskId('W13', level, options.seed, 0),
      ...m,
      topicId: W13_TOPIC_ID,
      skillId: W13_SKILL_ID,
      generatorId: W13_GENERATOR_ID,
      difficulty: level,
      taskType: 'shortAnswer',
      question: `Как называется главный город региона «${DEFAULT_DEMO_REGION.regionName}»?`,
      correctAnswer: DEFAULT_DEMO_REGION.city,
      acceptableAnswers: [DEFAULT_DEMO_REGION.city, DEFAULT_DEMO_REGION.city.toLowerCase()],
      explanation: `${DEFAULT_DEMO_REGION.city} — главный город ${DEFAULT_DEMO_REGION.regionName}.`,
      generatorParams: { subtype: 'city_facts', key: DEFAULT_DEMO_REGION.city },
    });
  }

  const distractors = uniqueDistractorsFromModels(
    item.answer,
    [
      ...W13_REGION_FACTS.filter((f) => f.answer !== item.answer).map((f) => f.answer),
      'Эйфелева башня',
      'Сахара',
      'Париж',
    ],
    rng,
  );
  return baseTask({
    id: taskId('W13', level, options.seed, 0),
    ...m,
    topicId: W13_TOPIC_ID,
    skillId: W13_SKILL_ID,
    generatorId: W13_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: item.question,
    answers: buildChoiceAnswers(item.answer, distractors, rng),
    correctAnswer: item.answer,
    explanation: item.fact,
    generatorParams: { subtype, key: item.answer },
  });
}

export function generateW13Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW13Task({ difficulty, seed: seed + index }), fingerprint, 'W13');
}

// ─── W14 ───────────────────────────────────────────────────────────────────
export const W14_SKILL_ID = 'world.society.region_speech' as const;
export const W14_TOPIC_ID = 'world.society.region' as const;
export const W14_GENERATOR_ID = 'gen.world.w14' as const;
export type W14Subtype = 'plan_speech' | 'topic_sentence' | 'best_presentation' | 'extra_detail';

export function generateW14Task(options: GenOpts): Task {
  const m = meta('W14');
  rejectAdvancedLevels('W14', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const speech = pickOne(rng, W14_REGION_SPEECH);
  const subtypes: W14Subtype[] =
    level === 1
      ? ['topic_sentence']
      : level === 2
        ? ['topic_sentence', 'plan_speech']
        : ['topic_sentence', 'plan_speech', 'best_presentation', 'extra_detail'];
  const subtype = pickSubtype(options, rng, subtypes);

  if (subtype === 'plan_speech') {
    const shuffled = shuffleOrder(rng, speech.plan);
    return baseTask({
      id: taskId('W14', level, options.seed, 0),
      ...m,
      topicId: W14_TOPIC_ID,
      skillId: W14_SKILL_ID,
      generatorId: W14_GENERATOR_ID,
      difficulty: level,
      taskType: 'ordering',
      question: `Расставь части плана выступления на тему «${speech.topic}»:`,
      items: shuffled,
      correctAnswer: [...speech.plan],
      explanation: 'План выступления должен быть логичным: вступление → основная часть → заключение.',
      generatorParams: { subtype, key: speech.topic },
    });
  }

  if (subtype === 'extra_detail') {
    const correct = speech.badDetail;
    const distractors = uniqueDistractorsFromModels(correct, [speech.goodDetail, ...speech.plan, speech.topicSentence], rng);
    return baseTask({
      id: taskId('W14', level, options.seed, 0),
      ...m,
      topicId: W14_TOPIC_ID,
      skillId: W14_SKILL_ID,
      generatorId: W14_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какая деталь ЛИШНЯЯ в выступлении о «${speech.topic}»?`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: 'Лишняя деталь не относится к теме выступления.',
      generatorParams: { subtype, key: speech.badDetail },
    });
  }

  if (subtype === 'topic_sentence') {
    const distractors = uniqueDistractorsFromModels(speech.topicSentence, [speech.badDetail, speech.goodDetail, 'Привет всем'], rng);
    return baseTask({
      id: taskId('W14', level, options.seed, 0),
      ...m,
      topicId: W14_TOPIC_ID,
      skillId: W14_SKILL_ID,
      generatorId: W14_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Выбери верное тематическое предложение для выступления «${speech.topic}»:`,
      answers: buildChoiceAnswers(speech.topicSentence, distractors, rng),
      correctAnswer: speech.topicSentence,
      explanation: 'Структурированное высказывание имеет тему, план и заключение.',
      generatorParams: { subtype, key: speech.topic },
    });
  }

  const correct = speech.plan.join(' → ');
  const distractors = uniqueDistractorsFromModels(
    correct,
    [shuffleOrder(rng, speech.plan).join(' → '), speech.badDetail, speech.goodDetail],
    rng,
  );
  return baseTask({
    id: taskId('W14', level, options.seed, 0),
    ...m,
    topicId: W14_TOPIC_ID,
    skillId: W14_SKILL_ID,
    generatorId: W14_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Выбери лучший план выступления «${speech.topic}»:`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: 'Лучший план логично раскрывает тему выступления.',
    generatorParams: { subtype: 'best_presentation', key: speech.topic },
  });
}

export function generateW14Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW14Task({ difficulty, seed: seed + index }), fingerprint, 'W14');
}

// ─── W15 ───────────────────────────────────────────────────────────────────
export const W15_SKILL_ID = 'world.nature.cause_effect' as const;
export const W15_TOPIC_ID = 'world.nature.cause_effect' as const;
export const W15_GENERATOR_ID = 'gen.world.w15' as const;

export function generateW15Task(options: GenOpts): Task {
  const m = meta('W15');
  rejectAdvancedLevels('W15', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W15_CAUSE_EFFECT);
  const askEffect = rng() > 0.4;
  const correct = askEffect ? item.effect : item.cause;
  const distractors = uniqueDistractorsFromModels(
    correct,
    askEffect ? item.wrongEffects : [item.effect, ...item.wrongEffects],
    rng,
  );
  return baseTask({
    id: taskId('W15', level, options.seed, 0),
    ...m,
    topicId: W15_TOPIC_ID,
    skillId: W15_SKILL_ID,
    generatorId: W15_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: askEffect ? `Что произойдёт, если ${item.cause}?` : `Что является причиной: «${item.effect}»?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Причина: ${item.cause}. Следствие: ${item.effect}.`,
    generatorParams: { subtype: askEffect ? 'effect' : 'cause', key: item.cause },
  });
}

export function generateW15Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW15Task({ difficulty, seed: seed + index }), fingerprint, 'W15');
}

// ─── W16 ───────────────────────────────────────────────────────────────────
export const W16_SKILL_ID = 'world.nature.ecology' as const;
export const W16_TOPIC_ID = 'world.nature.ecology' as const;
export const W16_GENERATOR_ID = 'gen.world.w16' as const;

export function generateW16Task(options: GenOpts): Task {
  const m = meta('W16');
  rejectAdvancedLevels('W16', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W16_ECOLOGY);
  const distractors = uniqueDistractorsFromModels(item.correct, item.wrong, rng);
  return baseTask({
    id: taskId('W16', level, options.seed, 0),
    ...m,
    topicId: W16_TOPIC_ID,
    skillId: W16_SKILL_ID,
    generatorId: W16_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: item.question,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: item.explanation,
    generatorParams: { subtype: 'ecology', key: item.question },
  });
}

export function generateW16Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW16Task({ difficulty, seed: seed + index }), fingerprint, 'W16');
}

// ─── W17 ───────────────────────────────────────────────────────────────────
export const W17_SKILL_ID = 'world.nature.classification' as const;
export const W17_TOPIC_ID = 'world.nature.classification' as const;
export const W17_GENERATOR_ID = 'gen.world.w17' as const;

export function generateW17Task(options: GenOpts): Task {
  const m = meta('W17');
  rejectAdvancedLevels('W17', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W17_CLASSIFICATION);
  const subtype = (options.subtype as string | undefined) ?? item.subtype;

  if (subtype === 'compare' || item.subtype === 'compare') {
    const distractors = uniqueDistractorsFromModels(
      item.correct,
      ['не имеют общего', 'оба — минералы', 'оба — насекомые', ...W17_CLASSIFICATION.filter((c) => c !== item).map((c) => c.correct)],
      rng,
    );
    return baseTask({
      id: taskId('W17', level, options.seed, 0),
      ...m,
      topicId: W17_TOPIC_ID,
      skillId: W17_SKILL_ID,
      generatorId: W17_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Что общего у объектов: ${item.items.join(' и ')}?`,
      answers: buildChoiceAnswers(item.correct, distractors, rng),
      correctAnswer: item.correct,
      explanation: item.explanation,
      generatorParams: { subtype: 'compare', key: item.items.join('|') },
    });
  }

  const distractors = uniqueDistractorsFromModels(item.correct, item.items.filter((x) => x !== item.correct), rng);
  return baseTask({
    id: taskId('W17', level, options.seed, 0),
    ...m,
    topicId: W17_TOPIC_ID,
    skillId: W17_SKILL_ID,
    generatorId: W17_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      item.subtype === 'odd_one_out'
        ? `Найди лишнее: ${item.items.join(', ')}`
        : `Что не относится к живой природе в ряду: ${item.items.join(', ')}?`,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: item.explanation,
    generatorParams: { subtype: item.subtype, key: item.items.join('|') },
  });
}

export function generateW17Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW17Task({ difficulty, seed: seed + index }), fingerprint, 'W17');
}

// ─── W18 ───────────────────────────────────────────────────────────────────
export const W18_SKILL_ID = 'world.nature.geography' as const;
export const W18_TOPIC_ID = 'world.nature.geography' as const;
export const W18_GENERATOR_ID = 'gen.world.w18' as const;

export function generateW18Task(options: GenOpts): Task {
  const m = meta('W18');
  rejectAdvancedLevels('W18', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W18_GEOGRAPHY);
  const distractors = uniqueDistractorsFromModels(item.correct, item.wrong, rng);
  return baseTask({
    id: taskId('W18', level, options.seed, 0),
    ...m,
    topicId: W18_TOPIC_ID,
    skillId: W18_SKILL_ID,
    generatorId: W18_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: item.question,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: 'География изучает поверхность Земли, реки, горы и равнины.',
    generatorParams: { subtype: 'geography', key: item.question },
  });
}

export function generateW18Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW18Task({ difficulty, seed: seed + index }), fingerprint, 'W18');
}

// ─── W19 ───────────────────────────────────────────────────────────────────
export const W19_SKILL_ID = 'world.society.civic' as const;
export const W19_TOPIC_ID = 'world.society.civic' as const;
export const W19_GENERATOR_ID = 'gen.world.w19' as const;

export function generateW19Task(options: GenOpts): Task {
  const m = meta('W19');
  rejectAdvancedLevels('W19', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W19_CIVIC);
  const distractors = uniqueDistractorsFromModels(item.correct, item.wrong, rng);
  return baseTask({
    id: taskId('W19', level, options.seed, 0),
    ...m,
    topicId: W19_TOPIC_ID,
    skillId: W19_SKILL_ID,
    generatorId: W19_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: item.question,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: 'Гражданские знания помогают понимать устройство государства.',
    generatorParams: { subtype: 'civic', key: item.question },
  });
}

export function generateW19Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW19Task({ difficulty, seed: seed + index }), fingerprint, 'W19');
}

// ─── W20 ───────────────────────────────────────────────────────────────────
export const W20_SKILL_ID = 'world.society.historical_map' as const;
export const W20_TOPIC_ID = 'world.society.historical_map' as const;
export const W20_GENERATOR_ID = 'gen.world.w20' as const;

export function generateW20Task(options: GenOpts): Task {
  const m = meta('W20');
  rejectAdvancedLevels('W20', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W20_HIST_MAP);

  if (level >= 2 && rng() > 0.5) {
    const pairs = shuffleSeeded([...W20_HIST_MAP], rng)
      .slice(0, 3)
      .map((h) => ({ left: h.place, right: h.fact }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('W20', level, options.seed, 0),
      ...m,
      topicId: W20_TOPIC_ID,
      skillId: W20_SKILL_ID,
      generatorId: W20_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини город на карте и его описание:',
      ...match,
      explanation: 'На исторической карте отмечены важные города России.',
      generatorParams: { subtype: 'map_match', key: 'historical-map' },
    });
  }

  const distractors = uniqueDistractorsFromModels(item.fact, item.wrong, rng);
  return baseTask({
    id: taskId('W20', level, options.seed, 0),
    ...m,
    topicId: W20_TOPIC_ID,
    skillId: W20_SKILL_ID,
    generatorId: W20_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Что верно о городе ${item.place}?`,
    answers: buildChoiceAnswers(item.fact, distractors, rng),
    correctAnswer: item.fact,
    explanation: `${item.place}: ${item.fact}.`,
    generatorParams: { subtype: 'map_fact', key: item.place },
  });
}

export function generateW20Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW20Task({ difficulty, seed: seed + index }), fingerprint, 'W20');
}

// ─── W21 ───────────────────────────────────────────────────────────────────
export const W21_SKILL_ID = 'world.society.heritage' as const;
export const W21_TOPIC_ID = 'world.society.heritage' as const;
export const W21_GENERATOR_ID = 'gen.world.w21' as const;

export function generateW21Task(options: GenOpts): Task {
  const m = meta('W21');
  rejectAdvancedLevels('W21', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W21_HERITAGE);

  if (level >= 2 && rng() > 0.4) {
    const pairs = shuffleSeeded([...W21_HERITAGE], rng)
      .slice(0, 3)
      .map((h) => ({ left: h.site, right: h.type }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('W21', level, options.seed, 0),
      ...m,
      topicId: W21_TOPIC_ID,
      skillId: W21_SKILL_ID,
      generatorId: W21_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини объект и его тип (наследие):',
      ...match,
      explanation: 'Всемирное наследие включает памятники культуры и природы.',
      generatorParams: { subtype: 'heritage_match', key: item.site },
    });
  }

  const distractors = uniqueDistractorsFromModels(item.type, [...item.wrong, 'природный', 'культурный', 'смешанный'], rng);
  return baseTask({
    id: taskId('W21', level, options.seed, 0),
    ...m,
    topicId: W21_TOPIC_ID,
    skillId: W21_SKILL_ID,
    generatorId: W21_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `«${item.site}» (${item.description}) — это объект наследия какого типа?`,
    answers: buildChoiceAnswers(item.type, distractors, rng),
    correctAnswer: item.type,
    explanation: `${item.site} относится к типу «${item.type}».`,
    generatorParams: { subtype: 'heritage_type', key: item.site },
  });
}

export function generateW21Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW21Task({ difficulty, seed: seed + index }), fingerprint, 'W21');
}

// ─── W22 ───────────────────────────────────────────────────────────────────
export const W22_SKILL_ID = 'world.safety.online' as const;
export const W22_TOPIC_ID = 'world.safety.online' as const;
export const W22_GENERATOR_ID = 'gen.world.w22' as const;

export function generateW22Task(options: GenOpts): Task {
  const m = meta('W22');
  rejectAdvancedLevels('W22', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W22_ONLINE_SAFETY);
  const distractors = uniqueDistractorsFromModels(item.correct, item.wrong, rng);
  return baseTask({
    id: taskId('W22', level, options.seed, 0),
    ...m,
    topicId: W22_TOPIC_ID,
    skillId: W22_SKILL_ID,
    generatorId: W22_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: item.question,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: 'Безопасность в интернете — не сообщай личные данные незнакомцам.',
    generatorParams: { subtype: 'online_safety', key: item.question },
  });
}

export function generateW22Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW22Task({ difficulty, seed: seed + index }), fingerprint, 'W22');
}

// ─── W23 ───────────────────────────────────────────────────────────────────
export const W23_SKILL_ID = 'world.nature.earth_sun' as const;
export const W23_TOPIC_ID = 'world.nature.earth_sun' as const;
export const W23_GENERATOR_ID = 'gen.world.w23' as const;

export function generateW23Task(options: GenOpts): Task {
  const m = meta('W23');
  rejectAdvancedLevels('W23', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W23_EARTH_SUN);
  const distractors = uniqueDistractorsFromModels(item.correct, item.wrong, rng);
  return baseTask({
    id: taskId('W23', level, options.seed, 0),
    ...m,
    topicId: W23_TOPIC_ID,
    skillId: W23_SKILL_ID,
    generatorId: W23_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: item.question,
    answers: buildChoiceAnswers(item.correct, distractors, rng),
    correctAnswer: item.correct,
    explanation: item.explanation,
    generatorParams: { subtype: 'earth_sun', key: item.question },
  });
}

export function generateW23Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW23Task({ difficulty, seed: seed + index }), fingerprint, 'W23');
}

// ─── W24 ───────────────────────────────────────────────────────────────────
export const W24_SKILL_ID = 'world.nature.methods' as const;
export const W24_TOPIC_ID = 'world.nature.methods' as const;
export const W24_GENERATOR_ID = 'gen.world.w24' as const;

export function generateW24Task(options: GenOpts): Task {
  const m = meta('W24');
  rejectAdvancedLevels('W24', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W24_METHODS);

  if (level >= 2 && rng() > 0.45) {
    const uniqueMethods = [...new Map(W24_METHODS.map((x) => [x.method, x])).values()];
    const pairs = uniqueMethods.map((mth) => ({ left: mth.method, right: mth.example }));
    const match = buildMatching(pairs, rng);
    return baseTask({
      id: taskId('W24', level, options.seed, 0),
      ...m,
      topicId: W24_TOPIC_ID,
      skillId: W24_SKILL_ID,
      generatorId: W24_GENERATOR_ID,
      difficulty: level,
      taskType: 'matching',
      question: 'Соедини метод познания природы и пример:',
      ...match,
      explanation: 'Наблюдение, эксперимент, измерение и описание — методы познания природы.',
      generatorParams: { subtype: 'method_match', key: item.method },
    });
  }

  const distractors = uniqueDistractorsFromModels(item.example, item.wrong, rng);
  return baseTask({
    id: taskId('W24', level, options.seed, 0),
    ...m,
    topicId: W24_TOPIC_ID,
    skillId: W24_SKILL_ID,
    generatorId: W24_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question: `Какой пример относится к методу «${item.method}»?`,
    answers: buildChoiceAnswers(item.example, distractors, rng),
    correctAnswer: item.example,
    explanation: `${item.method}: ${item.example}.`,
    generatorParams: { subtype: 'method_example', key: item.method },
  });
}

export function generateW24Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW24Task({ difficulty, seed: seed + index }), fingerprint, 'W24');
}

// ─── W25 ───────────────────────────────────────────────────────────────────
export const W25_SKILL_ID = 'world.reasoning.analysis' as const;
export const W25_TOPIC_ID = 'world.reasoning.analysis' as const;
export const W25_GENERATOR_ID = 'gen.world.w25' as const;
export type W25Subtype = (typeof W25_MODES)[number];

export function generateW25Task(options: GenOpts): Task {
  const m = meta('W25');
  rejectAdvancedLevels('W25', options.difficulty);
  const level = options.difficulty as Level;
  const rng = createSeededRng(options.seed);
  const item = pickOne(rng, W25_REASONING);
  const mode = (options.subtype as W25Subtype | undefined) ?? pickOne(rng, W25_MODES);

  if (mode === 'find_error') {
    const distractors = uniqueDistractorsFromModels(item.error, [item.correct, 'ошибки нет', 'оба верны'], rng);
    return baseTask({
      id: taskId('W25', level, options.seed, 0),
      ...m,
      topicId: W25_TOPIC_ID,
      skillId: W25_SKILL_ID,
      generatorId: W25_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Найди ошибку в рассуждении (${item.skill}): «${item.error}»`,
      answers: buildChoiceAnswers(item.error, distractors, rng),
      correctAnswer: item.error,
      explanation: `Правильно: ${item.correct}.`,
      generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
    });
  }

  if (mode === 'choose_sequence') {
    const correct = item.steps.join(' → ');
    const wrongSeq = shuffleOrder(rng, item.steps).join(' → ');
    const distractors = uniqueDistractorsFromModels(correct, [wrongSeq, item.error, [...item.steps].reverse().join(' → ')], rng);
    return baseTask({
      id: taskId('W25', level, options.seed, 0),
      ...m,
      topicId: W25_TOPIC_ID,
      skillId: W25_SKILL_ID,
      generatorId: W25_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Выбери правильную последовательность шагов рассуждения (${item.skill}):`,
      answers: buildChoiceAnswers(correct, distractors, rng),
      correctAnswer: correct,
      explanation: `Шаги: ${item.steps.join('; ')}.`,
      generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
    });
  }

  if (mode === 'cause_effect') {
    const distractors = uniqueDistractorsFromModels(item.correct, [item.error, 'не связано', 'наоборот'], rng);
    return baseTask({
      id: taskId('W25', level, options.seed, 0),
      ...m,
      topicId: W25_TOPIC_ID,
      skillId: W25_SKILL_ID,
      generatorId: W25_GENERATOR_ID,
      difficulty: level,
      taskType: 'singleChoice',
      question: `Какая причинно-следственная связь верна при разборе (${item.skill})?`,
      answers: buildChoiceAnswers(item.correct, distractors, rng),
      correctAnswer: item.correct,
      explanation: item.correct,
      generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
    });
  }

  const stepIndex = mode === 'first_step' ? 0 : Math.min(1, item.steps.length - 1);
  const correct = item.steps[stepIndex]!;
  const distractors = uniqueDistractorsFromModels(correct, [...item.steps.filter((_, i) => i !== stepIndex), item.error], rng);
  return baseTask({
    id: taskId('W25', level, options.seed, 0),
    ...m,
    topicId: W25_TOPIC_ID,
    skillId: W25_SKILL_ID,
    generatorId: W25_GENERATOR_ID,
    difficulty: level,
    taskType: 'singleChoice',
    question:
      mode === 'first_step'
        ? `Какой первый шаг рассуждения верен (${item.skill})?`
        : `Какой следующий шаг рассуждения верен (${item.skill})?`,
    answers: buildChoiceAnswers(correct, distractors, rng),
    correctAnswer: correct,
    explanation: `Правильный ход: ${item.correct}.`,
    generatorParams: { subtype: mode, key: item.skill, reasoningMode: mode },
  });
}

export function generateW25Series(options: { seed: number; countPerLevel?: number }): Task[] {
  return makeSeries(options, ({ difficulty, seed, index }) => generateW25Task({ difficulty, seed: seed + index }), fingerprint, 'W25');
}

// ─── Registry ──────────────────────────────────────────────────────────────
export const WORLD_GENERATORS: Record<WorldSkillCode, (opts: GenOpts) => Task> = {
  W01: generateW01Task,
  W02: generateW02Task,
  W03: generateW03Task,
  W04: generateW04Task,
  W05: generateW05Task,
  W06: generateW06Task,
  W07: generateW07Task,
  W08: generateW08Task,
  W09: generateW09Task,
  W10: generateW10Task,
  W11: generateW11Task,
  W12: generateW12Task,
  W13: generateW13Task,
  W14: generateW14Task,
  W15: generateW15Task,
  W16: generateW16Task,
  W17: generateW17Task,
  W18: generateW18Task,
  W19: generateW19Task,
  W20: generateW20Task,
  W21: generateW21Task,
  W22: generateW22Task,
  W23: generateW23Task,
  W24: generateW24Task,
  W25: generateW25Task,
};

export function generateWorldTask(code: WorldSkillCode, options: GenOpts): Task {
  const fn = WORLD_GENERATORS[code];
  if (!fn) throw new Error(`No generator for ${code}`);
  return fn(options);
}

export function fingerprintWorldTask(task: Task): string {
  return fingerprint(task);
}
