/**
 * Генератор M17: распознавание плоских и пространственных фигур + схемы.
 * Контракт: карточка M17 + закрытие ВПР №10 (выбор схемы, без фото чертежа).
 */
import type { Difficulty, Task } from '../../../types';
import {
  baseTask,
  buildChoiceAnswers,
  createSeededRng,
  makeSeries,
  pickOne,
  rejectAdvancedLevels,
  svgToDataUri,
  uniqueDistractorsFromModels,
  type Level,
  type SeededRng,
} from './generatorScaffold';
import { svgFigure, type FigureKind } from './visualSvg';

export const M17_SKILL_ID = 'math.geometry.figures.identify' as const;
export const M17_TOPIC_ID = 'math.geometry.figures' as const;
export const M17_GENERATOR_ID = 'gen.math.geometry.figures' as const;

export type FiguresSubtype =
  | 'canonical_name'
  | 'choose_from_four'
  | 'unusual_orientation'
  | 'solid_name'
  | 'spatial_read'
  | 'choose_scheme';

export type SolidKind = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'pyramid';
export type FiguresFeature = FigureKind | SolidKind | 'rotated' | 'has_svg' | 'spatial' | 'solid';

export type M17GenerateOptions = { difficulty: Difficulty; seed: number; subtype?: FiguresSubtype; seriesIndex?: number };
export type M17SeriesOptions = { seed: number; countPerLevel?: number };

export type M17GeneratorParams = {
  subtype: FiguresSubtype;
  features: FiguresFeature[];
  figureId: string;
  correctName: string;
  rotationDeg: number;
  promptKey: string;
  seed: number;
  hasVisual: true;
};

const FLAT_NAMES: Record<FigureKind, string> = {
  square: 'квадрат',
  rectangle: 'прямоугольник',
  triangle: 'треугольник',
  circle: 'круг',
  segment: 'отрезок',
  ray: 'луч',
  pentagon: 'пятиугольник',
};

const SOLID_NAMES: Record<SolidKind, string> = {
  cube: 'куб',
  sphere: 'шар',
  cylinder: 'цилиндр',
  cone: 'конус',
  pyramid: 'пирамида',
};

const L1_FLAT: FigureKind[] = ['square', 'rectangle', 'triangle', 'circle'];
const L2_FLAT: FigureKind[] = ['square', 'rectangle', 'triangle', 'circle', 'segment', 'ray'];
const L3_FLAT: FigureKind[] = ['square', 'rectangle', 'triangle', 'pentagon', 'segment', 'ray'];
const SOLIDS: SolidKind[] = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid'];

type ShapeToken = 'квадрат' | 'круг' | 'треугольник';

function distractorsFlat(kind: FigureKind, rng: SeededRng): string[] {
  return uniqueDistractorsFromModels(
    FLAT_NAMES[kind],
    Object.values(FLAT_NAMES).filter((n) => n !== FLAT_NAMES[kind]),
    rng,
    3,
  );
}

function distractorsSolid(kind: SolidKind, rng: SeededRng): string[] {
  return uniqueDistractorsFromModels(
    SOLID_NAMES[kind],
    [...Object.values(SOLID_NAMES).filter((n) => n !== SOLID_NAMES[kind]), 'круг', 'квадрат'],
    rng,
    3,
  );
}

