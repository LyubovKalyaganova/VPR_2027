/**
 * Self-check: все генераторы R01–R25.
 */
import { RUSSIAN_SKILL_CODES, RUSSIAN_SKILLS } from '../../data/taxonomy/russian';
import {
  RUSSIAN_GENERATORS,
  generateR01Series,
  generateR07Series,
  generateR18Series,
  generateR19Series,
  generateR23Series,
  fingerprintRussianTask,
  generateRussianTask,
} from './generators/skillGenerators';
import { VPR_2027_RUSSIAN_TASKS } from './generators/contentBanks';

const AUDIT_SEEDS = [20260822, 20260304, 20260415];

export function runRussianGeneratorsSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(RUSSIAN_SKILL_CODES.length === 25, `codes ${RUSSIAN_SKILL_CODES.length}`);
  check(Object.keys(RUSSIAN_GENERATORS).length === 25, `generators ${Object.keys(RUSSIAN_GENERATORS).length}`);
  check(!RUSSIAN_SKILL_CODES.includes('R26' as never), 'no R26');

  for (const code of RUSSIAN_SKILL_CODES) {
    for (const level of [1, 2, 3] as const) {
      try {
        const task = generateRussianTask(code, { difficulty: level, seed: 1000 + level });
        check(task.skillId === RUSSIAN_SKILLS.find((s) => s.code === code)?.id, `${code} skillId`);
        check(task.subject === 'russian', `${code} subject`);
        check(!/ответ\s*:/i.test(task.question), `${code} no leak`);
      } catch (error) {
        failures.push(`${code} L${level}: ${String(error)}`);
      }
    }
  }

  for (const seed of AUDIT_SEEDS) {
    check(generateR01Series({ seed, countPerLevel: 5 }).length === 15, `R01 series seed ${seed}`);
  }

  check(generateR07Series({ seed: 1, countPerLevel: 5 }).every((t) => t.transcript && t.taskType === 'audio'), 'R07 audio');
  check(
    generateR18Series({ seed: 1, countPerLevel: 5 }).some((t) => (t.generatorParams as { subtype?: string }).subtype === 'theme'),
    'R18 theme subtype',
  );
  check(
    generateR19Series({ seed: 1, countPerLevel: 5 }).some((t) => t.taskType === 'ordering'),
    'R19 ordering',
  );
  check(
    generateR23Series({ seed: 1, countPerLevel: 5 }).some((t) => (t.generatorParams as { reasoningMode?: string }).reasoningMode),
    'R23 reasoning',
  );

  const fps = new Set(generateR01Series({ seed: 99, countPerLevel: 10 }).map(fingerprintRussianTask));
  check(fps.size === 30, `R01 fingerprints ${fps.size}`);

  for (const vpr of VPR_2027_RUSSIAN_TASKS) {
    for (const code of vpr.skills) {
      check(RUSSIAN_SKILL_CODES.includes(code as never), `VPR ${vpr.n} → ${code}`);
    }
  }

  return failures;
}

export function reportRussianGeneratorsSelfChecks(): void {
  const failures = runRussianGeneratorsSelfChecks();
  if (failures.length) {
    throw new Error(`Russian generators self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Russian generators self-check: OK (25/25)');
}
