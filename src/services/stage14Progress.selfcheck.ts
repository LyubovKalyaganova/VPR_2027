/**
 * Stage 14: multi-subject progress, isolation, session breakdown.
 * Does not modify FROZEN subject content.
 */
import type { Attempt } from '../types';
import { MemoryAttemptRecorder } from '../db/memoryAttemptRecorder';
import { calculateSkillMastery, isWeakSkill } from './masteryService';
import {
  getChildProgress,
  getSessionSkillBreakdown,
  getSubjectScore,
  getSubjectSkillProgress,
  getTopicProgressForSubject,
} from './progressService';
import { selectAdaptiveTasks } from './adaptiveTaskSelector';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { ENGLISH_SKILLS } from '../data/taxonomy/english';
import { taskRepository } from './taskRepository';

const USER_A = 'stage14-user-a';
const USER_B = 'stage14-user-b';
const MATH_SKILL = 'math.calculation.multi_digit.addition';
const RUS_SKILL = RUSSIAN_SKILLS[0]?.id ?? 'russian.orthography.base';
const ENG_SKILL = ENGLISH_SKILLS[0]?.id ?? 'english.listening.specific';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'isCorrect' | 'skillId' | 'subject'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? `a-${Math.random().toString(36).slice(2, 8)}`,
    userId: overrides.userId ?? USER_A,
    questionId: overrides.questionId ?? 'q-1',
    sessionId: overrides.sessionId ?? 'session-1',
    date: overrides.date ?? '2026-08-23T12:00:00.000Z',
    answer: overrides.answer ?? 'x',
    isCorrect: overrides.isCorrect,
    timeSpent: overrides.timeSpent ?? 3000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 2,
    subject: overrides.subject,
    topic: overrides.topic ?? 't',
    skill: overrides.skill ?? 's',
    topicId: overrides.topicId,
    skillId: overrides.skillId,
    mode: overrides.mode ?? 'quick',
  };
}

