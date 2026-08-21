import type { Attempt, SkillMastery, SubjectId } from '../types';
import { MATH_SKILLS, type MathSkill } from '../data/taxonomy/math';
import { calculateSkillMastery, isWeakSkill } from './masteryService';

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
  skill: MathSkill;
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
    if (mine[index].isCorrect) {
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

export function getMathSkillProgress(attempts: Attempt[], userId: string): SkillProgress[] {
  return MATH_SKILLS.map((skill) => ({
    skill,
    mastery: calculateSkillMastery(attempts, skill.id, userId),
  }));
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

export function getTopicScore(attempts: Attempt[], userId: string, topicId: string): number | null {
  const skills = MATH_SKILLS.filter((skill) => skill.topicId === topicId);
  if (skills.length === 0) {
    return null;
  }
  return averageDefined(
    skills.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
  );
}

export function getSectionScore(attempts: Attempt[], userId: string, sectionId: string): number | null {
  const skills = MATH_SKILLS.filter((skill) => skill.sectionId === sectionId);
  if (skills.length === 0) {
    return null;
  }
  return averageDefined(
    skills.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
  );
}

export function getSubjectScore(attempts: Attempt[], userId: string, subjectId: SubjectId): number | null {
  if (subjectId !== 'mathematics') {
    return null;
  }
  return averageDefined(
    MATH_SKILLS.map((skill) => calculateSkillMastery(attempts, skill.id, userId).masteryScore),
  );
}

export function getChildProgress(attempts: Attempt[], userId: string): ChildProgress {
  const stats = getUserProgress(attempts, userId);
  const mathSkills = getMathSkillProgress(attempts, userId);
  const weakSkills = getWeakSkillProgress(mathSkills);
  const mathScore = averageDefined(mathSkills.map((item) => item.mastery.masteryScore));
  const subjectScores = Object.fromEntries(
    SUBJECT_IDS.map((subjectId) => [subjectId, subjectId === 'mathematics' ? mathScore : null]),
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
  if (subjectId === 'mathematics' && progress.weakSkills.length > 0) {
    return 'Есть слабые темы';
  }
  if (score < 50) {
    return 'Нужно повторение';
  }
  return 'Хорошо идёт';
}

export function getReadinessCaption(progress: ChildProgress): string {
  if (progress.mathScore === null) {
    return progress.stats.totalAttempts === 0
      ? 'Начните тренировку, чтобы появился прогресс.'
      : 'Нет данных по математическим навыкам.';
  }
  return 'Считается по ответам в математических навыках.';
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
