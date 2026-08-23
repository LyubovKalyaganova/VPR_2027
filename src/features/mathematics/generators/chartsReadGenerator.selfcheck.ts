/**
 * Self-check M24 (P0): нет утечки значений столбцов.
 */
import {
  M24_GENERATOR_ID,
  M24_SKILL_ID,
  chartLeaksValues,
  generateM24Series,
  generateM24Task,
  isValidM24Level,
  type M24GeneratorParams,
} from './chartsReadGenerator';

export function runM24GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (c: boolean, m: string) => {
    if (!c) failures.push(m);
  };
  let threw = false;
  try {
    generateM24Task({ difficulty: 4, seed: 1 });
  } catch {
    threw = true;
  }
  check(threw, 'L4');
  const series = generateM24Series({ seed: 20270324, countPerLevel: 10 });
  check(series.length === 30, '30');
  for (const task of series) {
    const p = task.generatorParams as M24GeneratorParams;
    check(task.skillId === M24_SKILL_ID, 'skill');
    check(task.generatorId === M24_GENERATOR_ID, 'gen');
    check(Boolean(task.image?.startsWith('data:image/svg+xml')), 'svg');
    check(p.hasVisual === true, 'visual');
    check(!chartLeaksValues(task.question, task.image, p.bars), `leak values`);
    check(!/→ значение|дел\. →/i.test(task.question + (task.image ?? '')), 'no value annotation');
    check(isValidM24Level(task.difficulty as 1 | 2 | 3, p.subtype, p.bars, p.scaleStep), 'level');
    if (task.difficulty === 3) {
      check(p.subtype === 'between_marks', 'L3 between');
      check(p.bars.some((b) => b.value % p.scaleStep !== 0), 'L3 off-mark');
    }
  }
  return failures;
}

export function reportM24GeneratorSelfChecks(): void {
  const f = runM24GeneratorSelfChecks();
  if (f.length) {
    console.error('M24 FAILED:\n' + f.map((x) => ` - ${x}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('M24 generator self-check: OK');
}
