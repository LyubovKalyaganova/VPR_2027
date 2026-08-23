/**
 * Weighted selection + sessions + isolation for reading.
 */
import { READING_SKILL_COUNT, READING_SKILLS } from '../../data/taxonomy/literaryReading';
import {
  assertNoReadingSkillBeyondL24,
  hasGeneratorForReadingSkillCode,
  selectWeightedReadingSessionTasks,
} from './literaryReadingTrainingSelection';
import { selectWeightedMathSessionTasks } from '../mathematics/mathTrainingSelection';
import { selectWeightedRussianSessionTasks } from '../russian/russianTrainingSelection';
import { selectWeightedWorldSessionTasks } from '../world/worldTrainingSelection';
import {
  EXTENSION_CAP,
  READING_SKILL_WEIGHTS,
  getReadingSkillWeightBySkillId,
  recommendReadingSessionSkillMix,
} from './literaryReadingTrainingWeights';
import { selectAdaptiveTasks } from '../../services/adaptiveTaskSelector';
import { taskRepository } from '../../services/taskRepository';

export function runReadingTrainingSelectionSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  try {
    assertNoReadingSkillBeyondL24();
  } catch (error) {
    failures.push(String(error));
  }

  check(READING_SKILLS.length === READING_SKILL_COUNT, `skills ${READING_SKILLS.length}`);
  check(READING_SKILL_WEIGHTS.length === 24, 'weights 24');

  for (const skill of READING_SKILLS) {
    check(hasGeneratorForReadingSkillCode(skill.code), `generator ${skill.code}`);
  }

  const quick = selectWeightedReadingSessionTasks(5, { seed: 42, shuffleOrder: false });
  const normal = selectWeightedReadingSessionTasks(10, { seed: 43, shuffleOrder: false });
  check(quick.length === 5, `quick ${quick.length}`);
  check(normal.length === 10, `normal ${normal.length}`);
  check(quick.every((t) => t.subject === 'reading'), 'quick subject');
  check(normal.every((t) => READING_SKILLS.some((s) => s.id === t.skillId)), 'normal skillIds');

  const many = selectWeightedReadingSessionTasks(200, { seed: 99, shuffleOrder: false });
  let coreHigh = 0;
  let coreMedium = 0;
  let support = 0;
  let extension = 0;
  let l03 = 0;
  let l12 = 0;
  let l13 = 0;
  let l24 = 0;
  for (const task of many) {
    const w = getReadingSkillWeightBySkillId(task.skillId ?? '');
    if (w?.tier === 'CORE_HIGH') coreHigh += 1;
    if (w?.tier === 'CORE_MEDIUM') coreMedium += 1;
    if (w?.tier === 'SUPPORT') support += 1;
    if (w?.tier === 'EXTENSION') extension += 1;
    if (w?.code === 'L03') l03 += 1;
    if (w?.code === 'L12') l12 += 1;
    if (w?.code === 'L13') l13 += 1;
    if (w?.code === 'L24') l24 += 1;
  }
  check(coreHigh > coreMedium, `CORE_HIGH ${coreHigh} > CORE_MEDIUM ${coreMedium}`);
  check(coreMedium > support, `CORE_MEDIUM ${coreMedium} > SUPPORT ${support}`);
  check(l03 + l12 + l13 + l24 >= 4, 'boost skills present');
  check(extension / many.length <= EXTENSION_CAP + 0.05, `extension cap ${extension}`);

  check(recommendReadingSessionSkillMix(500, 777).length === 500, 'mix length');

  const bank = taskRepository.getLiteraryReadingTasks();
  check(new Set(bank.map((t) => t.skillId)).size >= 24, `bank skills`);

  const USER = 'read-sel-user';
  const WEAK = 'reading.genres.folklore';
  const STRONG = 'reading.characters.compare';
  const attempts = [
    {
      attemptId: 'rd1',
      userId: USER,
      questionId: 'q1',
      sessionId: 's1',
      date: '2026-08-20T10:00:00.000Z',
      answer: 'x',
      isCorrect: false,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'reading' as const,
      topic: 't',
      skill: 's',
      topicId: 'reading.genres.folklore',
      skillId: WEAK,
      mode: 'weak' as const,
    },
    {
      attemptId: 'rd2',
      userId: USER,
      questionId: 'q2',
      sessionId: 's1',
      date: '2026-08-21T10:00:00.000Z',
      answer: 'ok',
      isCorrect: true,
      timeSpent: 1000,
      hintsUsed: 0 as const,
      difficulty: 2 as const,
      subject: 'reading' as const,
      topic: 't',
      skill: 's',
      topicId: 'reading.characters.hero',
      skillId: STRONG,
      mode: 'normal' as const,
    },
  ];

  const adaptive = selectAdaptiveTasks({
    userId: USER,
    subject: 'reading',
    count: 5,
    attempts,
    tasks: taskRepository.getBySubject('reading'),
    skills: READING_SKILLS,
  });
  check(adaptive.length === 5, `adaptive ${adaptive.length}`);
  check(
    adaptive.filter((t) => t.skillId === WEAK).length >= adaptive.filter((t) => t.skillId === STRONG).length,
    'weakness prioritized',
  );

  const cold = selectAdaptiveTasks({
    userId: 'cold-read',
    subject: 'reading',
    count: 5,
    attempts: [],
    tasks: taskRepository.getBySubject('reading'),
    skills: READING_SKILLS,
  });
  check(cold.length === 5, 'cold start');

  check(selectWeightedMathSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'mathematics'), 'math iso');
  check(selectWeightedRussianSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'russian'), 'rus iso');
  check(selectWeightedWorldSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'world'), 'world iso');
  check(selectWeightedReadingSessionTasks(5, { seed: 1 }).every((t) => t.subject === 'reading'), 'read iso');
  check(!taskRepository.getLiteraryReadingTasks().some((t) => t.subject !== 'reading'), 'repo pure');

  const topicTasks = taskRepository.getByTopic('reading.genres.folklore').filter((t) => t.subject === 'reading');
  check(topicTasks.length > 0, 'topic tasks');

  return failures;
}

export function reportReadingTrainingSelectionSelfChecks(): void {
  const failures = runReadingTrainingSelectionSelfChecks();
  if (failures.length) {
    throw new Error(`Reading training selection self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Reading training selection self-check: OK');
}

export const reportLiteraryReadingTrainingSelectionSelfChecks = reportReadingTrainingSelectionSelfChecks;
