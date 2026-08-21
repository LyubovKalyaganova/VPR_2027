import type { Attempt } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { localAttemptRecorder } from '../db';
import { ATTEMPTS_STORAGE_KEY } from '../db/localAttemptRecorder';
import { DAILY_PLANS_STORAGE_KEY } from './dailyPlanStorage';
import type { DailyPlan, DailyPlanItem } from './dailyPlanService';
import { getDailyPlanProgress } from './dailyPlanProgressService';
import {
  createMemoryDailyPlanStorage,
  getCalendarDate,
  saveDailyPlan,
} from './dailyPlanStorage';
import { calculateSkillMastery, isWeakSkill } from './masteryService';
import { getReviewState } from './reviewScheduler';
import { getLearningRecommendationForUser, resolveRecommendationLaunch } from './learningRecommendationRunner';
import { getLearningRecommendation, type GetLearningRecommendationInput } from './learningRecommendationService';

const PREFIX = 'rec-runner-8b';
const NEW_USER = `${PREFIX}-new`;
const PLAN_USER = `${PREFIX}-plan`;
const DONE_USER = `${PREFIX}-done`;
const MIX_USER = `${PREFIX}-mix`;
const REVIEW_USER = `${PREFIX}-review`;
const WEAK_USER = `${PREFIX}-weak`;
const NEW_SKILL_USER = `${PREFIX}-new-skill`;
const REINFORCE_USER = `${PREFIX}-reinforce`;
const EMPTY_USER = `${PREFIX}-empty`;
const DEMO_USER = `${PREFIX}-demo`;
const SELF_USER = `${PREFIX}-self`;
const OTHER_USER = `${PREFIX}-other`;
const DET_USER = `${PREFIX}-det`;
const PROGRESS_USER = `${PREFIX}-progress`;
const READONLY_USER = `${PREFIX}-readonly`;

const ADD = 'math.calculation.multi_digit.addition';
const NOW = '2026-08-21T12:00:00.000Z';
const TWO_DAYS_AGO = '2026-08-19T12:00:00.000Z';
const PLAN_TASKS = [
  'math-training-001',
  'math-training-002',
  'math-training-003',
  'math-training-004',
  'math-training-005',
];

function items(taskIds: readonly string[], skillId = ADD): DailyPlanItem[] {
  return taskIds.map((taskId) => ({
    taskId,
    skillId,
    source: 'reinforcement',
  }));
}

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'userId' | 'questionId'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `attempt-${overrides.userId}-${overrides.questionId}`,
    userId: overrides.userId,
    questionId: overrides.questionId,
    sessionId: overrides.sessionId ?? `session-${overrides.userId}`,
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
    mode: overrides.mode ?? 'quick',
  };
}

function planOf(userId: string, taskIds: readonly string[]): DailyPlan {
  return {
    userId,
    subject: 'mathematics',
    createdAt: NOW,
    totalCount: taskIds.length,
    items: items(taskIds),
  };
}

function snapshot(value: unknown): string {
  return JSON.stringify(value);
}

function storageKeys(): string[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    return Object.keys(localStorage).sort();
  } catch {
    return [];
  }
}

export function runLearningRecommendationRunnerSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  check(localAttemptRecorder.getAll(NEW_USER).length === 0, 'A: изолированный user не имеет Attempt в recorder');
  const newChild = getLearningRecommendationForUser({
    userId: NEW_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: [],
    storage: createMemoryDailyPlanStorage(),
  });
  check(newChild.type === 'start', 'A: новый ребёнок → start');
  check(newChild.action === 'normal', 'A: start использует action normal');

  const planStorage = createMemoryDailyPlanStorage();
  saveDailyPlan(PLAN_USER, 'mathematics', getCalendarDate(NOW), items(PLAN_TASKS), planStorage);
  const unfinishedAttempts = PLAN_TASKS.slice(0, 3).map((questionId, index) =>
    attempt({
      userId: PLAN_USER,
      questionId,
      attemptId: `plan-${index}`,
      isCorrect: true,
      mode: 'daily',
      date: NOW,
    }),
  );
  const unfinished = getLearningRecommendationForUser({
    userId: PLAN_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: unfinishedAttempts,
    storage: planStorage,
  });
  check(unfinished.type === 'continue-daily', 'B: незавершённый DailyPlan → continue-daily');
  check(unfinished.action === 'daily', 'B: action daily');
  check(unfinished.description.includes('2'), 'B: remaining отражается в описании');

  const doneStorage = createMemoryDailyPlanStorage();
  saveDailyPlan(DONE_USER, 'mathematics', getCalendarDate(NOW), items(PLAN_TASKS), doneStorage);
  const doneAttempts = [
    ...PLAN_TASKS.map((questionId, index) =>
      attempt({
        userId: DONE_USER,
        questionId,
        attemptId: `done-daily-${index}`,
        isCorrect: true,
        mode: 'daily',
        date: NOW,
      }),
    ),
    attempt({
      userId: DONE_USER,
      questionId: 'math-training-006',
      attemptId: 'done-mistake',
      isCorrect: false,
      mode: 'quick',
      date: NOW,
    }),
  ];
  const completedWithMistakes = getLearningRecommendationForUser({
    userId: DONE_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: doneAttempts,
    storage: doneStorage,
  });
  check(completedWithMistakes.type === 'mistakes', 'C: завершённый план + ошибки → mistakes');

  const mixAttempts = [
    attempt({
      userId: MIX_USER,
      questionId: 'math-training-001',
      isCorrect: false,
      date: NOW,
    }),
  ];
  const mixMastery = calculateSkillMastery(mixAttempts, ADD, MIX_USER);
  check(getReviewState(mixMastery, NOW).isReviewDue === true, 'D: ошибка даёт due через reviewScheduler');
  const mix = getLearningRecommendationForUser({
    userId: MIX_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: mixAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(mix.type === 'mistakes', 'D: ошибки + review → mistakes');

  const reviewAttempts = [
    attempt({
      userId: REVIEW_USER,
      questionId: 'math-training-001',
      isCorrect: true,
      date: TWO_DAYS_AGO,
    }),
  ];
  const reviewMastery = calculateSkillMastery(reviewAttempts, ADD, REVIEW_USER);
  check(getReviewState(reviewMastery, NOW).isReviewDue === true, 'E: срок повторения наступил');
  check(isWeakSkill(reviewMastery) === false, 'E: навык не weak');
  const reviewOnly = getLearningRecommendationForUser({
    userId: REVIEW_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: reviewAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(reviewOnly.type === 'review', 'E: review без ошибок → review');
  check(reviewOnly.action === 'review', 'E: action review');
  check(reviewOnly.skillId === ADD, 'E: skillId due-навыка');

  const weakAttempts = [1, 2, 3, 4, 5].map((index) =>
    attempt({
      userId: WEAK_USER,
      questionId: 'math-training-001',
      attemptId: `weak-${index}`,
      isCorrect: index === 5,
      date: `2026-08-21T12:0${index}:00.000Z`,
    }),
  );
  const weakMastery = calculateSkillMastery(weakAttempts, ADD, WEAK_USER);
  check(isWeakSkill(weakMastery) === true, 'F: навык weak через isWeakSkill');
  check(getReviewState(weakMastery, NOW).isReviewDue === false, 'F: навык ещё не due');
  const weakOnly = getLearningRecommendationForUser({
    userId: WEAK_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: weakAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(weakOnly.type === 'weak', 'F: weak без review → weak');
  check(weakOnly.action === 'weak', 'F: action weak');
  check(weakOnly.skillId === ADD, 'F: skillId слабого навыка');

  const newSkillAttempts = [
    attempt({
      userId: NEW_SKILL_USER,
      questionId: 'math-training-001',
      isCorrect: true,
      date: NOW,
    }),
  ];
  const newSkill = getLearningRecommendationForUser({
    userId: NEW_SKILL_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: newSkillAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(newSkill.type === 'new-skill', 'G: есть данные и незакрытые new → new-skill');
  check(newSkill.action === 'normal', 'G: action normal');
  check(typeof newSkill.skillId === 'string' && newSkill.skillId.length > 0, 'G: выбран skillId');
  check(newSkill.skillId !== ADD, 'G: выбран навык со статусом new, не ADD');

  const reinforceAttempts = MATH_SKILLS.map((skill, index) =>
    attempt({
      userId: REINFORCE_USER,
      questionId: `reinforce-${skill.id}`,
      attemptId: `reinforce-${index}`,
      isCorrect: true,
      date: NOW,
      skillId: skill.id,
      topicId: skill.topicId,
    }),
  );
  const reinforce = getLearningRecommendationForUser({
    userId: REINFORCE_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: reinforceAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(reinforce.type === 'reinforcement', 'H: все навыки с данными, не due/weak → reinforcement');
  check(reinforce.action === 'normal', 'H: action normal');
  check(reinforce.skillId === MATH_SKILLS[0]?.id, 'H: первый reinforcement в порядке MATH_SKILLS');

  const noSources = getLearningRecommendationForUser({
    userId: EMPTY_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: [],
    storage: createMemoryDailyPlanStorage(),
  });
  check(noSources.type === 'start', 'I: нет источников → start');

  const demoAttempts = [
    attempt({
      userId: DEMO_USER,
      questionId: 'demo-math-single-1',
      isCorrect: false,
      mode: 'demo',
      skillId: undefined,
      topicId: undefined,
    }),
    attempt({
      userId: DEMO_USER,
      questionId: 'math-training-001',
      attemptId: 'demo-with-skill',
      isCorrect: false,
      mode: 'demo',
      skillId: ADD,
    }),
  ];
  const demo = getLearningRecommendationForUser({
    userId: DEMO_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: demoAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(demo.type === 'start', 'J: DEMO не даёт mistakes/weak/review');

  const foreignAttempts = [
    attempt({
      userId: OTHER_USER,
      questionId: 'math-training-001',
      isCorrect: false,
      date: NOW,
    }),
  ];
  const isolated = getLearningRecommendationForUser({
    userId: SELF_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: foreignAttempts,
    storage: createMemoryDailyPlanStorage(),
  });
  check(isolated.type === 'start', 'K: чужой userId не влияет');

  const detAttempts = [
    attempt({
      userId: DET_USER,
      questionId: 'math-training-001',
      isCorrect: true,
      date: TWO_DAYS_AGO,
    }),
  ];
  const detStorage = createMemoryDailyPlanStorage();
  const first = getLearningRecommendationForUser({
    userId: DET_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: detAttempts,
    storage: detStorage,
  });
  const second = getLearningRecommendationForUser({
    userId: DET_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: detAttempts,
    storage: detStorage,
  });
  check(snapshot(first) === snapshot(second), 'L: одинаковый вызов → одинаковый результат');

  const progressStorage = createMemoryDailyPlanStorage();
  saveDailyPlan(PROGRESS_USER, 'mathematics', getCalendarDate(NOW), items(PLAN_TASKS), progressStorage);
  const progressAttempts = PLAN_TASKS.slice(0, 3).map((questionId, index) =>
    attempt({
      userId: PROGRESS_USER,
      questionId,
      attemptId: `progress-${index}`,
      isCorrect: true,
      mode: 'daily',
      date: NOW,
    }),
  );
  const existingProgress = getDailyPlanProgress({
    plan: planOf(PROGRESS_USER, PLAN_TASKS),
    attempts: progressAttempts,
    userId: PROGRESS_USER,
    nowIso: NOW,
  });
  check(existingProgress.total === 5 && existingProgress.completed === 3, 'M: эталон progressService: 3/5');
  const fromRunner = getLearningRecommendationForUser({
    userId: PROGRESS_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: progressAttempts,
    storage: progressStorage,
  });
  check(fromRunner.type === 'continue-daily', 'M: runner использует прогресс плана');
  check(fromRunner.description.includes(String(existingProgress.remaining)), 'M: remaining берётся из dailyPlanProgressService');

  const keysBefore = storageKeys();
  const recordedBefore = localAttemptRecorder.getAll(READONLY_USER).length;
  getLearningRecommendationForUser({
    userId: READONLY_USER,
    subject: 'mathematics',
    nowIso: NOW,
    attempts: [
      attempt({
        userId: READONLY_USER,
        questionId: 'math-training-001',
        isCorrect: false,
      }),
    ],
    storage: createMemoryDailyPlanStorage(),
  });
  check(localAttemptRecorder.getAll(READONLY_USER).length === recordedBefore, 'N: Attempt не записываются');
  const keysAfter = storageKeys();
  check(snapshot(keysBefore) === snapshot(keysAfter), 'N: новые localStorage keys не появляются');
  check(!keysAfter.includes('vpr-4-2027-learning-recommendations'), 'N: ключа рекомендаций нет');
  check(
    keysAfter.length === 0 ||
      keysAfter.every(
        (key) =>
          key === 'vpr-4-2027-user' ||
          key === 'vpr-4-2027-training' ||
          key === ATTEMPTS_STORAGE_KEY ||
          key === DAILY_PLANS_STORAGE_KEY,
      ),
    'N: runner не создаёт неизвестных ключей',
  );

  const launchOf = (overrides: Partial<GetLearningRecommendationInput> = {}) =>
    resolveRecommendationLaunch(
      getLearningRecommendation({
        userId: EMPTY_USER,
        dailyPlan: { total: 0, completed: 0 },
        mistakes: { count: 0 },
        dueSkillIds: [],
        weakSkillIds: [],
        newSkillIds: [],
        reinforcementSkillIds: [],
        ...overrides,
      }),
    );

  const eDaily = launchOf({ dailyPlan: { total: 5, completed: 2 } });
  check(eDaily?.start === 'startDaily', '8E-A: continue-daily → startDaily');

  const eMistakes = launchOf({ mistakes: { count: 2 } });
  check(eMistakes?.start === 'startMistakes', '8E-B: mistakes → startMistakes');

  const eReview = launchOf({ dueSkillIds: [ADD] });
  check(eReview?.start === 'startReview', '8E-C: review → startReview');

  const eWeak = launchOf({ weakSkillIds: [ADD] });
  check(eWeak?.start === 'startWeak', '8E-D: weak → startWeak');

  const eNew = launchOf({ newSkillIds: [ADD] });
  check(eNew?.start === 'startMath' && eNew.mode === 'normal', '8E-E: new-skill → startMath normal');

  const eReinforce = launchOf({ reinforcementSkillIds: [ADD] });
  check(eReinforce?.start === 'startMath' && eReinforce.mode === 'normal', '8E-F: reinforcement → startMath normal');

  const eStart = launchOf({});
  check(eStart?.start === 'startMath' && eStart.mode === 'normal', '8E-G: start → startMath normal');

  check(resolveRecommendationLaunch(null) === null, '8E-H: null recommendation → нет запуска');
  check(resolveRecommendationLaunch(undefined) === null, '8E-H: undefined recommendation → нет запуска');

  const invalid = getLearningRecommendation({
    userId: EMPTY_USER,
    dailyPlan: { total: 0, completed: 0 },
    mistakes: { count: 0 },
  });
  const spoofed = { ...invalid, action: 'random' as const };
  check(resolveRecommendationLaunch(spoofed) === null, '8E-I: unknown/random action → нет запуска');

  const demoRec = getLearningRecommendation({
    userId: EMPTY_USER,
    mistakes: { count: 3, mode: 'demo' },
  });
  const demoLaunch = resolveRecommendationLaunch(demoRec);
  check(demoRec.type === 'start', '8E-J: DEMO не даёт type mistakes');
  check(demoLaunch?.start === 'startMath' && demoLaunch.mode === 'normal', '8E-J: DEMO не запускает demo-режим');

  const sameA = launchOf({ dailyPlan: { total: 5, completed: 1 }, mistakes: { count: 2 } });
  const sameB = launchOf({ dailyPlan: { total: 5, completed: 1 }, mistakes: { count: 2 } });
  check(JSON.stringify(sameA) === JSON.stringify(sameB), '8E-K: одинаковый input → одинаковый launch');

  check(
    eDaily?.start !== 'startMath' &&
      eMistakes?.start !== 'startDaily' &&
      eReview?.start !== 'startWeak',
    '8E-L: режимы не подменяются друг другом',
  );

  return failures;
}

export function reportLearningRecommendationRunnerSelfChecks(): void {
  const failures = runLearningRecommendationRunnerSelfChecks();
  if (failures.length > 0) {
    throw new Error(`learning recommendation runner self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportLearningRecommendationRunnerSelfChecks();
console.log('learning recommendation runner self-check passed');
