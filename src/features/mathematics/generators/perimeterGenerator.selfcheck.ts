/**
 * Проверка генератора M19.
 */
import type { Task } from '../../../types';
import {
  M19_GENERATOR_ID,
  M19_SKILL_ID,
  generateM19Series,
  generateM19Task,
  isValidM19Level,
  perimeterFingerprint,
  type M19GeneratorParams,
} from './perimeterGenerator';

const TEST_SEED = 20271919;

function paramsOf(task: Task): M19GeneratorParams {
  return task.generatorParams as M19GeneratorParams;
}

export function generateM19InspectionSeries(): Task[] {
  return generateM19Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function formatM19InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M19 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        p.subtype,
        p.sides.join('+'),
        `P=${p.perimeter}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM19GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    try {
      generateM19Task({ difficulty: level, seed: 1 });
      check(false, `L${level} должен бросать`);
    } catch {
      check(true, `L${level} ok`);
    }
  }

  const series = generateM19InspectionSeries();
  check(series.length === 30, 'серия 30');
  check(new Set(series.map((t) => perimeterFingerprint(paramsOf(t)))).size === 30, 'нет дублей');
  check(
    JSON.stringify(generateM19InspectionSeries().map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'seed стабилен',
  );

  for (const task of series) {
    const p = paramsOf(task);
    const d = task.difficulty as 1 | 2 | 3;
    check(task.skillId === M19_SKILL_ID, `${task.id}: skillId`);
    check(task.generatorId === M19_GENERATOR_ID, `${task.id}: generatorId`);
    check(isValidM19Level(p, d), `${task.id}: valid`);
    check(Number(task.correctAnswer) === p.perimeter, `${task.id}: P`);
    check(!/площад/i.test(task.question), `${task.id}: не площадь`);
    if (d === 1) check(p.subtype === 'all_sides_given', `${task.id}: L1`);
    if (d === 2) {
      check(p.subtype === 'rect_formula', `${task.id}: L2`);
      check(!isValidM19Level(p, 1), `${task.id}: не L1`);
    }
    if (d === 3) {
      check(p.subtype === 'composite_perimeter' && task.taskType === 'numberAnswer', `${task.id}: L3`);
      check(!isValidM19Level(p, 1) && !isValidM19Level(p, 2), `${task.id}: не ниже`);
    }
    if (task.taskType === 'singleChoice') {
      const answers = task.answers ?? [];
      check(answers.length === 4 && new Set(answers).size === 4, `${task.id}: 4 варианта`);
    }
  }
  return failures;
}

export function reportM19GeneratorSelfChecks(): void {
  const series = generateM19InspectionSeries();
  const failures = runM19GeneratorSelfChecks();
  console.log(formatM19InspectionReport(series));
  if (failures.length > 0) throw new Error(`M19 generator self-check failed:\n- ${failures.join('\n- ')}`);
  console.log('M19 generator self-check: 30 заданий валидны, дубликатов нет.');
}
