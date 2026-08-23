/**
 * Self-check: weighted Russian training selection + real sessions.
 */
import { RUSSIAN_SKILL_COUNT, RUSSIAN_SKILLS } from '../../data/taxonomy/russian';
import {
  assertNoRussianSkillBeyondR25,
  hasGeneratorForRussianSkillCode,
  selectWeightedRussianSessionTasks,
} from './russianTrainingSelection';
import { selectWeightedMathSessionTasks } from '../mathematics/mathTrainingSelection';
import {
  EXTENSION_CAP,
  RUSSIAN_SKILL_WEIGHTS,
  getRussianSkillWeightBySkillId,
  recommendRussianSessionSkillMix,
} from './russianTrainingWeights';
import { selectAdaptiveTasks } from '../../services/adaptiveTaskSelector';
import { taskRepository } from '../../services/taskRepository';

export function runRussianTrainingSelectionSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  try {
    assertNoRussianSkillBeyondR25();
  } catch (error) {
    failures.push(String(error));
  }

  check(RUSSIAN_SKILLS.length === RUSSIAN_SKILL_COUNT, `skills ${RUSSIAN_SKILLS.length}`);
  check(RUSSIAN_SKILL_WEIGHTS.length === 25, 'weights 25');

  for (const skill of RUSSIAN_SKILLS) {
    check(hasGeneratorForRussianSkillCode(skill.code), `generator ${skill.code}`);
  }

  const quick = selectWeightedRussianSessionTasks(5, { seed: 42, shuffleOrder: false });
  const normal = selectWeightedRussianSessionTasks(10, { seed: 43, shuffleOrder: false });
  check(quick.length === 5, `quick ${quick.length}`);
  check(normal.length === 10, `normal ${normal.length}`);
  check(
    quick.every((t) => RUSSIAN_SKILLS.some((s) => s.id === t.skillId)),
    'quick skillIds',
  );

  const many = selectWeightedRussianSessionTasks(200, { seed: 99, shuffleOrder: false });
  let coreHigh = 0;
  let support = 0;
  let r24 = 0;
  let r25 = 0;
  let r18 = 0;
  let r19 = 0;
  let r23 = 0;
  let r07 = 0;
  let extension = 0;
  for (const task of many) {
    const w = getRussianSkillWeightBySkillId(task.skillId ?? '');
    if (w?.tier === 'CORE_HIGH') coreHigh += 1;
    if (w?.tier === 'SUPPORT') support += 1;
    if (w?.tier === 'EXTENSION') extension += 1;
    if (w?.code === 'R24') r24 += 1;
    if (w?.code === 'R25') r25 += 1;
    if (w?.code === 'R18') r18 += 1;
    if (w?.code === 'R19') r19 += 1;
    if (w?.code === 'R23') r23 += 1;
    if (w?.code === 'R07') r07 += 1;
  }
  check(coreHigh > support, `CORE_HIGH ${coreHigh} > SUPPORT ${support}`);
  check(r18 + r19 + r23 > r24 + r25, 'text/reasoning > support');
  check(r07 >= 1, `R07 present ${r07}`);
  check(extension / many.length <= EXTENSION_CAP + 0.05, `extension cap ${extension}`);

  const mix = recommendRussianSessionSkillMix(500, 777);
  check(mix.length === 500, 'mix length');
  check(!mix.some((c) => c === ('R26' as never)), 'no R26 in mix');

  const bank = taskRepository.getRussianTasks();
  const skillIdsInBank = new Set(bank.map((t) => t.skillId).filter(Boolean));
  check(skillIdsInBank.size >= 25, `bank skills ${skillIdsInBank.size}`);

  const USER = 'rus-sel-user';
  const WEAK_SKILL = 'russian.orthography.base';
  const STRONG_SKILL = 'russian.syntax.simple_complex';
  const attempts = [
    {
      attemptId: 'r1',
      userId: USER,
      questionId: 'q1',
      sessionId: 's1',
      date: '2026-08-20T10:00:00.000Z',
      answer: 'x',
      isCorrect: false,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'russian' as const,
      topic: 't',
      skill: 's',
      topicId: 'russian.orthography.spelling',
      skillId: WEAK_SKILL,
      mode: 'weak' as const,
    },
    {
      attemptId: 'r2',
      userId: USER,
      questionId: 'q2',
      sessionId: 's1',
      date: '2026-08-21T10:00:00.000Z',
      answer: 'ok',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'russian' as const,
      topic: 't',
      skill: 's',
      topicId: 'russian.syntax.base',
      skillId: STRONG_SKILL,
      mode: 'normal' as const,
    },
  ];
  const adaptive = selectAdaptiveTasks({
    userId: USER,
    subject: 'russian',
    count: 5,
    attempts,
    tasks: taskRepository.getBySubject('russian'),
    skills: RUSSIAN_SKILLS,
  });
  check(adaptive.length === 5, `adaptive weak ${adaptive.length}`);
  check(
    adaptive.filter((t) => t.skillId === WEAK_SKILL).length >=
      adaptive.filter((t) => t.skillId === STRONG_SKILL).length,
    'weakness prioritized',
  );

  const coldStart = selectAdaptiveTasks({
    userId: 'cold-rus',
    subject: 'russian',
    count: 5,
    attempts: [],
    tasks: taskRepository.getBySubject('russian'),
    skills: RUSSIAN_SKILLS,
  });
  check(coldStart.length === 5, 'cold start length');

  // Subject isolation
  const mathSess = selectWeightedMathSessionTasks(10, { seed: 1 });
  check(mathSess.every((t) => t.subject === 'mathematics'), 'math session isolation');
  const rusSess = selectWeightedRussianSessionTasks(10, { seed: 1 });
  check(rusSess.every((t) => t.subject === 'russian'), 'russian session isolation');
  check(!taskRepository.getRussianTasks().some((t) => t.subject !== 'russian'), 'repo russian pure');
  check(!taskRepository.getMathTasks().some((t) => t.subject === 'russian'), 'repo math no russian');

  return failures;
}

export function reportRussianTrainingSelectionSelfChecks(): void {
  const failures = runRussianTrainingSelectionSelfChecks();
  if (failures.length) {
    throw new Error(`Russian training selection self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Russian training selection self-check: OK');
}
