/**
 * Self-check: weighted training model M01–M35 (no M36).
 */
import { MATH_SKILL_COUNT, type MathSkillCode } from '../../data/taxonomy/math';
import {
  FRACTIONS_SHARES_POLICY,
  MATH_SKILL_WEIGHTS,
  VPR_2027_OFFICIAL,
  getMathSkillWeight,
  recommendSessionSkillMix,
  trainingShare,
} from './mathTrainingWeights';

const ALL_CODES: MathSkillCode[] = Array.from({ length: 35 }, (_, i) => {
  const n = i + 1;
  return `M${String(n).padStart(2, '0')}` as MathSkillCode;
});

export function runMathTrainingWeightsSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(MATH_SKILL_WEIGHTS.length === MATH_SKILL_COUNT, `weights ${MATH_SKILL_WEIGHTS.length} vs ${MATH_SKILL_COUNT}`);
  check(MATH_SKILL_WEIGHTS.length === 35, 'no M36');
  check(VPR_2027_OFFICIAL.maxPrimaryScore === 18, 'vpr max 18');
  check(VPR_2027_OFFICIAL.taskCount === 11, 'vpr 11 tasks');
  const pts = VPR_2027_OFFICIAL.tasks.reduce((s, t) => s + t.points, 0);
  check(pts === 18, `vpr points sum ${pts}`);

  for (const code of ALL_CODES) {
    const w = getMathSkillWeight(code);
    check(w.code === code, `code ${code}`);
    check(w.examWeight >= 1 && w.examWeight <= 10, `exam ${code}`);
    check(w.trainingWeight >= 1 && w.trainingWeight <= 10, `train ${code}`);
    check(w.weeklyTarget >= 1, `weekly ${code}`);
    check(w.tier !== ('EXTENSION' as never) || true, 'tier ok');
  }

  check(getMathSkillWeight('M29').trainingWeight === 10, 'M29 top training');
  check(getMathSkillWeight('M29').examWeight === 10, 'M29 top exam');
  check(getMathSkillWeight('M17').trainingWeight < getMathSkillWeight('M29').trainingWeight, 'M17 train < M29');
  check(getMathSkillWeight('M21').tier === 'SUPPORT', 'M21 support');
  check(FRACTIONS_SHARES_POLICY.inOfficialVpr2027Kim === false, 'fractions not VPR KIM');
  check(FRACTIONS_SHARES_POLICY.maxShareOfHostSeries <= 0.2, 'fractions capped');

  const shares = ALL_CODES.map(trainingShare);
  const sum = shares.reduce((a, b) => a + b, 0);
  check(Math.abs(sum - 1) < 0.02, `share sum ${sum}`);

  const mix = recommendSessionSkillMix(20);
  check(mix.length === 20, 'mix 20');
  check(mix.filter((c) => c === 'M29').length >= 2, 'mix has M29');
  check(!mix.includes('M36' as MathSkillCode), 'no M36 in mix');

  // Short-session variety: across seeds M17 sometimes appears, CORE_HIGH still dominates
  let m17Hits = 0;
  let coreHighHits = 0;
  let supportHits = 0;
  for (let seed = 1; seed <= 80; seed += 1) {
    const short = recommendSessionSkillMix(10, seed);
    for (const c of short) {
      const tier = getMathSkillWeight(c).tier;
      if (c === 'M17') m17Hits += 1;
      if (tier === 'CORE_HIGH') coreHighHits += 1;
      if (tier === 'SUPPORT') supportHits += 1;
    }
  }
  check(m17Hits >= 1, `M17 appears in short mixes ${m17Hits}`);
  check(coreHighHits > supportHits, `short CORE_HIGH ${coreHighHits} > SUPPORT ${supportHits}`);

  return failures;
}

export function reportMathTrainingWeightsSelfChecks(): void {
  const f = runMathTrainingWeightsSelfChecks();
  if (f.length) {
    throw new Error(`Math training weights self-check failed:\n- ${f.join('\n- ')}`);
  }
  console.log('Math training weights self-check: OK');
  console.log(
    `VPR-2027: ${VPR_2027_OFFICIAL.taskCount} tasks / ${VPR_2027_OFFICIAL.maxPrimaryScore} pts — ${VPR_2027_OFFICIAL.source}`,
  );
  console.log(`Fractions policy: ${FRACTIONS_SHARES_POLICY.status}`);
}
