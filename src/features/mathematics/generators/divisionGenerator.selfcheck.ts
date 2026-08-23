/**
 * Проверка генератора M06. Не импортируется приложением и не попадает в production-банк.
 */
import type { Task } from '../../../types';
import {
  M06_GENERATOR_ID,
  M06_SKILL_ID,
  analyzeWrittenDivision,
  divideExact,
  divisionFingerprint,
  generateM06Series,
  generateM06Task,
  isValidM06Level,
  type DivisionSubtype,
  type M06GeneratorParams,
} from './divisionGenerator';

const TEST_SEED = 20270606;
const PER_LEVEL = 10;

const L1_SUBTYPES: DivisionSubtype[] = ['table', 'divide_by_10', 'divide_by_100', 'simple_exact'];
const L2_SUBTYPES: DivisionSubtype[] = ['written_one_digit', 'with_zero_in_dividend'];
const L3_SUBTYPES: DivisionSubtype[] = ['zero_in_quotient', 'two_digit_divisor'];

function paramsOf(task: Task): M06GeneratorParams {
  return task.generatorParams as M06GeneratorParams;
}

function recordedQuotient(task: Task): number {
  return typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
}

export function generateM06InspectionSeries(): Task[] {
  return generateM06Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM06InspectionReport(tasks: readonly Task[]): string {
  const lines = tasks.map((task, index) => {
    const params = paramsOf(task);
    return [
      String(index + 1).padStart(2, '0'),
      `L${task.difficulty}`,
      task.taskType,
      `${params.dividend} ÷ ${params.divisor}`,
      `= ${recordedQuotient(task)}`,
      params.subtype,
      `interRem=${params.intermediateRemainderCount}`,
      `q0=${params.hasZeroInQuotient ? 'yes' : 'no'}`,
      `features=${params.features.join(',') || '—'}`,
    ].join('  ');
  });
  return ['Тестовая серия M06 (не входит в production-банк):', ...lines].join('\n');
}

export function runM06GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  let level4Threw = false;
  try {
    generateM06Task({ difficulty: 4, seed: 1 });
  } catch {
    level4Threw = true;
  }
  check(level4Threw, 'уровни 4 не генерируются автоматически');

  let level5Threw = false;
  try {
    generateM06Task({ difficulty: 5, seed: 1 });
  } catch {
    level5Threw = true;
  }
  check(level5Threw, 'уровни 5 не генерируются автоматически');

  const sameA = generateM06Task({ difficulty: 1, subtype: 'table', seed: 4242 });
  const sameB = generateM06Task({ difficulty: 1, subtype: 'table', seed: 4242 });
  check(sameA.id === sameB.id, 'одинаковые seed + difficulty + subtype дают одно задание');

  const series = generateM06InspectionSeries();
  check(series.length === 30, `серия: 30 заданий, получено ${series.length}`);

  const byLevel = {
    1: series.filter((task) => task.difficulty === 1),
    2: series.filter((task) => task.difficulty === 2),
    3: series.filter((task) => task.difficulty === 3),
  };

  check(byLevel[1].length === PER_LEVEL, `уровень 1: ${PER_LEVEL} заданий`);
  check(byLevel[2].length === PER_LEVEL, `уровень 2: ${PER_LEVEL} заданий`);
  check(byLevel[3].length === PER_LEVEL, `уровень 3: ${PER_LEVEL} заданий`);

  const fingerprints = series.map((task) =>
    divisionFingerprint(paramsOf(task).dividend, paramsOf(task).divisor),
  );
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дубликатов dividend÷divisor');
  check(new Set(series.map((task) => task.id)).size === series.length, 'id заданий уникальны');

  let sawZeroInDividend = false;
  let sawZeroInQuotient = false;
  let sawTwoDigitDivisor = false;
  let sawMultiStep = false;
  let sawWideFirstStep = false;
  let sawIntermediateRemainder = false;

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const { dividend, divisor } = params;
      const analysis = analyzeWrittenDivision(dividend, divisor);
      const computed = divideExact(dividend, divisor);
      const label = `${task.id} (${dividend}÷${divisor})`;

      check(task.skillId === M06_SKILL_ID, `${label}: skillId канонический`);
      check(task.skillId !== 'M06', `${label}: краткий код не подменяет skillId`);
      check(task.difficulty === difficulty, `${label}: difficulty`);
      check(task.subject === 'mathematics', `${label}: subject`);
      check(task.sourceType === 'generated', `${label}: sourceType generated`);
      check(task.generatorId === M06_GENERATOR_ID, `${label}: generatorId`);
      check(task.vprVersion === 2027, `${label}: vprVersion`);
      check(dividend % divisor === 0, `${label}: dividend % divisor === 0`);
      check(params.remainder === 0, `${label}: итоговый remainder === 0`);
      check(analysis.remainder === 0, `${label}: независимый итоговый remainder === 0`);
      check(params.hasIntermediateRemainder === analysis.hasIntermediateRemainder, `${label}: hasIntermediateRemainder согласован`);
      check(params.intermediateRemainderCount === analysis.intermediateRemainderCount, `${label}: intermediateRemainderCount согласован`);
      check(computed === recordedQuotient(task), `${label}: ответ равен частному`);
      check(params.quotient === computed, `${label}: quotient пересчитан`);
      check(isValidM06Level(dividend, divisor, difficulty), `${label}: структура уровня ${difficulty}`);
      check(allowed.includes(params.subtype), `${label}: подтип ${params.subtype} разрешён на L${difficulty}`);
      check(task.question.includes('÷'), `${label}: операция деления`);
      check(!task.question.includes('×') && !task.question.includes('+'), `${label}: это не умножение/сложение`);

      if (analysis.hasZeroInDividend) {
        sawZeroInDividend = true;
      }
      if (analysis.hasZeroInQuotient) {
        sawZeroInQuotient = true;
      }
      if (String(divisor).length === 2 && divisor >= 11) {
        sawTwoDigitDivisor = true;
      }
      if (analysis.quotientDigits >= 2) {
        sawMultiStep = true;
      }
      if (analysis.firstStepWidth >= 2) {
        sawWideFirstStep = true;
      }
      if (analysis.hasIntermediateRemainder) {
        sawIntermediateRemainder = true;
      }

      if (difficulty === 1) {
        const table = divisor >= 2 && divisor <= 9 && computed >= 2 && computed <= 9 && String(dividend).length === 2;
        const byTen = divisor === 10;
        const byHundred = divisor === 100;
        const simple =
          String(dividend).length >= 2 &&
          String(dividend).length <= 3 &&
          String(computed).length === 2 &&
          analysis.intermediateRemainderCount === 0;
        check(table || byTen || byHundred || simple, `${label}: L1 — таблица, ÷10/100 или простое письменное`);
        check(!isValidM06Level(dividend, divisor, 2), `${label}: L1 не проходит как L2`);
        check(!isValidM06Level(dividend, divisor, 3), `${label}: L1 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L1 → singleChoice`);
      }

      if (difficulty === 2) {
        check(divisor >= 2 && divisor <= 9, `${label}: L2 — однозначный делитель 2–9`);
        check(String(dividend).length >= 3, `${label}: L2 — делимое не короче 3 цифр`);
        check(String(dividend).length <= 4, `${label}: L2 — делимое не длиннее 4 цифр`);
        check(analysis.hasIntermediateRemainder, `${label}: L2 — есть промежуточный остаток > 0`);
        check(analysis.intermediateRemainderCount >= 1, `${label}: L2 — intermediateRemainderCount >= 1`);
        if (String(dividend).length === 3) {
          check(computed >= 40, `${label}: L2 3-значное — частное >= 40`);
          check(analysis.intermediateRemainderCount >= 2, `${label}: L2 3-значное — inter >= 2`);
        } else {
          check(computed >= 25, `${label}: L2 4-значное — частное >= 25`);
        }
        check(!analysis.hasZeroInQuotient, `${label}: L2 — нет нуля в частном`);
        check(params.remainder === 0, `${label}: L2 — итоговый remainder 0`);
        check(!isValidM06Level(dividend, divisor, 1), `${label}: L2 не проходит как L1`);
        check(!isValidM06Level(dividend, divisor, 3), `${label}: L2 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L2 → singleChoice`);
      }

      if (difficulty === 3) {
        const twoDigit = String(divisor).length === 2 && divisor >= 12 && computed >= 40;
        const zeroQ = analysis.hasZeroInQuotient && String(dividend).length === 4 && divisor <= 9;
        check(twoDigit || zeroQ, `${label}: L3 — нуль в частном или содержательный двузначный делитель`);
        if (twoDigit) {
          check(computed >= 40, `${label}: L3 двузначный делитель — частное >= 40`);
        }
        check(!isValidM06Level(dividend, divisor, 1), `${label}: L3 не проходит как L1`);
        check(!isValidM06Level(dividend, divisor, 2), `${label}: L3 не проходит как L2`);
        check(task.taskType === 'numberAnswer', `${label}: L3 → numberAnswer`);
        check(task.correctAnswer === computed, `${label}: correctAnswer число частного`);
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта`);
        check(new Set(answers).size === 4, `${label}: варианты уникальны`);
        check(answers.every((item) => /^\d+$/.test(item)), `${label}: варианты числовые`);
        check(answers.filter((item) => item === String(computed)).length === 1, `${label}: ровно один правильный`);
        if (computed >= 10) {
          for (const wrong of answers.filter((item) => item !== String(computed))) {
            check(Number(wrong) >= 10, `${label}: нет бессмысленного однозначного дистрактора ${wrong}`);
          }
        }
      }
    }
  }

  check(sawZeroInDividend, 'в серии есть нуль внутри делимого');
  check(sawZeroInQuotient, 'в серии есть нуль в частном');
  check(sawTwoDigitDivisor, 'в серии есть двузначный делитель');
  check(sawMultiStep, 'в серии есть несколько письменных шагов');
  check(sawWideFirstStep, 'в серии есть широкий первый шаг');
  check(sawIntermediateRemainder, 'в серии есть промежуточный остаток на шаге письменного деления');

  const sameSeedAgain = generateM06InspectionSeries();
  check(
    JSON.stringify(sameSeedAgain.map((task) => task.id)) === JSON.stringify(series.map((task) => task.id)),
    'одинаковый seed даёт ту же серию',
  );

  return failures;
}

export function reportM06GeneratorSelfChecks(): void {
  const series = generateM06InspectionSeries();
  const failures = runM06GeneratorSelfChecks();
  console.log(formatM06InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M06 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M06 generator self-check: 30 заданий валидны, дубликатов нет.');
}
