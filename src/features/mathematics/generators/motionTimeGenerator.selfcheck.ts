/**
 * Проверка генератора M31.
 */
import type { Task } from '../../../types';
import {
  M31_GENERATOR_ID,
  M31_SKILL_ID,
  computeTimeHours,
  generateM31Series,
  generateM31Task,
  isRealisticActorSpeed,
  isValidM31Level,
  type M31GeneratorParams,
} from './motionTimeGenerator';


const TEST_SEED = 20273131;

export function generateM31InspectionSeries(): Task[] {
  return generateM31Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM31GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM31Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM31InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);

  for (const task of series) {
    const p = task.generatorParams as M31GeneratorParams;
    const d = task.difficulty as 1 | 2 | 3;
    const label = task.id;
    check(task.skillId === M31_SKILL_ID, `${label}: skill`);
    check(task.generatorId === M31_GENERATOR_ID, `${label}: gen`);
    check(
      isValidM31Level(
        { features: p.features, subtype: p.subtype, timeHoursExact: p.timeHoursExact },
        d,
      ),
      `${label}: level`,
    );
    const hours = computeTimeHours(p.distanceKm, p.speedKmh);
    check(hours === p.timeHoursExact, `${label}: hours`);
    const expected = p.answerUnit === 'h' ? hours! : hours! * 60;
    check(Number(task.correctAnswer) === expected && expected === p.timeAnswer, `${label}: ans`);
    check(isRealisticActorSpeed(p.actor, p.speedKmh), `${label}: realistic`);
    check(/час|минут/i.test(task.question), `${label}: asks time`);
    check(!/какое расстояние|какова.*скорость/i.test(task.question), `${label}: not M30/M32`);
    check(p.speedKmh > 0, `${label}: speed>0`);
    if (d === 3) {
      check(task.taskType === 'numberAnswer', `${label}: type`);
      check(p.features.includes('needs_unit_convert'), `${label}: convert`);
    } else {
      check(task.taskType === 'singleChoice', `${label}: choice`);
    }
  }

  check(
    JSON.stringify(generateM31InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM31GeneratorSelfChecks(): void {
  const series = generateM31InspectionSeries();
  console.log(
    [
      'Тестовая серия M31:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M31GeneratorParams;
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${t.correctAnswer}`;
      }),
    ].join('\n'),
  );
  const failures = runM31GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M31 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M31 generator self-check: OK');
}
