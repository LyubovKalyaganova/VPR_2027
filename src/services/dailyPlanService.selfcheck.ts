import type { Attempt, Difficulty, Task } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { createDailyPlan, splitDailyPlanQuotas } from './dailyPlanService';
import { calculateSkillMastery, isWeakSkill } from './masteryService';
import { getReviewState } from './reviewScheduler';
import { taskRepository } from './taskRepository';

const USER = 'user-daily';
const OTHER = 'user-other';
const ADD = 'math.calculation.multi_digit.addition';
const SUB = 'math.calculation.multi_digit.subtraction';
const MUL = 'math.calculation.mul_div.multiplication';
const NOW = '2026-08-21T12:00:00.000Z';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'isCorrect'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? 'attempt-1',
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId ?? 'math-training-001',
    sessionId: overrides.sessionId ?? 'session-1',
    date: overrides.date ?? '2026-08-20T12:00:00.000Z',
    answer: overrides.answer ?? '1',
    isCorrect: overrides.isCorrect,
    timeSpent: overrides.timeSpent ?? 4000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 3,
    subject: overrides.subject ?? 'mathematics',
    topic: overrides.topic ?? 'Сложение',
    skill: overrides.skill ?? 'Сложение',
    topicId: 'topicId' in overrides ? overrides.topicId : 'math.calculation.multi_digit',
    skillId: 'skillId' in overrides ? overrides.skillId : ADD,
    mode: overrides.mode ?? 'quick',
  };
}

function fakeTask(id: string, skillId: string, difficulty: Difficulty = 3): Task {
  return {
    id,
    subject: 'mathematics',
    section: 'Тест',
    topic: 'Тест',
    skill: skillId,
    topicId: skillId.includes('mul_div') ? 'math.calculation.mul_div' : 'math.calculation.multi_digit',
    skillId,
    difficulty,
    vprVersion: 2027,
    taskType: 'numberAnswer',
    question: id,
    correctAnswer: 1,
    explanation: 'тест',
    sourceType: 'training',
  };
}

function bankFor(...skillIds: string[]): Task[] {
  const tasks: Task[] = [];
  for (const skillId of skillIds) {
    for (let index = 1; index <= 8; index += 1) {
      tasks.push(fakeTask(`plan-${skillId}-${index}`, skillId, ((index % 5) + 1) as Difficulty));
    }
  }
  return tasks;
}

function plan(overrides: Partial<Parameters<typeof createDailyPlan>[0]> & { attempts: Attempt[]; count: number }) {
  return createDailyPlan({
    userId: USER,
    subject: 'mathematics',
    tasks: taskRepository.getMathTasks(),
    skills: MATH_SKILLS,
    nowIso: NOW,
    ...overrides,
  });
}

function uniqueIds(result: ReturnType<typeof createDailyPlan>): boolean {
  return new Set(result.items.map((item) => item.taskId)).size === result.items.length;
}

function sourceCount(result: ReturnType<typeof createDailyPlan>, source: 'weak' | 'review' | 'reinforcement'): number {
  return result.items.filter((item) => item.source === source).length;
}

