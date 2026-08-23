/**
 * Проверка генератора M12. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M12_GENERATOR_ID,
  M12_SKILL_ID,
  generateM12Series,
  generateM12Task,
  isValidM12Level,
  kgGToGrams,
  massFingerprint,
  type M12GeneratorParams,
  type MassSubtype,
} from './massCalculateGenerator';

const TEST_SEED = 20271212;
const PER_LEVEL = 10;
const L1_SUBTYPES: MassSubtype[] = ['convert'];
const L2_SUBTYPES: MassSubtype[] = ['convert', 'compare', 'add_sub'];
const L3_SUBTYPES: MassSubtype[] = ['compound', 'add_sub'];

function paramsOf(task: Task): M12GeneratorParams {
  return task.generatorParams as M12GeneratorParams;
}

export function generateM12InspectionSeries(): Task[] {
  return generateM12Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM12InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M12 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        p.subtype,
        `${p.kg}кг ${p.g}г`,
        `answer=${task.correctAnswer}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM12GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  try {
    generateM12Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }
  try {
    generateM12Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен выбрасывать ошибку');
  } catch {
    check(true, 'L5 отклонён');
  }

  const series = generateM12InspectionSeries();
  check(series.length === 30, `ожидалось 30, получено ${series.length}`);
  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];
  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(massFingerprint(paramsOf(task)));
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
      check(task.skillId === M12_SKILL_ID, `${label}: skillId`);
      check(task.generatorId === M12_GENERATOR_ID, `${label}: generatorId`);
      check(task.sourceType === 'generated', `${label}: sourceType`);
      check(allowed.includes(p.subtype), `${label}: subtype`);
      check(isValidM12Level(p.features, difficulty), `${label}: level`);
      if (p.subtype === 'compound') {
        check(Number(task.correctAnswer) === kgGToGrams(p.kg, p.g), `${label}: compound`);
      }
      if (difficulty === 1) {
        check(!p.features.includes('compound'), `${label}: L1 no compound`);
        check(task.taskType === 'singleChoice', `${label}: L1 choice`);
      }
      if (difficulty === 2) {
        check(!p.features.includes('compound'), `${label}: L2 no compound`);
        check(task.taskType === 'singleChoice', `${label}: L2 choice`);
      }
      if (difficulty === 3) {
        check(task.taskType === 'numberAnswer', `${label}: L3 number`);
        check(
          p.features.includes('compound') || p.features.includes('add') || p.features.includes('sub'),
          `${label}: L3 features`,
        );
      }
    }
  }

  const again = generateM12InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'детерминизм seed',
  );
  return failures;
}

export function reportM12GeneratorSelfChecks(): void {
  const series = generateM12InspectionSeries();
  const failures = runM12GeneratorSelfChecks();
  console.log(formatM12InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M12 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M12 generator self-check: 30 заданий валидны, дубликатов нет.');
}
