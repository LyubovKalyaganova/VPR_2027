/**
 * Self-check: weighted World training selection + real sessions.
 */
import { WORLD_SKILL_COUNT, WORLD_SKILLS } from '../../data/taxonomy/world';
import {
  assertNoWorldSkillBeyondW25,
  hasGeneratorForWorldSkillCode,
  selectWeightedWorldSessionTasks,
} from './worldTrainingSelection';
import { selectWeightedMathSessionTasks } from '../mathematics/mathTrainingSelection';
import { selectWeightedRussianSessionTasks } from '../russian/russianTrainingSelection';
import {
  EXTENSION_CAP,
  WORLD_SKILL_WEIGHTS,
  getWorldSkillWeightBySkillId,
  recommendWorldSessionSkillMix,
} from './worldTrainingWeights';
import { selectAdaptiveTasks } from '../../services/adaptiveTaskSelector';
import { taskRepository } from '../../services/taskRepository';

export function runWorldTrainingSelectionSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  try {
    assertNoWorldSkillBeyondW25();
  } catch (error) {
    failures.push(String(error));
  }

  check(WORLD_SKILLS.length === WORLD_SKILL_COUNT, `skills ${WORLD_SKILLS.length}`);
  check(WORLD_SKILL_WEIGHTS.length === 25, 'weights 25');

  for (const skill of WORLD_SKILLS) {
    check(hasGeneratorForWorldSkillCode(skill.code), `generator ${skill.code}`);
  }

  const quick = selectWeightedWorldSessionTasks(5, { seed: 42, shuffleOrder: false });
  const normal = selectWeightedWorldSessionTasks(10, { seed: 43, shuffleOrder: false });
  const random = selectWeightedWorldSessionTasks(10, { seed: Date.now() >>> 0, shuffleOrder: false });
  check(quick.length === 5, `quick ${quick.length}`);
  check(normal.length === 10, `normal ${normal.length}`);
  check(random.length === 10, `random ${random.length}`);
  check(
    quick.every((t) => WORLD_SKILLS.some((s) => s.id === t.skillId)),
    'quick skillIds',
  );
  check(quick.every((t) => t.subject === 'world'), 'quick subject world');

  const many = selectWeightedWorldSessionTasks(200, { seed: 99, shuffleOrder: false });
  let coreHigh = 0;
  let coreMedium = 0;
  let support = 0;
  let w02 = 0;
  let w04 = 0;
  let w10 = 0;
  let w25 = 0;
  let w21 = 0;
  let w22 = 0;
  let w24 = 0;
  let extension = 0;
  for (const task of many) {
    const w = getWorldSkillWeightBySkillId(task.skillId ?? '');
    if (w?.tier === 'CORE_HIGH') coreHigh += 1;
    if (w?.tier === 'CORE_MEDIUM') coreMedium += 1;
    if (w?.tier === 'SUPPORT') support += 1;
    if (w?.tier === 'EXTENSION') extension += 1;
    if (w?.code === 'W02') w02 += 1;
    if (w?.code === 'W04') w04 += 1;
    if (w?.code === 'W10') w10 += 1;
    if (w?.code === 'W25') w25 += 1;
    if (w?.code === 'W21') w21 += 1;
    if (w?.code === 'W22') w22 += 1;
    if (w?.code === 'W24') w24 += 1;
  }
  check(coreHigh > coreMedium, `CORE_HIGH ${coreHigh} > CORE_MEDIUM ${coreMedium}`);
  check(coreMedium > support, `CORE_MEDIUM ${coreMedium} > SUPPORT ${support}`);
  check(w02 >= 1 && w04 >= 1 && w10 >= 1 && w25 >= 1, `boost skills W02=${w02} W04=${w04} W10=${w10} W25=${w25}`);
  check(w21 + w22 + w24 < w02, 'extension skills do not dominate');
  check(extension / many.length <= EXTENSION_CAP + 0.05, `extension cap ${extension}`);

  const mix = recommendWorldSessionSkillMix(500, 777);
  check(mix.length === 500, 'mix length');
  check(!mix.some((c) => c === ('W26' as never)), 'no W26 in mix');

  const bank = taskRepository.getWorldTasks();
  const skillIdsInBank = new Set(bank.map((t) => t.skillId).filter(Boolean));
  check(skillIdsInBank.size >= 25, `bank skills ${skillIdsInBank.size}`);

  const USER = 'world-sel-user';
  const WEAK_SKILL = 'world.nature.weather';
  const STRONG_SKILL = 'world.nature.geography';
  const attempts = [
    {
      attemptId: 'w1',
      userId: USER,
      questionId: 'q1',
      sessionId: 's1',
      date: '2026-08-20T10:00:00.000Z',
      answer: 'x',
      isCorrect: false,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'world' as const,
      topic: 't',
      skill: 's',
      topicId: 'world.nature.weather',
      skillId: WEAK_SKILL,
      mode: 'weak' as const,
    },
    {
      attemptId: 'w2',
      userId: USER,
      questionId: 'q2',
      sessionId: 's1',
      date: '2026-08-21T10:00:00.000Z',
      answer: 'ok',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'world' as const,
      topic: 't',
      skill: 's',
      topicId: 'world.nature.geography',
      skillId: STRONG_SKILL,
      mode: 'normal' as const,
    },
  ];
  const adaptive = selectAdaptiveTasks({
    userId: USER,
    subject: 'world',
    count: 5,
    attempts,
    tasks: taskRepository.getBySubject('world'),
    skills: WORLD_SKILLS,
  });
  check(adaptive.length === 5, `adaptive weak ${adaptive.length}`);
  check(
    adaptive.filter((t) => t.skillId === WEAK_SKILL).length >=
      adaptive.filter((t) => t.skillId === STRONG_SKILL).length,
    'weakness prioritized',
  );

  const coldStart = selectAdaptiveTasks({
    userId: 'cold-world',
    subject: 'world',
    count: 5,
    attempts: [],
    tasks: taskRepository.getBySubject('world'),
    skills: WORLD_SKILLS,
  });
  check(coldStart.length === 5, 'cold start length');

  const topicTasks = taskRepository.getByTopic('world.nature.weather').filter((t) => t.subject === 'world');
  check(topicTasks.length > 0, 'topic tasks');

  const mathSess = selectWeightedMathSessionTasks(10, { seed: 1 });
  check(mathSess.every((t) => t.subject === 'mathematics'), 'math session isolation');
  const rusSess = selectWeightedRussianSessionTasks(10, { seed: 1 });
  check(rusSess.every((t) => t.subject === 'russian'), 'russian session isolation');
  const worldSess = selectWeightedWorldSessionTasks(10, { seed: 1 });
  check(worldSess.every((t) => t.subject === 'world'), 'world session isolation');
  check(!taskRepository.getWorldTasks().some((t) => t.subject !== 'world'), 'repo world pure');
  check(!taskRepository.getMathTasks().some((t) => t.subject === 'world'), 'repo math no world');
  check(!taskRepository.getRussianTasks().some((t) => t.subject === 'world'), 'repo russian no world');

  return failures;
}

export function reportWorldTrainingSelectionSelfChecks(): void {
  const failures = runWorldTrainingSelectionSelfChecks();
  if (failures.length) {
    throw new Error(`World training selection self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('World training selection self-check: OK');
}
