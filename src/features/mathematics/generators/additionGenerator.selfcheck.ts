/**
 * Проверка генератора M03. Не импортируется приложением и не попадает в production-банк.
 */
import type { Task } from '../../../types';
import {
  M03_GENERATOR_ID,
  M03_SKILL_ID,
  additionFingerprint,
  analyzeCarries,
  countCarries,
  generateM03Series,
  generateM03Task,
  isValidM03Level,
  sumAddends,
  type AdditionSubtype,
  type M03GeneratorParams,
} from './additionGenerator';

const TEST_SEED = 20270303;
const PER_LEVEL = 10;

const L1_SUBTYPES: AdditionSubtype[] = ['no_carry', 'carry_one', 'mixed_digits'];
const L2_SUBTYPES: AdditionSubtype[] = ['carry_many', 'with_zeros', 'mixed_digits'];
const L3_SUBTYPES: AdditionSubtype[] = ['three_addends', 'with_zeros', 'mixed_digits', 'carry_many'];

function paramsOf(task: Task): M03GeneratorParams {
  return task.generatorParams as M03GeneratorParams;
}

function recordedSum(task: Task): number {
  return typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
}

function minDigits(addends: readonly number[]): number {
  return Math.min(...addends.map((value) => String(value).length));
}

export function generateM03InspectionSeries(): Task[] {
  return generateM03Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM03InspectionReport(tasks: readonly Task[]): string {
  const lines = tasks.map((task, index) => {
    const params = paramsOf(task);
    const analysis = analyzeCarries(params.addends);
    return [
      String(index + 1).padStart(2, '0'),
      `L${task.difficulty}`,
      task.taskType,
      params.addends.join(' + '),
      `= ${recordedSum(task)}`,
      params.subtype,
      `carries=${params.carryCount}`,
      analysis.consecutive ? 'consecutive' : 'isolated',
      `features=${params.features.join(',') || '—'}`,
    ].join('  ');
  });
  return ['Тестовая серия M03 (не входит в production-банк):', ...lines].join('\n');
}

export function runM03GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  let level4Threw = false;
  try {
    generateM03Task({ difficulty: 4, seed: 1 });
  } catch {
    level4Threw = true;
  }
  check(level4Threw, 'уровни 4 не генерируются автоматически');

  let level5Threw = false;
  try {
    generateM03Task({ difficulty: 5, seed: 1 });
  } catch {
    level5Threw = true;
  }
  check(level5Threw, 'уровни 5 не генерируются автоматически');

  const sameA = generateM03Task({ difficulty: 1, subtype: 'no_carry', seed: 4242 });
  const sameB = generateM03Task({ difficulty: 1, subtype: 'no_carry', seed: 4242 });
  check(sameA.id === sameB.id, 'одинаковые seed + difficulty + subtype дают одно задание');

  const series = generateM03InspectionSeries();
  check(series.length === 30, `серия: 30 заданий, получено ${series.length}`);

  const byLevel = {
    1: series.filter((task) => task.difficulty === 1),
    2: series.filter((task) => task.difficulty === 2),
    3: series.filter((task) => task.difficulty === 3),
  };

  check(byLevel[1].length === PER_LEVEL, `уровень 1: ${PER_LEVEL} заданий, получено ${byLevel[1].length}`);
  check(byLevel[2].length === PER_LEVEL, `уровень 2: ${PER_LEVEL} заданий, получено ${byLevel[2].length}`);
  check(byLevel[3].length === PER_LEVEL, `уровень 3: ${PER_LEVEL} заданий, получено ${byLevel[3].length}`);

  const fingerprints = series.map((task) => additionFingerprint(paramsOf(task).addends));
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дубликатов слагаемых');
  check(new Set(series.map((task) => task.id)).size === series.length, 'id заданий уникальны');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const computed = sumAddends(params.addends);
      const analysis = analyzeCarries(params.addends);
      const label = `${task.id} (${params.addends.join('+')})`;

      check(task.skillId === M03_SKILL_ID, `${label}: skillId канонический, не M03`);
      check(task.skillId !== 'M03', `${label}: краткий код не подменяет skillId`);
      check(task.difficulty === difficulty, `${label}: difficulty ${task.difficulty} = ${difficulty}`);
      check(task.subject === 'mathematics', `${label}: subject mathematics`);
      check(task.sourceType === 'generated', `${label}: sourceType generated`);
      check(task.generatorId === M03_GENERATOR_ID, `${label}: generatorId матрицы`);
      check(Array.isArray(params.features), `${label}: features заданы`);
      check(!params.features.includes(params.subtype), `${label}: features не дублируют главный subtype`);
      check(params.addends.every((value) => Number.isInteger(value) && value > 0), `${label}: слагаемые целые положительные`);
      check(minDigits(params.addends) >= 3, `${label}: нет двузначных слагаемых`);
      check(computed === recordedSum(task), `${label}: ответ ${recordedSum(task)} равен сумме ${computed}`);
      check(isValidM03Level(params.addends, difficulty), `${label}: числа соответствуют уровню ${difficulty}`);
      check(params.carryCount === countCarries(params.addends), `${label}: carryCount пересчитан`);
      check(params.carryCount === analysis.carryCount, `${label}: carryCount совпадает с analyzeCarries`);
      check(allowed.includes(params.subtype), `${label}: подтип ${params.subtype} разрешён на L${difficulty}`);
      check(task.question.includes('+'), `${label}: операция сложения`);
      check(!task.question.includes('−') && !task.question.includes('-'), `${label}: это не вычитание`);

      if (difficulty === 1) {
        check(params.addends.length === 2, `${label}: L1 — два слагаемых`);
        check(params.carryCount <= 1, `${label}: L1 — не больше одного переноса`);
        check(task.taskType === 'singleChoice', `${label}: L1 → singleChoice`);
      }
      if (difficulty === 2) {
        check(params.addends.length === 2, `${label}: L2 — два слагаемых`);
        check(params.carryCount === 2, `${label}: L2 — ровно 2 переноса`);
        check(analysis.consecutive, `${label}: L2 — последовательные переносы`);
        check(!isValidM03Level(params.addends, 1), `${label}: L2 не проходит как L1`);
        check(task.taskType === 'singleChoice', `${label}: L2 → singleChoice`);
      }
      if (difficulty === 3) {
        const three = params.addends.length === 3;
        const hardPair = params.addends.length === 2 && params.carryCount >= 3;
        check(three || hardPair, `${label}: L3 — три слагаемых или 2 слагаемых с ≥3 переносами`);
        check(minDigits(params.addends) >= 3, `${label}: L3 — разрядность не ниже 3`);
        check(!isValidM03Level(params.addends, 1), `${label}: L3 не проходит как L1`);
        check(!isValidM03Level(params.addends, 2), `${label}: L3 не проходит как типичный L2`);
        check(task.taskType === 'numberAnswer', `${label}: L3 → numberAnswer`);
        check(task.correctAnswer === computed, `${label}: correctAnswer число суммы`);
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта ответа`);
        check(new Set(answers).size === 4, `${label}: варианты уникальны`);
        check(answers.every((item) => /^\d+$/.test(item)), `${label}: варианты числовые`);
        check(answers.filter((item) => item === String(computed)).length === 1, `${label}: ровно один правильный вариант`);
        check(task.correctAnswer === String(computed), `${label}: correctAnswer строка суммы`);
        if (params.subtype === 'mixed_digits') {
          const width = Math.max(...params.addends.map((value) => String(value).length));
          const aligned = params.addends.reduce((total, value) => {
            const gap = width - String(value).length;
            return total + (gap > 0 ? value * 10 ** gap : value);
          }, 0);
          const ratioOk =
            aligned >= Math.floor(computed * 0.65) && aligned <= Math.ceil(computed * 1.55);
          const digitsOk =
            Math.abs(String(aligned).length - String(computed).length) <= 1;
          if (aligned !== computed && aligned > 0 && ratioOk && digitsOk) {
            check(answers.includes(String(aligned)), `${label}: mixed_digits содержит ошибку сдвига разрядов`);
          }
        }
      }
    }
  }

  const sameSeedAgain = generateM03InspectionSeries();
  check(
    JSON.stringify(sameSeedAgain.map((task) => task.id)) === JSON.stringify(series.map((task) => task.id)),
    'одинаковый seed даёт ту же серию',
  );

  return failures;
}

export function reportM03GeneratorSelfChecks(): void {
  const series = generateM03InspectionSeries();
  const failures = runM03GeneratorSelfChecks();
  console.log(formatM03InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M03 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M03 generator self-check: 30 заданий валидны, дубликатов нет.');
}
