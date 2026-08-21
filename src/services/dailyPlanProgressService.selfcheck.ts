import type { Attempt } from '../types';
import type { DailyPlan } from './dailyPlanService';
import { getDailyPlanProgress } from './dailyPlanProgressService';

const USER = 'user-daily-progress';
const OTHER = 'user-other-progress';
const ADD = 'math.calculation.multi_digit.addition';
const NOW = '2026-08-21T12:00:00.000Z';
const YESTERDAY = '2026-08-20T12:00:00.000Z';
const TOMORROW = '2026-08-22T12:00:00.000Z';

function planOf(taskIds: string[], sources?: Array<'weak' | 'review' | 'reinforcement'>): DailyPlan {
  return {
    userId: USER,
    subject: 'mathematics',
    createdAt: NOW,
    totalCount: taskIds.length,
    items: taskIds.map((taskId, index) => ({
      taskId,
      skillId: ADD,
      source: sources?.[index] ?? 'reinforcement',
    })),
  };
}

const FIVE = planOf(['001', '002', '003', '004', '005']);

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'questionId'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `attempt-${overrides.questionId}`,
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId,
    sessionId: overrides.sessionId ?? 'session-daily',
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

export function runDailyPlanProgressSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const emptyAttempts = getDailyPlanProgress({
    plan: FIVE,
    attempts: [],
    userId: USER,
    nowIso: NOW,
  });
  check(emptyAttempts.total === 5, 'A: total 5 при плане из 5 заданий');
  check(emptyAttempts.completed === 0, 'A: completed 0 без Attempt');
  check(emptyAttempts.remaining === 5, 'A: remaining 5 без Attempt');
  check(emptyAttempts.isCompleted === false, 'A: isCompleted false без Attempt');
  check(emptyAttempts.completedQuestionIds.length === 0, 'A: completedQuestionIds пустой');

  const oneDone = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '001' })],
    userId: USER,
    nowIso: NOW,
  });
  check(oneDone.completed === 1, 'B: один ответ → completed 1');
  check(oneDone.remaining === 4, 'B: один ответ → remaining 4');
  check(oneDone.isCompleted === false, 'B: один ответ → isCompleted false');
  check(oneDone.completedQuestionIds.join(',') === '001', 'B: completedQuestionIds = 001');

  const wrongAnswer = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '002', isCorrect: false })],
    userId: USER,
    nowIso: NOW,
  });
  check(wrongAnswer.completed === 1, 'C: неправильный ответ всё равно completed');
  check(wrongAnswer.completedQuestionIds.join(',') === '002', 'C: questionId неправильного ответа учтён');

  const repeats = getDailyPlanProgress({
    plan: FIVE,
    attempts: [
      attempt({ attemptId: 'r1', questionId: '001', isCorrect: false }),
      attempt({ attemptId: 'r2', questionId: '001', isCorrect: true }),
      attempt({ attemptId: 'r3', questionId: '001', isCorrect: true }),
    ],
    userId: USER,
    nowIso: NOW,
  });
  check(repeats.completed === 1, 'D: три Attempt одного questionId → completed 1');
  check(repeats.completedQuestionIds.join(',') === '001', 'D: completedQuestionIds без повторов');

  const yesterday = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '001', date: YESTERDAY })],
    userId: USER,
    nowIso: NOW,
  });
  check(yesterday.completed === 0, 'E: вчерашний Attempt не считается');

  const tomorrow = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '001', date: TOMORROW })],
    userId: USER,
    nowIso: NOW,
  });
  check(tomorrow.completed === 0, 'E: завтрашний Attempt не считается');

  const otherUser = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '001', userId: OTHER })],
    userId: USER,
    nowIso: NOW,
  });
  check(otherUser.completed === 0, 'F: Attempt другого пользователя не считается');

  const outsidePlan = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '999' })],
    userId: USER,
    nowIso: NOW,
  });
  check(outsidePlan.completed === 0, 'G: questionId вне плана не считается');

  const allDone = getDailyPlanProgress({
    plan: FIVE,
    attempts: [
      attempt({ questionId: '001' }),
      attempt({ questionId: '002' }),
      attempt({ questionId: '003' }),
      attempt({ questionId: '004' }),
      attempt({ questionId: '005' }),
    ],
    userId: USER,
    nowIso: NOW,
  });
  check(allDone.completed === 5, 'H: все 5 выполнены → completed 5');
  check(allDone.remaining === 0, 'H: remaining 0');
  check(allDone.isCompleted === true, 'H: isCompleted true');

  const emptyPlan = getDailyPlanProgress({
    plan: planOf([]),
    attempts: [attempt({ questionId: '001' })],
    userId: USER,
    nowIso: NOW,
  });
  check(emptyPlan.total === 0, 'I: пустой план → total 0');
  check(emptyPlan.completed === 0, 'I: пустой план → completed 0');
  check(emptyPlan.remaining === 0, 'I: пустой план → remaining 0');
  check(emptyPlan.isCompleted === false, 'I: пустой план → isCompleted false');

  const demo = getDailyPlanProgress({
    plan: FIVE,
    attempts: [
      attempt({
        questionId: '001',
        skillId: undefined,
        topicId: undefined,
        mode: 'quick',
      }),
    ],
    userId: USER,
    nowIso: NOW,
  });
  check(demo.completed === 0, 'J: DEMO Attempt без skillId не влияет на daily progress');

  const dailyMode = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '003', mode: 'daily' })],
    userId: USER,
    nowIso: NOW,
  });
  check(dailyMode.completed === 1, 'K: mode daily учитывается, если questionId в плане и дата сегодня');

  const otherModeInPlan = getDailyPlanProgress({
    plan: FIVE,
    attempts: [attempt({ questionId: '001', mode: 'quick' })],
    userId: USER,
    nowIso: NOW,
  });
  check(otherModeInPlan.completed === 0, 'K: Attempt другого режима не считается выполнением daily-плана');

  const mixed = getDailyPlanProgress({
    plan: planOf(['001', '002', '003', '004', '005'], [
      'weak',
      'weak',
      'review',
      'reinforcement',
      'reinforcement',
    ]),
    attempts: [attempt({ questionId: '001' }), attempt({ questionId: '003' })],
    userId: USER,
    nowIso: NOW,
  });
  check(mixed.total === 5, 'L: смешанный план → total 5');
  check(mixed.completed === 2, 'L: выполнены 001 и 003 → completed 2');
  check(mixed.remaining === 3, 'L: remaining 3');
  check(
    mixed.completedQuestionIds.slice().sort().join(',') === '001,003',
    'L: completedQuestionIds содержит 001 и 003',
  );

  return failures;
}

export function reportDailyPlanProgressSelfChecks(): void {
  const failures = runDailyPlanProgressSelfChecks();
  if (failures.length > 0) {
    throw new Error(`daily plan progress self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportDailyPlanProgressSelfChecks();
console.log('daily plan progress self-check passed');
