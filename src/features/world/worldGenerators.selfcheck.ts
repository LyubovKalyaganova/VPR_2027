/**
 * Self-check: все генераторы W01–W25.
 */
import { WORLD_SKILL_CODES, WORLD_SKILLS } from '../../data/taxonomy/world';
import {
  WORLD_GENERATORS,
  generateW01Series,
  generateW04Series,
  generateW12Series,
  generateW25Series,
  fingerprintWorldTask,
  generateWorldTask,
} from './generators/skillGenerators';
import { VPR_2027_WORLD_TASKS } from './generators/contentBanks';

const AUDIT_SEEDS = [20260822, 20260304, 20260415];

export function runWorldGeneratorsSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(WORLD_SKILL_CODES.length === 25, `codes ${WORLD_SKILL_CODES.length}`);
  check(Object.keys(WORLD_GENERATORS).length === 25, `generators ${Object.keys(WORLD_GENERATORS).length}`);
  check(!WORLD_SKILL_CODES.includes('W26' as never), 'no W26');

  for (const code of WORLD_SKILL_CODES) {
    for (const level of [1, 2, 3] as const) {
      try {
        const task = generateWorldTask(code, { difficulty: level, seed: 1000 + level });
        check(task.skillId === WORLD_SKILLS.find((s) => s.code === code)?.id, `${code} skillId`);
        check(task.subject === 'world', `${code} subject`);
        check(!/ответ\s*:/i.test(task.question), `${code} no leak`);
      } catch (error) {
        failures.push(`${code} L${level}: ${String(error)}`);
      }
    }
  }

  for (const seed of AUDIT_SEEDS) {
    check(generateW01Series({ seed, countPerLevel: 5 }).length === 15, `W01 series seed ${seed}`);
  }

  check(
    generateW04Series({ seed: 1, countPerLevel: 5 }).some((t) => t.taskType === 'ordering' || t.taskType === 'matching'),
    'W04 interactive',
  );
  check(
    generateW12Series({ seed: 1, countPerLevel: 5 }).some((t) => t.image || t.taskType === 'ordering'),
    'W12 timeline',
  );
  check(
    generateW25Series({ seed: 1, countPerLevel: 5 }).some((t) => (t.generatorParams as { reasoningMode?: string }).reasoningMode),
    'W25 reasoning',
  );

  const fps = new Set(generateW01Series({ seed: 99, countPerLevel: 10 }).map(fingerprintWorldTask));
  check(fps.size === 30, `W01 fingerprints ${fps.size}`);

  for (const vpr of VPR_2027_WORLD_TASKS) {
    for (const code of vpr.skills) {
      check(WORLD_SKILL_CODES.includes(code as never), `VPR ${vpr.n} → ${code}`);
    }
  }

  return failures;
}

export function reportWorldGeneratorsSelfChecks(): void {
  const failures = runWorldGeneratorsSelfChecks();
  if (failures.length) {
    throw new Error(`World generators self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('World generators self-check: OK (25/25)');
}
