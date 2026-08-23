/**
 * Проверка генератора M05. Не импортируется приложением и не попадает в production-банк.
 */
import type { Task } from '../../../types';
import {
  M05_GENERATOR_ID,
  M05_SKILL_ID,
  countOneDigitCarries,
  generateM05Series,
  generateM05Task,
  isSubstantialTwoDigitCase,
  isSubstantialZeroCase,
  isValidM05Level,
  multiplicationFingerprint,
  multiplyFactors,
  type M05GeneratorParams,
  type MultiplicationSubtype,
} from './multiplicationGenerator';

const TEST_SEED = 20270505;
const PER_LEVEL = 10;

const L1_SUBTYPES: MultiplicationSubtype[] = ['table', 'multiply_by_10', 'multiply_by_100', 'multiply_by_1000'];
const L2_SUBTYPES: MultiplicationSubtype[] = ['one_digit_multiplier'];
const L3_SUBTYPES: MultiplicationSubtype[] = ['two_digit_multiplier', 'with_zeros'];

function paramsOf(task: Task): M05GeneratorParams {
  return task.generatorParams as M05GeneratorParams;
}

function recordedProduct(task: Task): number {
  return typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
}

export function generateM05InspectionSeries(): Task[] {
  return generateM05Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM05InspectionReport(tasks: readonly Task[]): string {
  const lines = tasks.map((task, index) => {
    const params = paramsOf(task);
    return [
      String(index + 1).padStart(2, '0'),
      `L${task.difficulty}`,
      task.taskType,
      `${params.factors[0]} × ${params.factors[1]}`,
      `= ${recordedProduct(task)}`,
      params.subtype,
      `carries=${params.carryCount}`,
      `features=${params.features.join(',') || '—'}`,
    ].join('  ');
  });
  return ['Тестовая серия M05 (не входит в production-банк):', ...lines].join('\n');
}

export function runM05GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  let level4Threw = false;
  try {
    generateM05Task({ difficulty: 4, seed: 1 });
  } catch {
    level4Threw = true;
  }
  check(level4Threw, 'уровни 4 не генерируются автоматически');

  let level5Threw = false;
  try {
    generateM05Task({ difficulty: 5, seed: 1 });
  } catch {
    level5Threw = true;
  }
  check(level5Threw, 'уровни 5 не генерируются автоматически');

  const sameA = generateM05Task({ difficulty: 1, subtype: 'table', seed: 4242 });
  const sameB = generateM05Task({ difficulty: 1, subtype: 'table', seed: 4242 });
  check(sameA.id === sameB.id, 'одинаковые seed + difficulty + subtype дают одно задание');

  const series = generateM05InspectionSeries();
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
    multiplicationFingerprint(paramsOf(task).factors[0], paramsOf(task).factors[1]),
  );
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дубликатов (3×25 и 25×3 — один отпечаток)');
  check(new Set(series.map((task) => task.id)).size === series.length, 'id заданий уникальны');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const [a, b] = params.factors;
      const computed = multiplyFactors(a, b);
      const label = `${task.id} (${a}×${b})`;

      check(task.skillId === M05_SKILL_ID, `${label}: skillId канонический`);
      check(task.skillId !== 'M05', `${label}: краткий код не подменяет skillId`);
      check(task.difficulty === difficulty, `${label}: difficulty`);
      check(task.subject === 'mathematics', `${label}: subject`);
      check(task.sourceType === 'generated', `${label}: sourceType generated`);
      check(task.generatorId === M05_GENERATOR_ID, `${label}: generatorId`);
      check(task.vprVersion === 2027, `${label}: vprVersion`);
      check(computed === recordedProduct(task), `${label}: ответ равен произведению`);
      check(params.product === computed, `${label}: product пересчитан`);
      check(isValidM05Level(a, b, difficulty), `${label}: структура уровня ${difficulty}`);
      check(allowed.includes(params.subtype), `${label}: подтип ${params.subtype} разрешён на L${difficulty}`);
      check(task.question.includes('×'), `${label}: операция умножения`);
      check(!task.question.includes('+') && !task.question.includes('−'), `${label}: это не сложение/вычитание`);

      if (difficulty === 1) {
        const table = a >= 2 && a <= 9 && b >= 2 && b <= 9;
        const byTen = a === 10 || b === 10;
        check(table || byTen, `${label}: L1 — таблица или ×10`);
        check(!isValidM05Level(a, b, 2), `${label}: L1 не проходит как L2`);
        check(!isValidM05Level(a, b, 3), `${label}: L1 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L1 → singleChoice`);
      }

      if (difficulty === 2) {
        const oneDigit = [a, b].find((value) => value >= 2 && value <= 9);
        const other = oneDigit === a ? b : a;
        check(oneDigit !== undefined, `${label}: L2 — есть однозначный множитель 2–9`);
        check(String(other).length >= 3, `${label}: L2 — множимое не короче 3 цифр`);
        check(String(other).length <= 4, `${label}: L2 — множимое не длиннее 4 цифр`);
        check(String(other).length !== 2, `${label}: L2 — двузначное множимое запрещено`);
        check(!String(a).includes('0') && !String(b).includes('0'), `${label}: L2 — без особых нулей`);
        if (oneDigit !== undefined) {
          const carries = countOneDigitCarries(other, oneDigit);
          check(carries >= 1, `${label}: L2 — есть перенос (факт: ${carries})`);
          check(params.carryCount === carries, `${label}: carryCount совпадает с независимым пересчётом`);
        }
        check(!isValidM05Level(a, b, 1), `${label}: L2 не проходит как L1`);
        check(!isValidM05Level(a, b, 3), `${label}: L2 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L2 → singleChoice`);
      }

      if (difficulty === 3) {
        const substantial =
          isSubstantialTwoDigitCase(a, b) || isSubstantialZeroCase(a, b);
        check(substantial, `${label}: L3 — содержательный двузначный или содержательный нуль`);

        const twoDigit = [a, b].find((value) => String(value).length === 2 && value >= 14 && !String(value).includes('0'));
        const partner = twoDigit === a ? b : twoDigit === b ? a : null;
        if (twoDigit !== undefined && partner !== null && String(partner).length === 3) {
          check(params.carryCount >= 3, `${label}: 3×2 → carryCount >= 3 (факт ${params.carryCount})`);
        }
        if (twoDigit !== undefined && partner !== null && String(partner).length === 4) {
          check(params.carryCount >= 2, `${label}: 4×2 → carryCount >= 2 (факт ${params.carryCount})`);
        }

        const oneDigit = [a, b].find((value) => value >= 3 && value <= 9);
        const multi = oneDigit === a ? b : oneDigit === b ? a : null;
        if (
          oneDigit !== undefined &&
          multi !== null &&
          String(multi).includes('0') &&
          (String(multi).length === 3 || String(multi).length === 4)
        ) {
          check(
            countOneDigitCarries(multi, oneDigit) >= 3,
            `${label}: zero + однозначный → carryCount >= 3`,
          );
        }

        check(
          !(String(a).length <= 3 && String(b).length === 1 && String(a).includes('0') && countOneDigitCarries(a, b) < 3) &&
            !(String(b).length <= 3 && String(a).length === 1 && String(b).includes('0') && countOneDigitCarries(b, a) < 3),
          `${label}: L3 не сводится к лёгкому ×однозначное с нулём`,
        );
        check(![a, b].includes(40) || Math.max(a, b) >= 100, `${label}: нет лёгких 21×40`);
        check(!isValidM05Level(a, b, 1), `${label}: L3 не проходит как L1`);
        check(!isValidM05Level(a, b, 2), `${label}: L3 не проходит как L2`);
        check(task.taskType === 'numberAnswer', `${label}: L3 → numberAnswer`);
        check(task.correctAnswer === computed, `${label}: correctAnswer число произведения`);
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта`);
        check(new Set(answers).size === 4, `${label}: варианты уникальны`);
        check(answers.every((item) => /^\d+$/.test(item)), `${label}: варианты числовые`);
        check(answers.filter((item) => item === String(computed)).length === 1, `${label}: ровно один правильный`);
        check(
          answers.filter((item) => item !== String(computed)).every((item) => Number(item) !== computed),
          `${label}: неправильные варианты действительно неправильные`,
        );
        for (const wrong of answers.filter((item) => item !== String(computed))) {
          const value = Number(wrong);
          check(
            Math.abs(String(value).length - String(computed).length) <= 1,
            `${label}: дистрактор ${wrong} правдоподобной разрядности`,
          );
          const isTable = a <= 9 && b <= 9;
          const isPlace = a === 10 || b === 10 || a === 100 || b === 100 || a === 1000 || b === 1000;
          if (isPlace) {
            const lost =
              (computed % 10 === 0 && value === computed / 10) ||
              (computed % 100 === 0 && value === computed / 100) ||
              (computed % 1000 === 0 && value === computed / 1000);
            const extra = value === computed * 10 || value === computed * 100;
            const near =
              String(value).length === String(computed).length &&
              value >= Math.floor(computed * 0.85) &&
              value <= Math.ceil(computed * 1.15);
            check(
              lost || extra || near,
              `${label}: place-дистрактор ${wrong} — модель ×10/×100 (не артефакт вроде 60 для 240)`,
            );
          } else if (!isTable) {
            check(value >= Math.floor(computed * 0.45), `${label}: дистрактор ${wrong} не обрубок ответа ${computed}`);
          }
        }
      }
    }
  }

  // Отрицательные кейсы нового контракта L3.
  check(!isValidM05Level(427, 22, 3), 'отклонить 427×22 как L3 при недостаточных переносах');
  check(!isSubstantialTwoDigitCase(427, 22), '427×22 не substantial two-digit');
  check(!isValidM05Level(206, 2, 3), 'отклонить 206×2 как L3');
  check(!isSubstantialZeroCase(206, 2), '206×2 не substantial zero');
  check(!isValidM05Level(108, 8, 3), 'отклонить 108×8 как L3');
  check(!isSubstantialZeroCase(108, 8), '108×8 не substantial zero');
  check(!isValidM05Level(709, 2, 3), 'отклонить 709×2 как L3');
  check(!isSubstantialZeroCase(709, 2), '709×2 не substantial zero');
  check(!isValidM05Level(1707, 4, 3) || countOneDigitCarries(1707, 4) >= 3, '1707×4 в L3 только при ≥3 переносах');

  const sameSeedAgain = generateM05InspectionSeries();
  check(
    JSON.stringify(sameSeedAgain.map((task) => task.id)) === JSON.stringify(series.map((task) => task.id)),
    'одинаковый seed даёт ту же серию',
  );

  return failures;
}

export function reportM05GeneratorSelfChecks(): void {
  const series = generateM05InspectionSeries();
  const failures = runM05GeneratorSelfChecks();
  console.log(formatM05InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M05 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M05 generator self-check: 30 заданий валидны, дубликатов нет.');
}
