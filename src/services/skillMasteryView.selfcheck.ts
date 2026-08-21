import { MATH_SECTIONS, MATH_SKILLS, type MathSkill } from '../data/taxonomy/math';
import type { MasteryStatus, SkillMastery } from '../types';
import type { SkillProgress } from './progressService';
import { getSkillMasteryView } from './skillMasteryView';

const USER = 'user-skill-mastery-view';

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

function progressFor(
  skill: MathSkill,
  masteryOverrides: Partial<SkillMastery> = {},
): SkillProgress {
  return {
    skill,
    mastery: emptyMastery(skill.id, masteryOverrides),
  };
}

function allSkillProgress(
  overrideById: Record<string, Partial<SkillMastery>> = {},
): SkillProgress[] {
  return MATH_SKILLS.map((skill) => progressFor(skill, overrideById[skill.id]));
}

function flattenSkills(sections: ReturnType<typeof getSkillMasteryView>) {
  return sections.flatMap((section) => section.skills);
}

export function runSkillMasteryViewSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const full = allSkillProgress();
  const fullView = getSkillMasteryView(full);
  const fullSkills = flattenSkills(fullView);

  check(fullSkills.length === 22, `A: 22 навыка → все присутствуют, получено ${fullSkills.length}`);
  check(
    MATH_SKILLS.every((skill) => fullSkills.some((item) => item.skillId === skill.id)),
    'A: каждый MATH_SKILLS присутствует во view',
  );

  check(
    fullView.every((section) =>
      section.skills.every((item) => {
        const skill = MATH_SKILLS.find((entry) => entry.id === item.skillId);
        return skill?.sectionId === section.sectionId;
      }),
    ),
    'B: навыки распределяются по существующим MATH_SECTIONS',
  );

  check(
    fullView.map((section) => section.sectionId).join('|') === MATH_SECTIONS.map((section) => section.id).join('|'),
    'C: порядок разделов сохраняется',
  );
  check(
    fullView.map((section) => section.title).join('|') === MATH_SECTIONS.map((section) => section.title).join('|'),
    'C: названия разделов совпадают с MATH_SECTIONS',
  );

  const reversed = allSkillProgress().reverse();
  const reversedView = getSkillMasteryView(reversed);
  const expectedOrder = MATH_SKILLS.map((skill) => skill.id).join('|');
  const reversedOrder = flattenSkills(reversedView)
    .map((item) => item.skillId)
    .join('|');
  check(reversedOrder === expectedOrder, 'D: порядок навыков внутри разделов сохраняется');

  const add = MATH_SKILLS[0];
  const scored = (score: number | null, status: MasteryStatus, attemptsCount = 1) =>
    getSkillMasteryView([
      progressFor(add, { masteryScore: score, status, attemptsCount }),
    ]);

  const zero = scored(0, 'not_mastered')[0]?.skills[0];
  check(zero?.scoreLabel === '0%', 'E: masteryScore = 0 → 0%, а не «—»');
  check(zero?.progressValue === 0, 'E: masteryScore = 0 → progressValue 0');
  check(zero?.masteryScore === 0, 'E: исходный masteryScore 0 не изменён');

  const fifty = scored(50, 'developing')[0]?.skills[0];
  check(fifty?.scoreLabel === '50%', 'F: masteryScore = 50 → 50%');
  check(fifty?.progressValue === 50, 'F: progressValue = 50');
  check(fifty?.masteryScore === 50, 'F: исходный masteryScore 50 не изменён');

  const hundred = scored(100, 'mastered')[0]?.skills[0];
  check(hundred?.scoreLabel === '100%', 'G: masteryScore = 100 → 100%');
  check(hundred?.progressValue === 100, 'G: progressValue = 100');
  check(hundred?.masteryScore === 100, 'G: исходный masteryScore 100 не изменён');

  const emptyScore = scored(null, 'new', 0)[0]?.skills[0];
  check(emptyScore?.scoreLabel === '—', 'H: masteryScore = null → «—»');
  check(emptyScore?.progressValue === 0, 'H: masteryScore = null → progressValue 0');
  check(emptyScore?.masteryScore === null, 'H: исходный masteryScore null не изменён');

  check(emptyScore?.status === 'new' && emptyScore.statusLabel === 'Нет данных', 'I: status = new → «Нет данных»');
  check(fifty?.status === 'developing' && fifty.statusLabel === 'Формируется', 'J: status = developing → «Формируется»');
  check(hundred?.status === 'mastered' && hundred.statusLabel === 'Освоено', 'K: status = mastered → «Освоено»');

  const oddScore = scored(37, 'not_mastered')[0]?.skills[0];
  check(oddScore?.masteryScore === 37 && oddScore.progressValue === 37 && oddScore.scoreLabel === '37%', 'P: view не пересчитывает masteryScore');

  check(
    fullSkills.every((item) => {
      const skill = MATH_SKILLS.find((entry) => entry.id === item.skillId);
      const displayText = `${item.title} ${item.statusLabel} ${item.scoreLabel}`;
      return skill !== undefined && item.title === skill.title && !displayText.includes(skill.id);
    }),
    'L: skillId не превращается в пользовательский текст',
  );

  const source = allSkillProgress({
    [add.id]: { masteryScore: 40, status: 'developing', attemptsCount: 2 },
  });
  const before = JSON.stringify(source);
  const mutatedView = getSkillMasteryView(source);
  mutatedView[0].title = 'MUTATED-SECTION';
  const firstSkill = mutatedView[0]?.skills[0];
  if (firstSkill) {
    firstSkill.title = 'MUTATED-SKILL';
    firstSkill.scoreLabel = 'MUTATED-SCORE';
  }
  check(JSON.stringify(source) === before, 'M: входные данные не мутируются');

  const first = getSkillMasteryView(source);
  const second = getSkillMasteryView(source);
  check(JSON.stringify(first) === JSON.stringify(second), 'N: одинаковый вход → одинаковый результат');

  const storage = (globalThis as { localStorage?: { length: number } }).localStorage;
  const storageBefore = storage ? storage.length : 'absent';
  getSkillMasteryView(full);
  const storageAfter = storage ? storage.length : 'absent';
  check(storageAfter === storageBefore, 'O: сервис не использует localStorage');
  check(!/\blocalStorage\b/.test(getSkillMasteryView.toString()), 'O: функция не обращается к localStorage');
  check(
    !getSkillMasteryView.toString().includes('calculateSkillMastery'),
    'P: сервис не вызывает calculateSkillMastery',
  );

  const emptyView = getSkillMasteryView([]);
  check(emptyView.length === MATH_SECTIONS.length, 'Q: пустой набор не падает и сохраняет разделы');
  check(
    emptyView.every((section) => section.skills.length === 0),
    'Q: пустой набор → разделы без карточек навыков',
  );

  check(emptyView.length === 7, 'R: все 7 MATH_SECTIONS сохраняются при отсутствии навыков');
  check(
    emptyView.map((section) => section.sectionId).join('|') === MATH_SECTIONS.map((section) => section.id).join('|'),
    'R: состав и порядок MATH_SECTIONS сохраняется при пустом входе',
  );

  return failures;
}

export function reportSkillMasteryViewSelfChecks(): void {
  const failures = runSkillMasteryViewSelfChecks();
  if (failures.length > 0) {
    throw new Error(`skillMasteryView self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportSkillMasteryViewSelfChecks();
