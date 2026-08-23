/**
 * Self-check M02: сравнение чисел.
 */
import {
  M02_GENERATOR_ID,
  M02_SKILL_ID,
  fingerprintM02,
  generateM02Series,
  generateM02Task,
  isValidM02Level,
  type M02GeneratorParams,
} from './numberCompareGenerator';

const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

export function runM02GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM02Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM02Series({ seed: 20270202, countPerLevel: 10 });
  check(series.length === 30, `30 got ${series.length}`);
  check(new Set(series.map(fingerprintM02)).size === 30, 'fingerprints');

  for (const task of series) {
    const p = task.generatorParams as M02GeneratorParams;
    check(task.skillId === M02_SKILL_ID, 'skill');
    check(task.generatorId === M02_GENERATOR_ID, 'gen');
    check(isValidM02Level(p, task.difficulty as 1 | 2 | 3), `level ${task.id}`);
    check(String(task.correctAnswer) === p.answer, 'answer');
    check(task.taskType === 'singleChoice', 'choice');
    check((task.answers ?? []).includes(p.answer), 'in options');
    check(!/на сколько|во сколько раз/i.test(task.question), 'not M27');
  }

  for (const seed of AUDIT_SEEDS) {
    check(generateM02Series({ seed, countPerLevel: 10 }).length === 30, `seed ${seed}`);
  }

  check(
    JSON.stringify(generateM02Series({ seed: 20270202, countPerLevel: 10 }).map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM02GeneratorSelfChecks(): void {
  const failures = runM02GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M02 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M02 generator self-check: OK');
}