export function runStage14ProgressSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  // New skill is not weak
  const emptyMastery = calculateSkillMastery([], MATH_SKILL, USER_A);
  check(emptyMastery.status === 'new', 'new skill status');
  check(emptyMastery.masteryScore === null, 'new skill score null');
  check(!isWeakSkill(emptyMastery), 'new ≠ weak');

  // Correct answers raise mastery
  const correctSeries: Attempt[] = [];
  for (let i = 0; i < 5; i += 1) {
    correctSeries.push(
      attempt({
        attemptId: `ok-${i}`,
        isCorrect: true,
        skillId: MATH_SKILL,
        subject: 'mathematics',
        questionId: `mq-${i}`,
        date: `2026-08-1${i}T12:00:00.000Z`,
      }),
    );
  }
  const raised = calculateSkillMastery(correctSeries, MATH_SKILL, USER_A);
  check((raised.masteryScore ?? 0) >= 80, `correct raises mastery ${raised.masteryScore}`);
  check(raised.status === 'mastered' || raised.status === 'confident', `status ${raised.status}`);

  // One error does not destroy mastery immediately
  const withOneError = [
    ...correctSeries,
    attempt({
      attemptId: 'err-1',
      isCorrect: false,
      skillId: MATH_SKILL,
      subject: 'mathematics',
      questionId: 'mq-err',
      date: '2026-08-19T12:00:00.000Z',
    }),
  ];
  const afterError = calculateSkillMastery(withOneError, MATH_SKILL, USER_A);
  check((afterError.masteryScore ?? 0) >= 50, `one error soft drop ${afterError.masteryScore}`);

  // Subject isolation: russian error does not affect math score
  const mixedSubjects = [
    ...correctSeries,
    attempt({
      attemptId: 'rus-err',
      isCorrect: false,
      skillId: RUS_SKILL,
      subject: 'russian',
      questionId: 'rq-1',
    }),
  ];
  const mathScore = getSubjectScore(mixedSubjects, USER_A, 'mathematics');
  const rusScore = getSubjectScore(mixedSubjects, USER_A, 'russian');
  check(mathScore !== null && mathScore >= 80, `math isolated ${mathScore}`);
  check(rusScore === 0, `russian wrong score ${rusScore}`);

  // User isolation
  const foreign = [
    attempt({
      attemptId: 'b1',
      userId: USER_B,
      isCorrect: false,
      skillId: MATH_SKILL,
      subject: 'mathematics',
    }),
  ];
  const own = calculateSkillMastery([...correctSeries, ...foreign], MATH_SKILL, USER_A);
  check(own.incorrectCount === 0, 'foreign user ignored');
  check(calculateSkillMastery(foreign, MATH_SKILL, USER_A).status === 'new', 'other user empty for A');

  // English subject score works
  const engAttempts = [
    attempt({
      attemptId: 'e1',
      isCorrect: true,
      skillId: ENG_SKILL,
      subject: 'english',
      questionId: 'eq-1',
    }),
  ];
  const engSkills = getSubjectSkillProgress(engAttempts, USER_A, 'english');
  check(engSkills.length === ENGLISH_SKILLS.length, 'english skills count');
  check(engSkills.some((s) => s.skill.id === ENG_SKILL && s.mastery.attemptsCount === 1), 'english mastery hit');
  check(getSubjectScore(engAttempts, USER_A, 'english') !== null, 'english subject score');

  // Topic progress
  const topics = getTopicProgressForSubject(correctSeries, USER_A, 'mathematics');
  check(topics.some((t) => t.score !== null), 'topic progress present');

  // Session breakdown
  const sessionId = 'sess-break';
  const sessionAttempts = [
    attempt({
      attemptId: 'sb1',
      sessionId,
      isCorrect: true,
      skillId: MATH_SKILL,
      subject: 'mathematics',
      questionId: 'sb-q1',
    }),
    attempt({
      attemptId: 'sb2',
      sessionId,
      isCorrect: false,
      skillId: MATH_SKILL,
      subject: 'mathematics',
      questionId: 'sb-q2',
    }),
  ];
  const breakdown = getSessionSkillBreakdown(sessionAttempts, sessionId, USER_A);
  check(breakdown.length === 1, 'session skills');
  check(breakdown[0]?.correct === 1 && breakdown[0]?.total === 2, 'session 1/2');

  // Child progress fills all subject keys
  const child = getChildProgress(mixedSubjects, USER_A);
  check(child.subjectScores.mathematics !== null, 'child math score');
  check(child.subjectScores.russian !== null, 'child russian score');
  check(child.subjectScores.english === null, 'child english empty');
  check(child.weakSkills.every((w) => w.mastery.status !== 'new'), 'weak never new');

  // Attempt recorder persistence (in-memory stand-in for localStorage contract)
  const recorder = new MemoryAttemptRecorder();
  const recorded = attempt({
    attemptId: 'persist-1',
    isCorrect: true,
    skillId: MATH_SKILL,
    subject: 'mathematics',
  });
  recorder.record(recorded);
  check(recorder.getAll(USER_A).length === 1, 'recorder saves');
  check(recorder.getBySession('session-1').length === 1, 'recorder by session');
  check(recorder.getAll(USER_B).length === 0, 'recorder user filter');

  // Adaptive cold-start vs history (math bank)
  const mathTasks = taskRepository.getBySubject('mathematics').filter((t) => Boolean(t.skillId));
  if (mathTasks.length >= 5) {
    const cold = selectAdaptiveTasks({
      userId: USER_A,
      subject: 'mathematics',
      count: 5,
      attempts: [],
      tasks: mathTasks,
      skills: MATH_SKILLS,
    });
    check(cold.length === 5, `cold start ${cold.length}`);
    check(cold.every((t) => t.subject === 'mathematics'), 'cold subject iso');

    const weakAttempts = [
      attempt({
        attemptId: 'w1',
        isCorrect: false,
        skillId: MATH_SKILL,
        subject: 'mathematics',
        date: '2026-08-23T10:00:00.000Z',
      }),
      attempt({
        attemptId: 'w2',
        isCorrect: false,
        skillId: MATH_SKILL,
        subject: 'mathematics',
        date: '2026-08-23T11:00:00.000Z',
      }),
    ];
    const adaptive = selectAdaptiveTasks({
      userId: USER_A,
      subject: 'mathematics',
      count: 5,
      attempts: weakAttempts,
      tasks: mathTasks,
      skills: MATH_SKILLS,
    });
    check(adaptive.length === 5, 'history adaptive length');
    check(adaptive.every((t) => t.subject === 'mathematics'), 'history subject iso');
    const weakHits = adaptive.filter((t) => t.skillId === MATH_SKILL).length;
    check(weakHits >= 1, `recent mistakes prioritized ${weakHits}`);
  } else {
    failures.push('math task bank too small for adaptive check');
  }

  return failures;
}

export function reportStage14ProgressSelfChecks(): void {
  const failures = runStage14ProgressSelfChecks();
  if (failures.length) {
    throw new Error(`Stage 14 progress self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Stage 14 progress/mastery/adaptive self-check: OK');
}
