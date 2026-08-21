import type { Attempt, Difficulty } from '../types';
import {
  calculateSkillMastery,
  classifyAttemptError,
  isMasteredSkill,
  isWeakSkill,
} from './masteryService';
import {
  REVIEW_INTERVAL_DAYS,
  calculateNextReviewAt,
  calculateReviewInterval,
  getReviewState,
  getReviewStateFromAttempts,
  isReviewDue,
  isReviewIntervalDays,
} from './reviewScheduler';

const USER = 'user-a';
const SKILL = 'math.calculation.multi_digit.addition';
const OTHER_USER = 'user-b';
const OTHER_SKILL = 'math.calculation.multi_digit.subtraction';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'isCorrect'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? 'attempt-1',
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId ?? 'math-training-001',
    sessionId: overrides.sessionId ?? 'session-1',
    date: overrides.date ?? '2026-08-20T12:00:00.000Z',
    answer: overrides.answer ?? '359',
    isCorrect: overrides.isCorrect,
    timeSpent: overrides.timeSpent ?? 5000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 3,
    subject: overrides.subject ?? 'mathematics',
    topic: overrides.topic ?? 'Сложение и вычитание многозначных чисел',
    skill: overrides.skill ?? 'Сложение многозначных чисел',
    topicId: overrides.topicId ?? 'math.calculation.multi_digit',
    skillId: 'skillId' in overrides ? overrides.skillId : SKILL,
    mode: overrides.mode ?? 'quick',
  };
}

