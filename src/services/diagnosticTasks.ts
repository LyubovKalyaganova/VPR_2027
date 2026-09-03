import type { SubjectId, Task } from '../types';
import { taskRepository } from './taskRepository';

/** Сколько заданий на каждый выбранный предмет во входной проверке. */
export const DIAGNOSTIC_TASKS_PER_SUBJECT = 3;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Навыки «старта 4 класса»: опора на 1–3 класс и ранние темы,
 * а не mid/late-year материал (движение, сложная грамматика, ВПР-логика).
 */
const ENTRY_SKILL_IDS: Readonly<Record<SubjectId, readonly string[]>> = {
  mathematics: [
    'math.calculation.numbers.place_value',
    'math.calculation.numbers.compare',
    'math.calculation.multi_digit.addition',
    'math.calculation.multi_digit.subtraction',
    'math.calculation.mul_div.multiplication',
    'math.calculation.mul_div.division',
    'math.calculation.mul_div.division_remainder',
    'math.quantities.units.convert',
    'math.quantities.time.read_clock',
  ],
  russian: [
    'russian.orthography.base',
    'russian.phonetics.stress',
    'russian.phonetics.sound_letter',
    'russian.orthography.noun_endings',
    'russian.punctuation.homogeneous',
  ],
  world: [
    'world.nature.weather',
    'world.nature.body_structure',
    'world.nature.health',
    'world.safety.public',
    'world.nature.food_chain',
  ],
  reading: [
    'reading.comprehension.sequence',
    'reading.genres.folklore',
    'reading.genres.literature',
    'reading.comprehension.interpret',
    'reading.knowledge.authors',
  ],
  english: [
    'english.grammar.verbs',
    'english.lexis.life',
    'english.lexis.world',
    'english.reading.specific',
    'english.reading.vocabulary',
  ],
};

function isFriendlyDiagnostic(task: Task): boolean {
  if (task.taskType === 'audio' || task.taskType === 'constructedResponse') {
    return false;
  }
  if (task.difficulty > 2) {
    return false;
  }
  if (task.passage && task.passage.length > 350) {
    return false;
  }
  return true;
}

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function scoreTask(task: Task, entrySkills: ReadonlySet<string>): number {
  let score = 0;
  const skillId = task.skillId ?? '';
  if (skillId && entrySkills.has(skillId)) {
    score += 100;
  }
  if (task.difficulty === 1) {
    score += 20;
  } else if (task.difficulty === 2) {
    score += 5;
  }
  if (task.taskType === 'singleChoice' || task.taskType === 'numberAnswer' || task.taskType === 'imageTask') {
    score += 8;
  }
  return score;
}

function pickForSubject(
  subject: SubjectId,
  count: number,
  rng: () => number,
  seen: Set<string>,
): Task[] {
  const entrySkills = new Set(ENTRY_SKILL_IDS[subject] ?? []);
  const pool = taskRepository.getBySubject(subject).filter(isFriendlyDiagnostic);
  if (pool.length === 0) {
    return [];
  }

  const ranked = [...pool].sort((a, b) => {
    const diff = scoreTask(b, entrySkills) - scoreTask(a, entrySkills);
    if (diff !== 0) {
      return diff;
    }
    return a.id.localeCompare(b.id);
  });

  // Берём верх рейтинга и слегка перемешиваем, чтобы не всегда один и тот же набор.
  const top = ranked.slice(0, Math.min(ranked.length, Math.max(count * 8, 16)));
  shuffleInPlace(top, rng);

  const picked: Task[] = [];
  const usedSkills = new Set<string>();

  // Сначала разные entry-навыки.
  for (const task of top) {
    if (picked.length >= count) {
      break;
    }
    const skillId = task.skillId ?? '';
    if (seen.has(task.id) || !skillId || usedSkills.has(skillId)) {
      continue;
    }
    if (!entrySkills.has(skillId)) {
      continue;
    }
    seen.add(task.id);
    usedSkills.add(skillId);
    picked.push(task);
  }

  // Добираем любыми friendly, разными навыками.
  for (const task of top) {
    if (picked.length >= count) {
      break;
    }
    const skillId = task.skillId ?? '';
    if (seen.has(task.id) || (skillId && usedSkills.has(skillId))) {
      continue;
    }
    seen.add(task.id);
    if (skillId) {
      usedSkills.add(skillId);
    }
    picked.push(task);
  }

  // Если навыков мало — добираем без ограничения на уникальный skill.
  for (const task of ranked) {
    if (picked.length >= count) {
      break;
    }
    if (seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    picked.push(task);
  }

  return picked;
}

/**
 * Входная проверка: несколько коротких заданий на предмет.
 * Предпочтение — базовым темам старта 4 класса (опора на 1–3), без аудирования и длинных текстов.
 * Это стартовый срез, а не оценка готовности к ВПР.
 */
export function pickDiagnosticTasks(
  subjects: readonly SubjectId[],
  seed = 20270825,
  perSubject = DIAGNOSTIC_TASKS_PER_SUBJECT,
): Task[] {
  const rng = mulberry32(seed >>> 0);
  const picked: Task[] = [];
  const seen = new Set<string>();
  for (const subject of subjects) {
    picked.push(...pickForSubject(subject, perSubject, rng, seen));
  }
  return picked;
}
