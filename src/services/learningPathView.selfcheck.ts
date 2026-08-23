import { MATH_SECTIONS, MATH_SKILLS, type MathSkill } from '../data/taxonomy/math';
import type { MasteryStatus, SkillMastery } from '../types';
import type { SkillProgress } from './progressService';
import { getLearningPathView } from './learningPathView';

const USER = 'user-learning-path-view';

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

function progressFor(skill: MathSkill, masteryOverrides: Partial<SkillMastery> = {}): SkillProgress {
  return {
    skill,
    mastery: emptyMastery(skill.id, masteryOverrides),
  };
}

function allSkills(status: MasteryStatus, masteryScore: number | null): SkillProgress[] {
  return MATH_SKILLS.map((skill) =>
    progressFor(skill, {
      status,
      masteryScore,
      attemptsCount: masteryScore === null ? 0 : 3,
    }),
  );
}

function withStatus(skillIndex: number, status: MasteryStatus, masteryScore: number | null): SkillProgress[] {
  return MATH_SKILLS.map((skill, index) =>
    progressFor(skill, {
      status: index === skillIndex ? status : 'new',
      masteryScore: index === skillIndex ? masteryScore : null,
      attemptsCount: index === skillIndex ? 2 : 0,
    }),
  );
}

export function runLearningPathViewSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const first = MATH_SKILLS[0];
  const second = MATH_SKILLS[1];
  const third = MATH_SKILLS[2];

  const emptyChild = allSkills('new', null);
  const emptyView = getLearningPathView(emptyChild);
  check(emptyView.sections.length === 7, 'A: путь существует, 7 разделов');
  check(
    emptyView.sections.map((section) => section.sectionId).join('|') ===
      MATH_SECTIONS.map((section) => section.id).join('|'),
    'A: все MATH_SECTIONS присутствуют в порядке',
  );
  check(emptyView.currentSkillId === first.id, 'A: пустой ребёнок → первая тема как начало пути');
  check(emptyView.isComplete === false, 'A: пустой путь не считается завершённым');
  check(
    emptyView.sections.every((section) => section.skills.every((item) => item.scoreLabel === '—' && item.progressValue === 0)),
    'A: нет искусственных 100%',
  );

  const allNew = getLearningPathView(allSkills('new', null));
  check(allNew.currentSkillId === first.id, 'B: все new → текущая точка — первый навык');
  check(allNew.sections[0]?.marker === 'current', 'B: первый раздел текущий');

  const oneDeveloping = getLearningPathView(withStatus(2, 'developing', 50));
  check(oneDeveloping.currentSkillId === third.id, 'C: единственный developing становится текущей точкой');
  check(oneDeveloping.currentSectionId === third.sectionId, 'C: текущий раздел совпадает с навыком');

  const severalDeveloping = MATH_SKILLS.map((skill, index) =>
    progressFor(skill, {
      status: index === 1 || index === 4 ? 'developing' : 'new',
      masteryScore: index === 1 || index === 4 ? 45 : null,
    }),
  );
  check(getLearningPathView(severalDeveloping).currentSkillId === second.id, 'D: несколько developing → первый в MATH_SKILLS');

  const firstConfident = getLearningPathView(withStatus(3, 'confident', 70));
  check(firstConfident.currentSkillId === MATH_SKILLS[3]?.id, 'E: нет developing → первый confident');

  const firstNotMastered = getLearningPathView(withStatus(5, 'not_mastered', 20));
  check(firstNotMastered.currentSkillId === MATH_SKILLS[5]?.id, 'F: нет developing/confident → первый not_mastered');

  const firstSectionId = MATH_SECTIONS[0]?.id;
  const masteredAndNew = MATH_SKILLS.map((skill) =>
    progressFor(skill, {
      status: skill.sectionId === firstSectionId ? 'mastered' : 'new',
      masteryScore: skill.sectionId === firstSectionId ? 95 : null,
    }),
  );
  const mixedView = getLearningPathView(masteredAndNew);
  const firstNewSkill = MATH_SKILLS.find((skill) => skill.sectionId !== firstSectionId);
  check(mixedView.currentSkillId === firstNewSkill?.id, 'G: mastered + new → первый new');
  check(mixedView.sections[0]?.marker === 'completed', 'G: полностью освоенный раздел — completed');

  const allMastered = getLearningPathView(allSkills('mastered', 100));
  check(allMastered.currentSkillId === null, 'H: все mastered → нет текущей точки');
  check(allMastered.isComplete === true, 'H: путь завершён');
  check(
    allMastered.sections.every((section) => section.marker === 'completed'),
    'H: все разделы completed',
  );

  const demoExtra: SkillProgress = {
    skill: {
      id: 'demo-fake-skill',
      code: 'M03',
      subjectId: 'mathematics',
      sectionId: 'math.calculation',
      topicId: 'math.calculation.multi_digit',
      title: 'DEMO навык',
    },
    mastery: emptyMastery('demo-fake-skill', { status: 'mastered', masteryScore: 100, attemptsCount: 9 }),
  };
  const withoutDemo = getLearningPathView(emptyChild);
  const withDemo = getLearningPathView([...emptyChild, demoExtra]);
  check(JSON.stringify(withoutDemo) === JSON.stringify(withDemo), 'I: посторонний DEMO-навык не меняет путь');
  check(
    !JSON.stringify(withDemo).includes('DEMO навык') && !JSON.stringify(withDemo).includes('demo-fake-skill'),
    'I: DEMO не создаёт отдельную точку пути',
  );

  const source = withStatus(1, 'developing', 60);
  const before = JSON.stringify(source);
  const mutated = getLearningPathView(source);
  mutated.sections[0].title = 'MUTATED';
  mutated.currentSkillId = 'mutated';
  check(JSON.stringify(source) === before, 'J: входные массивы не мутируются');

  const firstPass = getLearningPathView(source);
  const secondPass = getLearningPathView(source);
  check(JSON.stringify(firstPass) === JSON.stringify(secondPass), 'K: одинаковый вход → одинаковый результат');

  const display = getLearningPathView(emptyChild);
  check(
    display.sections.every((section) => {
      const sectionMeta = MATH_SECTIONS.find((entry) => entry.id === section.sectionId);
      const text = `${section.title} ${section.skills.map((item) => `${item.title} ${item.statusLabel} ${item.scoreLabel}`).join(' ')}`;
      return (
        sectionMeta !== undefined &&
        section.title === sectionMeta.title &&
        !text.includes(section.sectionId) &&
        section.skills.every((item) => !text.includes(item.skillId))
      );
    }),
    'L: технические ID не предназначены для UI',
  );

  check(!/\blocalStorage\b/.test(getLearningPathView.toString()), 'сервис не обращается к localStorage');
  check(!getLearningPathView.toString().includes('calculateSkillMastery'), 'сервис не пересчитывает mastery');
  check(!getLearningPathView.toString().includes('getLearningRecommendation'), 'сервис не вызывает recommendation');

  return failures;
}

export function reportLearningPathViewSelfChecks(): void {
  const failures = runLearningPathViewSelfChecks();
  if (failures.length > 0) {
    throw new Error(`learningPathView self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportLearningPathViewSelfChecks();
