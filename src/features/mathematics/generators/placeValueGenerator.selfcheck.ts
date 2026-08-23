/**
 * Self-check M01: разрядный состав.
 */
import {
  M01_GENERATOR_ID,
  M01_SKILL_ID,
  fingerprintM01,
  generateM01Series,
  generateM01Task,
  isValidM01Level,
  type M01GeneratorParams,
} from './placeValueGenerator';

const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

export function runM01GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM01Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM01Series({ seed: 20270101, countPerLevel: 10 });
  check(series.length === 30, `30 got ${series.length}`);
  check(new Set(series.map(fingerprintM01)).size === 30, 'fingerprints');

  for (const task of series) {
    const p = task.generatorParams as M01GeneratorParams;
    check(task.skillId === M01_SKILL_ID, 'skill');
    check(task.generatorId === M01_GENERATOR_ID, 'gen');
    check(isValidM01Level(p, task.difficulty as 1 | 2 | 3), `level ${task.id}`);
    check(String(task.correctAnswer) === String(p.answer), 'answer');
    check(!/ответ\s*:|→\s*\d/i.test(task.question), 'no leak meta');
    if (task.difficulty === 1) check(p.subtype === 'digit_value', 'L1 subtype');
    if (task.difficulty === 3) {
      check(String(p.number).includes('0'), 'L3 zeros');
    }
  }

  for (const seed of AUDIT_SEEDS) {
    check(generateM01Series({ seed, countPerLevel: 10 }).length === 30, `seed ${seed}`);
  }

  check(
    JSON.stringify(generateM01Series({ seed: 20270101, countPerLevel: 10 }).map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM01GeneratorSelfChecks(): void {
  const failures = runM01GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M01 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M01 generator self-check: OK');
}