/** Простые «объёмные» SVG без правок visualSvg.ts */
function svgSolid(kind: SolidKind): string {
  let body = '';
  if (kind === 'cube') {
    body = `<path d="M60,70 L110,50 L160,70 L160,130 L110,150 L60,130 Z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>
<path d="M60,70 L110,90 L160,70 M110,90 L110,150" fill="none" stroke="#1e3a8a" stroke-width="2"/>`;
  } else if (kind === 'sphere') {
    body = `<circle cx="100" cy="100" r="55" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="3"/>
<ellipse cx="100" cy="100" rx="55" ry="18" fill="none" stroke="#1e3a8a" stroke-width="2"/>`;
  } else if (kind === 'cylinder') {
    body = `<ellipse cx="100" cy="55" rx="40" ry="14" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>
<rect x="60" y="55" width="80" height="80" fill="#dbeafe" stroke="none"/>
<line x1="60" y1="55" x2="60" y2="135" stroke="#1e3a8a" stroke-width="2"/>
<line x1="140" y1="55" x2="140" y2="135" stroke="#1e3a8a" stroke-width="2"/>
<ellipse cx="100" cy="135" rx="40" ry="14" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="2"/>`;
  } else if (kind === 'cone') {
    body = `<path d="M100,40 L160,140 L40,140 Z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>
<ellipse cx="100" cy="140" rx="60" ry="16" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="2"/>`;
  } else {
    body = `<path d="M100,35 L170,145 L30,145 Z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>
<line x1="100" y1="35" x2="100" y2="145" stroke="#1e3a8a" stroke-width="2"/>
<path d="M30,145 L100,115 L170,145" fill="none" stroke="#1e3a8a" stroke-width="2"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="${SOLID_NAMES[kind]}">
<rect width="200" height="200" fill="#fff"/>${body}</svg>`;
}

function drawToken(name: ShapeToken, x: number, y: number, s = 28): string {
  if (name === 'квадрат') {
    return `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>`;
  }
  if (name === 'круг') {
    return `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="#86efac" stroke="#166534" stroke-width="2"/>`;
  }
  return `<polygon points="${x},${y - s / 2} ${x + s / 2},${y + s / 2} ${x - s / 2},${y + s / 2}" fill="#fcd34d" stroke="#92400e" stroke-width="2"/>`;
}

type Layout = { square: { x: number; y: number }; circle: { x: number; y: number }; triangle: { x: number; y: number } };

function layoutFromRule(rule: 'circle_left_tri_above' | 'circle_right_tri_below' | 'tri_left_circle_above' | 'all_row'): Layout {
  if (rule === 'circle_left_tri_above') {
    return { square: { x: 100, y: 120 }, circle: { x: 45, y: 120 }, triangle: { x: 100, y: 50 } };
  }
  if (rule === 'circle_right_tri_below') {
    return { square: { x: 100, y: 70 }, circle: { x: 155, y: 70 }, triangle: { x: 100, y: 145 } };
  }
  if (rule === 'tri_left_circle_above') {
    return { square: { x: 110, y: 120 }, circle: { x: 110, y: 50 }, triangle: { x: 45, y: 120 } };
  }
  return { square: { x: 50, y: 100 }, circle: { x: 100, y: 100 }, triangle: { x: 150, y: 100 } };
}

function svgScene(layout: Layout, label?: string): string {
  const lab = label
    ? `<text x="16" y="24" font-size="18" font-family="Arial,sans-serif" font-weight="bold" fill="#111">${label}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img">
<rect width="200" height="200" fill="#fff" stroke="#cbd5e1"/>
${lab}
${drawToken('квадрат', layout.square.x, layout.square.y)}
${drawToken('круг', layout.circle.x, layout.circle.y)}
${drawToken('треугольник', layout.triangle.x, layout.triangle.y)}
</svg>`;
}

function svgQuadSchemes(layouts: Layout[], labels: [string, string, string, string]): string {
  const cells = layouts.map((lay, i) => {
    const ox = (i % 2) * 200;
    const oy = Math.floor(i / 2) * 200;
    return `<g transform="translate(${ox},${oy})">
<rect width="200" height="200" fill="#fff" stroke="#94a3b8"/>
<text x="12" y="22" font-size="16" font-family="Arial,sans-serif" font-weight="bold">${labels[i]}</text>
${drawToken('квадрат', lay.square.x, lay.square.y, 24)}
${drawToken('круг', lay.circle.x, lay.circle.y, 24)}
${drawToken('треугольник', lay.triangle.x, lay.triangle.y, 24)}
</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img">${cells.join('')}</svg>`;
}

export function isValidM17Level(
  params: Pick<M17GeneratorParams, 'subtype' | 'features' | 'rotationDeg'>,
  difficulty: Level,
): boolean {
  if (!params.features.includes('has_svg')) return false;
  if (difficulty === 1) {
    return (
      (params.subtype === 'canonical_name' && params.rotationDeg === 0) ||
      params.subtype === 'solid_name' ||
      params.subtype === 'spatial_read'
    );
  }
  if (difficulty === 2) {
    return (
      (params.subtype === 'choose_from_four' && Math.abs(params.rotationDeg) <= 15) ||
      params.subtype === 'choose_scheme' ||
      params.subtype === 'solid_name'
    );
  }
  return (
    (params.subtype === 'unusual_orientation' && Math.abs(params.rotationDeg) >= 25) ||
    params.subtype === 'choose_scheme' ||
    params.subtype === 'spatial_read'
  );
}

export function figuresFingerprint(params: M17GeneratorParams): string {
  return [params.subtype, params.figureId, params.rotationDeg, params.correctName, params.promptKey, params.seed].join('|');
}

function allowedSubtypes(difficulty: Level): FiguresSubtype[] {
  if (difficulty === 1) return ['canonical_name', 'solid_name', 'spatial_read'];
  if (difficulty === 2) return ['choose_from_four', 'choose_scheme', 'solid_name'];
  return ['unusual_orientation', 'choose_scheme', 'spatial_read'];
}

function buildFlat(
  rng: SeededRng,
  difficulty: Level,
  seed: number,
  subtype: FiguresSubtype,
  indexHint: number,
): Task | null {
  if (subtype !== 'canonical_name' && subtype !== 'choose_from_four' && subtype !== 'unusual_orientation') {
    return null;
  }
  const kinds = difficulty === 1 ? L1_FLAT : difficulty === 2 ? L2_FLAT : L3_FLAT;
  const kind = kinds[(indexHint + Math.floor(rng() * 100)) % kinds.length] ?? pickOne(rng, kinds);
  const rotationDeg =
    difficulty === 3
      ? pickOne(rng, [35, 45, 60, 90, 120, 135, -30, -45, -60])
      : difficulty === 2
        ? pickOne(rng, [0, 5, -5, 10, -10, 15])
        : 0;
  const prompts =
    difficulty === 1
      ? [
          { key: 'name', q: 'Как называется фигура на рисунке?' },
          { key: 'shown', q: 'Какая фигура изображена на рисунке?' },
          { key: 'choose', q: 'Выберите название фигуры на рисунке.' },
        ]
      : difficulty === 2
        ? [
            { key: 'name', q: 'Как называется фигура на рисунке?' },
            { key: 'pick', q: 'Укажите название фигуры на рисунке.' },
          ]
        : [
            { key: 'name_rot', q: 'Фигура повёрнута. Как она называется?' },
            { key: 'orient', q: 'Несмотря на положение, как называется фигура?' },
          ];
  const prompt = prompts[(indexHint + Math.floor(rng() * 50)) % prompts.length]!;
  const correctName = FLAT_NAMES[kind];
  const features: FiguresFeature[] = [kind, 'has_svg'];
  if (Math.abs(rotationDeg) >= 25) features.push('rotated');
  const params: M17GeneratorParams = {
    subtype,
    features,
    figureId: kind,
    correctName,
    rotationDeg,
    promptKey: prompt.key,
    seed,
    hasVisual: true,
  };
  if (!isValidM17Level(params, difficulty)) return null;
  const distractors = distractorsFlat(kind, rng);
  if (distractors.length !== 3) return null;
  return baseTask({
    id: `generated-m17-${difficulty}-${kind}-${rotationDeg}-${prompt.key}-${seed}`,
    section: 'Геометрия',
    topic: 'Геометрические фигуры',
    skill: 'Распознавание фигуры',
    topicId: M17_TOPIC_ID,
    skillId: M17_SKILL_ID,
    difficulty,
    taskType: 'imageTask',
    question: prompt.q,
    correctAnswer: correctName,
    answers: buildChoiceAnswers(correctName, distractors, rng),
    explanation: `На рисунке изображён ${correctName}.`,
    generatorId: M17_GENERATOR_ID,
    generatorParams: params,
    image: svgToDataUri(svgFigure(kind, rotationDeg)),
  });
}

function buildSolid(rng: SeededRng, difficulty: Level, seed: number, indexHint: number): Task | null {
  const kind = SOLIDS[(indexHint + Math.floor(rng() * 20)) % SOLIDS.length] ?? pickOne(rng, SOLIDS);
  const correctName = SOLID_NAMES[kind];
  const params: M17GeneratorParams = {
    subtype: 'solid_name',
    features: [kind, 'solid', 'has_svg'],
    figureId: kind,
    correctName,
    rotationDeg: 0,
    promptKey: pickOne(rng, ['solid_name', 'solid_which', 'solid_body']),
    seed,
    hasVisual: true,
  };
  if (!isValidM17Level(params, difficulty)) return null;
  const distractors = distractorsSolid(kind, rng);
  if (distractors.length !== 3) return null;
  const question = pickOne(rng, [
    'Как называется тело на рисунке?',
    'Какое пространственное тело изображено?',
    'Выберите название фигуры на рисунке.',
  ]);
  return baseTask({
    id: `generated-m17-${difficulty}-solid-${kind}-${seed}`,
    section: 'Геометрия',
    topic: 'Геометрические фигуры',
    skill: 'Распознавание фигуры',
    topicId: M17_TOPIC_ID,
    skillId: M17_SKILL_ID,
    difficulty,
    taskType: 'imageTask',
    question,
    correctAnswer: correctName,
    answers: buildChoiceAnswers(correctName, distractors, rng),
    explanation: `На рисунке изображён ${correctName}.`,
    generatorId: M17_GENERATOR_ID,
    generatorParams: params,
    image: svgToDataUri(svgSolid(kind)),
  });
}

function buildSpatialRead(rng: SeededRng, difficulty: Level, seed: number): Task | null {
  const rule = pickOne(rng, ['circle_left_tri_above', 'circle_right_tri_below', 'tri_left_circle_above'] as const);
  const layout = layoutFromRule(rule);
  type Ask = { question: string; answer: string };
  const asks: Ask[] =
    rule === 'circle_left_tri_above'
      ? [
          { question: 'Какая фигура находится слева от квадрата?', answer: 'круг' },
          { question: 'Какая фигура находится над квадратом?', answer: 'треугольник' },
          { question: 'Какая фигура находится между кругом и треугольником?', answer: 'квадрат' },
        ]
      : rule === 'circle_right_tri_below'
        ? [
            { question: 'Какая фигура находится справа от квадрата?', answer: 'круг' },
            { question: 'Какая фигура находится под квадратом?', answer: 'треугольник' },
            { question: 'Какая фигура находится выше треугольника?', answer: 'квадрат' },
          ]
        : [
            { question: 'Какая фигура находится слева от квадрата?', answer: 'треугольник' },
            { question: 'Какая фигура находится над квадратом?', answer: 'круг' },
            { question: 'Какая фигура находится справа от треугольника?', answer: 'квадрат' },
          ];
  const ask = pickOne(rng, asks);
  const distractors = uniqueDistractorsFromModels(
    ask.answer,
    ['круг', 'квадрат', 'треугольник', 'прямоугольник'].filter((x) => x !== ask.answer),
    rng,
    3,
  );
  const params: M17GeneratorParams = {
    subtype: 'spatial_read',
    features: ['spatial', 'has_svg'],
    figureId: `read-${rule}-${ask.answer}`,
    correctName: ask.answer,
    rotationDeg: 0,
    promptKey: 'spatial_q',
    seed,
    hasVisual: true,
  };
  if (!isValidM17Level(params, difficulty)) return null;
  return baseTask({
    id: `generated-m17-${difficulty}-spatial-${rule}-${ask.answer}-${seed}`,
    section: 'Геометрия',
    topic: 'Геометрические фигуры',
    skill: 'Распознавание фигуры',
    topicId: M17_TOPIC_ID,
    skillId: M17_SKILL_ID,
    difficulty,
    taskType: 'imageTask',
    question: ask.question,
    correctAnswer: ask.answer,
    answers: buildChoiceAnswers(ask.answer, distractors, rng),
    explanation: `По схеме: ${ask.answer}.`,
    generatorId: M17_GENERATOR_ID,
    generatorParams: params,
    image: svgToDataUri(svgScene(layout)),
  });
}

function buildChooseScheme(rng: SeededRng, difficulty: Level, seed: number): Task | null {
  const correctRule = pickOne(rng, ['circle_left_tri_above', 'circle_right_tri_below', 'tri_left_circle_above'] as const);
  const correct = layoutFromRule(correctRule);
  const wrongRules = (['circle_left_tri_above', 'circle_right_tri_below', 'tri_left_circle_above', 'all_row'] as const).filter(
    (r) => r !== correctRule,
  );
  const wrongLayouts = wrongRules.slice(0, 3).map((r) => layoutFromRule(r));
  const labels: [string, string, string, string] = ['А', 'Б', 'В', 'Г'];
  const correctSlot = Math.floor(rng() * 4);
  const panels: Layout[] = [wrongLayouts[0]!, wrongLayouts[1]!, wrongLayouts[2]!, wrongLayouts[0]!];
  panels[correctSlot] = correct;
  // fill remaining wrong uniquely
  let w = 0;
  for (let i = 0; i < 4; i += 1) {
    if (i === correctSlot) continue;
    panels[i] = wrongLayouts[w]!;
    w += 1;
  }
  const correctLabel = labels[correctSlot]!;
  const desc =
    correctRule === 'circle_left_tri_above'
      ? 'Круг слева от квадрата, треугольник над квадратом.'
      : correctRule === 'circle_right_tri_below'
        ? 'Круг справа от квадрата, треугольник под квадратом.'
        : 'Треугольник слева от квадрата, круг над квадратом.';
  const params: M17GeneratorParams = {
    subtype: 'choose_scheme',
    features: ['spatial', 'has_svg'],
    figureId: `scheme-${correctRule}-${correctLabel}`,
    correctName: correctLabel,
    rotationDeg: 0,
    promptKey: 'scheme',
    seed,
    hasVisual: true,
  };
  if (!isValidM17Level(params, difficulty)) return null;
  return baseTask({
    id: `generated-m17-${difficulty}-scheme-${correctRule}-${correctLabel}-${seed}`,
    section: 'Геометрия',
    topic: 'Геометрические фигуры',
    skill: 'Распознавание фигуры',
    topicId: M17_TOPIC_ID,
    skillId: M17_SKILL_ID,
    difficulty,
    taskType: 'imageTask',
    question: `${desc} Какой рисунок подходит?`,
    correctAnswer: correctLabel,
    answers: buildChoiceAnswers(correctLabel, labels.filter((l) => l !== correctLabel), rng),
    explanation: `Подходит рисунок ${correctLabel}.`,
    generatorId: M17_GENERATOR_ID,
    generatorParams: params,
    image: svgToDataUri(svgQuadSchemes(panels, labels)),
  });
}

function build(rng: SeededRng, difficulty: Level, seed: number, indexHint = 0, requested?: FiguresSubtype): Task | null {
  const allowed = allowedSubtypes(difficulty);
  const subtype = requested && allowed.includes(requested) ? requested : allowed[indexHint % allowed.length]!;
  if (subtype === 'solid_name') return buildSolid(rng, difficulty, seed, indexHint);
  if (subtype === 'spatial_read') return buildSpatialRead(rng, difficulty, seed);
  if (subtype === 'choose_scheme') return buildChooseScheme(rng, difficulty, seed);
  return buildFlat(rng, difficulty, seed, subtype, indexHint);
}

export function generateM17Task(options: M17GenerateOptions): Task {
  rejectAdvancedLevels('M17', options.difficulty);
  const rng = createSeededRng(options.seed >>> 0);
  for (let i = 0; i < 100; i += 1) {
    const task = build(rng, options.difficulty, options.seed, (options.seriesIndex ?? 0) + i, options.subtype);
    if (task) return task;
  }
  throw new Error(`M17: не удалось сгенерировать L${options.difficulty}`);
}

export function generateM17Series(options: M17SeriesOptions): Task[] {
  return makeSeries(
    options,
    ({ difficulty, seed, index }) => {
      const subtypes = allowedSubtypes(difficulty);
      return generateM17Task({
        difficulty,
        seed,
        seriesIndex: index,
        subtype: subtypes[index % subtypes.length],
      });
    },
    (task) => figuresFingerprint(task.generatorParams as M17GeneratorParams),
    'M17',
  );
}
