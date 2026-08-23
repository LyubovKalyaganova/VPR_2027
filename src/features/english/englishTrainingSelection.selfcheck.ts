/**
 * Weighted selection + sessions + isolation for English.
 */
import { ENGLISH_SKILL_COUNT, ENGLISH_SKILLS } from '../../data/taxonomy/english';
import {
  assertNoEnglishSkillBeyondE18,
  hasGeneratorForEnglishSkillCode,
  selectWeightedEnglishSessionTasks,
} from './englishTrainingSelection';
import { selectWeightedMathSessionTasks } from '../mathematics/mathTrainingSelection';
import { selectWeightedRussianSessionTasks } from '../russian/russianTrainingSelection';
import { selectWeightedWorldSessionTasks } from '../world/worldTrainingSelection';
import { selectWeightedReadingSessionTasks } from '../reading/literaryReadingTrainingSelection';
import {
  ENGLISH_SKILL_WEIGHTS,
  getEnglishSkillWeightBySkillId,
  recommendEnglishSessionSkillMix,
} from './englishTrainingWeights';
import { selectAdaptiveTasks } from '../../services/adaptiveTaskSelector';
import { taskRepository } from '../../services/taskRepository';

export function runEnglishTrainingSelectionSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  try {
    assertNoEnglishSkillBeyondE18();
  } catch (error) {
    failures.push(String(error));
  }

  check(ENGLISH_SKILLS.length === ENGLISH_SKILL_COUNT, `skills ${ENGLISH_SKILLS.length}`);
  check(ENGLISH_SKILL_WEIGHTS.length === 18, 'weights 18');

  for (const skill of ENGLISH_SKILLS) {
    check(hasGeneratorForEnglishSkillCode(skill.code), `generator ${skill.code}`);
  }

  const quick = selectWeightedEnglishSessionTasks(5, { seed: 42, shuffleOrder: false });
  const normal = selectWeightedEnglishSessionTasks(10, { seed: 43, shuffleOrder: false });
  check(quick.length === 5, `quick ${quick.length}`);
  check(normal.length === 10, `normal ${normal.length}`);
  check(quick.every((t) => t.subject === 'english'), 'quick subject');
  check(normal.every((t) => ENGLISH_SKILLS.some((s) => s.id === t.skillId)), 'normal skillIds');

  const many = selectWeightedEnglishSessionTasks(200, { seed: 99, shuffleOrder: false });
  let coreHigh = 0;
  let coreMedium = 0;
  let support = 0;
  let e14 = 0;
  let e01 = 0;
  let e04 = 0;
  let e08 = 0;
  for (const task of many) {
    const w = getEnglishSkillWeightBySkillId(task.skillId ?? '');
    if (w?.tier === 'CORE_HIGH') coreHigh += 1;
    if (w?.tier === 'CORE_MEDIUM') coreMedium += 1;
    if (w?.tier === 'SUPPORT') support += 1;
    if (w?.code === 'E14') e14 += 1;
    if (w?.code === 'E01') e01 += 1;
    if (w?.code === 'E04') e04 += 1;
    if (w?.code === 'E08') e08 += 1;
  }
  check(coreHigh > coreMedium, `CORE_HIGH ${coreHigh} > CORE_MEDIUM ${coreMedium}`);
  check(coreMedium > support, `CORE_MEDIUM ${coreMedium} > SUPPORT ${support}`);
  check(e14 >= 1, `E14 present ${e14}`);
  check(e01 >= 1 && e04 >= 1 && e08 >= 1, 'host skills present');

  check(recommendEnglishSessionSkillMix(500, 777).length === 500, 'mix length');

  const bank = taskRepository.getEnglishTasks();
  check(new Set(bank.map((t) => t.skillId)).size >= 18, `bank skills`);

  const USER = 'en-sel-user';
  const WEAK = 'english.listening.specific';
  const STRONG = 'english.lexis.world';
  const attempts = [
    {
      attemptId: 'en1',
      userId: USER,
      questionId: 'q1',
      sessionId: 's1',
      date: '2026-08-20T10:00:00.000Z',
      answer: 'x',
      isCorrect: false,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'english' as const,
      topic: 't',
      skill: 's',
      topicId: 'english.listening.comprehension',
      skillId: WEAK,
      mode: 'weak' as const,
    },
    {
      attemptId: 'en2',
      userId: USER,
      questionId: 'q2',
      sessionId: 's1',
      date: '2026-08-21T10:00:00.000Z',
      answer: 'ok',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'english' as const,
      topic: 't',
      skill: 's',
      topicId: 'english.lexis.fields',
      skillId: STRONG,
      mode: 'normal' as const,
    },
  ];

  const adaptive = selectAdaptiveTasks({
    userId: USER,
    subject: 'english',
    count: 5,
    attempts,
    tasks: taskRepository.getBySubject('english'),
    skills: ENGLISH_SKILLS,
  });
  check(adaptive.length === 5, `adaptive ${adaptive.length}`);
  check(
    adaptive.filter((t) => t.skillId === WEAK).length >= adaptive.filter((t) => t.skillId === STRONG).length,
    'weakness prioritized',
  );

  const cold = selectAdaptiveTasks({
    userId: 'cold-en',
    subject: 'english',
    count: 5,
    attempts: [],
    tasks: taskRepository.getBySubject('english'),
    skills: ENGLISH_SKILLS,
  });
  check(cold.length === 5, 'cold start');

  check(selectWeightedMathSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'mathematics'), 'math iso');
  check(selectWeightedRussianSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'russian'), 'rus iso');
  check(selectWeightedWorldSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'world'), 'world iso');
  check(selectWeightedReadingSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'reading'), 'read iso');
  check(selectWeightedEnglishSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'english'), 'english iso');
  check(!taskRepository.getEnglishTasks().some((t) => t.subject !== 'english'), 'repo pure');

  const topicTasks = taskRepository.getByTopic('english.listening.comprehension').filter((t) => t.subject === 'english');
  check(topicTasks.length > 0, 'topic tasks');

  return failures;
}

export function reportEnglishTrainingSelectionSelfChecks(): void {
  const failures = runEnglishTrainingSelectionSelfChecks();
  if (failures.length) {
    throw new Error(`English training selection self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('English training selection self-check: OK');
}
