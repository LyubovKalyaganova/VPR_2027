/**
 * Проверка генератора M15. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M15_GENERATOR_ID,
  M15_SKILL_ID,
  costFingerprint,
  generateM15Series,
  generateM15Task,
  isValidM15Level,
  type CostSubtype,
  type M15GeneratorParams,
} from './costCalculateGenerator';

const TEST_SEED = 20271515;
const PER_LEVEL = 10;
const L1_SUBTYPES: CostSubtype[] = ['total_cost'];
const L2_SUBTYPES: CostSubtype[] = ['total_cost', 'find_price', 'find_qty', 'rub_kop'];
const L3_SUBTYPES: CostSubtype[] = ['change', 'total_cost', 'mixed_cost', 'how_many'];

function paramsOf(task: Task): M15GeneratorParams {
  return task.generatorParams as M15GeneratorParams;
}

export function generateM15InspectionSeries(): Task[] {
  return generateM15Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM15InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M15 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        p.subtype,
        `${p.price}×${p.qty}`,
        `answer=${task.correctAnswer}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM15GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  try {
    generateM15Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }
  try {
    generateM15Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен выбрасывать ошибку');
  } catch {
    check(true, 'L5 отклонён');
  }

  const series = generateM15InspectionSeries();
  check(series.length === 30, `ожидалось 30, получено ${series.length}`);
  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];
  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(costFingerprint(paramsOf(task)));
  }
  check(byLevel[1].length === PER_LEVEL, 'L1: 10');
  check(byLevel[2].length === PER_LEVEL, 'L2: 10');
  check(byLevel[3].length === PER_LEVEL, 'L3: 10');
  check(new Set(fingerprints).size === fingerprints.length, 'нет дублей');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;
    for (const task of group) {
      const p = paramsOf(task);
      const label = task.id;
      check(task.skillId === M15_SKILL_ID, `${label}: skillId`);
      check(task.generatorId === M15_GENERATOR_ID, `${label}: generatorId`);
      check(task.sourceType === 'generated', `${label}: sourceType`);
      check(allowed.includes(p.subtype), `${label}: subtype`);
      check(isValidM15Level(p.features, p.subtype, difficulty), `${label}: level`);
      if (p.subtype === 'total_cost' && p.features.includes('mul_small')) {
        check(Number(task.correctAnswer) === p.price * p.qty, `${label}: mul`);
      }
      if (p.subtype === 'find_price') {
        check(Number(task.correctAnswer) === p.price, `${label}: price`);
      }
      if (p.subtype === 'find_qty') {
        check(Number(task.correctAnswer) === p.qty, `${label}: qty`);
      }
      if (difficulty < 3) {
        check(task.taskType === 'singleChoice', `${label}: choice`);
      }
      if (difficulty === 3) {
        check(task.taskType === 'numberAnswer', `${label}: number`);
        check(
          p.features.includes('change_after_purchase') ||
            p.features.includes('change') ||
            p.features.includes('two_purchases') ||
            p.features.includes('mixed_cost') ||
            p.features.includes('how_many_buy') ||
            p.features.includes('compare_cost'),
          `${label}: L3 features`,
        );
        // L3 change — только после вычисления стоимости (qty ≥ 2)
        if (p.subtype === 'change') {
          check(p.features.includes('change_after_purchase'), `${label}: change_after`);
          check(p.qty >= 2, `${label}: change qty>=2`);
        }
      }
    }
  }

  const again = generateM15InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'детерминизм seed',
  );
  return failures;
}

export function reportM15GeneratorSelfChecks(): void {
  const series = generateM15InspectionSeries();
  const failures = runM15GeneratorSelfChecks();
  console.log(formatM15InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M15 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M15 generator self-check: 30 заданий валидны, дубликатов нет.');
}
