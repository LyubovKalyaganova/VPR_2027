/**
 * Проверка генератора M13. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M13_GENERATOR_ID,
  M13_SKILL_ID,
  generateM13Series,
  generateM13Task,
  isValidM13Level,
  lengthFingerprint,
  type LengthSubtype,
  type M13GeneratorParams,
} from './lengthCalculateGenerator';

const TEST_SEED = 20271313;
const PER_LEVEL = 10;
const L1_SUBTYPES: LengthSubtype[] = ['convert'];
const L2_SUBTYPES: LengthSubtype[] = ['convert', 'compare', 'add_sub'];
const L3_SUBTYPES: LengthSubtype[] = ['compound', 'add_sub'];

function paramsOf(task: Task): M13GeneratorParams {
  return task.generatorParams as M13GeneratorParams;
}

export function generateM13InspectionSeries(): Task[] {
  return generateM13Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM13InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M13 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        p.subtype,
        p.label ?? '',
        `answer=${task.correctAnswer}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM13GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  try {
    generateM13Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }
  try {
    generateM13Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен выбрасывать ошибку');
  } catch {
    check(true, 'L5 отклонён');
  }

  const series = generateM13InspectionSeries();
  check(series.length === 30, `ожидалось 30, получено ${series.length}`);
  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];
  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(lengthFingerprint(paramsOf(task)));
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
      check(task.skillId === M13_SKILL_ID, `${label}: skillId`);
      check(task.generatorId === M13_GENERATOR_ID, `${label}: generatorId`);
      check(task.sourceType === 'generated', `${label}: sourceType`);
      check(allowed.includes(p.subtype), `${label}: subtype`);
      check(isValidM13Level(p.features, difficulty), `${label}: level`);
      check(task.correctAnswer !== undefined && task.correctAnswer !== null, `${label}: answer`);
      if (difficulty === 1) {
        check(p.features.includes('cm_mm') || p.features.includes('m_cm'), `${label}: L1 features`);
        check(task.taskType === 'singleChoice', `${label}: L1 choice`);
      }
      if (difficulty === 2) {
        check(!p.features.includes('three_units'), `${label}: L2 no three units`);
        check(task.taskType === 'singleChoice', `${label}: L2 choice`);
      }
      if (difficulty === 3) {
        check(
          p.features.includes('compound') || p.features.includes('three_units'),
          `${label}: L3 compound`,
        );
        check(task.taskType === 'numberAnswer', `${label}: L3 number`);
      }
    }
  }

  const again = generateM13InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'детерминизм seed',
  );
  return failures;
}

export function reportM13GeneratorSelfChecks(): void {
  const series = generateM13InspectionSeries();
  const failures = runM13GeneratorSelfChecks();
  console.log(formatM13InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M13 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M13 generator self-check: 30 заданий валидны, дубликатов нет.');
}
