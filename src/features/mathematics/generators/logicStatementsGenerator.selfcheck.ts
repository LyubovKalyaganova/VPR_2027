/**
 * Проверка генератора M34.
 */
import type { Task } from '../../../types';
import {
  M34_GENERATOR_ID,
  M34_SKILL_ID,
  generateM34Series,
  generateM34Task,
  isValidM34Level,
  type M34GeneratorParams,
} from './logicStatementsGenerator';

const TEST_SEED = 20273434;

export function generateM34InspectionSeries(): Task[] {
  return generateM34Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM34GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM34Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM34InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);

  for (const task of series) {
    const p = task.generatorParams as M34GeneratorParams;
    const d = task.difficulty as 1 | 2 | 3;
    const label = task.id;
    check(task.skillId === M34_SKILL_ID, `${label}: skill`);
    check(task.generatorId === M34_GENERATOR_ID, `${label}: gen`);
    check(task.taskType === 'singleChoice', `${label}: всегда singleChoice`);
    check(isValidM34Level({ subtype: p.subtype, features: p.features }, d), `${label}: level`);
    check(String(task.correctAnswer) === p.trueStatement, `${label}: ans`);
    check((task.answers ?? []).length === 4, `${label}: 4 варианта`);
    check(p.falseStatements.every((s) => s !== p.trueStatement), `${label}: ложные ≠ истине`);
    if (d === 1) check(p.subtype === 'one_cell', `${label}: L1`);
    if (d === 2) check(p.subtype === 'compare_two', `${label}: L2`);
    if (d === 3) check(p.subtype === 'and_or', `${label}: L3`);
  }

  check(
    JSON.stringify(generateM34InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM34GeneratorSelfChecks(): void {
  const series = generateM34InspectionSeries();
  console.log(
    [
      'Тестовая серия M34:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M34GeneratorParams;
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${String(t.correctAnswer).slice(0, 40)}`;
      }),
    ].join('\n'),
  );
  const failures = runM34GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M34 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M34 generator self-check: OK');
}
