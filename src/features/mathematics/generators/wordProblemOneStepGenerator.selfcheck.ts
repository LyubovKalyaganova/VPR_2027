/**
 * Проверка генератора M26.
 */
import type { Task } from '../../../types';
import {
  M26_GENERATOR_ID,
  M26_SKILL_ID,
  generateM26Series,
  generateM26Task,
  hasComparisonPhrase,
  isCompareSubtype,
  isValidM26Level,
  type M26GeneratorParams,
  type OneStepSubtype,
} from './wordProblemOneStepGenerator';

const TEST_SEED = 20272626;

export function generateM26InspectionSeries(): Task[] {
  return generateM26Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM26GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM26Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM26InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);
  const seen = new Set<OneStepSubtype>();

  for (const task of series) {
    const p = task.generatorParams as M26GeneratorParams;
    seen.add(p.subtype);
    check(task.skillId === M26_SKILL_ID, `${task.id}: skill`);
    check(task.generatorId === M26_GENERATOR_ID, `${task.id}: gen`);
    check(isValidM26Level(task.difficulty as 1 | 2 | 3, p.subtype, p.a, p.b), `${task.id}: level`);
    check(Number(task.correctAnswer) === p.answer, `${task.id}: ans`);
    check(!/руб|цена|стоим|сдач|купил|заплат|покуп/i.test(task.question), `${task.id}: no money`);
    check(!hasComparisonPhrase(task.question), `${task.id}: no compare phrase`);
    check(!isCompareSubtype(p.subtype), `${task.id}: no compare subtype`);
    check(!isCompareSubtype(p.op), `${task.id}: no compare op`);
    check(!/У (Маше|Ане|Кате|Оле|Пете|Коле|Боре|Игорю)\b/.test(task.question), `${task.id}: case У`);
    if (task.difficulty === 3) {
      check(p.subtype === 'extra_number', `${task.id}: extra`);
      check(p.extra !== undefined, `${task.id}: has extra`);
      check(task.taskType === 'numberAnswer', `${task.id}: type`);
    } else {
      check(task.taskType === 'singleChoice', `${task.id}: choice`);
    }
  }

  check(
    JSON.stringify(generateM26InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  let shareCount = 0;
  for (const seed of [20260822, 20260304, 20260415, 20260526, 20260717]) {
    shareCount += generateM26Series({ seed, countPerLevel: 10 }).filter(
      (t) => (t.generatorParams as M26GeneratorParams).op === 'share',
    ).length;
  }
  check(shareCount >= 2, `share coverage ${shareCount}`);
  check(shareCount <= 25, `share not dominating ${shareCount}`);
  return failures;
}

export function reportM26GeneratorSelfChecks(): void {
  const series = generateM26InspectionSeries();
  console.log(
    ['Тестовая серия M26:', ...series.map((t, i) => {
      const p = t.generatorParams as M26GeneratorParams;
      return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}/${p.op}  → ${t.correctAnswer}`;
    })].join('\n'),
  );
  const failures = runM26GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M26 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M26 generator self-check: OK');
}
