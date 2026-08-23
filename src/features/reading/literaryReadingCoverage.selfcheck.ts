/**
 * Coverage: 24/24 skills, 13/13 VPR hosts, no L25+.
 */
import { READING_SKILL_COUNT, READING_SKILLS } from '../../data/taxonomy/literaryReading';
import { VPR_2027_READING_OFFICIAL } from './literaryReadingTrainingWeights';
import { hasGeneratorForReadingSkillCode, buildReadingTrainingPool } from './literaryReadingTrainingSelection';
import { taskRepository } from '../../services/taskRepository';

const VPR_HOSTS = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L10', 'L11', 'L12', 'L13'] as const;

export function runReadingCoverageSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(READING_SKILLS.length === READING_SKILL_COUNT, `skills ${READING_SKILLS.length}`);
  check(READING_SKILLS.length === 24, 'exactly 24');
  check(!READING_SKILLS.some((s) => s.code === ('L25' as never)), 'no L25');

  for (const skill of READING_SKILLS) {
    check(hasGeneratorForReadingSkillCode(skill.code), `generator ${skill.code}`);
  }

  const hosts = new Set<string>();
  for (const task of VPR_2027_READING_OFFICIAL.tasks) {
    for (const code of task.skills) hosts.add(code);
  }
  check(VPR_2027_READING_OFFICIAL.tasks.length === 13, 'VPR 13 tasks');
  for (const code of VPR_HOSTS) {
    check(hosts.has(code), `VPR host ${code}`);
  }

  const pool = buildReadingTrainingPool({ perLevel: 1, seed: 42 });
  check(pool.length === 72, `pool size ${pool.length}`);
  const poolSkillIds = new Set(pool.map((t) => t.skillId));
  for (const skill of READING_SKILLS) {
    check(poolSkillIds.has(skill.id), `pool has ${skill.code}`);
  }

  const bank = taskRepository.getLiteraryReadingTasks();
  check(bank.length >= 72, `repository bank ${bank.length}`);

  return failures;
}

export function reportReadingCoverageSelfChecks(): void {
  const failures = runReadingCoverageSelfChecks();
  if (failures.length) {
    throw new Error(`Reading coverage self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Reading coverage self-check: OK (24/24 skills, VPR 13/13 hosts)');
}

export const reportLiteraryReadingCoverageSelfChecks = reportReadingCoverageSelfChecks;
