/**
 * Проверка генератора M30.
 */
import type { Task } from '../../../types';
import {
  M30_GENERATOR_ID,
  M30_SKILL_ID,
  computeDistanceKm,
  generateM30Series,
  generateM30Task,
  isRealisticActorSpeed,
  isValidM30Level,
  type M30GeneratorParams,
} from './motionDistanceGenerator';


const TEST_SEED = 20273030;

export function generateM30InspectionSeries(): Task[] {
  return generateM30Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM30GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM30Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level} должен бросать`);
  }

  const series = generateM30InspectionSeries();
  check(series.length === 30, `ожидалось 30, получено ${series.length}`);

  for (const task of series) {
    const p = task.generatorParams as M30GeneratorParams;
    const d = task.difficulty as 1 | 2 | 3;
    const label = task.id;
    check(task.skillId === M30_SKILL_ID, `${label}: skillId`);
    check(task.generatorId === M30_GENERATOR_ID, `${label}: generatorId`);
    check(task.sourceType === 'generated', `${label}: sourceType`);
    check(
      isValidM30Level(
        { timeHoursExact: p.timeHoursExact, features: p.features, subtype: p.subtype },
        d,
      ),
      `${label}: уровень`,
    );
    const km = computeDistanceKm(p.speedKmh, p.timeHoursExact);
    check(km === p.distanceKm, `${label}: distanceKm`);
    const expected = p.answerUnit === 'km' ? km : km * 1000;
    check(Number(task.correctAnswer) === expected && expected === p.distanceAnswer, `${label}: ответ`);
    check(isRealisticActorSpeed(p.actor, p.speedKmh), `${label}: realistic speed`);
    check(!/велосипедист.*7[0-9]|велосипедист.*[89]\d|велосипедист.*100/i.test(task.question), `${label}: no absurd bike`);
    check(/расстояние/i.test(task.question), `${label}: asks distance`);
    check(!/какова была скорость|сколько часов длилась/i.test(task.question), `${label}: not M31/M32`);
    if (d === 3) {
      check(task.taskType === 'numberAnswer', `${label}: L3 numberAnswer`);
      check(
        p.features.includes('needs_time_convert') || p.features.includes('needs_length_convert'),
        `${label}: L3 convert`,
      );
    } else {
      check(task.taskType === 'singleChoice', `${label}: singleChoice`);
      check((task.answers ?? []).length === 4, `${label}: 4 варианта`);
    }
  }

  check(
    JSON.stringify(generateM30InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'детерминизм seed',
  );
  return failures;
}

export function reportM30GeneratorSelfChecks(): void {
  const series = generateM30InspectionSeries();
  console.log(
    [
      'Тестовая серия M30:',
      ...series.map((t, i) => {
        const p = t.generatorParams as M30GeneratorParams;
        return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${t.correctAnswer}`;
      }),
    ].join('\n'),
  );
  const failures = runM30GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M30 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M30 generator self-check: OK');
}
