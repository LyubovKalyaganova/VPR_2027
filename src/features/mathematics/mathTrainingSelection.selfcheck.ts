/**
 * Self-check: weighted training selection wired to real sessions.
 */
import { MATH_SKILL_COUNT, MATH_SKILLS } from '../../data/taxonomy/math';
import {
  assertNoMathSkillBeyondM35,
  hasGeneratorForSkillCode,
  selectWeightedMathSessionTasks,
} from './mathTrainingSelection';
import {
  FRACTIONS_SHARES_POLICY,
  MATH_SKILL_WEIGHTS,
  getMathSkillWeightBySkillId,
  recommendSessionSkillMix,
} from './mathTrainingWeights';
import { selectAdaptiveTasks } from '../../services/adaptiveTaskSelector';
import { taskRepository } from '../../services/taskRepository';
import { selectMistakeTasks, selectReviewTasks } from '../../store/useTrainingStore';

const CORE_HIGH = new Set(
  MATH_SKILL_WEIGHTS.filter((w) => w.tier === 'CORE_HIGH').map((w) => w.skillId),
);
const SUPPORT = new Set(
  MATH_SKILL_WEIGHTS.filter((w) => w.tier === 'SUPPORT').map((w) => w.skillId),
);

export function runMathTrainingSelectionSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  try {
    assertNoMathSkillBeyondM35();
  } catch (error) {
    failures.push(String(error));
  }

  check(MATH_SKILLS.length === MATH_SKILL_COUNT, `skills ${MATH_SKILLS.length}`);
  check(MATH_SKILLS.length === 35, 'no M36 in taxonomy');
  check(!MATH_SKILLS.some((s) => s.code === ('M36' as never)), 'no M36 code');
  check(MATH_SKILL_WEIGHTS.length === 35, 'weights 35');

  for (const skill of MATH_SKILLS) {
    check(hasGeneratorForSkillCode(skill.code), `generator ${skill.code}`);
  }

  // A–E: large mix distribution
  const N = 2000;
  const mix = recommendSessionSkillMix(N);
  check(mix.length === N, `mix length ${mix.length}`);
  check(!mix.some((c) => c === ('M36' as never)), 'mix no M36');

  const byCode: Record<string, number> = {};
  for (const c of mix) byCode[c] = (byCode[c] ?? 0) + 1;
  check((byCode.M29 ?? 0) >= 2, `M29 in mix ${byCode.M29}`);
  check((byCode.M17 ?? 0) < (byCode.M29 ?? 0), 'M17 < M29 in mix');

  let coreHigh = 0;
  let coreMed = 0;
  let support = 0;
  for (const c of mix) {
    const tier = MATH_SKILL_WEIGHTS.find((w) => w.code === c)?.tier;
    if (tier === 'CORE_HIGH') coreHigh += 1;
    else if (tier === 'CORE_MEDIUM') coreMed += 1;
    else if (tier === 'SUPPORT') support += 1;
  }
  check(coreHigh > coreMed, `CORE_HIGH ${coreHigh} > CORE_MEDIUM ${coreMed}`);
  check(coreMed > support, `CORE_MEDIUM ${coreMed} > SUPPORT ${support}`);

  // Weighted session tasks
  const quick = selectWeightedMathSessionTasks(5, { seed: 42, shuffleOrder: false });
  const random = selectWeightedMathSessionTasks(10, { seed: 43, shuffleOrder: false });
  check(quick.length === 5, `quick ${quick.length}`);
  check(random.length === 10, `random ${random.length}`);
  check(
    quick.every((t) => typeof t.skillId === 'string' && MATH_SKILLS.some((s) => s.id === t.skillId)),
    'quick skillIds valid',
  );
  check(
    random.every((t) => typeof t.skillId === 'string' && MATH_SKILLS.some((s) => s.id === t.skillId)),
    'random skillIds valid',
  );

  const many = selectWeightedMathSessionTasks(200, { seed: 99, shuffleOrder: false });
  const tierCounts = { CORE_HIGH: 0, CORE_MEDIUM: 0, SUPPORT: 0, EXTENSION: 0 };
  let m29 = 0;
  let m17 = 0;
  let shareOps = 0;
  for (const task of many) {
    const w = getMathSkillWeightBySkillId(task.skillId ?? '');
    if (w) tierCounts[w.tier] += 1;
    if (w?.code === 'M29') m29 += 1;
    if (w?.code === 'M17') m17 += 1;
    if (task.generatorParams && (task.generatorParams as { op?: string }).op === 'share') {
      shareOps += 1;
    }
    if (task.generatorParams && (task.generatorParams as { plot?: string }).plot === 'share') {
      shareOps += 1;
    }
  }
  check(tierCounts.CORE_HIGH > tierCounts.SUPPORT, 'session CORE_HIGH > SUPPORT');
  check(m29 >= 1, `session has M29 ${m29}`);
  check(m17 < m29 || m17 <= Math.ceil(200 * 0.08), `M17 not dominant ${m17} vs M29 ${m29}`);
  check(shareOps / many.length <= FRACTIONS_SHARES_POLICY.maxShareOfHostSeries + 0.1, `share capped ${shareOps}`);

  // Repository pool covers all skills
  const bank = taskRepository.getMathTasks();
  const skillIdsInBank = new Set(bank.map((t) => t.skillId).filter(Boolean));
  check(skillIdsInBank.size >= 35, `bank skills ${skillIdsInBank.size}`);
  for (const skill of MATH_SKILLS) {
    check(skillIdsInBank.has(skill.id), `bank has ${skill.code}`);
  }

  // Same counts as useTrainingStore.pickMathTasks (quick=5, random=10)
  const viaStoreQuick = selectWeightedMathSessionTasks(5, { seed: 501 });
  const viaStoreRandom = selectWeightedMathSessionTasks(10, { seed: 502 });
  check(viaStoreQuick.length === 5, 'store quick');
  check(viaStoreRandom.length === 10, 'store random');

  // Topic: one topic only
  const topicId = 'math.word_problems.general';
  const topicTasks = taskRepository.getByTopic(topicId).filter((t) => t.subject === 'mathematics');
  check(topicTasks.length > 0, 'topic has tasks');
  check(
    topicTasks.every((t) => t.topicId === topicId),
    'topic filter intact',
  );

  // Weak / adaptive: weakness > weights (ADD weak, SUB strong)
  const USER = 'sel-user';
  const ADD = 'math.calculation.multi_digit.addition';
  const SUB = 'math.calculation.multi_digit.subtraction';
  const attempts = [
    {
      attemptId: 'a1',
      userId: USER,
      questionId: 'q1',
      sessionId: 's1',
      date: '2026-08-20T10:00:00.000Z',
      answer: '1',
      isCorrect: false,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'mathematics' as const,
      topic: 't',
      skill: 's',
      topicId: 'math.calculation.multi_digit',
      skillId: ADD,
      mode: 'quick' as const,
    },
    {
      attemptId: 'a2',
      userId: USER,
      questionId: 'q2',
      sessionId: 's1',
      date: '2026-08-20T11:00:00.000Z',
      answer: '1',
      isCorrect: false,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'mathematics' as const,
      topic: 't',
      skill: 's',
      topicId: 'math.calculation.multi_digit',
      skillId: ADD,
      mode: 'quick' as const,
    },
    {
      attemptId: 'b1',
      userId: USER,
      questionId: 'q3',
      sessionId: 's1',
      date: '2026-08-20T10:00:00.000Z',
      answer: '1',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'mathematics' as const,
      topic: 't',
      skill: 's',
      topicId: 'math.calculation.multi_digit',
      skillId: SUB,
      mode: 'quick' as const,
    },
    {
      attemptId: 'b2',
      userId: USER,
      questionId: 'q4',
      sessionId: 's1',
      date: '2026-08-20T11:00:00.000Z',
      answer: '1',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'mathematics' as const,
      topic: 't',
      skill: 's',
      topicId: 'math.calculation.multi_digit',
      skillId: SUB,
      mode: 'quick' as const,
    },
    {
      attemptId: 'b3',
      userId: USER,
      questionId: 'q5',
      sessionId: 's1',
      date: '2026-08-20T12:00:00.000Z',
      answer: '1',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'mathematics' as const,
      topic: 't',
      skill: 's',
      topicId: 'math.calculation.multi_digit',
      skillId: SUB,
      mode: 'quick' as const,
    },
  ];
  const weakPick = selectAdaptiveTasks({
    userId: USER,
    subject: 'mathematics',
    count: 5,
    attempts,
    tasks: taskRepository.getMathTasks(),
    skills: MATH_SKILLS,
    nowIso: '2026-08-22T12:00:00.000Z',
  });
  check(weakPick.length === 5, `weak length ${weakPick.length}`);
  check(weakPick[0]?.skillId === ADD, `weak prefers ADD got ${weakPick[0]?.skillId}`);

  // Review / mistakes empty-safe
  check(selectReviewTasks([], USER).length === 0, 'review empty');
  check(selectMistakeTasks([], USER).length === 0, 'mistakes empty');

  // Exam disabled path: no crash on unknown mode default bank
  check(taskRepository.getMathTasks().length > 35, 'bank expanded');

  void CORE_HIGH;
  void SUPPORT;

  return failures;
}

export function reportMathTrainingSelectionSelfChecks(): void {
  const f = runMathTrainingSelectionSelfChecks();
  if (f.length) {
    throw new Error(`Math training selection self-check failed:\n- ${f.join('\n- ')}`);
  }
  console.log('Math training selection self-check: OK');
}
