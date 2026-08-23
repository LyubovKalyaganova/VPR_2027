import type { Attempt, SkillMastery, SubjectId } from '../types';
import { MATH_SKILLS, MATH_TOPICS } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS, RUSSIAN_TOPICS } from '../data/taxonomy/russian';
import { WORLD_SKILLS, WORLD_TOPICS } from '../data/taxonomy/world';
import { READING_SKILLS, READING_TOPICS } from '../data/taxonomy/literaryReading';
import { ENGLISH_SKILLS, ENGLISH_TOPICS } from '../data/taxonomy/english';
import { calculateSkillMastery, isWeakSkill } from './masteryService';

/** Универсальная ссылка на навык таксономии (все предметы). */
export type TaxonomySkillRef = {
  id: string;
  title: string;
  topicId: string;
  sectionId: string;
  subjectId: SubjectId;
};

export type UserProgress = {
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  totalTimeSpent: number;
  totalHintsUsed: number;
  solvedQuestionIds: string[];
  solvedQuestionsCount: number;
};

export type SkillProgress = {
  skill: TaxonomySkillRef;
  mastery: SkillMastery;
};

export type TopicProgress = {
  topicId: string;
  title: string;
  score: number | null;
  skillCount: number;
};

export type SessionSkillBreakdownItem = {
  skillId: string;
  title: string;
  correct: number;
  total: number;
  mastery: SkillMastery;
};

export type ChildProgress = {
  stats: UserProgress;
  mathSkills: SkillProgress[];
  weakSkills: SkillProgress[];
  mathScore: number | null;
  subjectScores: Record<SubjectId, number | null>;
};

const SUBJECT_IDS: readonly SubjectId[] = [
  'russian',
  'mathematics',
  'world',
  'reading',
  'english',
];

function emptyUserProgress(): UserProgress {
  return {
    totalAttempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    accuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalTimeSpent: 0,
    totalHintsUsed: 0,
    solvedQuestionIds: [],
    solvedQuestionsCount: 0,
  };
}

