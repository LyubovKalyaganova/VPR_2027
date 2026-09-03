/**
 * Общие хелперы для генераторов W01–W25.
 */
import type { Difficulty, Task, TaskType } from '../../../types';
import {
  createSeededRng,
  pickOne,
  randomInt,
  shuffleSeeded,
  type SeededRng,
} from '../../mathematics/generators/seededRng';

export { createSeededRng, pickOne, randomInt, shuffleSeeded };
export type { SeededRng };

export type Level = 1 | 2 | 3;

export function rejectAdvancedLevels(code: string, difficulty: Difficulty): asserts difficulty is Level {
  if (difficulty === 4 || difficulty === 5) {
    throw new Error(`Генератор ${code} пока не создаёт уровни 4–5.`);
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
    if (value === null || value === undefined) continue;
    const text = String(value);
    if (text === correctText || pool.includes(text) || text.length === 0) continue;
    pool.push(text);
  }
  const shuffled = shuffleSeeded(pool, rng);
  return shuffled.slice(0, count);
}

export function buildChoiceAnswers(correct: number | string, distractors: string[], rng: SeededRng): string[] {
  const pool = [...new Set(distractors.map((item) => String(item)).filter((item) => item && item !== String(correct)))];
  if (pool.length < 3) {
    throw new Error(`Нужно 3 дистрактора без заполнителей, получено ${pool.length} для «${correct}»`);
  }
  return shuffleSeeded([String(correct), ...pool.slice(0, 3)], rng);
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
        if (seen.has(fp)) continue;
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
  correctAnswer: string | string[] | number;
  answers?: string[];
  explanation: string;
  generatorId: string;
  generatorParams: Record<string, unknown>;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  image?: string;
  passage?: string;
  items?: string[];
  matchingLeft?: string[];
  matchingRight?: string[];
  matchingRowOptions?: string[][];
  acceptableAnswers?: string[];
}): Task {
  return {
    id: args.id,
    subject: 'world',
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
    hint2: args.hint2 ?? 'Вспомни, что изучали на уроке.',
    hint3: args.hint3 ?? `Ответ: ${Array.isArray(args.correctAnswer) ? args.correctAnswer.join(', ') : args.correctAnswer}.`,
    sourceType: 'generated',
    generatorId: args.generatorId,
    generatorParams: args.generatorParams,
    image: args.image,
    passage: args.passage,
    items: args.items,
    matchingLeft: args.matchingLeft,
    matchingRight: args.matchingRight,
    matchingRowOptions: args.matchingRowOptions,
    acceptableAnswers: args.acceptableAnswers,
  };
}

export function svgToDataUri(svg: string): string {
  const compact = svg.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(compact)}`;
}

function weatherSymbolLabel(symbol: string): string {
  switch (symbol) {
    case '☀️':
      return 'солнце';
    case '🌧️':
      return 'дождь';
    case '⛅':
      return 'облачно';
    case '❄️':
      return 'снег';
    default:
      return symbol;
  }
}

/** Чистый SVG без foreignObject/HTML — иначе таблица пустая в Android WebView. */
export function weatherTableSvg(days: Array<{ day: string; symbol: string; temp: number; wind: number }>): string {
  const width = 360;
  const top = 30;
  const headerH = 30;
  const rowH = 34;
  const height = top + headerH + days.length * rowH + 10;
  const colX = [12, 118, 230, 290] as const;
  const headers = ['День', 'Погода', 't°', 'Ветер'];

  const headerCells = headers
    .map((label, i) => `<text x="${colX[i]}" y="${top + 20}" font-size="13" font-weight="700" font-family="sans-serif" fill="#334155">${label}</text>`)
    .join('');

  const body = days
    .map((day, index) => {
      const y = top + headerH + index * rowH;
      const bg = index % 2 === 0 ? '#ffffff' : '#e8f1fb';
      const weather = weatherSymbolLabel(day.symbol);
      return [
        `<rect x="8" y="${y}" width="${width - 16}" height="${rowH}" fill="${bg}"/>`,
        `<text x="${colX[0]}" y="${y + 22}" font-size="13" font-family="sans-serif" fill="#20242a">${day.day}</text>`,
        `<text x="${colX[1]}" y="${y + 22}" font-size="13" font-family="sans-serif" fill="#20242a">${day.symbol} ${weather}</text>`,
        `<text x="${colX[2]}" y="${y + 22}" font-size="13" font-family="sans-serif" fill="#20242a">${day.temp}°C</text>`,
        `<text x="${colX[3]}" y="${y + 22}" font-size="13" font-family="sans-serif" fill="#20242a">${day.wind} м/с</text>`,
      ].join('');
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" rx="12" fill="#f0f8ff"/>`,
    `<text x="12" y="20" font-size="14" font-weight="700" font-family="sans-serif" fill="#20242a">Прогноз погоды</text>`,
    `<rect x="8" y="${top}" width="${width - 16}" height="${headerH}" fill="#d7e3f4"/>`,
    headerCells,
    body,
    `</svg>`,
  ].join('');
}

