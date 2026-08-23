/**
 * Проверка генератора M09. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M09_GENERATOR_ID,
  M09_SKILL_ID,
  compoundToSmaller,
  convertLargerToSmaller,
  convertSmallerToLarger,
  generateM09Series,
  generateM09Task,
  isValidM09Level,
  unitsFingerprint,
  type M09GeneratorParams,
  type UnitsSubtype,
} from './unitsConvertGenerator';

const TEST_SEED = 20270909;
const PER_LEVEL = 10;
const L1_SUBTYPES: UnitsSubtype[] = ['to_smaller', 'to_larger', 'choose_unit'];
const L2_SUBTYPES: UnitsSubtype[] = ['to_smaller', 'to_larger', 'compare'];
const L3_SUBTYPES: UnitsSubtype[] = ['to_smaller', 'compare'];

function paramsOf(task: Task): M09GeneratorParams {
  return task.generatorParams as M09GeneratorParams;
}

/** Независимый коэффициент по паре единиц. */
function independentCoeff(fromUnit: string, toUnit: string): number | null {
  const key = `${fromUnit}->${toUnit}`;
  const map: Record<string, number> = {
    'см->мм': 10,
    'мм->см': 10,
    'дм->см': 10,
    'см->дм': 10,
    'м->дм': 10,
    'дм->м': 10,
    'м->см': 100,
    'см->м': 100,
    'км->м': 1000,
    'м->км': 1000,
    'кг->г': 1000,
    'г->кг': 1000,
    'ч->мин': 60,
    'мин->ч': 60,
  };
  return map[key] ?? null;
}

function independentValue(params: M09GeneratorParams): number | string | null {
  if (params.subtype === 'choose_unit') {
    return params.toUnit;
  }
  if (params.subtype === 'compare') {
    return null; // ответ текстовый; проверяем согласованность частей
  }
  if (params.compoundParts && params.compoundParts.length === 2) {
    const [major, minor] = params.compoundParts;
    const coeff = independentCoeff(major.unit, minor.unit);
    if (!coeff || !major || !minor) {
      return null;
    }
    return compoundToSmaller(major.value, minor.value, coeff);
  }
  const coeff = independentCoeff(params.fromUnit, params.toUnit);
  if (!coeff) {
    return null;
  }
  if (params.subtype === 'to_smaller') {
    return convertLargerToSmaller(params.valueFrom, coeff);
  }
  return convertSmallerToLarger(params.valueFrom, coeff);
}

export function generateM09InspectionSeries(): Task[] {
  return generateM09Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM09InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M09 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const params = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        params.subtype,
        `${params.valueFrom} ${params.fromUnit}→${params.valueTo} ${params.toUnit}`,
        params.features.join(',') || '—',
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM09GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  try {
    generateM09Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }
  try {
    generateM09Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен выбрасывать ошибку');
  } catch {
    check(true, 'L5 отклонён');
  }

  const series = generateM09InspectionSeries();
  check(series.length === 30, `ожидалось 30 заданий, получено ${series.length}`);

  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];

  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(unitsFingerprint(paramsOf(task)));
  }

  check(byLevel[1].length === PER_LEVEL, 'L1: 10 заданий');
  check(byLevel[2].length === PER_LEVEL, 'L2: 10 заданий');
  check(byLevel[3].length === PER_LEVEL, 'L3: 10 заданий');
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дублей');
  check(new Set(series.map((t) => t.id)).size === series.length, 'id уникальны');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const label = `${task.id}`;
      check(task.skillId === M09_SKILL_ID, `${label}: skillId`);
      check(task.generatorId === M09_GENERATOR_ID, `${label}: generatorId`);
      check(task.sourceType === 'generated', `${label}: sourceType`);
      check(task.vprVersion === 2027, `${label}: vprVersion`);
      check(allowed.includes(params.subtype), `${label}: subtype ${params.subtype}`);
      check(isValidM09Level(params, difficulty), `${label}: isValidM09Level L${difficulty}`);
      if (difficulty === 1) {
        check(!isValidM09Level(params, 2), `${label}: L1 не как L2`);
        check(!isValidM09Level(params, 3), `${label}: L1 не как L3`);
      }
      if (difficulty === 2) {
        check(!isValidM09Level(params, 1), `${label}: L2 не как L1`);
        check(!isValidM09Level(params, 3), `${label}: L2 не как L3`);
      }
      if (difficulty === 3) {
        check(!isValidM09Level(params, 1), `${label}: L3 не как L1`);
        check(!isValidM09Level(params, 2), `${label}: L3 не как L2`);
      }

      if (difficulty === 1) {
        check(task.taskType === 'singleChoice', `${label}: L1 singleChoice`);
        check(!params.features.includes('compound'), `${label}: L1 без составных`);
      }
      if (difficulty === 2) {
        check(task.taskType === 'singleChoice', `${label}: L2 singleChoice`);
        check(!params.features.includes('compound'), `${label}: L2 без составных`);
      }
      if (difficulty === 3) {
        check(params.features.includes('compound'), `${label}: L3 составные`);
        if (params.subtype === 'to_smaller') {
          check(task.taskType === 'numberAnswer', `${label}: L3 to_smaller numberAnswer`);
        }
      }

      if (params.subtype !== 'compare' && params.subtype !== 'choose_unit') {
        const computed = independentValue(params);
        check(computed !== null, `${label}: независимый пересчёт`);
        check(
          Number(task.correctAnswer) === Number(computed) || String(task.correctAnswer) === String(computed),
          `${label}: ответ ${task.correctAnswer} ≠ ${computed}`,
        );
      }

      if (params.subtype === 'choose_unit') {
        check(String(task.correctAnswer) === params.toUnit, `${label}: choose_unit ответ`);
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта`);
        check(new Set(answers).size === 4, `${label}: уникальные варианты`);
        check(
          answers.filter((item) => item === String(task.correctAnswer)).length === 1,
          `${label}: ровно один правильный`,
        );
      }
    }
  }

  const again = generateM09InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'одинаковый seed даёт ту же серию',
  );

  const massConvert = series.filter(
    (t) =>
      paramsOf(t).quantityFamily === 'mass' &&
      (paramsOf(t).subtype === 'to_smaller' || paramsOf(t).subtype === 'to_larger'),
  ).length;
  check(massConvert <= 4, `масса-перевод не доминирует (${massConvert}/30)`);
  const chooseOrTimeOrCompare = series.filter((t) => {
    const p = paramsOf(t);
    return p.subtype === 'choose_unit' || p.subtype === 'compare' || p.quantityFamily === 'time';
  }).length;
  check(chooseOrTimeOrCompare >= 10, `общий навык units представлен (${chooseOrTimeOrCompare}/30)`);

  return failures;
}

export function reportM09GeneratorSelfChecks(): void {
  const series = generateM09InspectionSeries();
  const failures = runM09GeneratorSelfChecks();
  console.log(formatM09InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M09 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M09 generator self-check: 30 заданий валидны, дубликатов нет.');
}
