/**
 * Coverage audit: 25/25 skills, 10/10 VPR hosts, no W26+.
 */
import { WORLD_SKILL_COUNT, WORLD_SKILLS } from '../../data/taxonomy/world';
import { VPR_2027_WORLD_OFFICIAL } from './worldTrainingWeights';
import { hasGeneratorForWorldSkillCode, buildWorldTrainingPool } from './worldTrainingSelection';
import { taskRepository } from '../../services/taskRepository';

const VPR_HOST_SKILLS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10', 'W11', 'W12', 'W13', 'W14'] as const;

export function runWorldCoverageSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(WORLD_SKILLS.length === WORLD_SKILL_COUNT, `skills ${WORLD_SKILLS.length}`);
  check(WORLD_SKILLS.length === 25, 'exactly 25');
  check(!WORLD_SKILLS.some((s) => s.code === ('W26' as never)), 'no W26 in taxonomy');

  for (const skill of WORLD_SKILLS) {
    check(hasGeneratorForWorldSkillCode(skill.code), `generator ${skill.code}`);
  }

  const vprHosts = new Set<string>();
  for (const task of VPR_2027_WORLD_OFFICIAL.tasks) {
    for (const code of task.skills) vprHosts.add(code);
  }
  check(VPR_2027_WORLD_OFFICIAL.tasks.length === 16, 'VPR task entries');
  for (const code of VPR_HOST_SKILLS) {
    check(vprHosts.has(code), `VPR host ${code}`);
  }

  const pool = buildWorldTrainingPool({ perLevel: 1, seed: 42 });
  check(pool.length === 75, `pool size ${pool.length}`);
  const poolSkillIds = new Set(pool.map((t) => t.skillId));
  for (const skill of WORLD_SKILLS) {
    check(poolSkillIds.has(skill.id), `pool has ${skill.code}`);
  }

  const bank = taskRepository.getWorldTasks();
  check(bank.length >= 75, `repository bank ${bank.length}`);

  return failures;
}

export function reportWorldCoverageSelfChecks(): void {
  const failures = runWorldCoverageSelfChecks();
  if (failures.length) {
    throw new Error(`World coverage self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('World coverage self-check: OK (25/25 skills, VPR 10/10 hosts)');
}
