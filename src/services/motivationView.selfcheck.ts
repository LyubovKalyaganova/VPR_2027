import { MATH_SKILLS, type MathSkill } from '../data/taxonomy/math';
import type { MasteryStatus, SkillMastery } from '../types';
import type { Achievement, AchievementId } from './achievementService';
import type { SkillProgress } from './progressService';
import { getMotivationView } from './motivationView';

const USER = 'user-motivation-view';

const KNOWN_TITLES = new Set([
  'Первый шаг',
  '10 заданий',
  '25 заданий',
  '50 заданий',
  'Серия 3',
  'Серия 5',
  'Серия 10',
  'Первый план',
  '3 дня обучения',
  '7 дней обучения',
  'Навык освоен',
]);

function emptyMastery(skillId: string, overrides: Partial<SkillMastery> = {}): SkillMastery {
  return {
    userId: USER,
    skillId,
    masteryScore: null,
    attemptsCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastAttemptAt: null,
    lastCorrectAt: null,
    currentStreak: 0,
    incorrectStreak: 0,
    lastDifficulty: null,
    lastHintsUsed: 0,
    nextReviewAt: null,
    reviewIntervalDays: 0,
    status: 'new',
    ...overrides,
  };
}

function skillProgress(skill: MathSkill, status: MasteryStatus, score: number | null): SkillProgress {
  return {
    skill,
    mastery: emptyMastery(skill.id, {
      status,
      masteryScore: score,
      attemptsCount: status === 'new' ? 0 : 5,
    }),
  };
}

function allSkills(status: MasteryStatus, score: number | null): SkillProgress[] {
  return MATH_SKILLS.map((skill) => skillProgress(skill, status, score));
}

function achievement(
  id: AchievementId,
  title: string,
  description: string,
  achieved: boolean,
): Achievement {
  return {
    id,
    title,
    description,
    achieved,
    achievedAt: achieved ? '2026-08-21T12:00:00.000Z' : null,
  };
}

const CATALOG: Achievement[] = [
  achievement('first-step', 'Первый шаг', 'Решено хотя бы одно задание', false),
  achievement('tasks-10', '10 заданий', 'Решено 10 разных заданий', false),
  achievement('tasks-25', '25 заданий', 'Решено 25 разных заданий', false),
  achievement('tasks-50', '50 заданий', 'Решено 50 разных заданий', false),
  achievement('streak-3', 'Серия 3', 'Текущая серия правильных ответов — 3', false),
  achievement('streak-5', 'Серия 5', 'Текущая серия правильных ответов — 5', false),
  achievement('streak-10', 'Серия 10', 'Текущая серия правильных ответов — 10', false),
  achievement('first-plan', 'Первый план', 'Ежедневный план выполнен полностью', false),
  achievement('days-3', '3 дня обучения', 'Занятия в 3 разных дня', false),
  achievement('days-7', '7 дней обучения', 'Занятия в 7 разных дня', false),
  achievement('skill-mastered', 'Навык освоен', 'Есть освоенный навык', false),
];

function withAchieved(ids: AchievementId[]): Achievement[] {
  return CATALOG.map((item) =>
    ids.includes(item.id) ? { ...item, achieved: true, achievedAt: '2026-08-21T12:00:00.000Z' } : item,
  );
}

export function runMotivationViewSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const emptySkills = allSkills('new', null);
  const empty = getMotivationView({
    mathSkills: emptySkills,
    achievements: CATALOG,
    nextHint: 'Реши первое задание — откроется «Первый шаг»',
  });
  check(empty.earned.length === 0, 'A: новый ребёнок → нет ложных достижений');
  check(empty.emptyMessage !== null, 'A: есть приглашение начать, без фиктивных наград');
  check(empty.masteredPhrase === 'Первый освоенный навык ещё впереди', 'B: 0 mastered → корректный текст');

  const oneMasteredSkills = MATH_SKILLS.map((skill, index) =>
    skillProgress(skill, index === 0 ? 'mastered' : 'new', index === 0 ? 95 : null),
  );
  const one = getMotivationView({
    mathSkills: oneMasteredSkills,
    achievements: withAchieved(['skill-mastered']),
    nextHint: 'До 10 заданий осталось 2',
  });
  check(one.masteredPhrase === 'Освоено навыков: 1', 'C: 1 mastered → корректный текст');
  check(one.earned.some((item) => item.title === 'Навык освоен'), 'E: существующее достижение отображается');

  const threeMastered = MATH_SKILLS.map((skill, index) =>
    skillProgress(skill, index < 3 ? 'mastered' : 'new', index < 3 ? 92 : null),
  );
  const several = getMotivationView({
    mathSkills: threeMastered,
    achievements: withAchieved(['first-step', 'tasks-10', 'skill-mastered']),
    nextHint: 'До 25 заданий осталось 12',
  });
  check(several.masteredPhrase === 'Освоено навыков: 3', 'D: несколько mastered → корректное количество');
  check(several.earned.length === 3, 'E: не больше 3 полученных в подборке');
  check(
    several.earned.every((item) => KNOWN_TITLES.has(item.title)),
    'F: нет выдуманных achievements',
  );

  const demo = getMotivationView({
    mathSkills: emptySkills,
    achievements: CATALOG,
    nextHint: null,
  });
  check(demo.earned.length === 0 && demo.masteredPhrase.includes('впереди'), 'G: DEMO/пустые данные не создают прогресса');

  const input = {
    mathSkills: oneMasteredSkills,
    achievements: withAchieved(['first-step', 'skill-mastered']),
    nextHint: 'До 10 заданий осталось 4',
  };
  const first = getMotivationView(input);
  const second = getMotivationView(input);
  check(JSON.stringify(first) === JSON.stringify(second), 'H: одинаковый вход → одинаковый выход');

  const before = JSON.stringify(input);
  const mutated = getMotivationView(input);
  mutated.earned[0].title = 'MUTATED';
  mutated.masteredPhrase = 'MUTATED';
  check(JSON.stringify(input) === before, 'I: входные массивы не мутируются');

  const display = JSON.stringify(several);
  check(!display.includes('skill-mastered') && !display.includes('first-step'), 'J: технические ID не в UI-модели');
  check(!several.earned.some((item) => item.title.startsWith('skill-')), 'J: title не является skillId');

  check(!getMotivationView.toString().includes('uniqueCount'), 'K: правила achievements не дублируются');
  check(!/\blocalStorage\b/.test(getMotivationView.toString()), 'сервис не читает localStorage');
  check(!getMotivationView.toString().includes('calculateSkillMastery'), 'сервис не считает mastery');

  return failures;
}

export function reportMotivationViewSelfChecks(): void {
  const failures = runMotivationViewSelfChecks();
  if (failures.length > 0) {
    throw new Error(`motivationView self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportMotivationViewSelfChecks();
