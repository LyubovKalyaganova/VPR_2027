/**
 * Coverage audit: 25/25 skills, 15/15 VPR, no R26+.
 */
import { RUSSIAN_SKILL_COUNT, RUSSIAN_SKILLS } from '../../data/taxonomy/russian';
import { VPR_2027_RUSSIAN_OFFICIAL } from './russianTrainingWeights';
import { hasGeneratorForRussianSkillCode, buildRussianTrainingPool } from './russianTrainingSelection';
import { taskRepository } from '../../services/taskRepository';

export function runRussianCoverageSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(RUSSIAN_SKILLS.length === RUSSIAN_SKILL_COUNT, `skills ${RUSSIAN_SKILLS.length}`);
  check(RUSSIAN_SKILLS.length === 25, 'exactly 25');
  check(!RUSSIAN_SKILLS.some((s) => s.code === ('R26' as never)), 'no R26 in taxonomy');

  for (const skill of RUSSIAN_SKILLS) {
    check(hasGeneratorForRussianSkillCode(skill.code), `generator ${skill.code}`);
  }

  const vprSkills = new Set<string>();
  for (const task of VPR_2027_RUSSIAN_OFFICIAL.tasks) {
    for (const code of task.skills) vprSkills.add(code);
  }
  check(VPR_2027_RUSSIAN_OFFICIAL.tasks.length === 16, 'VPR task entries'); // 15 + numbered 3.1/3.2 split
  for (const code of vprSkills) {
    check(RUSSIAN_SKILLS.some((s) => s.code === code), `VPR skill ${code} in taxonomy`);
  }

  const pool = buildRussianTrainingPool({ perLevel: 1, seed: 42 });
  check(pool.length === 75, `pool size ${pool.length}`);
  const poolSkillIds = new Set(pool.map((t) => t.skillId));
  for (const skill of RUSSIAN_SKILLS) {
    check(poolSkillIds.has(skill.id), `pool has ${skill.code}`);
  }

  const bank = taskRepository.getRussianTasks();
  check(bank.length >= 75, `repository bank ${bank.length}`);

  return failures;
}

export function reportRussianCoverageSelfChecks(): void {
  const failures = runRussianCoverageSelfChecks();
  if (failures.length) {
    throw new Error(`Russian coverage self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Russian coverage self-check: OK (25/25 skills, VPR mapped)');
}
