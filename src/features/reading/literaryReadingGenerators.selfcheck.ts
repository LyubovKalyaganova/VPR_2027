/**
 * Self-check: генераторы L01–L24.
 */
import { READING_SKILL_CODES, READING_SKILLS } from '../../data/taxonomy/literaryReading';
import {
  READING_GENERATORS,
  generateL01Series,
  generateL09Series,
  generateL24Series,
  fingerprintReadingTask,
  generateReadingTask,
} from './generators/skillGenerators';
import { VPR_2027_READING_TASKS } from './generators/contentBanks';

export function runReadingGeneratorsSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(READING_SKILL_CODES.length === 24, `codes ${READING_SKILL_CODES.length}`);
  check(Object.keys(READING_GENERATORS).length === 24, `generators ${Object.keys(READING_GENERATORS).length}`);
  check(!READING_SKILL_CODES.includes('L25' as never), 'no L25');

  for (const code of READING_SKILL_CODES) {
    for (const level of [1, 2, 3] as const) {
      try {
        const task = generateReadingTask(code, { difficulty: level, seed: 1000 + level });
        check(task.skillId === READING_SKILLS.find((s) => s.code === code)?.id, `${code} skillId`);
        check(task.subject === 'reading', `${code} subject`);
        check(!/ответ\s*:/i.test(task.question), `${code} no leak`);
      } catch (error) {
        failures.push(`${code} L${level}: ${String(error)}`);
      }
    }
  }

  check(generateL01Series({ seed: 1, countPerLevel: 5 }).length === 15, 'L01 series');
  check(
    generateL09Series({ seed: 1, countPerLevel: 5 }).some((t) => t.taskType === 'ordering'),
    'L09 ordering',
  );
  check(
    generateL24Series({ seed: 1, countPerLevel: 5 }).some(
      (t) => (t.generatorParams as { reasoningMode?: string }).reasoningMode,
    ),
    'L24 reasoning',
  );

  const fps = new Set(generateL01Series({ seed: 99, countPerLevel: 8 }).map(fingerprintReadingTask));
  check(fps.size === 24, `L01 fingerprints ${fps.size}`);

  for (const vpr of VPR_2027_READING_TASKS) {
    for (const code of vpr.skills) {
      check(READING_SKILL_CODES.includes(code as never), `VPR ${vpr.n} → ${code}`);
    }
  }

  return failures;
}

export function reportReadingGeneratorsSelfChecks(): void {
  const failures = runReadingGeneratorsSelfChecks();
  if (failures.length) {
    throw new Error(`Reading generators self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Reading generators self-check: OK (24/24)');
}

export const reportLiteraryReadingGeneratorsSelfChecks = reportReadingGeneratorsSelfChecks;