function attemptTimestamp(attempt: Attempt): number {
  const parsed = Date.parse(attempt.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareAttempts(a: Attempt, b: Attempt): number {
  const byDate = attemptTimestamp(a) - attemptTimestamp(b);
  if (byDate !== 0) {
    return byDate;
  }
  return a.attemptId.localeCompare(b.attemptId);
}

function selectUserAttempts(attempts: Attempt[], userId: string): Attempt[] {
  if (!userId) {
    return [];
  }
  return attempts
    .filter((attempt) => attempt.userId === userId && attempt.mode !== 'demo')
    .slice()
    .sort(compareAttempts);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function averageDefined(values: Array<number | null>): number | null {
  const scores = values.filter((value): value is number => value !== null);
  if (scores.length === 0) {
    return null;
  }
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function toRef(skill: {
  id: string;
  title: string;
  topicId: string;
  sectionId: string;
  subjectId: SubjectId;
}): TaxonomySkillRef {
  return {
    id: skill.id,
    title: skill.title,
    topicId: skill.topicId,
    sectionId: skill.sectionId,
    subjectId: skill.subjectId,
  };
}

/** Навыки таксономии предмета. FROZEN-каталоги только читаются. */
export function getSkillsForSubject(subjectId: SubjectId): readonly TaxonomySkillRef[] {
  switch (subjectId) {
    case 'mathematics':
      return MATH_SKILLS.map(toRef);
    case 'russian':
      return RUSSIAN_SKILLS.map(toRef);
    case 'world':
      return WORLD_SKILLS.map(toRef);
    case 'reading':
      return READING_SKILLS.map(toRef);
    case 'english':
      return ENGLISH_SKILLS.map(toRef);
    default:
      return [];
  }
}

function findSkillRef(skillId: string): TaxonomySkillRef | undefined {
  for (const subjectId of SUBJECT_IDS) {
    const found = getSkillsForSubject(subjectId).find((skill) => skill.id === skillId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Агрегаты по Attempt текущего пользователя.
 * Не читает localStorage; попытки передаются аргументом.
 */
export function getUserProgress(attempts: Attempt[], userId: string): UserProgress {
  const mine = selectUserAttempts(attempts, userId);
  if (mine.length === 0) {
    return emptyUserProgress();
  }

  let correctAttempts = 0;
  let incorrectAttempts = 0;
  let totalTimeSpent = 0;
  let totalHintsUsed = 0;
  let bestStreak = 0;
  let run = 0;
  const solvedQuestionIds: string[] = [];
  const seenQuestions = new Set<string>();

  for (const attempt of mine) {
    if (attempt.isCorrect) {
      correctAttempts += 1;
      run += 1;
      if (run > bestStreak) {
        bestStreak = run;
      }
    } else {
      incorrectAttempts += 1;
      run = 0;
    }

    const timeSpent = finiteNumber(attempt.timeSpent);
    if (timeSpent !== null && timeSpent > 0) {
      totalTimeSpent += timeSpent;
    }

    const hintsUsed = finiteNumber(attempt.hintsUsed);
    if (hintsUsed !== null && hintsUsed > 0) {
      totalHintsUsed += hintsUsed;
    }

    if (attempt.questionId && !seenQuestions.has(attempt.questionId)) {
      seenQuestions.add(attempt.questionId);
      solvedQuestionIds.push(attempt.questionId);
    }
  }

  let currentStreak = 0;
  for (let index = mine.length - 1; index >= 0; index -= 1) {
    if (mine[index]!.isCorrect) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const totalAttempts = mine.length;
  const accuracy = totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100);

  return {
    totalAttempts,
    correctAttempts,
    incorrectAttempts,
    accuracy: Number.isFinite(accuracy) ? accuracy : 0,
    currentStreak,
    bestStreak,
    totalTimeSpent,
    totalHintsUsed,
    solvedQuestionIds,
    solvedQuestionsCount: solvedQuestionIds.length,
  };
}

export function getSubjectSkillProgress(
  attempts: Attempt[],
  userId: string,
  subjectId: SubjectId,
): SkillProgress[] {
  return getSkillsForSubject(subjectId).map((skill) => ({
    skill,
    mastery: calculateSkillMastery(attempts, skill.id, userId),
  }));
}

export function getMathSkillProgress(attempts: Attempt[], userId: string): SkillProgress[] {
  return getSubjectSkillProgress(attempts, userId, 'mathematics');
}

export function getWeakSkillProgress(skills: SkillProgress[]): SkillProgress[] {
  return skills
    .filter((item) => isWeakSkill(item.mastery))
    .slice()
    .sort((left, right) => {
      const leftScore = left.mastery.masteryScore ?? Number.POSITIVE_INFINITY;
      const rightScore = right.mastery.masteryScore ?? Number.POSITIVE_INFINITY;
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }
      return right.mastery.incorrectCount - left.mastery.incorrectCount;
    });
}

export function getAllWeakSkillProgress(attempts: Attempt[], userId: string): SkillProgress[] {
  const all = SUBJECT_IDS.flatMap((subjectId) => getSubjectSkillProgress(attempts, userId, subjectId));
  return getWeakSkillProgress(all);
}

export function getTopicScore(
  attempts: Attempt[],
  userId: string,
  topicId: string,
  subjectId?: SubjectId,
): number | null {
  const pool = subjectId
    ? getSkillsForSubject(subjectId)
    : SUBJECT_IDS.flatMap((id) => getSkillsForSubject(id));
  const skills = pool.filter((skill) => skill.topicId === topicId);
  if (skills.length === 0) {
    return null;
  }
  return averageDefined(
    skills.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
  );
}

export function getSectionScore(
  attempts: Attempt[],
  userId: string,
  sectionId: string,
  subjectId?: SubjectId,
): number | null {
  const pool = subjectId
    ? getSkillsForSubject(subjectId)
    : SUBJECT_IDS.flatMap((id) => getSkillsForSubject(id));
  const skills = pool.filter((skill) => skill.sectionId === sectionId);
  if (skills.length === 0) {
    return null;
  }
  return averageDefined(
    skills.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
  );
}

export function getSubjectScore(attempts: Attempt[], userId: string, subjectId: SubjectId): number | null {
  const skills = getSkillsForSubject(subjectId);
  if (skills.length === 0) {
    return null;
  }
  return averageDefined(
    skills.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
  );
}

export function getTopicTitleForSubject(subjectId: SubjectId, topicId: string): string {
  const topics =
    subjectId === 'mathematics'
      ? MATH_TOPICS
      : subjectId === 'russian'
        ? RUSSIAN_TOPICS
        : subjectId === 'world'
          ? WORLD_TOPICS
          : subjectId === 'reading'
            ? READING_TOPICS
            : ENGLISH_TOPICS;
  return topics.find((topic) => topic.id === topicId)?.title ?? topicId;
}

/** Прогресс по темам предмета (среднее mastery skills темы). */
export function getTopicProgressForSubject(
  attempts: Attempt[],
  userId: string,
  subjectId: SubjectId,
): TopicProgress[] {
  const skills = getSkillsForSubject(subjectId);
  const byTopic = new Map<string, TaxonomySkillRef[]>();
  for (const skill of skills) {
    const list = byTopic.get(skill.topicId) ?? [];
    list.push(skill);
    byTopic.set(skill.topicId, list);
  }
  return [...byTopic.entries()].map(([topicId, topicSkills]) => ({
    topicId,
    title: getTopicTitleForSubject(subjectId, topicId),
    score: averageDefined(
      topicSkills.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
    ),
    skillCount: topicSkills.length,
  }));
}

/**
 * Разбор навыков одной сессии для экрана результата.
 * Source of truth — Attempt history (не summary store).
 */
export function getSessionSkillBreakdown(
  attempts: Attempt[],
  sessionId: string,
  userId: string,
): SessionSkillBreakdownItem[] {
  const sessionAttempts = attempts
    .filter(
      (attempt) =>
        attempt.sessionId === sessionId &&
        attempt.userId === userId &&
        typeof attempt.skillId === 'string' &&
        attempt.skillId.length > 0,
    )
    .slice()
    .sort(compareAttempts);

  const bySkill = new Map<string, { correct: number; total: number; title: string }>();
  for (const attempt of sessionAttempts) {
    const skillId = attempt.skillId!;
    const ref = findSkillRef(skillId);
    const current = bySkill.get(skillId) ?? {
      correct: 0,
      total: 0,
      title: ref?.title ?? attempt.skill,
    };
    current.total += 1;
    if (attempt.isCorrect) {
      current.correct += 1;
    }
    bySkill.set(skillId, current);
  }

  return [...bySkill.entries()]
    .map(([skillId, stats]) => ({
      skillId,
      title: stats.title,
      correct: stats.correct,
      total: stats.total,
      mastery: calculateSkillMastery(attempts, skillId, userId),
    }))
    .sort((left, right) => {
      const leftScore = left.mastery.masteryScore ?? -1;
      const rightScore = right.mastery.masteryScore ?? -1;
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }
      return left.title.localeCompare(right.title);
    });
}

export function getChildProgress(attempts: Attempt[], userId: string): ChildProgress {
  const stats = getUserProgress(attempts, userId);
  const mathSkills = getMathSkillProgress(attempts, userId);
  const weakSkills = getAllWeakSkillProgress(attempts, userId);
  const mathScore = averageDefined(mathSkills.map((item) => item.mastery.masteryScore));
  const subjectScores = Object.fromEntries(
    SUBJECT_IDS.map((subjectId) => [subjectId, getSubjectScore(attempts, userId, subjectId)]),
  ) as Record<SubjectId, number | null>;

  return {
    stats,
    mathSkills,
    weakSkills,
    mathScore,
    subjectScores,
  };
}

export function formatScoreLabel(score: number | null): string {
  return score === null ? 'Нет данных' : `${score}%`;
}

export function formatScoreCompact(score: number | null): string {
  return score === null ? '—' : `${score}%`;
}

export function getSubjectStatusLabel(subjectId: SubjectId, progress: ChildProgress): string {
  const score = progress.subjectScores[subjectId];
  if (score === null) {
    return 'Нет данных';
  }
  const weakForSubject = progress.weakSkills.filter((item) => item.skill.subjectId === subjectId);
  if (weakForSubject.length > 0) {
    return 'Есть слабые темы';
  }
  if (score < 50) {
    return 'Нужно повторение';
  }
  return 'Хорошо идёт';
}

export function getReadinessCaption(progress: ChildProgress): string {
  const withData = SUBJECT_IDS.filter((id) => progress.subjectScores[id] !== null);
  if (withData.length === 0) {
    return progress.stats.totalAttempts === 0
      ? 'Начните тренировку, чтобы появился прогресс.'
      : 'Нет данных по навыкам предметов.';
  }
  if (withData.length === 1 && withData[0] === 'mathematics') {
    return 'Считается по ответам в математических навыках.';
  }
  return 'Считается по ответам во всех тренируемых предметах.';
}

export function getHomeRecommendation(progress: ChildProgress): string {
  const weak = progress.weakSkills[0];
  if (weak) {
    return `Стоит потренировать: ${weak.skill.title}.`;
  }
  if (progress.stats.totalAttempts === 0) {
    return 'Начните тренировку, чтобы появился прогресс.';
  }
  return 'Можно продолжить тренировку.';
}

export function getProgressLevelIndex(progress: ChildProgress): number {
  return progress.stats.totalAttempts === 0 ? -1 : 0;
}

export function minutesFromMs(timeSpent: number): number {
  const ms = finiteNumber(timeSpent);
  if (ms === null || ms <= 0) {
    return 0;
  }
  return Math.round(ms / 60000);
}

export function masteryStatusLabel(status: SkillMastery['status']): string {
  switch (status) {
    case 'new':
      return 'Нет данных';
    case 'not_mastered':
      return 'Не освоено';
    case 'developing':
      return 'Формируется';
    case 'confident':
      return 'Уверенно';
    case 'mastered':
      return 'Освоено';
  }
}
