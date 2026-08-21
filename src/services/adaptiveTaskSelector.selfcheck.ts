import type { Attempt } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { taskRepository } from './taskRepository';
import { selectAdaptiveTasks } from './adaptiveTaskSelector';
import { calculateSkillMastery } from './masteryService';

const USER = 'user-a';
const OTHER = 'user-b';
const ADD = 'math.calculation.multi_digit.addition';
const SUB = 'math.calculation.multi_digit.subtraction';
const EMPTY_SKILL = 'math.quantities.units.convert';

function attempt(overrides: Partial<Attempt> & Pick<Attempt, 'isCorrect'>): Attempt {
  return {
    attemptId: overrides.attemptId ?? 'attempt-1',
    userId: overrides.userId ?? USER,
    questionId: overrides.questionId ?? 'math-training-001',
    sessionId: overrides.sessionId ?? 'session-1',
    date: overrides.date ?? '2026-08-20T12:00:00.000Z',
    answer: overrides.answer ?? '359',
    isCorrect: overrides.isCorrect,
    timeSpent: overrides.timeSpent ?? 4000,
    hintsUsed: overrides.hintsUsed ?? 0,
    difficulty: overrides.difficulty ?? 3,
    subject: overrides.subject ?? 'mathematics',
    topic: overrides.topic ?? 'Сложение и вычитание многозначных чисел',
    skill: overrides.skill ?? 'Сложение',
    topicId: overrides.topicId ?? 'math.calculation.multi_digit',
    skillId: 'skillId' in overrides ? overrides.skillId : ADD,
    mode: overrides.mode ?? 'quick',
  };
}

function bank() {
  return taskRepository.getMathTasks();
}

function pick(overrides: Partial<Parameters<typeof selectAdaptiveTasks>[0]> & { attempts: Attempt[]; count: number }) {
  return selectAdaptiveTasks({
    userId: USER,
    subject: 'mathematics',
    tasks: bank(),
    skills: MATH_SKILLS,
    nowIso: '2026-08-22T12:00:00.000Z',
    ...overrides,
  });
}

