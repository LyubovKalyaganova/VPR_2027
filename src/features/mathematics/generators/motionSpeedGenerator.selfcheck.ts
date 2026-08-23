/**
 * Проверка генератора M32.
 */
import type { Task } from '../../../types';
import {
  M32_GENERATOR_ID,
  M32_SKILL_ID,
  computeSpeedKmh,
  generateM32Series,
  generateM32Task,
  isRealisticActorSpeed,
  isValidM32Level,
  type M32GeneratorParams,
} from './motionSpeedGenerator';


const TEST_SEED = 20273232;

export function generateM32InspectionSeries(): Task[] {
  return generateM32Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM32GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM32Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level}`);
  }

  const series = generateM32InspectionSeries();
  check(series.length === 30, `30 got ${series.length}`);

  for (const task of series) {
    const p = task.generatorParams as M32GeneratorParams;
    const d = task.difficulty as 1 | 2 | 3;
    const label = task.id;
    check(task.skillId === M32_SKILL_ID, `${label}: skill`);
    check(task.generatorId === M32_GENERATOR_ID, `${label}: gen`);
    check(isValidM32Level({ features: p.features, subtype: p.subtype }, d), `${label}: level`);
    const speed = computeSpeedKmh(p.distanceKm, p.timeHoursExact);
    check(speed === p.speedKmh, `${label}: speed`);
    check(Number(task.correctAnswer) === p.speedKmh, `${label}: ans`);
    check(isRealisticActorSpeed(p.actor, p.speedKmh), `${label}: realistic`);
    check(/скорост/i.test(task.question), `${label}: asks speed`);
    check(!/какое расстояние|сколько часов длилась|сколько минут длилась/i.test(task.question), `${label}: not M30/M31`);
    check(p.timeHoursExact > 0 && p.speedKmh > 0, `${label}: params`);
    if (d === 3) {
      check(task.taskType === 'numberAnswer', `${label}: type`);
      check(p.features.includes('needs_time_convert'), `${label}: convert`);
    } else {
      check(task.taskType === 'singleChoice', `${label}: choice`);
    }
  }

  check(
    JSON.stringify(generateM32InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );
  return failures;
}

export function reportM32GeneratorSelfChecks(): void {
  const series = generateM32InspectionSeries();
  console.log(
    [
      'Тестовая серия M32:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M32GeneratorParams;
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${t.correctAnswer}`;
      }),
    ].join('\n'),
  );
  const failures = runM32GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M32 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M32 generator self-check: OK');
}
