/**
 * Self-check M18 (P0): SVG сетка, нет echo ответа в question.
 */
import {
  M18_GENERATOR_ID,
  M18_SKILL_ID,
  generateM18Series,
  generateM18Task,
  gridFingerprint,
  isValidM18Level,
  questionLeaksAnswer,
  type M18GeneratorParams,
} from './gridReadGenerator';

export function runM18GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (c: boolean, m: string) => {
    if (!c) failures.push(m);
  };
  let threw = false;
  try {
    generateM18Task({ difficulty: 4, seed: 1 });
  } catch {
    threw = true;
  }
  check(threw, 'L4');
  const series = generateM18Series({ seed: 20270318, countPerLevel: 10 });
  check(series.length === 30, '30');
  check(new Set(series.map((t) => gridFingerprint(t.generatorParams as M18GeneratorParams))).size === 30, 'dupes');
  for (const task of series) {
    const p = task.generatorParams as M18GeneratorParams;
    check(task.skillId === M18_SKILL_ID, 'skill');
    check(task.generatorId === M18_GENERATOR_ID, 'gen');
    check(Boolean(task.image?.startsWith('data:image/svg+xml')), 'svg');
    check(!questionLeaksAnswer(task.question, p.answer), `echo ${task.question} → ${p.answer}`);
    check(!/проходит через \d+ клет/i.test(task.question), 'no length in prose');
    check(isValidM18Level(p, task.difficulty as 1 | 2 | 3), 'level');
    check(Number(task.correctAnswer) === p.answer, 'answer');
  }
  return failures;
}

export function reportM18GeneratorSelfChecks(): void {
  const f = runM18GeneratorSelfChecks();
  if (f.length) {
    console.error('M18 FAILED:\n' + f.map((x) => ` - ${x}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('M18 generator self-check: OK');
}
