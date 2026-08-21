import { MATH_SECTIONS, MATH_SKILLS } from '../data/taxonomy/math';
import type { MasteryStatus } from '../types';
import { formatScoreCompact, masteryStatusLabel, type SkillProgress } from './progressService';

export type SkillMasteryViewSkill = {
  /** Внутренний ключ для React. Не является пользовательским текстом. */
  skillId: string;
  title: string;
  status: MasteryStatus;
  statusLabel: string;
  masteryScore: number | null;
  scoreLabel: string;
  progressValue: number;
  attemptsCount: number;
};

export type SkillMasteryViewSection = {
  /** Внутренний ключ для React. Не является пользовательским текстом. */
  sectionId: string;
  title: string;
  skills: SkillMasteryViewSkill[];
};

function toViewSkill(item: SkillProgress): SkillMasteryViewSkill {
  const masteryScore = item.mastery.masteryScore;

  return {
    skillId: item.skill.id,
    title: item.skill.title,
    status: item.mastery.status,
    statusLabel: masteryStatusLabel(item.mastery.status),
    masteryScore,
    scoreLabel: formatScoreCompact(masteryScore),
    progressValue: masteryScore === null ? 0 : masteryScore,
    attemptsCount: item.mastery.attemptsCount,
  };
}

/**
 * Чистая UI-модель навыков: группировка по MATH_SECTIONS без пересчёта masteryScore.
 * Не читает браузерное хранилище, Attempt, Zustand, DailyPlan и TaskEngine.
 */
export function getSkillMasteryView(
  skills: readonly SkillProgress[],
): SkillMasteryViewSection[] {
  const byId = new Map<string, SkillProgress>();
  for (const item of skills) {
    byId.set(item.skill.id, item);
  }

  return MATH_SECTIONS.map((section) => ({
    sectionId: section.id,
    title: section.title,
    skills: MATH_SKILLS.filter((skill) => skill.sectionId === section.id).flatMap((skill) => {
      const item = byId.get(skill.id);
      return item ? [toViewSkill(item)] : [];
    }),
  }));
}
