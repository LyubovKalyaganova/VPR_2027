/**
 * Self-check M21: SVG симметрия, YES/NO баланс.
 */
import {
  M21_GENERATOR_ID,
  M21_SKILL_ID,
  generateM21Series,
  generateM21Task,
  isValidM21Level,
  type M21GeneratorParams,
} from './symmetryIdentifyGenerator';

export function runM21GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (c: boolean, m: string) => {
    if (!c) failures.push(m);
  };
  let threw = false;
  try {
    generateM21Task({ difficulty: 4, seed: 1 });
  } catch {
    threw = true;
  }
  check(threw, 'L4');
  const series = generateM21Series({ seed: 20270321, countPerLevel: 10 });
  check(series.length === 30, '30');
  const fps = new Set(
    series.map((t) => {
      const p = t.generatorParams as M21GeneratorParams;
      return `${p.subtype}|${p.figureKey}|${p.correctLabel}|${p.promptKey}|${p.seed}`;
    }),
  );
  check(fps.size === 30, 'dupes');
  let yes = 0;
  let no = 0;
  const l1Answers = new Set<string>();
  for (const task of series) {
    const p = task.generatorParams as M21GeneratorParams;
    check(task.skillId === M21_SKILL_ID, 'skill');
    check(task.generatorId === M21_GENERATOR_ID, 'gen');
    check(task.taskType === 'imageTask', 'imageTask');
    check(Boolean(task.image?.startsWith('data:image/svg+xml')), 'svg');
    check(!/бабочка с одинаковыми крыльями|почти равнобедренный/i.test(task.question), 'no verbal giveaway');
    check(isValidM21Level(p, task.difficulty as 1 | 2 | 3), 'level');
    if (p.yesNo === 'yes') yes += 1;
    if (p.yesNo === 'no') no += 1;
    if (task.difficulty === 1) l1Answers.add(String(task.correctAnswer));
  }
  check(yes >= 5 && no >= 5, `YES/NO balance yes=${yes} no=${no}`);
  check(l1Answers.size >= 2, `L1 not fixed answer (${[...l1Answers].join(',')})`);
  return failures;
}

export function reportM21GeneratorSelfChecks(): void {
  const f = runM21GeneratorSelfChecks();
  if (f.length) {
    console.error('M21 FAILED:\n' + f.map((x) => ` - ${x}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('M21 generator self-check: OK');
}
