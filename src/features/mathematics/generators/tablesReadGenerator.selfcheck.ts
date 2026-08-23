/**
 * Проверка генератора M22.
 */
import type { Task } from '../../../types';
import {
  M22_GENERATOR_ID,
  M22_SKILL_ID,
  generateM22Series,
  generateM22Task,
  isValidM22Level,
  tablesReadFingerprint,
  type M22GeneratorParams,
} from './tablesReadGenerator';

const TEST_SEED = 20272222;

function paramsOf(task: Task): M22GeneratorParams {
  return task.generatorParams as M22GeneratorParams;
}

export function generateM22InspectionSeries(): Task[] {
  return generateM22Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function formatM22InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M22 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        p.subtype,
        `${p.rowCount}x${p.colCount}`,
        `→ ${task.correctAnswer}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM22GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    try {
      generateM22Task({ difficulty: level, seed: 1 });
      check(false, `L${level} должен бросать`);
    } catch {
      check(true, `L${level} ok`);
    }
  }

  const series = generateM22InspectionSeries();
  check(series.length === 30, 'серия 30');
  check(new Set(series.map((t) => tablesReadFingerprint(paramsOf(t)))).size === 30, 'нет дублей');
  check(
    JSON.stringify(generateM22InspectionSeries().map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'seed стабилен',
  );

  for (const task of series) {
    const p = paramsOf(task);
    const d = task.difficulty as 1 | 2 | 3;
    check(task.skillId === M22_SKILL_ID, `${task.id}: skillId`);
    check(task.generatorId === M22_GENERATOR_ID, `${task.id}: generatorId`);
    check(task.generatorId !== 'gen.math.data.tables', `${task.id}: read-specific id`);
    check(isValidM22Level(p, d), `${task.id}: valid`);
    check(task.question.includes('Таблица:'), `${task.id}: таблица в тексте`);
    check(!/на сколько|сумм|разност|всего вместе/i.test(task.question), `${task.id}: не M23`);
    if (d === 1) check(p.subtype === 'direct_2x2' && p.rowCount === 2, `${task.id}: L1`);
    if (d === 2) {
      check(p.subtype === 'typical_table', `${task.id}: L2`);
      check(!isValidM22Level(p, 1), `${task.id}: не L1`);
    }
    if (d === 3) {
      check(p.subtype === 'indirect_extra_rows' && p.rowCount >= 4, `${task.id}: L3`);
      check(p.features.includes('indirect_wording'), `${task.id}: indirect`);
      check(!isValidM22Level(p, 1) && !isValidM22Level(p, 2), `${task.id}: не ниже`);
    }
    if (task.taskType === 'singleChoice') {
      const answers = task.answers ?? [];
      check(answers.length === 4 && new Set(answers).size === 4, `${task.id}: 4 варианта`);
    }
  }
  return failures;
}

export function reportM22GeneratorSelfChecks(): void {
  const series = generateM22InspectionSeries();
  const failures = runM22GeneratorSelfChecks();
  console.log(formatM22InspectionReport(series));
  if (failures.length > 0) throw new Error(`M22 generator self-check failed:\n- ${failures.join('\n- ')}`);
  console.log('M22 generator self-check: 30 заданий валидны, дубликатов нет.');
}