export function runAdaptiveSelectorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const tasksSnapshot = bank();
  const newChild = pick({ attempts: [], count: 5 });
  check(newChild.length > 0, 'тест 1: новый ребёнок получает задания');
  check(newChild.length <= 5, 'тест 1: не больше count');
  check(
    newChild.every((task) => task.skillId === ADD || task.skillId === SUB),
    'тест 1: только навыки с заданиями в банке',
  );

  const weakAttempts = [
    attempt({ attemptId: 'w1', skillId: ADD, isCorrect: true, date: '2026-08-20T09:00:00.000Z' }),
    attempt({ attemptId: 'w2', skillId: ADD, isCorrect: false, date: '2026-08-20T10:00:00.000Z' }),
    attempt({ attemptId: 'w3', skillId: ADD, isCorrect: false, date: '2026-08-20T11:00:00.000Z' }),
    attempt({ attemptId: 's1', skillId: SUB, isCorrect: true, date: '2026-08-20T09:00:00.000Z' }),
    attempt({ attemptId: 's2', skillId: SUB, isCorrect: true, date: '2026-08-20T10:00:00.000Z' }),
    attempt({ attemptId: 's3', skillId: SUB, isCorrect: true, date: '2026-08-20T11:00:00.000Z' }),
    attempt({ attemptId: 's4', skillId: SUB, isCorrect: true, date: '2026-08-20T11:30:00.000Z' }),
    attempt({ attemptId: 's5', skillId: SUB, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
  ];
  const weakMastery = calculateSkillMastery(weakAttempts, ADD, USER);
  const strongMastery = calculateSkillMastery(weakAttempts, SUB, USER);
  check(
    weakMastery.masteryScore !== null &&
      strongMastery.masteryScore !== null &&
      weakMastery.masteryScore < strongMastery.masteryScore,
    'тест 2: исходные score слабый < сильный',
  );
  const weakVsStrong = pick({
    count: 1,
    nowIso: '2026-08-20T12:00:00.000Z',
    attempts: weakAttempts,
  });
  check(weakVsStrong[0]?.skillId === ADD, 'тест 2: слабый навык приоритетнее сильного');

  const dueAttempts = [
    attempt({ attemptId: 'd1', skillId: SUB, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
    attempt({ attemptId: 'n1', skillId: ADD, isCorrect: false, date: '2026-08-22T10:00:00.000Z' }),
    attempt({ attemptId: 'n2', skillId: ADD, isCorrect: false, date: '2026-08-22T11:00:00.000Z' }),
    attempt({ attemptId: 'n3', skillId: ADD, isCorrect: true, date: '2026-08-22T12:00:00.000Z' }),
  ];
  const duePick = pick({ attempts: dueAttempts, count: 1, nowIso: '2026-08-22T12:00:00.000Z' });
  check(duePick[0]?.skillId === SUB, 'тест 3: reviewDue важнее более низкого score без due (§22)');

  const errorsPick = pick({
    count: 1,
    nowIso: '2026-08-20T12:00:00.000Z',
    attempts: [
      attempt({ attemptId: 'e1', skillId: ADD, isCorrect: false, date: '2026-08-20T09:00:00.000Z' }),
      attempt({ attemptId: 'e2', skillId: ADD, isCorrect: false, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'e3', skillId: ADD, isCorrect: false, date: '2026-08-20T11:00:00.000Z' }),
      attempt({ attemptId: 'b1', skillId: SUB, isCorrect: false, date: '2026-08-20T11:00:00.000Z' }),
    ],
  });
  check(errorsPick[0]?.skillId === ADD, 'тест 4: навык с несколькими ошибками приоритетнее');

  const historyPick = pick({
    count: 1,
    nowIso: '2026-08-20T12:00:00.000Z',
    attempts: [
      attempt({ attemptId: 'h1', skillId: ADD, isCorrect: false, date: '2026-08-20T09:00:00.000Z' }),
      attempt({ attemptId: 'h2', skillId: ADD, isCorrect: false, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'h3', skillId: ADD, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
      attempt({ attemptId: 'ok1', skillId: SUB, isCorrect: true, date: '2026-08-20T09:00:00.000Z' }),
      attempt({ attemptId: 'ok2', skillId: SUB, isCorrect: true, date: '2026-08-20T10:00:00.000Z' }),
      attempt({ attemptId: 'ok3', skillId: SUB, isCorrect: true, date: '2026-08-20T11:00:00.000Z' }),
      attempt({ attemptId: 'ok4', skillId: SUB, isCorrect: true, date: '2026-08-20T11:30:00.000Z' }),
      attempt({ attemptId: 'ok5', skillId: SUB, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
    ],
  });
  check(historyPick[0]?.skillId === ADD, 'тест 5: учитывается история ошибок, не только последняя попытка');

  const foreignAttempts = [
    attempt({ attemptId: 'me-strong-1', skillId: ADD, isCorrect: true, date: '2026-08-16T12:00:00.000Z' }),
    attempt({ attemptId: 'me-strong-2', skillId: ADD, isCorrect: true, date: '2026-08-17T12:00:00.000Z' }),
    attempt({ attemptId: 'me-strong-3', skillId: ADD, isCorrect: true, date: '2026-08-18T12:00:00.000Z' }),
    attempt({ attemptId: 'me-strong-4', skillId: ADD, isCorrect: true, date: '2026-08-19T12:00:00.000Z' }),
    attempt({ attemptId: 'me-strong-5', skillId: ADD, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
    attempt({
      attemptId: 'them1',
      userId: OTHER,
      skillId: ADD,
      isCorrect: false,
      date: '2026-08-20T11:00:00.000Z',
    }),
    attempt({
      attemptId: 'them2',
      userId: OTHER,
      skillId: ADD,
      isCorrect: false,
      date: '2026-08-20T12:00:00.000Z',
    }),
  ];
  const ownAdd = calculateSkillMastery(foreignAttempts, ADD, USER);
  check(ownAdd.incorrectCount === 0, 'тест 6: ошибки другого userId не входят в SkillMastery');
  check(ownAdd.masteryScore !== null && ownAdd.masteryScore >= 80, 'тест 6: свой навык остаётся сильным');
  pick({ count: 1, nowIso: '2026-08-20T12:00:00.000Z', attempts: foreignAttempts });

  const otherSkill = pick({
    count: 1,
    nowIso: '2026-08-20T12:00:00.000Z',
    attempts: [
      attempt({ attemptId: 'own-sub', skillId: SUB, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
      attempt({
        attemptId: 'ghost1',
        skillId: EMPTY_SKILL,
        isCorrect: false,
        date: '2026-08-20T10:00:00.000Z',
      }),
      attempt({
        attemptId: 'ghost2',
        skillId: EMPTY_SKILL,
        isCorrect: false,
        date: '2026-08-20T11:00:00.000Z',
      }),
    ],
  });
  check(
    otherSkill[0]?.skillId === SUB || otherSkill[0]?.skillId === ADD,
    'тест 7: Attempt другого skillId не ломает подбор',
  );
  check(
    otherSkill.every((task) => task.skillId !== EMPTY_SKILL),
    'тест 7: навык без заданий в банке не выбирается',
  );

  const demoIgnored = pick({
    count: 1,
    nowIso: '2026-08-20T12:00:00.000Z',
    attempts: [
      attempt({ attemptId: 'real', skillId: SUB, isCorrect: true, date: '2026-08-20T12:00:00.000Z' }),
      attempt({
        attemptId: 'demo',
        skillId: undefined,
        isCorrect: false,
        questionId: 'demo-math-single-1',
        date: '2026-08-20T12:00:00.000Z',
      }),
    ],
  });
  check(demoIgnored.length > 0, 'тест 8: Attempt без skillId не мешает подбору');

  const excludedIds = ['math-training-001', 'math-training-003'];
  const excluded = pick({
    attempts: [],
    count: 4,
    excludeQuestionIds: excludedIds,
  });
  check(
    excluded.every((task) => !excludedIds.includes(task.id)),
    'тест 9: excludeQuestionIds не выбираются при наличии альтернатив',
  );

  let threw = false;
  try {
    pick({
      attempts: [],
      count: 3,
      skills: [{ id: EMPTY_SKILL }, { id: ADD }, { id: SUB }],
    });
  } catch {
    threw = true;
  }
  check(!threw, 'тест 10: отсутствие заданий у skillId не бросает ошибку');
  check(
    pick({
      attempts: [],
      count: 3,
      skills: [{ id: EMPTY_SKILL }],
    }).length === 0,
    'тест 10: если заданий навыка нет — пустой список, без исключения',
  );

  const fromBank = pick({ attempts: [], count: 10 });
  check(fromBank.length > 0, 'тест 11: подбор из текущего банка из 10 заданий');
  check(
    fromBank.every((task) => bank().some((item) => item.id === task.id)),
    'тест 11: все выбранные задания из банка',
  );

  const five = pick({ attempts: [], count: 5 });
  check(five.length <= 5, 'тест 12: count=5 даёт не больше 5');

  const tooMany = pick({ attempts: [], count: 100 });
  check(tooMany.length <= bank().length, 'тест 13: count больше банка — только доступные задания');
  check(tooMany.length === bank().length, 'тест 13: возвращаются все уникальные доступные задания');

  const original = bank();
  const originalIds = original.map((task) => task.id).join(',');
  pick({ attempts: [], count: 5, tasks: original });
  check(original.map((task) => task.id).join(',') === originalIds, 'тест 14: исходный массив tasks не изменён');
  check(original === tasksSnapshot || original.length === tasksSnapshot.length, 'тест 14: длина банка прежняя');

  check(newChild.length >= 1 && tooMany.length >= 1, 'тест 15: селектор возвращает результат для сборки');

  return failures;
}

export function reportAdaptiveSelectorSelfChecks(): void {
  const failures = runAdaptiveSelectorSelfChecks();
  if (failures.length > 0) {
    throw new Error(`adaptive selector self-check failed:\n- ${failures.join('\n- ')}`);
  }
}
