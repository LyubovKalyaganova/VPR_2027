import type { Attempt } from '../types';
import type { DailyPlan } from './dailyPlanService';
import { getDailyPlanProgress, getRemainingDailyTaskIds } from './dailyPlanProgressService';
import { taskRepository } from './taskRepository';

const USER = 'user-daily-continuation';
const OTHER = 'user-other-continuation';
const ADD = 'math.calculation.multi_digit.addition';
const NOW = '2026-08-21T12:00:00.000Z';
const YESTERDAY = '2026-08-20T12:00:00.000Z';

function planOf(taskIds: string[]): DailyPlan {
  return {
    userId: USER,
    subject: 'mathematics',
    createdAt: NOW,
    totalCount: taskIds.length,
    items: taskIds.map((taskId) => ({
      taskId,
      skillId: ADD,
      source: 'reinforcement',
    })),
  };
}

const FIVE = planOf(['A', 'B', 'C', 'D', 'E']);

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'questionId'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `attempt-${overrides.questionId}`,
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId,
    sessionId: overrides.sessionId ?? 'session-daily-continuation',
    date: overrides.date ?? NOW,
    answer: overrides.answer ?? '1',
    isCorrect: overrides.isCorrect ?? true,
    timeSpent: overrides.timeSpent ?? 4000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 3,
    subject: overrides.subject ?? 'mathematics',
    topic: overrides.topic ?? 'Сложение',
    skill: overrides.skill ?? 'Сложение',
    topicId: 'topicId' in overrides ? overrides.topicId : 'math.calculation.multi_digit',
    skillId: 'skillId' in overrides ? overrides.skillId : ADD,
    mode: overrides.mode ?? 'daily',
  };
}

function remaining(attempts: Attempt[], plan: DailyPlan = FIVE): string[] {
  return getRemainingDailyTaskIds({
    plan,
    attempts,
    userId: USER,
    nowIso: NOW,
  });
}

function resolveTasks(taskIds: string[]) {
  const tasks = [];
  for (const taskId of taskIds) {
    const task = taskRepository.getById(taskId);
    if (task) {
      tasks.push(task);
    }
  }
  return tasks;
}

export function runDailyPlanContinuationSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  check(remaining([]).join(',') === 'A,B,C,D,E', 'A: 0/5 remaining = 5 в исходном порядке');
  check(remaining([]).length === 5, 'A: remaining length 5');

  check(remaining([attempt({ questionId: 'A' })]).join(',') === 'B,C,D,E', 'B: 1/5 remaining = 4');
  check(remaining([attempt({ questionId: 'A' })]).length === 4, 'B: remaining length 4');

  const twoDone = remaining([attempt({ questionId: 'A' }), attempt({ questionId: 'C' })]);
  check(twoDone.join(',') === 'B,D,E', 'C: 2/5 remaining = 3');
  check(twoDone.length === 3, 'C: remaining length 3');

  const fourDone = remaining([
    attempt({ questionId: 'A' }),
    attempt({ questionId: 'B' }),
    attempt({ questionId: 'C' }),
    attempt({ questionId: 'D' }),
  ]);
  check(fourDone.join(',') === 'E', 'D: 4/5 remaining = 1');
  check(fourDone.length === 1, 'D: remaining length 1');

  const allDone = remaining([
    attempt({ questionId: 'A' }),
    attempt({ questionId: 'B' }),
    attempt({ questionId: 'C' }),
    attempt({ questionId: 'D' }),
    attempt({ questionId: 'E' }),
  ]);
  check(allDone.length === 0, 'E: 5/5 remaining = 0');

  const order = remaining([attempt({ questionId: 'B' }), attempt({ questionId: 'D' })]);
  check(order.join(',') === 'A,C,E', 'F: порядок A C E сохраняется');

  const repeats = remaining([
    attempt({ attemptId: 'b1', questionId: 'B', isCorrect: false }),
    attempt({ attemptId: 'b2', questionId: 'B', isCorrect: true }),
    attempt({ attemptId: 'b3', questionId: 'B', isCorrect: true }),
  ]);
  check(repeats.join(',') === 'A,C,D,E', 'G: несколько Attempt для B не дают два B');
  check(repeats.filter((id) => id === 'B').length === 0, 'G: выполненное B не возвращается');

  const wrong = remaining([attempt({ questionId: 'B', isCorrect: false })]);
  check(wrong.join(',') === 'A,C,D,E', 'H: неверный daily Attempt всё равно выполняет задание');

  const stranger = remaining([attempt({ questionId: 'A', userId: OTHER })]);
  check(stranger.join(',') === 'A,B,C,D,E', 'I: чужой userId не влияет на remaining');

  const yesterday = remaining([attempt({ questionId: 'A', date: YESTERDAY })]);
  check(yesterday.join(',') === 'A,B,C,D,E', 'J: вчерашний Attempt не влияет на сегодняшний remaining');

  const otherMode = remaining([attempt({ questionId: 'A', mode: 'quick' })]);
  check(otherMode.join(',') === 'A,B,C,D,E', 'K: mode !== daily не считается выполнением');

  const mixedPlan = planOf(['math-training-001', 'missing-task-does-not-exist', 'math-training-002']);
  const mixedRemaining = remaining([], mixedPlan);
  let missingThrew = false;
  let resolvedIds: string[] = [];
  try {
    resolvedIds = resolveTasks(mixedRemaining).map((task) => task.id);
  } catch {
    missingThrew = true;
  }
  check(!missingThrew, 'L: отсутствующий Task не роняет разбор remaining');
  check(mixedRemaining.includes('missing-task-does-not-exist'), 'L: missing id остаётся в полном плане remaining');
  check(
    resolvedIds.every((id) => id !== 'missing-task-does-not-exist'),
    'L: отсутствующий Task пропускается при сборке сессии',
  );
  check(
    resolvedIds.includes('math-training-001') && resolvedIds.includes('math-training-002'),
    'L: остальные задания продолжают работать',
  );

  check(allDone.length === 0, 'M: полное выполнение → пустой remaining');
  const fullProgress = getDailyPlanProgress({
    plan: FIVE,
    attempts: ['A', 'B', 'C', 'D', 'E'].map((questionId) => attempt({ questionId })),
    userId: USER,
    nowIso: NOW,
  });
  check(fullProgress.isCompleted === true, 'M: 5/5 isCompleted');
  check(resolveTasks(allDone).length === 0, 'M: пустой remaining → сессия не создаётся');

  const originalIds = FIVE.items.map((item) => item.taskId).join(',');
  remaining([attempt({ questionId: 'A' })]);
  check(FIVE.items.map((item) => item.taskId).join(',') === originalIds, 'план после remaining не изменяется');

  return failures;
}

export function reportDailyPlanContinuationSelfChecks(): void {
  const failures = runDailyPlanContinuationSelfChecks();
  if (failures.length > 0) {
    throw new Error(`daily plan continuation self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportDailyPlanContinuationSelfChecks();
console.log('daily plan continuation self-check passed');
