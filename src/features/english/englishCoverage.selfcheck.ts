/**
 * Coverage: 18/18 skills, 4/4 VPR hosts, no E19+.
 */
import { ENGLISH_SKILL_CODES, ENGLISH_SKILLS } from '../../data/taxonomy/english';
import { ENGLISH_GENERATORS } from './generators/skillGenerators';
import { VPR_2027_ENGLISH_TASKS } from './generators/contentBanks';
import { VPR_2027_ENGLISH_OFFICIAL } from './englishTrainingWeights';

export function runEnglishCoverageSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(ENGLISH_SKILLS.length === 18, `skills ${ENGLISH_SKILLS.length}`);
  check(Object.keys(ENGLISH_GENERATORS).length === 18, `generators ${Object.keys(ENGLISH_GENERATORS).length}`);
  check(!ENGLISH_SKILL_CODES.includes('E19' as never), 'no E19');
  check(VPR_2027_ENGLISH_OFFICIAL.taskCount === 4, '4 VPR tasks');
  check(VPR_2027_ENGLISH_OFFICIAL.maxPoints === 25, '25 points');

  const hostSkills = new Set(VPR_2027_ENGLISH_TASKS.flatMap((t) => [...t.skills]));
  check(hostSkills.has('E01'), 'host E01');
  check(hostSkills.has('E04'), 'host E04');
  check(hostSkills.has('E08'), 'host E08');
  check(hostSkills.has('E14'), 'host E14');
  check(VPR_2027_ENGLISH_TASKS.length === 4, '4/4 hosts');

  for (const skill of ENGLISH_SKILLS) {
    check(ENGLISH_GENERATORS[skill.code] !== undefined, `generator ${skill.code}`);
  }

  return failures;
}

export function reportEnglishCoverageSelfChecks(): void {
  const failures = runEnglishCoverageSelfChecks();
  if (failures.length) {
    throw new Error(`English coverage self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('English coverage self-check: OK (18/18 skills, VPR 4/4 hosts)');
}
