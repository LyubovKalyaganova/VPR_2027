/**
 * Проверка генератора M14. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M14_GENERATOR_ID,
  M14_SKILL_ID,
  areaFingerprint,
  dm2ToCm2,
  generateM14Series,
  generateM14Task,
  isValidM14Level,
  looksLikeFigureArea,
  m2ToCm2,
  type M14GeneratorParams,
} from './areaConvertGenerator';

const TEST_SEED = 20271414;
const PER_LEVEL = 10;
const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

function paramsOf(task: Task): M14GeneratorParams {
  return task.generatorParams as M14GeneratorParams;
}

export function generateM14InspectionSeries(): Task[] {
  return generateM14Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM14InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M14 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        p.subtype,
        p.promptKey ?? '',
        `answer=${task.correctAnswer}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM14GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  try {
    generateM14Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }

  check(dm2ToCm2(3) === 300, 'coeff 100 dm2');
  check(m2ToCm2(2) === 20000, 'coeff 10000 m2');
  check(looksLikeFigureArea('Площадь фотографии 10×15 см'), 'NEG: M20-like');
  check(!looksLikeFigureArea('Площадь небольшой фотографии удобнее указать в …'), 'POS: no sizes');
  check(!isValidM14Level(['cm2'], 'convert', 1), 'NEG: L1 convert');
  check(isValidM14Level(['cm2'], 'choose_unit', 1), 'POS: L1 choose');
  check(isValidM14Level(['coeff_100'], 'relation', 1), 'POS: L1 relation');

  const series = generateM14InspectionSeries();
  check(series.length === 30, `ожидалось 30, получено ${series.length}`);
  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];
  let chooseCount = 0;
  let relationCount = 0;
  let has10000 = false;
  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(areaFingerprint(paramsOf(task)));
    const p = paramsOf(task);
    if (p.subtype === 'choose_unit') chooseCount += 1;
    if (p.subtype === 'relation') relationCount += 1;
    if (p.features.includes('coeff_10000')) has10000 = true;
  }
  check(byLevel[1].length === PER_LEVEL, 'L1: 10');
  check(byLevel[2].length === PER_LEVEL, 'L2: 10');
  check(byLevel[3].length === PER_LEVEL, 'L3: 10');
  check(new Set(fingerprints).size === fingerprints.length, 'нет дублей');
  check(relationCount >= 4, `L1 relation not rare (${relationCount})`);
  check(chooseCount <= 6, `choose_unit not dominant (${chooseCount})`);
  check(has10000, 'coeff_10000 used in series');

  for (const task of series) {
    const p = paramsOf(task);
    const label = task.id;
    check(task.skillId === M14_SKILL_ID, `${label}: skillId`);
    check(task.generatorId === M14_GENERATOR_ID, `${label}: generatorId`);
    check(isValidM14Level(p.features, p.subtype, task.difficulty as 1 | 2 | 3), `${label}: level`);
    check(!looksLikeFigureArea(task.question), `${label}: not M20`);
    check(!/прямоугольник|стороны|длина.*ширин/i.test(task.question), `${label}: no figure formula`);
  }

  for (const seed of AUDIT_SEEDS) {
    const s = generateM14Series({ seed, countPerLevel: 10 });
    check(s.length === 30, `seed ${seed}: 30`);
    check(new Set(s.map((t) => areaFingerprint(paramsOf(t)))).size === 30, `seed ${seed}: unique`);
  }

  const again = generateM14InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'детерминизм seed',
  );
  return failures;
}

export function reportM14GeneratorSelfChecks(): void {
  const series = generateM14InspectionSeries();
  const failures = runM14GeneratorSelfChecks();
  console.log(formatM14InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M14 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M14 generator self-check: 30 заданий валидны, дубликатов нет.');
}
