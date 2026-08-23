/**
 * Проверка генератора M07. Не импортируется приложением и не попадает в production-банк.
 */
import type { Task } from '../../../types';
import {
  M07_GENERATOR_ID,
  M07_SKILL_ID,
  decomposeDivision,
  divisionRemainderFingerprint,
  formatQuotientRemainder,
  generateM07Series,
  generateM07Task,
  isNearRemainder,
  isObviousRemainder,
  isValidM07Level,
  verifyDivisionIdentity,
  type DivisionRemainderSubtype,
  type M07GeneratorParams,
} from './divisionWithRemainderGenerator';

const TEST_SEED = 20270707;
const PER_LEVEL = 10;

const L1_SUBTYPES: DivisionRemainderSubtype[] = ['small_obvious'];
const L2_SUBTYPES: DivisionRemainderSubtype[] = ['typical_written', 'with_zero_in_dividend'];
const L3_SUBTYPES: DivisionRemainderSubtype[] = ['near_divisor', 'largest_with_remainder'];

function paramsOf(task: Task): M07GeneratorParams {
  return task.generatorParams as M07GeneratorParams;
}

export function generateM07InspectionSeries(): Task[] {
  return generateM07Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM07InspectionReport(tasks: readonly Task[]): string {
  const lines = tasks.map((task, index) => {
    const params = paramsOf(task);
    return [
      String(index + 1).padStart(2, '0'),
      `L${task.difficulty}`,
      task.taskType,
      `${params.dividend} ÷ ${params.divisor}`,
      `→ ${task.correctAnswer}`,
      params.subtype,
      `q=${params.quotient}`,
      `r=${params.remainder}`,
      `features=${params.features.join(',') || '—'}`,
    ].join('  ');
  });
  return ['Тестовая серия M07 (не входит в production-банк):', ...lines].join('\n');
}

export function runM07GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  let level4Threw = false;
  try {
    generateM07Task({ difficulty: 4, seed: 1 });
  } catch {
    level4Threw = true;
  }
  check(level4Threw, 'уровни 4 не генерируются автоматически');

  let level5Threw = false;
  try {
    generateM07Task({ difficulty: 5, seed: 1 });
  } catch {
    level5Threw = true;
  }
  check(level5Threw, 'уровни 5 не генерируются автоматически');

  const sameA = generateM07Task({ difficulty: 1, subtype: 'small_obvious', seed: 4242 });
  const sameB = generateM07Task({ difficulty: 1, subtype: 'small_obvious', seed: 4242 });
  check(sameA.id === sameB.id, 'одинаковые seed + difficulty + subtype дают одно задание');

  const series = generateM07InspectionSeries();
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
    divisionRemainderFingerprint(paramsOf(task).dividend, paramsOf(task).divisor),
  );
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дубликатов dividend÷divisor');
  check(new Set(series.map((task) => task.id)).size === series.length, 'id заданий уникальны');

  const seenSubtypes = new Set<DivisionRemainderSubtype>();
  let sawRemainderOne = false;
  let sawRemainderMax = false;
  let sawZeroDividend = false;

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const { dividend, divisor, quotient, remainder } = params;
      const computed = decomposeDivision(dividend, divisor);
      const label = `${task.id} (${dividend}÷${divisor})`;
      seenSubtypes.add(params.subtype);

      check(task.skillId === M07_SKILL_ID, `${label}: skillId канонический`);
      check(task.skillId !== 'M07', `${label}: краткий код не подменяет skillId`);
      check(task.difficulty === difficulty, `${label}: difficulty`);
      check(task.subject === 'mathematics', `${label}: subject`);
      check(task.sourceType === 'generated', `${label}: sourceType generated`);
      check(task.generatorId === M07_GENERATOR_ID, `${label}: generatorId`);
      check(task.vprVersion === 2027, `${label}: vprVersion`);
      check(dividend > divisor, `${label}: dividend > divisor`);
      check(remainder > 0, `${label}: remainder > 0`);
      check(remainder < divisor, `${label}: remainder < divisor`);
      check(remainder !== 0, `${label}: remainder не 0 (не M06)`);
      check(
        verifyDivisionIdentity(dividend, divisor, quotient, remainder),
        `${label}: dividend === divisor*quotient+remainder`,
      );
      check(dividend % divisor === remainder, `${label}: dividend % divisor === remainder`);
      check(computed.quotient === quotient, `${label}: quotient пересчитан`);
      check(computed.remainder === remainder, `${label}: remainder пересчитан`);
      check(
        String(task.correctAnswer) === formatQuotientRemainder(computed.quotient, computed.remainder),
        `${label}: correctAnswer совпадает с пересчётом`,
      );
      check(isValidM07Level(dividend, divisor, difficulty), `${label}: структура уровня ${difficulty}`);
      check(allowed.includes(params.subtype), `${label}: подтип ${params.subtype} разрешён на L${difficulty}`);
      check(task.question.includes('÷'), `${label}: операция деления`);

      if (remainder === 1) {
        sawRemainderOne = true;
      }
      if (remainder === divisor - 1) {
        sawRemainderMax = true;
      }
      if (String(dividend).includes('0')) {
        sawZeroDividend = true;
      }

      if (difficulty === 1) {
        check(String(dividend).length === 2, `${label}: L1 — двузначное делимое`);
        check(isObviousRemainder(remainder, divisor), `${label}: L1 — остаток очевиден`);
        check(!isValidM07Level(dividend, divisor, 2), `${label}: L1 не проходит как L2`);
        check(!isValidM07Level(dividend, divisor, 3), `${label}: L1 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L1 → singleChoice`);
      }

      if (difficulty === 2) {
        check(String(dividend).length >= 3 && String(dividend).length <= 4, `${label}: L2 — делимое 3–4 знака`);
        check(quotient >= 10, `${label}: L2 — частное ≥ 10`);
        check(!isNearRemainder(remainder, divisor), `${label}: L2 — остаток не near`);
        check(!isValidM07Level(dividend, divisor, 1), `${label}: L2 не проходит как L1`);
        check(!isValidM07Level(dividend, divisor, 3), `${label}: L2 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L2 → singleChoice`);
      }

      if (difficulty === 3) {
        check(isNearRemainder(remainder, divisor), `${label}: L3 — остаток near`);
        check(divisor >= 3, `${label}: L3 — делитель ≥ 3`);
        check(!isValidM07Level(dividend, divisor, 1), `${label}: L3 не проходит как L1`);
        check(!isValidM07Level(dividend, divisor, 2), `${label}: L3 не проходит как L2`);
        check(task.taskType === 'numberAnswer', `${label}: L3 → numberAnswer`);
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта`);
        check(new Set(answers).size === 4, `${label}: варианты уникальны`);
        check(
          answers.filter((item) => item === String(task.correctAnswer)).length === 1,
          `${label}: ровно один правильный`,
        );
      }
    }
  }

  for (const subtype of [...L1_SUBTYPES, ...L2_SUBTYPES, ...L3_SUBTYPES]) {
    check(seenSubtypes.has(subtype), `в серии есть подтип ${subtype}`);
  }
  check(sawRemainderOne, 'в серии есть remainder === 1');
  check(sawRemainderMax, 'в серии есть remainder === divisor - 1');
  check(sawZeroDividend, 'в серии есть нуль в делимом');

  const l1Remainders = byLevel[1].map((task) => paramsOf(task).remainder);
  const remOneShare = l1Remainders.filter((value) => value === 1).length / l1Remainders.length;
  check(remOneShare <= 0.5, `L1: доля remainder=1 не больше половины (сейчас ${remOneShare})`);
  check(new Set(l1Remainders).size >= 3, `L1: разнообразие remainder (уникальных ${new Set(l1Remainders).size})`);

  for (const task of byLevel[3].filter((item) => paramsOf(item).subtype === 'largest_with_remainder')) {
    check(task.question.includes('наибольшее'), `${task.id}: формулировка largest_with_remainder`);
  }

  const sameSeedAgain = generateM07InspectionSeries();
  check(
    JSON.stringify(sameSeedAgain.map((task) => task.id)) === JSON.stringify(series.map((task) => task.id)),
    'одинаковый seed даёт ту же серию',
  );

  return failures;
}

export function reportM07GeneratorSelfChecks(): void {
  const series = generateM07InspectionSeries();
  const failures = runM07GeneratorSelfChecks();
  console.log(formatM07InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M07 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M07 generator self-check: 30 заданий валидны, дубликатов нет.');
}
