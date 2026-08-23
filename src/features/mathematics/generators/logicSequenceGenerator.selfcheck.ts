/**
 * Проверка генератора M33.
 */
import type { Task } from '../../../types';
import {
  M33_GENERATOR_ID,
  M33_SKILL_ID,
  generateM33Series,
  generateM33Task,
  hasExplicitRuleLeak,
  isValidM33Level,
  type M33GeneratorParams,
} from './logicSequenceGenerator';

const TEST_SEED = 20273333;

export function generateM33InspectionSeries(): Task[] {
  return generateM33Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM33GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM33Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM33InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);
  let sawOdd = false;
  let sawTwo = false;

  for (const task of series) {
    const p = task.generatorParams as M33GeneratorParams;
    const d = task.difficulty as 1 | 2 | 3;
    const label = task.id;
    check(task.skillId === M33_SKILL_ID, `${label}: skill`);
    check(task.generatorId === M33_GENERATOR_ID, `${label}: gen`);
    check(isValidM33Level({ subtype: p.subtype, features: p.features }, d), `${label}: level`);
    check(task.taskType === 'singleChoice', `${label}: choice`);
    check(Number(task.correctAnswer) === p.nextValue || String(task.correctAnswer) === String(p.nextValue), `${label}: ans`);
    if (p.subtype === 'odd_one_out') sawOdd = true;
    if (p.subtype === 'two_rule_alternate') sawTwo = true;
    if (d === 1) check(p.subtype === 'add_const', `${label}: L1 subtype`);
  }

  check(sawOdd || sawTwo, 'в L3 есть two_rule или odd_one');
  for (const task of series) {
    check(!hasExplicitRuleLeak(task.question), `${task.id}: no rule leak`);
  }
  check(hasExplicitRuleLeak('В ряду чередуются умножение на 2 и прибавление 3. Продолжи'), 'NEG: leak');
  check(!hasExplicitRuleLeak('Продолжи ряд: 2, 4, 6, 8, …'), 'POS: clean');
  check(
    JSON.stringify(generateM33InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM33GeneratorSelfChecks(): void {
  const series = generateM33InspectionSeries();
  console.log(
    [
      'Тестовая серия M33:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M33GeneratorParams;
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  ${p.sequence.join(',')} → ${t.correctAnswer}`;
      }),
    ].join('\n'),
  );
  const failures = runM33GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M33 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M33 generator self-check: OK');
}
