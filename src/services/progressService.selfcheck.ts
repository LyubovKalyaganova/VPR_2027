import type { Attempt, Difficulty } from '../types';
import { isMasteredSkill, isWeakSkill } from './masteryService';
import {
  getChildProgress,
  getOverallSubjectScore,
  getSectionScore,
  getTopicScore,
  getUserProgress,
  getWeakSkillProgress,
} from './progressService';

const USER = 'user-a';
const OTHER = 'user-b';
const ADD = 'math.calculation.multi_digit.addition';
const SUB = 'math.calculation.multi_digit.subtraction';
const ADD_TOPIC = 'math.calculation.multi_digit';
const ADD_SECTION = 'math.calculation';
const EMPTY_TOPIC = 'math.quantities.units';

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
    topicId: 'topicId' in overrides ? overrides.topicId : ADD_TOPIC,
    skillId: 'skillId' in overrides ? overrides.skillId : ADD,
    mode: overrides.mode ?? 'quick',
  };
}

function expect(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

export function runProgressSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    const error = expect(condition, message);
    if (error) {
      failures.push(error);
    }
  };

  const empty = getUserProgress([], USER);
  check(empty.totalAttempts === 0, '1. нет Attempt: totalAttempts 0');
  check(empty.correctAttempts === 0 && empty.incorrectAttempts === 0, '1. нет Attempt: correct/incorrect 0');
  check(empty.accuracy === 0, '1. нет Attempt: accuracy 0, не NaN');
  check(empty.currentStreak === 0 && empty.bestStreak === 0, '1. нет Attempt: серии 0');
  check(empty.totalTimeSpent === 0 && empty.totalHintsUsed === 0, '1. нет Attempt: время и подсказки 0');
  check(empty.solvedQuestionsCount === 0, '1. нет Attempt: уникальных заданий 0');
  const emptyChild = getChildProgress([], USER);
  check(emptyChild.mathScore === null, '1. нет Attempt: mathScore null, не 0');
  check(
    emptyChild.mathSkills.every((item) => item.mastery.status === 'new' && item.mastery.masteryScore === null),
    '15. нет данных по навыку: status new, masteryScore null',
  );
  check(emptyChild.weakSkills.length === 0, '1. нет Attempt: слабых навыков нет');

  const oneCorrect = getUserProgress([attempt({ isCorrect: true })], USER);
  check(oneCorrect.totalAttempts === 1, '2. одна правильная: totalAttempts 1');
  check(oneCorrect.correctAttempts === 1 && oneCorrect.incorrectAttempts === 0, '2. одна правильная: 1/0');
  check(oneCorrect.accuracy === 100, '5. accuracy одной правильной: 100');
  check(oneCorrect.currentStreak === 1 && oneCorrect.bestStreak === 1, '2. одна правильная: серия 1');

  const oneWrong = getUserProgress([attempt({ isCorrect: false })], USER);
  check(oneWrong.totalAttempts === 1, '3. одна неправильная: totalAttempts 1');
  check(oneWrong.correctAttempts === 0 && oneWrong.incorrectAttempts === 1, '3. одна неправильная: 0/1');
  check(oneWrong.accuracy === 0, '5. accuracy одной ошибки: 0');
  check(oneWrong.currentStreak === 0, '6. последняя ошибка: currentStreak 0');
  check(oneWrong.bestStreak === 0, '7. одна ошибка: bestStreak 0');

  const mixedAttempts = [
    attempt({ attemptId: 'a1', isCorrect: true, date: '2026-08-20T10:00:00.000Z' }),
    attempt({ attemptId: 'a2', isCorrect: true, date: '2026-08-20T11:00:00.000Z' }),
    attempt({ attemptId: 'a3', isCorrect: false, date: '2026-08-20T12:00:00.000Z' }),
    attempt({ attemptId: 'a4', isCorrect: true, date: '2026-08-20T13:00:00.000Z' }),
    attempt({ attemptId: 'a5', isCorrect: true, date: '2026-08-20T14:00:00.000Z' }),
  ];
  const mixed = getUserProgress(mixedAttempts, USER);
  check(mixed.totalAttempts === 5, '4. смесь: totalAttempts 5');
  check(mixed.correctAttempts === 4 && mixed.incorrectAttempts === 1, '4. смесь: 4/1');
  check(mixed.correctAttempts + mixed.incorrectAttempts === mixed.totalAttempts, '4. смесь: сумма равна total');
  check(mixed.accuracy === 80, `5. accuracy смеси: 80, получено ${mixed.accuracy}`);
  check(mixed.currentStreak === 2, '6. currentStreak после true true false true true = 2');
  check(mixed.bestStreak === 2, '7. bestStreak смеси из пар = 2');

  const bestThree = getUserProgress(
    [
      attempt({ attemptId: 'b1', isCorrect: true, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'b2', isCorrect: true, date: '2026-08-20T11:00:00.000Z' }),
      attempt({ attemptId: 'b3', isCorrect: false, date: '2026-08-20T12:00:00.000Z' }),
      attempt({ attemptId: 'b4', isCorrect: true, date: '2026-08-20T13:00:00.000Z' }),
      attempt({ attemptId: 'b5', isCorrect: true, date: '2026-08-20T14:00:00.000Z' }),
      attempt({ attemptId: 'b6', isCorrect: true, date: '2026-08-20T15:00:00.000Z' }),
      attempt({ attemptId: 'b7', isCorrect: false, date: '2026-08-20T16:00:00.000Z' }),
    ],
    USER,
  );
  check(bestThree.bestStreak === 3, '7. bestStreak true true false true true true false = 3');
  check(bestThree.currentStreak === 0, '6. последняя ошибка: currentStreak 0');

  const timed = getUserProgress(
    [
      attempt({ attemptId: 't1', isCorrect: true, timeSpent: 4000 }),
      attempt({ attemptId: 't2', isCorrect: false, timeSpent: Number.NaN }),
      attempt({
        attemptId: 't3',
        isCorrect: true,
        timeSpent: Number.POSITIVE_INFINITY,
      }),
    ],
    USER,
  );
  check(timed.totalTimeSpent === 4000, `8. totalTime: только корректные 4000, получено ${timed.totalTimeSpent}`);
  check(timed.totalAttempts === 3, '8. битое timeSpent не ломает подсчёт Attempt');

  const hints = getUserProgress(
    [
      attempt({ attemptId: 'h1', isCorrect: true, hintsUsed: 2 }),
      attempt({ attemptId: 'h2', isCorrect: false, hintsUsed: 1 }),
    ],
    USER,
  );
  check(hints.totalHintsUsed === 3, '9. totalHintsUsed: сумма сохранённых подсказок 3');

  const unique = getUserProgress(
    [
      attempt({ attemptId: 'q1', isCorrect: true, questionId: 'math-training-001' }),
      attempt({ attemptId: 'q2', isCorrect: false, questionId: 'math-training-001' }),
      attempt({ attemptId: 'q3', isCorrect: true, questionId: 'math-training-002' }),
    ],
    USER,
  );
  check(unique.totalAttempts === 3, '10. уникальные questionId не подменяют totalAttempts');
  check(unique.solvedQuestionsCount === 2, '10. solvedQuestionsCount = 2 уникальных');
  check(unique.solvedQuestionIds.join(',') === 'math-training-001,math-training-002', '10. порядок первого появления');

  const withStranger = getUserProgress(
    [
      attempt({ attemptId: 'mine', isCorrect: true }),
      attempt({ attemptId: 'other', isCorrect: true, userId: OTHER, questionId: 'math-training-009' }),
    ],
    USER,
  );
  check(withStranger.totalAttempts === 1, '11. чужой userId полностью исключён');
  check(withStranger.solvedQuestionsCount === 1, '11. чужой questionId не считается');

  const demo = attempt({
    attemptId: 'demo-1',
    isCorrect: true,
    questionId: 'demo-math-single-1',
    skillId: undefined,
    topicId: undefined,
    mode: 'quick',
  });
  const demoProgress = getUserProgress([demo], USER);
  const demoChild = getChildProgress([demo], USER);
  check(demoProgress.totalAttempts === 1, '12. DEMO без skillId при mode quick входит в totalAttempts');
  check(demoProgress.accuracy === 100, '12. DEMO без skillId при mode quick входит в accuracy');
  check(demoChild.mathScore === null, '12. DEMO без skillId не повышает mathScore');
  check(
    demoChild.mathSkills.every((item) => item.mastery.masteryScore === null),
    '12. DEMO без skillId не даёт SkillMastery',
  );
  const demoMode = attempt({
    attemptId: 'demo-mode',
    isCorrect: true,
    questionId: 'demo-math-single-1',
    skillId: undefined,
    topicId: undefined,
    mode: 'demo',
  });
  const demoModeProgress = getUserProgress([demoMode], USER);
  check(demoModeProgress.totalAttempts === 0, '12b. mode demo не входит в totalAttempts');
  check(demoModeProgress.correctAttempts === 0, '12b. mode demo не входит в correctAttempts');
  check(demoModeProgress.currentStreak === 0 && demoModeProgress.bestStreak === 0, '12b. mode demo не влияет на серию');

  const skillAttempt = attempt({ isCorrect: false, skillId: ADD });
  const withSkill = getChildProgress([skillAttempt], USER);
  const addMastery = withSkill.mathSkills.find((item) => item.skill.id === ADD)?.mastery;
  check(addMastery?.attemptsCount === 1, '13. попытка с skillId попадает в SkillMastery');
  check(addMastery?.masteryScore === 0, '13. ошибка навыка: score 0, не null');
  check(addMastery !== undefined && isWeakSkill(addMastery), '16. слабый навык через isWeakSkill()');

  const twoSkills = getChildProgress(
    [
      attempt({ attemptId: 's-add', isCorrect: false, skillId: ADD, questionId: 'math-training-001' }),
      attempt({
        attemptId: 's-sub',
        isCorrect: true,
        skillId: SUB,
        questionId: 'math-training-002',
        topicId: ADD_TOPIC,
      }),
    ],
    USER,
  );
  const add = twoSkills.mathSkills.find((item) => item.skill.id === ADD)?.mastery;
  const sub = twoSkills.mathSkills.find((item) => item.skill.id === SUB)?.mastery;
  check(add?.attemptsCount === 1 && sub?.attemptsCount === 1, '14. несколько навыков считаются раздельно');
  check(add?.masteryScore === 0 && sub?.masteryScore === 60, '14. scores навыков независимы');
  check(
    twoSkills.mathSkills.filter((item) => item.mastery.masteryScore === null).length ===
      twoSkills.mathSkills.length - 2,
    '15. остальные навыки без данных: masteryScore null',
  );

  const weakSorted = getWeakSkillProgress(twoSkills.mathSkills);
  check(weakSorted[0]?.skill.id === ADD, '16. слабые навыки: первым более низкий masteryScore');
  check(
    weakSorted.every((item) => isWeakSkill(item.mastery)),
    '16. список слабых строится через isWeakSkill()',
  );

  const masteredAttempts: Attempt[] = [];
  for (let index = 0; index < 5; index += 1) {
    masteredAttempts.push(
      attempt({
        attemptId: `ok-${index}`,
        isCorrect: true,
        difficulty: 3 as Difficulty,
        date: `2026-08-2${index}T12:00:00.000Z`,
        questionId: `math-training-00${index + 1}`,
      }),
    );
  }
  const masteredChild = getChildProgress(masteredAttempts, USER);
  const mastered = masteredChild.mathSkills.find((item) => item.skill.id === ADD)?.mastery;
  check(mastered !== undefined && isMasteredSkill(mastered), '17. mastered определяется masteryService');
  check(mastered?.status === 'mastered', '17. status mastered');
  check(
    masteredChild.weakSkills.every((item) => item.skill.id !== ADD),
    '17. mastered навык не входит в слабые',
  );

  const topicScore = getTopicScore(
    [
      attempt({ attemptId: 'tp-add', isCorrect: false, skillId: ADD }),
      attempt({ attemptId: 'tp-sub', isCorrect: true, skillId: SUB, questionId: 'math-training-002' }),
    ],
    USER,
    ADD_TOPIC,
  );
  check(topicScore === 30, `18. тема: среднее 0 и 60 = 30, получено ${topicScore}`);
  check(getTopicScore([], USER, ADD_TOPIC) === null, '18. тема без данных: null, не 0');
  check(getTopicScore([attempt({ isCorrect: true, skillId: ADD })], USER, EMPTY_TOPIC) === null, '18. чужая тема без данных: null');
  check(getSectionScore([], USER, ADD_SECTION) === null, '19. раздел без данных: null');
  check(
    getSectionScore([attempt({ isCorrect: false, skillId: ADD })], USER, ADD_SECTION) === 0,
    '19. раздел сосчитан только по навыкам с данными',
  );

  const first = getUserProgress(mixedAttempts, USER);
  const second = getUserProgress(mixedAttempts, USER);
  check(JSON.stringify(first) === JSON.stringify(second), '18. повторный расчёт без изменения Attempt даёт тот же результат');
  check(getUserProgress(mixedAttempts, '').totalAttempts === 0, 'пустой userId не падает и не считает чужое');
  check(getOverallSubjectScore({ mathematics: 80, russian: 60, world: null, reading: null, english: null }, ['mathematics', 'russian']) === 70, 'overall selected subjects average');
  check(getOverallSubjectScore({ mathematics: null, russian: null, world: null, reading: null, english: null }, ['english']) === null, 'overall empty stays null');

  return failures;
}

export function reportProgressSelfChecks(): void {
  const failures = runProgressSelfChecks();
  if (failures.length > 0) {
    throw new Error(`progress self-check failed:\n- ${failures.join('\n- ')}`);
  }
}
