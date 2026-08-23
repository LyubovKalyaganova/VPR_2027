/**
 * Self-check M10 (P0): нет digital-echo, есть SVG, ответ не в question.
 */
import type { Task } from '../../../types';
import {
  M10_GENERATOR_ID,
  M10_SKILL_ID,
  clockFingerprint,
  formatTime,
  generateM10Series,
  generateM10Task,
  isValidM10Level,
  questionLeaksDigitalTime,
  type M10GeneratorParams,
} from './readClockGenerator';

const TEST_SEED = 20270310;
const PER_LEVEL = 10;

function paramsOf(task: Task): M10GeneratorParams {
  return task.generatorParams as M10GeneratorParams;
}

export function runM10GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (c: boolean, m: string) => {
    if (!c) failures.push(m);
  };

  let threw4 = false;
  try {
    generateM10Task({ difficulty: 4, seed: 1 });
  } catch {
    threw4 = true;
  }
  check(threw4, 'L4 throw');

  const a = generateM10Task({ difficulty: 1, seed: 4242, subtype: 'analog_clock' });
  const b = generateM10Task({ difficulty: 1, seed: 4242, subtype: 'analog_clock' });
  check(a.id === b.id, 'repro seed');

  const series = generateM10Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
  check(series.length === 30, `series ${series.length}`);

  const fps = new Set(series.map((t) => clockFingerprint(paramsOf(t).hours, paramsOf(t).minutes, paramsOf(t).subtype)));
  check(fps.size === 30, 'no dupes');

  for (const task of series) {
    const p = paramsOf(task);
    check(task.skillId === M10_SKILL_ID, 'skillId');
    check(task.generatorId === M10_GENERATOR_ID, 'generatorId');
    check(task.sourceType === 'generated', 'sourceType');
    check(Boolean(task.image && task.image.startsWith('data:image/svg+xml')), 'has svg image');
    check(p.hasVisual === true, 'hasVisual');
    check(p.features.includes('has_svg'), 'feature has_svg');
    check(!questionLeaksDigitalTime(task.question, p.hours, p.minutes), `leak: ${task.question}`);
    check(!/электронн/i.test(task.question), 'no digital echo subtype');
    check(isValidM10Level(p.hours, p.minutes, task.difficulty as 1 | 2 | 3, p.subtype), 'level');
    check(String(task.correctAnswer) === formatTime(p.hours, p.minutes) || Number(task.correctAnswer) === 60 - p.minutes, 'answer');
  }

  return failures;
}

export function reportM10GeneratorSelfChecks(): void {
  const failures = runM10GeneratorSelfChecks();
  if (failures.length) {
    console.error('M10 generator self-check FAILED:\n' + failures.map((f) => ` - ${f}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('M10 generator self-check: OK');
}