export function runDailyPlanSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const quotas5 = splitDailyPlanQuotas(5);
  check(quotas5.weak === 3 && quotas5.review === 1 && quotas5.reinforcement === 1, 'квоты count=5: 3/1/1');
  const quotas10 = splitDailyPlanQuotas(10);
  check(quotas10.weak === 6 && quotas10.review === 2 && quotas10.reinforcement === 2, 'квоты count=10: 6/2/2');

  const originalBank = taskRepository.getMathTasks();
  const originalIds = originalBank.map((task) => task.id).join(',');

  const newChild = plan({ attempts: [], count: 5 });
  check(newChild.items.length > 0, 'A: новый ребёнок получает план');
  check(newChild.items.length <= 5, 'A: не больше count');
  check(uniqueIds(newChild), 'A: задания уникальны');
  check(
    newChild.items.every((item) => item.source === 'reinforcement'),
    'A: без истории план идёт из закрепления',
  );
  check(newChild.createdAt === NOW, 'A: createdAt = nowIso');
  check(newChild.userId === USER && newChild.subject === 'mathematics', 'A: userId и subject заполнены');

  const emptyBank = plan({ attempts: [], count: 5, tasks: [] });
  check(emptyBank.items.length === 0 && emptyBank.totalCount === 0, 'B: пустой банк → пустой план');

  const weakAttempts = [
    attempt({ attemptId: 'w1', isCorrect: false, date: '2026-08-21T10:00:00.000Z', skillId: ADD }),
    attempt({ attemptId: 'w2', isCorrect: false, date: '2026-08-21T11:00:00.000Z', skillId: ADD, questionId: 'math-training-003' }),
    attempt({ attemptId: 'w3', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: ADD, questionId: 'math-training-004' }),
    attempt({ attemptId: 's1', isCorrect: true, date: '2026-08-21T10:00:00.000Z', skillId: SUB, questionId: 'math-training-002' }),
    attempt({ attemptId: 's2', isCorrect: true, date: '2026-08-21T11:00:00.000Z', skillId: SUB, questionId: 'math-training-006' }),
    attempt({ attemptId: 's3', isCorrect: true, date: '2026-08-21T11:20:00.000Z', skillId: SUB, questionId: 'math-training-008' }),
    attempt({ attemptId: 's4', isCorrect: true, date: '2026-08-21T11:40:00.000Z', skillId: SUB, questionId: 'math-training-010' }),
    attempt({ attemptId: 's5', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: SUB, questionId: 'q-sub-5' }),
  ];
  check(isWeakSkill(calculateSkillMastery(weakAttempts, ADD, USER)), 'C: ADD слабый по masteryService');
  check(!isWeakSkill(calculateSkillMastery(weakAttempts, SUB, USER)), 'C: SUB не слабый');
  check(getReviewState(calculateSkillMastery(weakAttempts, ADD, USER), NOW).isReviewDue === false, 'C: ADD не due в NOW');
  const weakPlan = plan({ attempts: weakAttempts, count: 5 });
  check(sourceCount(weakPlan, 'weak') >= 3, `C: слабый навык получает приоритет, weak=${sourceCount(weakPlan, 'weak')}`);
  check(
    weakPlan.items.filter((item) => item.skillId === ADD).length >=
      weakPlan.items.filter((item) => item.skillId === SUB).length,
    'C: заданий слабого навыка не меньше, чем сильного',
  );

  const dueAttempts = [
    attempt({ attemptId: 'due1', isCorrect: true, date: '2026-08-20T12:00:00.000Z', skillId: SUB, questionId: 'math-training-002' }),
  ];
  check(getReviewState(calculateSkillMastery(dueAttempts, SUB, USER), NOW).isReviewDue === true, 'D: SUB due на NOW');
  const duePlan = plan({ attempts: dueAttempts, count: 5 });
  check(
    duePlan.items.some((item) => item.skillId === SUB && item.source === 'review'),
    'D: due-навык попадает в план как review',
  );

  const dueVsRecent = [
    attempt({ attemptId: 'old-due', isCorrect: true, date: '2026-08-19T12:00:00.000Z', skillId: ADD }),
    attempt({ attemptId: 'recent-w1', isCorrect: false, date: '2026-08-21T10:00:00.000Z', skillId: SUB, questionId: 'math-training-002' }),
    attempt({ attemptId: 'recent-w2', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: SUB, questionId: 'math-training-006' }),
  ];
  check(getReviewState(calculateSkillMastery(dueVsRecent, ADD, USER), NOW).isReviewDue === true, 'E: ADD due');
  check(getReviewState(calculateSkillMastery(dueVsRecent, SUB, USER), NOW).isReviewDue === false, 'E: SUB не due');
  const dueKept = plan({ attempts: dueVsRecent, count: 5 });
  check(
    dueKept.items.some((item) => item.skillId === ADD && item.source === 'review'),
    'E: due-навык не теряется рядом с недавним не-due',
  );

  const twoWeak = [
    attempt({ attemptId: 'aw1', isCorrect: false, date: '2026-08-21T10:00:00.000Z', skillId: ADD }),
    attempt({ attemptId: 'aw2', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: ADD, questionId: 'math-training-003' }),
    attempt({ attemptId: 'bw1', isCorrect: false, date: '2026-08-21T10:00:00.000Z', skillId: SUB, questionId: 'math-training-002' }),
    attempt({ attemptId: 'bw2', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: SUB, questionId: 'math-training-006' }),
  ];
  const twoWeakPlan = plan({ attempts: twoWeak, count: 5 });
  const weakSkillIds = new Set(twoWeakPlan.items.filter((item) => item.source === 'weak').map((item) => item.skillId));
  check(weakSkillIds.size >= 2, `F: несколько weak-навыков участвуют, было ${[...weakSkillIds].join(',')}`);
  let consecutive = 1;
  let maxConsecutive = 1;
  for (let index = 1; index < twoWeakPlan.items.length; index += 1) {
    if (twoWeakPlan.items[index].skillId === twoWeakPlan.items[index - 1].skillId) {
      consecutive += 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 1;
    }
  }
  check(maxConsecutive <= 2, `F: нет бесконечного повторения одного skillId, подряд ${maxConsecutive}`);

  const onlyStrong = [
    attempt({ attemptId: 'ok1', isCorrect: true, date: '2026-08-21T10:00:00.000Z', skillId: ADD }),
    attempt({ attemptId: 'ok2', isCorrect: true, date: '2026-08-21T11:00:00.000Z', skillId: ADD, questionId: 'math-training-003' }),
  ];
  check(getReviewState(calculateSkillMastery(onlyStrong, ADD, USER), NOW).isReviewDue === false, 'G: сильный навык сегодня не due');
  const reinforcementPlan = plan({ attempts: onlyStrong, count: 5 });
  check(reinforcementPlan.items.length === 5, 'G: план заполняется при недостатке weak/review');
  check(sourceCount(reinforcementPlan, 'reinforcement') >= 4, 'G: свободные места уходят в закрепление');

  const errorAttempts = [attempt({ attemptId: 'err', isCorrect: false, date: NOW, skillId: ADD })];
  const errorMastery = calculateSkillMastery(errorAttempts, ADD, USER);
  check(isWeakSkill(errorMastery), 'H: ошибка делает навык weak');
  check(getReviewState(errorMastery, NOW).reviewIntervalDays === 0, 'H: ошибка → интервал 0');
  check(getReviewState(errorMastery, NOW).isReviewDue === true, 'H: ошибка → due');
  const errorPlan = plan({ attempts: errorAttempts, count: 5 });
  check(
    errorPlan.items.some((item) => item.skillId === ADD),
    'H: навык с последней ошибкой присутствует в плане',
  );

  const demo = attempt({
    attemptId: 'demo',
    isCorrect: false,
    date: NOW,
    questionId: 'demo-math-single-1',
    skillId: undefined,
    topicId: undefined,
  });
  const demoPlan = plan({ attempts: [demo], count: 5 });
  check(
    demoPlan.items.every((item) => item.source === 'reinforcement'),
    'I: DEMO без skillId не создаёт weak/review',
  );
  check(calculateSkillMastery([demo], ADD, USER).status === 'new', 'I: DEMO не меняет SkillMastery');

  const stranger = attempt({ attemptId: 'x', isCorrect: false, date: NOW, userId: OTHER, skillId: ADD });
  const strangerPlan = plan({ attempts: [stranger], count: 5 });
  check(
    strangerPlan.items.every((item) => item.source === 'reinforcement'),
    'J: чужой userId не влияет на weak/review',
  );

  check(uniqueIds(newChild) && uniqueIds(weakPlan) && uniqueIds(duePlan), 'K: taskId не дублируется');

  const oversized = plan({ attempts: [], count: 100 });
  check(oversized.items.length <= originalBank.length, 'L: count больше банка → только реальные задания');
  check(uniqueIds(oversized), 'L: уникальность при большом count');

  const excludeId = 'math-training-001';
  const excluded = plan({
    attempts: [],
    count: 5,
    excludeQuestionIds: [excludeId],
  });
  check(
    excluded.items.every((item) => item.taskId !== excludeId),
    'M: excludeQuestionIds не используется, пока есть альтернативы',
  );
  check(excluded.items.length > 0, 'M: план всё равно создаётся');

  const oneCorrect = [attempt({ attemptId: 'n1', isCorrect: true, date: '2026-08-20T12:00:00.000Z', skillId: ADD })];
  const futurePlan = plan({ attempts: oneCorrect, count: 5, nowIso: '2026-08-20T12:00:00.000Z' });
  const dueNowPlan = plan({ attempts: oneCorrect, count: 5, nowIso: '2026-08-21T12:00:00.000Z' });
  check(
    futurePlan.items.every((item) => item.source !== 'review' || item.skillId !== ADD),
    'N: в момент ответа навык ещё не due',
  );
  check(
    dueNowPlan.items.some((item) => item.skillId === ADD && item.source === 'review'),
    'N: на следующий день due определяется по nowIso',
  );

  const threeSourceAttempts = [
    attempt({ attemptId: 'tw1', isCorrect: false, date: '2026-08-21T10:00:00.000Z', skillId: ADD }),
    attempt({ attemptId: 'tw2', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: ADD, questionId: 'add-2' }),
    attempt({ attemptId: 'tr1', isCorrect: true, date: '2026-08-20T12:00:00.000Z', skillId: SUB, questionId: 'sub-1' }),
    attempt({ attemptId: 'tf1', isCorrect: true, date: '2026-08-21T10:00:00.000Z', skillId: MUL, questionId: 'mul-1' }),
    attempt({ attemptId: 'tf2', isCorrect: true, date: '2026-08-21T12:00:00.000Z', skillId: MUL, questionId: 'mul-2' }),
  ];
  const threeBank = bankFor(ADD, SUB, MUL);
  const quotaPlan = createDailyPlan({
    userId: USER,
    subject: 'mathematics',
    count: 10,
    attempts: threeSourceAttempts,
    tasks: threeBank,
    skills: MATH_SKILLS,
    nowIso: NOW,
  });
  check(quotaPlan.totalCount === 10, `O: при достаточном банке 10 заданий, было ${quotaPlan.totalCount}`);
  check(sourceCount(quotaPlan, 'weak') === 6, `O: weak 6, было ${sourceCount(quotaPlan, 'weak')}`);
  check(sourceCount(quotaPlan, 'review') === 2, `O: review 2, было ${sourceCount(quotaPlan, 'review')}`);
  check(sourceCount(quotaPlan, 'reinforcement') === 2, `O: reinforcement 2, было ${sourceCount(quotaPlan, 'reinforcement')}`);
  check(uniqueIds(quotaPlan), 'O: уникальность при трёх источниках');

  const shortage = plan({ attempts: errorAttempts, count: 5 });
  check(shortage.items.length === 5, 'P: недостаток review/weak добирается другими источниками');
  check(shortage.items.every((item) => item.taskId.length > 0), 'P: нет пустых слотов');
  check(uniqueIds(shortage), 'P: уникальность после перераспределения');

  check(sourceCount(quotaPlan, 'weak') > 0, 'Q: weak присутствует');
  check(sourceCount(quotaPlan, 'review') > 0, 'Q: review присутствует');
  check(sourceCount(quotaPlan, 'reinforcement') > 0, 'Q: reinforcement присутствует');
  check(
    quotaPlan.items.filter((item) => item.skillId === ADD).every((item) => item.source === 'weak'),
    'Q: задания ADD помечены как weak',
  );
  check(
    quotaPlan.items.filter((item) => item.skillId === SUB).every((item) => item.source === 'review'),
    'Q: задания SUB помечены как review',
  );
  check(
    quotaPlan.items.filter((item) => item.skillId === MUL).every((item) => item.source === 'reinforcement'),
    'Q: задания MUL помечены как reinforcement',
  );

  check(originalBank.map((task) => task.id).join(',') === originalIds, 'исходный банк заданий не изменён');

  return failures;
}

export function reportDailyPlanSelfChecks(): void {
  const failures = runDailyPlanSelfChecks();
  if (failures.length > 0) {
    throw new Error(`daily plan self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportDailyPlanSelfChecks();
console.log('daily plan self-check passed');
