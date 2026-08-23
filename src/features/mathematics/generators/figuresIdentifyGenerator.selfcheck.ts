/**
 * Self-check M17: плоские + пространственные + схемы (ВПР №10).
 */
import {
  M17_GENERATOR_ID,
  M17_SKILL_ID,
  figuresFingerprint,
  generateM17Series,
  generateM17Task,
  isValidM17Level,
  type M17GeneratorParams,
} from './figuresIdentifyGenerator';

const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

export function runM17GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (c: boolean, m: string) => {
    if (!c) failures.push(m);
  };
  let threw = false;
  try {
    generateM17Task({ difficulty: 5, seed: 1 });
  } catch {
    threw = true;
  }
  check(threw, 'L5 throw');
  const series = generateM17Series({ seed: 20270317, countPerLevel: 10 });
  check(series.length === 30, 'series 30');
  check(new Set(series.map((t) => figuresFingerprint(t.generatorParams as M17GeneratorParams))).size === 30, 'dupes');

  const subtypes = new Set<string>();
  let solids = 0;
  let spatial = 0;
  for (const task of series) {
    const p = task.generatorParams as M17GeneratorParams;
    subtypes.add(p.subtype);
    if (p.subtype === 'solid_name') solids += 1;
    if (p.subtype === 'spatial_read' || p.subtype === 'choose_scheme') spatial += 1;
    check(task.skillId === M17_SKILL_ID, 'skill');
    check(task.generatorId === M17_GENERATOR_ID, 'gen');
    check(task.taskType === 'imageTask', 'imageTask');
    check(Boolean(task.image?.startsWith('data:image/svg+xml')), 'svg');
    check(p.hasVisual === true, 'visual');
    check(isValidM17Level(p, task.difficulty as 1 | 2 | 3), 'level');
    check(String(task.correctAnswer) === p.correctName, 'answer');
    check((task.answers ?? []).includes(String(task.correctAnswer)), 'in options');
  }
  check(solids >= 2, `solids ${solids}`);
  check(spatial >= 2, `spatial ${spatial}`);

  for (const seed of AUDIT_SEEDS) {
    const s = generateM17Series({ seed, countPerLevel: 10 });
    check(s.length === 30, `seed ${seed}`);
    check(s.some((t) => (t.generatorParams as M17GeneratorParams).subtype === 'solid_name'), `solid ${seed}`);
    check(
      s.some((t) => {
        const st = (t.generatorParams as M17GeneratorParams).subtype;
        return st === 'spatial_read' || st === 'choose_scheme';
      }),
      `spatial ${seed}`,
    );
  }
  return failures;
}

export function reportM17GeneratorSelfChecks(): void {
  const f = runM17GeneratorSelfChecks();
  if (f.length) {
    console.error('M17 FAILED:\n' + f.map((x) => ` - ${x}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('M17 generator self-check: OK');
}