export function zoneMapSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200"><rect width="360" height="200" fill="#e8f4e8"/><text x="8" y="16" font-size="11" font-family="sans-serif">Природные зоны РФ (схема)</text><rect x="20" y="30" width="60" height="140" fill="#b8d4e8" stroke="#333"/><text x="28" y="105" font-size="9">А</text><rect x="80" y="30" width="50" height="140" fill="#a8c8a0" stroke="#333"/><text x="92" y="105" font-size="9">Б</text><rect x="130" y="30" width="55" height="140" fill="#d4c4a0" stroke="#333"/><text x="145" y="105" font-size="9">В</text><rect x="185" y="30" width="50" height="140" fill="#c8b888" stroke="#333"/><text x="198" y="105" font-size="9">Г</text><rect x="235" y="30" width="55" height="140" fill="#a0a878" stroke="#333"/><text x="250" y="105" font-size="9">Д</text><rect x="290" y="30" width="50" height="140" fill="#889878" stroke="#333"/><text x="302" y="105" font-size="9">Е</text></svg>`;
}

export function bodySvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="280" viewBox="0 0 180 280"><ellipse cx="90" cy="35" rx="28" ry="32" fill="#ffe0c0" stroke="#333"/><rect x="70" y="65" width="40" height="80" rx="8" fill="#ffe0c0" stroke="#333"/><rect x="55" y="70" width="18" height="60" rx="6" fill="#ffe0c0" stroke="#333"/><rect x="107" y="70" width="18" height="60" rx="6" fill="#ffe0c0" stroke="#333"/><rect x="75" y="145" width="15" height="70" rx="5" fill="#ffe0c0" stroke="#333"/><rect x="90" y="145" width="15" height="70" rx="5" fill="#ffe0c0" stroke="#333"/><circle cx="90" cy="100" r="12" fill="#ffaaaa" opacity="0.6"/><circle cx="90" cy="130" r="10" fill="#aaaaff" opacity="0.5"/><text x="105" cy="105" font-size="8">1</text><text x="105" cy="135" font-size="8">2</text><text x="50" cy="100" font-size="8">3</text><text x="50" cy="130" font-size="8">4</text></svg>`;
}

export function timelineSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="80" viewBox="0 0 360 80"><line x1="20" y1="40" x2="340" y2="40" stroke="#333" stroke-width="2"/><circle cx="60" cy="40" r="8" fill="#4a90d9"/><circle cx="140" cy="40" r="8" fill="#4a90d9"/><circle cx="220" cy="40" r="8" fill="#4a90d9"/><circle cx="300" cy="40" r="8" fill="#4a90d9"/><text x="48" y="65" font-size="9">I</text><text x="128" y="65" font-size="9">II</text><text x="208" y="65" font-size="9">III</text><text x="288" y="65" font-size="9">IV</text></svg>`;
}
