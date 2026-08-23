/**
 * Проверка генератора M04. Не импортируется приложением и не попадает в production-банк.
 */
import type { Task } from '../../../types';
import {
  M04_GENERATOR_ID,
  M04_SKILL_ID,
  analyzeBorrows,
  countBorrows,
  generateM04Series,
  generateM04Task,
  isValidM04Level,
  subtractPair,
  subtractionFingerprint,
  type M04GeneratorParams,
  type SubtractionSubtype,
} from './subtractionGenerator';

const TEST_SEED = 20270404;
const PER_LEVEL = 10;

const L1_SUBTYPES: SubtractionSubtype[] = ['no_borrow', 'borrow_one', 'mixed_digits'];
const L2_SUBTYPES: SubtractionSubtype[] = ['borrow_many', 'with_zeros', 'mixed_digits'];
const L3_SUBTYPES: SubtractionSubtype[] = [
  'consecutive_borrows',
  'from_round',
  'with_zeros',
  'mixed_digits',
  'borrow_many',
];

function paramsOf(task: Task): M04GeneratorParams {
  return task.generatorParams as M04GeneratorParams;
}

function recordedDifference(task: Task): number {
  return typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
}

export function generateM04InspectionSeries(): Task[] {
  return generateM04Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM04InspectionReport(tasks: readonly Task[]): string {
  const lines = tasks.map((task, index) => {
    const params = paramsOf(task);
    const analysis = analyzeBorrows(params.minuend, params.subtrahend);
    return [
      String(index + 1).padStart(2, '0'),
      `L${task.difficulty}`,
      task.taskType,
      `${params.minuend} − ${params.subtrahend}`,
      `= ${recordedDifference(task)}`,
      params.subtype,
      `borrows=${params.borrowCount}`,
      analysis.consecutive ? 'consecutive' : 'isolated',
      `features=${params.features.join(',') || '—'}`,
    ].join('  ');
  });
  return ['Тестовая серия M04 (не входит в production-банк):', ...lines].join('\n');
}

export function runM04GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  let level4Threw = false;
  try {
    generateM04Task({ difficulty: 4, seed: 1 });
  } catch {
    level4Threw = true;
  }
  check(level4Threw, 'уровни 4 не генерируются автоматически');

  let level5Threw = false;
  try {
    generateM04Task({ difficulty: 5, seed: 1 });
  } catch {
    level5Threw = true;
  }
  check(level5Threw, 'уровни 5 не генерируются автоматически');

  const sameA = generateM04Task({ difficulty: 1, subtype: 'no_borrow', seed: 4242 });
  const sameB = generateM04Task({ difficulty: 1, subtype: 'no_borrow', seed: 4242 });
  check(sameA.id === sameB.id, 'одинаковые seed + difficulty + subtype дают одно задание');

  const series = generateM04InspectionSeries();
  check(series.length === 30, `серия: 30 заданий, получено ${series.length}`);

  const byLevel = {
    1: series.filter((task) => task.difficulty === 1),
    2: series.filter((task) => task.difficulty === 2),
    3: series.filter((task) => task.difficulty === 3),
  };

  check(byLevel[1].length === PER_LEVEL, `уровень 1: ${PER_LEVEL} заданий, получено ${byLevel[1].length}`);
  check(byLevel[2].length === PER_LEVEL, `уровень 2: ${PER_LEVEL} заданий, получено ${byLevel[2].length}`);
  check(byLevel[3].length === PER_LEVEL, `уровень 3: ${PER_LEVEL} заданий, получено ${byLevel[3].length}`);

  const fingerprints = series.map((task) => subtractionFingerprint(paramsOf(task).minuend, paramsOf(task).subtrahend));
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дубликатов minuend-subtrahend');
  check(new Set(series.map((task) => task.id)).size === series.length, 'id заданий уникальны');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const computed = subtractPair(params.minuend, params.subtrahend);
      const analysis = analyzeBorrows(params.minuend, params.subtrahend);
      const label = `${task.id} (${params.minuend}−${params.subtrahend})`;

      check(task.skillId === M04_SKILL_ID, `${label}: skillId канонический, не M04`);
      check(task.skillId !== 'M04', `${label}: краткий код не подменяет skillId`);
      check(task.difficulty === difficulty, `${label}: difficulty`);
      check(task.subject === 'mathematics', `${label}: subject mathematics`);
      check(task.sourceType === 'generated', `${label}: sourceType generated`);
      check(task.generatorId === M04_GENERATOR_ID, `${label}: generatorId`);
      check(Array.isArray(params.features), `${label}: features заданы`);
      check(!params.features.includes(params.subtype), `${label}: features не дублируют главный subtype`);
      check(params.minuend > params.subtrahend, `${label}: minuend > subtrahend`);
      check(String(params.minuend).length >= 3 && String(params.subtrahend).length >= 3, `${label}: нет двузначных чисел`);
      check(computed === recordedDifference(task), `${label}: ответ равен разности`);
      check(isValidM04Level(params.minuend, params.subtrahend, difficulty), `${label}: соответствует уровню ${difficulty}`);
      check(params.borrowCount === countBorrows(params.minuend, params.subtrahend), `${label}: borrowCount пересчитан`);
      check(params.borrowCount === analysis.borrowCount, `${label}: borrowCount совпадает с analyzeBorrows`);
      check(allowed.includes(params.subtype), `${label}: подтип ${params.subtype} разрешён на L${difficulty}`);
      check(task.question.includes('−'), `${label}: операция вычитания`);
      check(!task.question.includes('+'), `${label}: это не сложение`);

      if (difficulty === 1) {
        check(params.borrowCount <= 1, `${label}: L1 — не больше одного заимствования`);
        check(!isValidM04Level(params.minuend, params.subtrahend, 2), `${label}: L1 не проходит как L2`);
        check(!isValidM04Level(params.minuend, params.subtrahend, 3), `${label}: L1 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L1 → singleChoice`);
      }
      if (difficulty === 2) {
        check(params.borrowCount === 2, `${label}: L2 — ровно 2 заимствования`);
        check(analysis.consecutive, `${label}: L2 — последовательные заимствования`);
        check(!isValidM04Level(params.minuend, params.subtrahend, 1), `${label}: L2 не проходит как L1`);
        check(!isValidM04Level(params.minuend, params.subtrahend, 3), `${label}: L2 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L2 → singleChoice`);
      }
      if (difficulty === 3) {
        check(params.borrowCount >= 3, `${label}: L3 — не меньше 3 заимствований`);
        check(!isValidM04Level(params.minuend, params.subtrahend, 1), `${label}: L3 не проходит как L1`);
        check(!isValidM04Level(params.minuend, params.subtrahend, 2), `${label}: L3 не проходит как L2`);
        check(task.taskType === 'numberAnswer', `${label}: L3 → numberAnswer`);
        check(task.correctAnswer === computed, `${label}: correctAnswer число разности`);
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта ответа`);
        check(new Set(answers).size === 4, `${label}: варианты уникальны`);
        check(answers.every((item) => /^\d+$/.test(item)), `${label}: варианты числовые`);
        check(answers.filter((item) => item === String(computed)).length === 1, `${label}: ровно один правильный вариант`);
        check(task.correctAnswer === String(computed), `${label}: correctAnswer строка разности`);
        if (params.subtype === 'mixed_digits') {
          const gap = String(params.minuend).length - String(params.subtrahend).length;
          if (gap > 0) {
            const aligned = params.minuend - params.subtrahend * 10 ** gap;
            const ratioOk =
              aligned >= Math.floor(computed * 0.65) && aligned <= Math.ceil(computed * 1.55);
            const digitsOk =
              Math.abs(String(aligned).length - String(computed).length) <= 1;
            if (aligned > 0 && aligned !== computed && ratioOk && digitsOk) {
              check(answers.includes(String(aligned)), `${label}: mixed_digits содержит ошибку сдвига разрядов`);
            }
          }
        }
      }
    }
  }

  const sameSeedAgain = generateM04InspectionSeries();
  check(
    JSON.stringify(sameSeedAgain.map((task) => task.id)) === JSON.stringify(series.map((task) => task.id)),
    'одинаковый seed даёт ту же серию',
  );

  return failures;
}

export function reportM04GeneratorSelfChecks(): void {
  const series = generateM04InspectionSeries();
  const failures = runM04GeneratorSelfChecks();
  console.log(formatM04InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M04 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M04 generator self-check: 30 заданий валидны, дубликатов нет.');
}
