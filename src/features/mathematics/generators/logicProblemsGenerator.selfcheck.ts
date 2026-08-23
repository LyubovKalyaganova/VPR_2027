/**
 * Проверка генератора M35.
 */
import type { Task } from '../../../types';
import {
  M35_GENERATOR_ID,
  M35_SKILL_ID,
  answerAlreadyInQuestion,
  generateM35Series,
  generateM35Task,
  isDirectPairAsked,
  isValidM35Level,
  type M35GeneratorParams,
} from './logicProblemsGenerator';

const TEST_SEED = 20273535;
const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

export function generateM35InspectionSeries(): Task[] {
  return generateM35Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM35GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM35Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  check(
    answerAlreadyInQuestion('Галя любит киви. Что любит Галя?', 'киви', 'Галя'),
    'NEG: answerAlreadyInQuestion',
  );
  check(
    isDirectPairAsked([{ who: 'Дима', what: 'банан' }], 'Дима', 'банан'),
    'NEG: directPairAsked',
  );
  check(
    !isDirectPairAsked([{ who: 'Дима', what: 'банан' }], 'Галя', 'киви'),
    'POS: not direct pair',
  );

  const series = generateM35InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);

  for (const task of series) {
    const p = task.generatorParams as M35GeneratorParams;
    const d = task.difficulty as 1 | 2 | 3;
    const label = task.id;
    check(task.skillId === M35_SKILL_ID, `${label}: skill`);
    check(task.generatorId === M35_GENERATOR_ID, `${label}: gen`);
    check(task.taskType === 'singleChoice', `${label}: choice`);
    check(isValidM35Level({ subtype: p.subtype, features: p.features }, d), `${label}: level`);
    check(String(task.correctAnswer) === p.answer, `${label}: ans`);
    check((task.answers ?? []).includes(p.answer), `${label}: ответ в вариантах`);
    if (d >= 2) {
      check(
        !answerAlreadyInQuestion(task.question, p.answer, p.askedEntity),
        `${label}: no answer leak`,
      );
    }
    if (d === 1) check(p.subtype === 'short_search', `${label}: L1`);
    if (d === 2) check(p.subtype === 'who_what', `${label}: L2`);
    if (d === 3) check(p.subtype === 'three_by_three', `${label}: L3`);
  }

  for (const seed of AUDIT_SEEDS) {
    const s = generateM35Series({ seed, countPerLevel: 10 });
    check(s.length === 30, `seed ${seed}`);
  }

  check(
    JSON.stringify(generateM35InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM35GeneratorSelfChecks(): void {
  const series = generateM35InspectionSeries();
  console.log(
    [
      'Тестовая серия M35:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M35GeneratorParams;
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${t.correctAnswer}`;
      }),
    ].join('\n'),
  );
  const failures = runM35GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M35 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M35 generator self-check: OK');
}
