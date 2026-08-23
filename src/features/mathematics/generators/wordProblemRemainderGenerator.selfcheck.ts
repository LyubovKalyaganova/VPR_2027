/**
 * Проверка генератора M28.
 */
import type { Task } from '../../../types';
import {
  M28_GENERATOR_ID,
  M28_SKILL_ID,
  generateM28Series,
  generateM28Task,
  isValidM28Level,
  type M28GeneratorParams,
  type RemainderStorySubtype,
} from './wordProblemRemainderGenerator';

const TEST_SEED = 20272828;
const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

export function generateM28InspectionSeries(): Task[] {
  return generateM28Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM28GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM28Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  check(!isValidM28Level(1, 'ask_remainder', 20, 5, 0), 'NEG: rem=0');
  check(!isValidM28Level(1, 'ask_remainder', 20, 5, 5), 'NEG: rem>=divisor');

  const series = generateM28InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);
  const seen = new Set<RemainderStorySubtype>();

  for (const task of series) {
    const p = task.generatorParams as M28GeneratorParams;
    seen.add(p.subtype);
    check(task.skillId === M28_SKILL_ID, `${task.id}: skill`);
    check(task.generatorId === M28_GENERATOR_ID, `${task.id}: gen`);
    check(p.remainder > 0 && p.remainder < p.perGroup, `${task.id}: rem rule`);
    check(p.total === p.perGroup * p.quotient + p.remainder, `${task.id}: identity`);
    check(
      isValidM28Level(task.difficulty as 1 | 2 | 3, p.subtype, p.total, p.perGroup, p.remainder),
      `${task.id}: level`,
    );
    check(!/ручки ящика|по \d+ штук(?!)/.test(task.question) || !/ручки ящика/.test(task.question), `${task.id}: natural`);
    check(!/ручки ящика/.test(task.question), `${task.id}: no bad box`);
    check(!/\b1 яблок\b|\b2 яблок\b|\b1 карандашей\b/.test(task.question), `${task.id}: plural`);
    if (task.difficulty === 3) {
      check(p.subtype === 'ask_boxes_only', `${task.id}: boxes`);
      check(p.answer === p.quotient, `${task.id}: quotient answer`);
    }
  }

  check(seen.has('ask_remainder'), 'ask_remainder');
  check(seen.has('ask_groups') || series.some((t) => (t.generatorParams as M28GeneratorParams).subtype === 'ask_groups'), 'ask_groups soft');
  check(seen.has('ask_boxes_only'), 'ask_boxes_only');
  for (const seed of AUDIT_SEEDS) {
    check(generateM28Series({ seed, countPerLevel: 10 }).length === 30, `seed ${seed}`);
  }
  check(
    JSON.stringify(generateM28InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM28GeneratorSelfChecks(): void {
  const series = generateM28InspectionSeries();
  console.log(
    ['Тестовая серия M28:', ...series.map((t, i) => {
      const p = t.generatorParams as M28GeneratorParams;
      return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  ${p.total}÷${p.perGroup} → ${t.correctAnswer}`;
    })].join('\n'),
  );
  const failures = runM28GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M28 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M28 generator self-check: OK');
}
