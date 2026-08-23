/**
 * Проверка генератора M11. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M11_GENERATOR_ID,
  M11_SKILL_ID,
  generateM11Series,
  generateM11Task,
  isTechnicalTimeAnswer,
  isValidM11Level,
  timeCalcFingerprint,
  type M11GeneratorParams,
  type TimeCalcSubtype,
} from './timeCalculateGenerator';

const TEST_SEED = 20271111;
const PER_LEVEL = 10;
const L1_SUBTYPES: TimeCalcSubtype[] = ['convert_hm', 'duration', 'find_end'];
const L2_SUBTYPES: TimeCalcSubtype[] = ['duration', 'find_end', 'find_start', 'convert_hm'];
const L3_SUBTYPES: TimeCalcSubtype[] = ['duration', 'find_end', 'find_start'];
const AUDIT_SEEDS = [20260822, 20260304, 20260415, 20260526, 20260717];

function paramsOf(task: Task): M11GeneratorParams {
  return task.generatorParams as M11GeneratorParams;
}

function independentDuration(start: number, end: number): number {
  return ((end - start) % (24 * 60) + 24 * 60) % (24 * 60);
}

export function generateM11InspectionSeries(): Task[] {
  return generateM11Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM11InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M11 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const p = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        p.subtype,
        `dur=${p.durationMinutes}`,
        `answer=${task.correctAnswer}`,
        p.answerKind,
        p.features.join(','),
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM11GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  try {
    generateM11Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }
  try {
    generateM11Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен выбрасывать ошибку');
  } catch {
    check(true, 'L5 отклонён');
  }

  // NEGATIVE / POSITIVE level cases
  check(!isValidM11Level(['with_minutes'], 1), 'NEG: L1 with minutes');
  check(!isValidM11Level(['with_minutes', 'cross_hour'], 2), 'NEG: L2 with cross hour');
  check(!isValidM11Level(['with_minutes'], 3), 'NEG: L3 without cross');
  check(isValidM11Level(['with_minutes', 'cross_hour'], 3), 'POS: L3 cross hour');
  check(isTechnicalTimeAnswer('1500', 'minutes'), 'NEG: HHMM as minutes');
  check(isTechnicalTimeAnswer('735', 'minutes') === false, 'POS: 735 as duration minutes ok if kind minutes');
  check(isTechnicalTimeAnswer('10:15', 'clock') === false, 'POS: clock format');
  check(isTechnicalTimeAnswer('1010', 'clock'), 'NEG: clock without colon');

  const series = generateM11InspectionSeries();
  check(series.length === 30, `ожидалось 30, получено ${series.length}`);
  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];
  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(timeCalcFingerprint(paramsOf(task)));
  }
  check(byLevel[1].length === PER_LEVEL, 'L1: 10');
  check(byLevel[2].length === PER_LEVEL, 'L2: 10');
  check(byLevel[3].length === PER_LEVEL, 'L3: 10');
  check(new Set(fingerprints).size === fingerprints.length, 'нет дублей');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;
    for (const task of group) {
      const p = paramsOf(task);
      const label = task.id;
      check(task.skillId === M11_SKILL_ID, `${label}: skillId`);
      check(task.generatorId === M11_GENERATOR_ID, `${label}: generatorId`);
      check(task.sourceType === 'generated', `${label}: sourceType`);
      check(allowed.includes(p.subtype), `${label}: subtype`);
      check(isValidM11Level(p.features, difficulty), `${label}: level`);
      check(String(task.correctAnswer) === p.answerText, `${label}: answer`);
      check(!isTechnicalTimeAnswer(p.answerText, p.answerKind), `${label}: human format`);
      check(!/минут от полуночи|ЧЧММ|от полуночи/i.test(task.question), `${label}: no technical prompt`);
      if (p.answerKind === 'clock') {
        check(/^\d{1,2}:\d{2}$/.test(String(task.correctAnswer)), `${label}: clock HH:MM`);
      }
      if (p.subtype === 'duration') {
        check(
          independentDuration(p.startMinutes, p.endMinutes) === p.durationMinutes,
          `${label}: duration math`,
        );
      }
      if (p.startMinutes < 0 || p.durationMinutes <= 0) {
        check(false, `${label}: invalid interval`);
      }
      const endM = minutesMod(p.endMinutes);
      const startM = minutesMod(p.startMinutes);
      check(startM >= 0 && endM >= 0, `${label}: non-negative clock`);
      if (difficulty === 1) {
        check(task.taskType === 'singleChoice', `${label}: L1 choice`);
        check(p.features.includes('whole_hours'), `${label}: whole hours`);
      }
      if (difficulty === 2) {
        check(task.taskType === 'singleChoice', `${label}: L2 choice`);
        check(p.features.includes('with_minutes'), `${label}: with minutes`);
        check(!p.features.includes('cross_hour'), `${label}: L2 no cross`);
      }
      if (difficulty === 3) {
        check(
          p.features.includes('cross_hour') || p.features.includes('cross_midnight'),
          `${label}: cross`,
        );
        if (p.answerKind === 'clock') {
          check(task.taskType === 'shortAnswer', `${label}: L3 clock short`);
        } else {
          check(task.taskType === 'numberAnswer', `${label}: L3 number`);
        }
      }
    }
  }

  for (const seed of AUDIT_SEEDS) {
    const s = generateM11Series({ seed, countPerLevel: 10 });
    check(s.length === 30, `seed ${seed}: 30`);
    const fps = s.map((t) => timeCalcFingerprint(paramsOf(t)));
    check(new Set(fps).size === 30, `seed ${seed}: unique`);
    check(
      JSON.stringify(generateM11Series({ seed, countPerLevel: 10 }).map((t) => t.id)) ===
        JSON.stringify(s.map((t) => t.id)),
      `seed ${seed}: deterministic`,
    );
  }

  const again = generateM11InspectionSeries();
  check(
    JSON.stringify(again.map((t) => t.id)) === JSON.stringify(series.map((t) => t.id)),
    'детерминизм seed',
  );
  return failures;
}

function minutesMod(total: number): number {
  return ((total % (24 * 60)) + 24 * 60) % (24 * 60);
}

export function reportM11GeneratorSelfChecks(): void {
  const series = generateM11InspectionSeries();
  const failures = runM11GeneratorSelfChecks();
  console.log(formatM11InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M11 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M11 generator self-check: 30 заданий валидны, дубликатов нет.');
}
