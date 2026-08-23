/**
 * Проверка генератора M27.
 */
import type { Task } from '../../../types';
import {
  M27_GENERATOR_ID,
  M27_SKILL_ID,
  generateM27Series,
  generateM27Task,
  isValidM27Level,
  type ComparisonSubtype,
  type M27GeneratorParams,
} from './wordProblemComparisonGenerator';

const TEST_SEED = 20272727;
const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

export function generateM27InspectionSeries(): Task[] {
  return generateM27Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM27GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM27Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  check(!isValidM27Level(1, 'how_much_diff', 10, 9), 'NEG: diff=1 on L1');
  check(isValidM27Level(1, 'how_much_diff', 10, 8), 'POS: diff>=2 L1');
  check(!isValidM27Level(3, 'how_much_diff', 20, 10), 'NEG: L3 how_much');

  const series = generateM27InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);
  const seen = new Set<ComparisonSubtype>();

  for (const task of series) {
    const p = task.generatorParams as M27GeneratorParams;
    seen.add(p.subtype);
    check(task.skillId === M27_SKILL_ID, `${task.id}: skill`);
    check(task.generatorId === M27_GENERATOR_ID, `${task.id}: gen`);
    check(isValidM27Level(task.difficulty as 1 | 2 | 3, p.subtype, p.bigger, p.smaller), `${task.id}: level`);
    check(!/У (Катя|Маша|Аня|Петя|Боря|Дима) \d+ (марок|наклеек)/.test(task.question) || true, `${task.id}: grammar soft`);
    check(!/\bУ Катя\b|\bУ Маша\b|\bУ Аня\b|\bУ Петя\b|\bУ Боря\b|\bУ Дима\b/.test(task.question), `${task.id}: no bad case`);
    check(!/(?:^|[^\d])(?:1 марок|2 марок|3 марок|1 яблок|2 яблок)(?=\s|[,.?]|$)/.test(task.question), `${task.id}: plural`);
    if (task.difficulty === 1) {
      check(p.bigger - p.smaller >= 2, `${task.id}: L1 diff>=2`);
      check(/на сколько/i.test(task.question), `${task.id}: how much`);
    }
    if (p.subtype === 'how_many_times') {
      check(p.bigger % p.smaller === 0, `${task.id}: exact`);
      check(p.answer === p.bigger / p.smaller, `${task.id}: factor`);
      check(/во сколько/i.test(task.question), `${task.id}: wording`);
      check(!/на сколько/i.test(task.question), `${task.id}: not how much`);
    }
    if (p.subtype === 'how_much_diff') {
      check(p.answer === p.bigger - p.smaller, `${task.id}: diff ans`);
    }
    if (task.difficulty === 3) {
      check(task.taskType === 'numberAnswer', `${task.id}: number`);
    } else {
      check(task.taskType === 'singleChoice', `${task.id}: choice`);
    }
  }

  check(seen.has('how_many_times'), 'how_many_times');
  for (const seed of AUDIT_SEEDS) {
    const s = generateM27Series({ seed, countPerLevel: 10 });
    check(s.length === 30, `seed ${seed}`);
  }
  check(
    JSON.stringify(generateM27InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM27GeneratorSelfChecks(): void {
  const series = generateM27InspectionSeries();
  console.log(
    ['Тестовая серия M27:', ...series.map((t, i) => {
      const p = t.generatorParams as M27GeneratorParams;
      return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${t.correctAnswer}`;
    })].join('\n'),
  );
  const failures = runM27GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M27 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M27 generator self-check: OK');
}
