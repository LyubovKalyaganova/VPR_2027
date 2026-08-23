/**
 * Проверка генератора M20.
 */
import type { Task } from '../../../types';
import {
  M20_GENERATOR_ID,
  M20_SKILL_ID,
  areaFingerprint,
  generateM20Series,
  generateM20Task,
  isValidM20Level,
  type M20GeneratorParams,
} from './figureAreaGenerator';

const TEST_SEED = 20272020;

function paramsOf(task: Task): M20GeneratorParams {
  return task.generatorParams as M20GeneratorParams;
}

export function generateM20InspectionSeries(): Task[] {
  return generateM20Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function formatM20InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M20 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [String(index + 1).padStart(2, '0'), `L${task.difficulty}`, p.subtype, p.dims.join('×'), `S=${p.area}`].join(
        '  ',
      ),
    );
  });
  return lines.join('\n');
}

export function runM20GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    try {
      generateM20Task({ difficulty: level, seed: 1 });
      check(false, `L${level} должен бросать`);
    } catch {
      check(true, `L${level} ok`);
    }
  }

  const series = generateM20InspectionSeries();
  check(series.length === 30, 'серия 30');
  check(new Set(series.map((t) => areaFingerprint(paramsOf(t)))).size === 30, 'нет дублей');
  check(
    JSON.stringify(generateM20InspectionSeries().map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'seed стабилен',
  );

  for (const task of series) {
    const p = paramsOf(task);
    const d = task.difficulty as 1 | 2 | 3;
    check(task.skillId === M20_SKILL_ID, `${task.id}: skillId`);
    check(task.generatorId === M20_GENERATOR_ID, `${task.id}: generatorId`);
    check(isValidM20Level(p, d), `${task.id}: valid`);
    check(Number(task.correctAnswer) === p.area, `${task.id}: S`);
    check(!/перевод|см² в м²|м² в см²/i.test(task.question), `${task.id}: не M14`);
    if (d === 1) check(p.subtype === 'rect_or_square', `${task.id}: L1`);
    if (d === 2) {
      check(p.subtype === 'typical_area', `${task.id}: L2`);
      check(!isValidM20Level(p, 1), `${task.id}: не L1`);
    }
    if (d === 3) {
      check(p.subtype === 'composite_or_cells' && task.taskType === 'numberAnswer', `${task.id}: L3`);
      check(!isValidM20Level(p, 1) && !isValidM20Level(p, 2), `${task.id}: не ниже`);
    }
    if (task.taskType === 'singleChoice') {
      const answers = task.answers ?? [];
      check(answers.length === 4 && new Set(answers).size === 4, `${task.id}: 4 варианта`);
    }
  }
  return failures;
}

export function reportM20GeneratorSelfChecks(): void {
  const series = generateM20InspectionSeries();
  const failures = runM20GeneratorSelfChecks();
  console.log(formatM20InspectionReport(series));
  if (failures.length > 0) throw new Error(`M20 generator self-check failed:\n- ${failures.join('\n- ')}`);
  console.log('M20 generator self-check: 30 заданий валидны, дубликатов нет.');
}
