/**
 * Проверка генератора M16. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M16_GENERATOR_ID,
  M16_SKILL_ID,
  generateM16Series,
  generateM16Task,
  isTrivialSameUnitL3,
  isValidM16Level,
  speedFingerprint,
  type M16GeneratorParams,
  type SpeedSubtype,
} from './speedGenerator';

const TEST_SEED = 20271616;
const PER_LEVEL = 10;
const L1: SpeedSubtype[] = ['recognize_speed_unit'];
const L2: SpeedSubtype[] = ['compare_same_unit'];
const L3: SpeedSubtype[] = ['compare_awkward'];

function paramsOf(task: Task): M16GeneratorParams {
  return task.generatorParams as M16GeneratorParams;
}

export function generateM16InspectionSeries(): Task[] {
  return generateM16Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM16InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M16 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        p.subtype,
        p.values.join('/'),
        `→ ${task.correctAnswer}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM16GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  try {
    generateM16Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен бросать');
  } catch {
    check(true, 'L4 ok');
  }
  try {
    generateM16Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен бросать');
  } catch {
    check(true, 'L5 ok');
  }

  const a = generateM16Task({ difficulty: 1, seed: 4242 });
  const b = generateM16Task({ difficulty: 1, seed: 4242 });
  check(a.id === b.id, 'одинаковый seed даёт то же задание');

  // NEGATIVE / POSITIVE cases for isValidM16Level
  check(
    !isValidM16Level(
      {
        subtype: 'compare_awkward',
        kind: 'compare',
        values: [68, 47],
        units: ['км/ч', 'км/ч'],
        features: ['unit_km_h', 'how_much_faster'],
      },
      3,
    ),
    'NEG: L3 без convert / одна единица',
  );
  check(
    !isValidM16Level(
      {
        subtype: 'compare_awkward',
        kind: 'compare',
        values: [68, 47],
        units: ['км/ч', 'км/ч'],
        features: ['needs_convert', 'unit_km_h'],
      },
      3,
    ),
    'NEG: L3 needs_convert но единицы одинаковые',
  );
  check(
    isValidM16Level(
      {
        subtype: 'compare_awkward',
        kind: 'compare',
        values: [2, 70],
        units: ['км/мин', 'км/ч'],
        features: ['needs_convert', 'unit_km_h', 'unit_m_min', 'who_faster'],
      },
      3,
    ),
    'POS: L3 convert + compare',
  );
  check(
    isTrivialSameUnitL3(
      {
        subtype: 'compare_awkward',
        features: ['needs_convert', 'unit_km_h'],
        kind: 'compare',
        values: [10, 40],
        units: ['м/с', 'км/ч'],
        correctLabel: 'x',
        numericAnswer: 1,
        seed: 1,
      },
      'Что больше: 10 м/с или 40 км/ч? (подсказка: 10 м/с = 36 км/ч)',
    ),
    'NEG: L3 с подсказкой перевода в условии',
  );

  const series = generateM16InspectionSeries();
  check(series.length === 30, `серия 30, получено ${series.length}`);
  check(new Set(series.map((t) => speedFingerprint(paramsOf(t)))).size === 30, 'нет дублей fingerprint');
  check(new Set(series.map((t) => t.id)).size === 30, 'id уникальны');

  const again = generateM16InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'серия воспроизводима',
  );

  let triviaQty = 0;
  for (const task of series) {
    const p = paramsOf(task);
    const d = task.difficulty as 1 | 2 | 3;
    const allowedList = d === 1 ? L1 : d === 2 ? L2 : L3;
    check(task.skillId === M16_SKILL_ID, `${task.id}: skillId`);
    check(task.generatorId === M16_GENERATOR_ID, `${task.id}: generatorId`);
    check(task.subject === 'mathematics', `${task.id}: subject`);
    check(task.sourceType === 'generated', `${task.id}: sourceType`);
    check(allowedList.includes(p.subtype), `${task.id}: subtype`);
    check(isValidM16Level(p, d), `${task.id}: isValid`);
    check(!task.question.toLowerCase().includes('расстояние'), `${task.id}: не M30`);
    check(!/подсказка:\s*\d+\s*м\/с\s*=/i.test(task.question), `${task.id}: нет подсказки м/с`);
    check(!/\d+\s*м\/с\s*=\s*\d+\s*км\/ч/i.test(task.question), `${task.id}: нет готового перевода`);
    if (/Величина \d+ км\/ч — это/.test(task.question)) triviaQty += 1;
    if (task.taskType === 'singleChoice') {
      const answers = task.answers ?? [];
      check(answers.length === 4 && new Set(answers).size === 4, `${task.id}: 4 уникальных`);
      check(answers.filter((x) => x === String(task.correctAnswer)).length === 1, `${task.id}: один верный`);
    }
    if (d === 2) check(!isValidM16Level(p, 1), `${task.id}: не L1`);
    if (d === 3) {
      check(!isValidM16Level(p, 1), `${task.id}: не L1`);
      check(!isValidM16Level(p, 2), `${task.id}: не L2`);
      check(p.features.includes('needs_convert'), `${task.id}: L3 needs_convert`);
      check(p.units[0] !== p.units[1], `${task.id}: L3 разные единицы`);
      check(!isTrivialSameUnitL3(p, task.question), `${task.id}: не trivial L3`);
      check(!/^На сколько км\/ч скорость \d+ км\/ч больше/.test(task.question), `${task.id}: не простое вычитание`);
    }
  }
  check(triviaQty === 0, 'нет trivia «Величина N км/ч — это …»');
  return failures;
}

export function reportM16GeneratorSelfChecks(): void {
  const series = generateM16InspectionSeries();
  const failures = runM16GeneratorSelfChecks();
  console.log(formatM16InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M16 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M16 generator self-check: 30 заданий валидны, дубликатов нет.');
}