function expect(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

export function runMasterySelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    const error = expect(condition, message);
    if (error) {
      failures.push(error);
    }
  };

  const empty = calculateSkillMastery([], SKILL, USER);
  check(empty.status === 'new', 'нет попыток: status new');
  check(empty.masteryScore === null, 'нет попыток: masteryScore null, не 0');
  check(empty.attemptsCount === 0, 'нет попыток: attemptsCount 0');
  check(!isWeakSkill(empty), 'нет попыток: не weak');

  const oneCorrect = calculateSkillMastery([attempt({ isCorrect: true, difficulty: 3 })], SKILL, USER);
  check(oneCorrect.masteryScore === 60, `одна правильная: cap 60, получено ${oneCorrect.masteryScore}`);
  check(oneCorrect.status === 'confident', `одна правильная: status confident, получено ${oneCorrect.status}`);
  check(oneCorrect.reviewIntervalDays === 1, 'одна правильная: интервал 1 день');
  check(!isMasteredSkill(oneCorrect), 'одна правильная: не mastered');
  check(!isWeakSkill(oneCorrect), 'одна правильная при score 60: не weak');

  const oneWrong = calculateSkillMastery([attempt({ isCorrect: false })], SKILL, USER);
  check(oneWrong.masteryScore === 0, `одна ошибка: score 0, получено ${oneWrong.masteryScore}`);
  check(oneWrong.status === 'not_mastered', `одна ошибка: not_mastered, получено ${oneWrong.status}`);
  check(isWeakSkill(oneWrong), 'одна ошибка: weak');
  check(oneWrong.reviewIntervalDays === 0, 'одна ошибка: интервал 0');
  check(classifyAttemptError(attempt({ isCorrect: false })) === 'unknown', 'ошибка без taskType: unknown');
  check(classifyAttemptError(attempt({ isCorrect: true })) === null, 'правильный ответ: нет errorType');

  const mixed = calculateSkillMastery(
    [
      attempt({ attemptId: 'm1', isCorrect: true, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'm2', isCorrect: false, date: '2026-08-20T11:00:00.000Z' }),
      attempt({ attemptId: 'm3', isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
    ],
    SKILL,
    USER,
  );
  check(mixed.attemptsCount === 3, 'смешанные: 3 попытки');
  check(mixed.correctCount === 2 && mixed.incorrectCount === 1, 'смешанные: счётчики 2/1');
  check(mixed.currentStreak === 1, 'смешанные: серия 1 после последней правильной');
  check(mixed.masteryScore !== null && mixed.masteryScore <= 80, 'смешанные: cap < 5 попыток <= 80');

  const easy = calculateSkillMastery(
    [attempt({ isCorrect: true, difficulty: 1 })],
    SKILL,
    USER,
  );
  const hard = calculateSkillMastery(
    [attempt({ isCorrect: true, difficulty: 5 })],
    SKILL,
    USER,
  );
  check(easy.masteryScore === 60, 'difficulty 1: после cap всё ещё 60');
  check(hard.masteryScore === 60, 'difficulty 5: вклад ограничен 1, затем cap 60');

  const withHints = calculateSkillMastery(
    [attempt({ isCorrect: true, hintsUsed: 2, difficulty: 3 })],
    SKILL,
    USER,
  );
  check(withHints.masteryScore === 60, `2 подсказки: 0.80 затем cap 60, получено ${withHints.masteryScore}`);
  check(withHints.lastHintsUsed === 2, 'подсказки: lastHintsUsed 2');
  check(withHints.reviewIntervalDays === 1, 'правильный с подсказкой: первый шаг интервала 1 день');

  const hintFreeze = calculateSkillMastery(
    [
      attempt({ attemptId: 'h1', isCorrect: true, hintsUsed: 0, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'h2', isCorrect: true, hintsUsed: 1, date: '2026-08-20T11:00:00.000Z' }),
    ],
    SKILL,
    USER,
  );
  check(hintFreeze.reviewIntervalDays === 1, 'подсказка не поднимает интервал с 1 до 3');
  check(hintFreeze.currentStreak === 2, 'подсказка всё равно увеличивает consecutiveCorrect');

  const ignored = calculateSkillMastery(
    [
      attempt({ attemptId: 'ok', isCorrect: true }),
      attempt({ attemptId: 'other-skill', isCorrect: false, skillId: OTHER_SKILL }),
      attempt({ attemptId: 'other-user', isCorrect: false, userId: OTHER_USER }),
      attempt({ attemptId: 'demo', isCorrect: false, skillId: undefined, questionId: 'demo-math-single-1' }),
    ],
    SKILL,
    USER,
  );
  check(ignored.attemptsCount === 1, 'чужой skill/user и DEMO без skillId не учитываются');
  check(ignored.incorrectCount === 0, 'ошибки другого навыка/пользователя/DEMO не входят');

  const masteredAttempts: Attempt[] = [];
  for (let index = 0; index < 5; index += 1) {
    masteredAttempts.push(
      attempt({
        attemptId: `ok-${index}`,
        isCorrect: true,
        difficulty: 3 as Difficulty,
        date: `2026-08-2${index}T12:00:00.000Z`,
      }),
    );
  }
  const mastered = calculateSkillMastery(masteredAttempts, SKILL, USER);
  check(mastered.masteryScore === 100, `5 правильных d3: score 100, получено ${mastered.masteryScore}`);
  check(mastered.status === 'mastered', `5 правильных: mastered, получено ${mastered.status}`);
  check(isMasteredSkill(mastered), 'порог mastered §19 выполнен');
  check(!isWeakSkill(mastered), 'освоенный навык не weak');

  const threeCorrect = calculateSkillMastery(masteredAttempts.slice(0, 3), SKILL, USER);
  check(threeCorrect.masteryScore === 80, `3 правильных: cap 80, получено ${threeCorrect.masteryScore}`);
  check(threeCorrect.status === 'confident', '3 правильных: не mastered, т.к. score 80 < 90 по §19');

  return failures;
}

export function runReviewSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    const error = expect(condition, message);
    if (error) {
      failures.push(error);
    }
  };

  const newChild = getReviewStateFromAttempts([], SKILL, USER, '2026-08-20T12:00:00.000Z');
  check(newChild.reviewIntervalDays === null, 'новый ребёнок: интервал не назначен');
  check(newChild.nextReviewAt === null, 'новый ребёнок: nextReviewAt null');
  check(newChild.isReviewDue === false, 'новый ребёнок: повторение не просрочено');
  check(
    getReviewState(calculateSkillMastery([], SKILL, USER)).isReviewDue === false,
    'новый ребёнок: getReviewState(mastery) не due',
  );

  const firstDate = '2026-08-20T12:00:00.000Z';
  const firstCorrect = [attempt({ attemptId: 'r1', isCorrect: true, date: firstDate })];
  check(calculateReviewInterval(firstCorrect, SKILL, USER) === 1, 'первая правильная: интервал 1');
  check(
    calculateNextReviewAt(firstDate, 1) === '2026-08-21T12:00:00.000Z',
    'первая правильная: nextReviewAt = last + 1 день',
  );
  const firstState = getReviewStateFromAttempts(firstCorrect, SKILL, USER, firstDate);
  check(firstState.reviewIntervalDays === 1, 'первая правильная: state.interval 1');
  check(firstState.nextReviewAt === '2026-08-21T12:00:00.000Z', 'первая правильная: дата стабильна');
  check(firstState.isReviewDue === false, 'первая правильная: в момент ответа ещё не due (срок завтра)');

  const day1 = attempt({ attemptId: 's1', isCorrect: true, date: '2026-08-20T12:00:00.000Z' });
  const day2 = attempt({ attemptId: 's2', isCorrect: true, date: '2026-08-21T12:00:00.000Z' });
  const day3 = attempt({ attemptId: 's3', isCorrect: true, date: '2026-08-22T12:00:00.000Z' });
  const day4 = attempt({ attemptId: 's4', isCorrect: true, date: '2026-08-23T12:00:00.000Z' });
  check(calculateReviewInterval([day1], SKILL, USER) === 1, 'переход: 1 правильная → 1 день');
  check(calculateReviewInterval([day1, day2], SKILL, USER) === 3, 'переход: 2 правильные → 3 дня');
  check(calculateReviewInterval([day1, day2, day3], SKILL, USER) === 7, 'переход: 3 правильные → 7 дней');
  check(calculateReviewInterval([day1, day2, day3, day4], SKILL, USER) === 7, 'переход: 4 правильные остаются 7');
  check(
    getReviewStateFromAttempts([day1, day2, day3], SKILL, USER).nextReviewAt === '2026-08-29T12:00:00.000Z',
    '3 правильные: last 22 авг + 7 дней = 29 авг',
  );

  const dueState = getReviewStateFromAttempts(firstCorrect, SKILL, USER, '2026-08-22T12:00:00.000Z');
  check(dueState.isReviewDue === true, 'срок в прошлом: isReviewDue true');
  check(isReviewDue(dueState.nextReviewAt, '2026-08-22T12:00:00.000Z') === true, 'isReviewDue(past) true');
  check(isReviewDue(dueState.nextReviewAt, '2026-08-20T12:00:00.000Z') === false, 'срок в будущем: isReviewDue false');

  const mixedUsers = [
    attempt({ attemptId: 'own', isCorrect: true, date: firstDate }),
    attempt({ attemptId: 'other-u', isCorrect: false, userId: OTHER_USER, date: '2026-08-20T13:00:00.000Z' }),
    attempt({ attemptId: 'other-s', isCorrect: false, skillId: OTHER_SKILL, date: '2026-08-20T13:00:00.000Z' }),
    attempt({
      attemptId: 'demo',
      isCorrect: false,
      skillId: undefined,
      questionId: 'demo-math-single-1',
      date: '2026-08-20T13:00:00.000Z',
    }),
  ];
  check(calculateReviewInterval(mixedUsers, SKILL, USER) === 1, 'чужой user/skill и DEMO без skillId не меняют интервал');
  check(
    getReviewStateFromAttempts(mixedUsers, SKILL, USER).nextReviewAt === '2026-08-21T12:00:00.000Z',
    'чужие попытки не сдвигают nextReviewAt',
  );

  const afterError = getReviewStateFromAttempts(
    [
      attempt({ attemptId: 'ok', isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
      attempt({ attemptId: 'bad', isCorrect: false, date: '2026-08-21T12:00:00.000Z' }),
    ],
    SKILL,
    USER,
    '2026-08-21T12:00:00.000Z',
  );
  check(afterError.reviewIntervalDays === 0, 'ошибка: интервал 0');
  check(afterError.nextReviewAt === '2026-08-21T12:00:00.000Z', 'ошибка: nextReviewAt = дата ошибки');
  check(afterError.isReviewDue === true, 'ошибка: повторить сразу (due)');

  const withHint = getReviewStateFromAttempts(
    [
      attempt({ attemptId: 'h1', isCorrect: true, hintsUsed: 0, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'h2', isCorrect: true, hintsUsed: 1, date: '2026-08-20T11:00:00.000Z' }),
    ],
    SKILL,
    USER,
  );
  check(withHint.reviewIntervalDays === 1, 'правильный с подсказкой: интервал остаётся 1, не 3');
  check(withHint.nextReviewAt === '2026-08-21T11:00:00.000Z', 'подсказка: nextReviewAt = last + 1 день');

  const again = calculateNextReviewAt(firstDate, 1);
  check(again === calculateNextReviewAt(firstDate, 1), 'даты стабильны при повторном расчёте');
  check(calculateNextReviewAt(firstDate, 0) === firstDate, 'интервал 0: nextReviewAt совпадает с lastAttemptAt');

  const seen = new Set<number>();
  for (const sample of [
    calculateReviewInterval([], SKILL, USER),
    calculateReviewInterval(firstCorrect, SKILL, USER),
    calculateReviewInterval([day1, day2], SKILL, USER),
    calculateReviewInterval([day1, day2, day3], SKILL, USER),
    afterError.reviewIntervalDays,
    withHint.reviewIntervalDays,
    newChild.reviewIntervalDays,
  ]) {
    if (sample !== null) {
      check(isReviewIntervalDays(sample), `интервал ${sample} должен быть 0/1/3/7`);
      seen.add(sample);
    }
  }
  check(
    [...seen].every((value) => (REVIEW_INTERVAL_DAYS as readonly number[]).includes(value)),
    'нет интервалов кроме 0/1/3/7',
  );

  const masteryReview = getReviewState(
    calculateSkillMastery([day1, day2, day3], SKILL, USER),
    '2026-08-22T12:00:00.000Z',
  );
  check(masteryReview.reviewIntervalDays === 7, 'поверх SkillMastery: интервал 7');
  check(masteryReview.nextReviewAt === '2026-08-29T12:00:00.000Z', 'поверх SkillMastery: nextReviewAt совпадает');

  return failures;
}

export function reportMasterySelfChecks(): void {
  const failures = [...runMasterySelfChecks(), ...runReviewSelfChecks()];
  if (failures.length > 0) {
    throw new Error(`mastery self-check failed:\n- ${failures.join('\n- ')}`);
  }
}
