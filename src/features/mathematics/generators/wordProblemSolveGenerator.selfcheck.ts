/**
 * Проверка генератора M29.
 */
import type { Task } from '../../../types';
import {
  M29_GENERATOR_ID,
  M29_SKILL_ID,
  generateM29Series,
  generateM29Task,
  isValidM29Level,
  type M29GeneratorParams,
  type SolveSubtype,
} from './wordProblemSolveGenerator';

const TEST_SEED = 20272929;

export function generateM29InspectionSeries(): Task[] {
  return generateM29Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM29GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM29Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM29InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);
  const seen = new Set<SolveSubtype>();
  let solutions = 0;
  let shares = 0;

  for (const task of series) {
    const p = task.generatorParams as M29GeneratorParams;
    seen.add(p.subtype);
    if (p.subtype === 'choose_solution') solutions += 1;
    if (p.plot === 'share') shares += 1;
    check(task.skillId === M29_SKILL_ID, `${task.id}: skill`);
    check(task.generatorId === M29_GENERATOR_ID, `${task.id}: gen`);
    check(isValidM29Level(task.difficulty as 1 | 2 | 3, p.subtype, p.steps), `${task.id}: level`);
    check(!/км\/ч|ехал со скоростью|проехал \d+ км/i.test(task.question), `${task.id}: не движение`);
    check(!/руб|цена|стоим|сдач|купил|заплат|покуп/i.test(task.question), `${task.id}: не деньги`);
    check(!/это не нужно|не используй|лишнее число|обрати внимание/i.test(task.question), `${task.id}: no meta`);
    if (p.subtype === 'choose_solution') {
      check(task.taskType === 'singleChoice', `${task.id}: solution choice`);
      check((task.answers ?? []).includes(String(task.correctAnswer)), `${task.id}: in opts`);
      check(
        /Что нужно сделать первым|Что сделать дальше|Где ошибка|последовательность действий верная/i.test(
          task.question,
        ),
        `${task.id}: reasoning prompt`,
      );
      check(
        !!p.reasoningMode && ['full', 'first', 'next', 'error'].includes(String(p.reasoningMode)),
        `${task.id}: reasoningMode`,
      );
    } else {
      check(Number(task.correctAnswer) === p.answer, `${task.id}: ans`);
      if (task.difficulty === 3) {
        check(task.taskType === 'numberAnswer', `${task.id}: number`);
      } else {
        check(task.taskType === 'singleChoice', `${task.id}: choice`);
      }
    }
    if (task.difficulty === 1) {
      check(p.subtype === 'two_ordered', `${task.id}: ordered`);
    }
  }

  check(seen.has('two_ordered'), 'two_ordered');
  check(seen.has('two_hidden'), 'two_hidden');
  check(seen.has('choose_solution'), 'choose_solution');
  check(solutions >= 2, `solutions ${solutions}`);

  let perf = 0;
  let shareAudit = 0;
  for (const seed of [20260822, 20260304, 20260415, 20260526, 20260717]) {
    const s = generateM29Series({ seed, countPerLevel: 10 });
    perf += s.filter((t) => (t.generatorParams as M29GeneratorParams).plot === 'performance').length;
    shareAudit += s.filter((t) => (t.generatorParams as M29GeneratorParams).plot === 'share').length;
  }
  check(perf >= 5, `performance coverage got ${perf}`);
  check(shareAudit >= 1 || shares >= 1, `share coverage shareAudit=${shareAudit} series=${shares}`);
  check(
    JSON.stringify(generateM29InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM29GeneratorSelfChecks(): void {
  const series = generateM29InspectionSeries();
  console.log(
    [
      'Тестовая серия M29:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M29GeneratorParams;
        const ans = String(t.correctAnswer).slice(0, 40);
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${ans}`;
      }),
    ].join('\n'),
  );
  const failures = runM29GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M29 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M29 generator self-check: OK');
}
