import { MATH_SECTIONS, MATH_SKILLS } from '../data/taxonomy/math';
import type { MasteryStatus } from '../types';
import { formatScoreCompact, masteryStatusLabel, type SkillProgress } from './progressService';

export type LearningPathMarker = 'completed' | 'current' | 'ahead';

export type LearningPathSkill = {
  /** Внутренний ключ. Не является пользовательским текстом. */
  skillId: string;
  title: string;
  status: MasteryStatus;
  statusLabel: string;
  masteryScore: number | null;
  scoreLabel: string;
  progressValue: number;
  isCurrent: boolean;
};

export type LearningPathSection = {
  /** Внутренний ключ. Не является пользовательским текстом. */
  sectionId: string;
  title: string;
  marker: LearningPathMarker;
  skills: LearningPathSkill[];
};

export type LearningPathView = {
  sections: LearningPathSection[];
  currentSkillId: string | null;
  currentSectionId: string | null;
  isComplete: boolean;
};

const CURRENT_STATUS_ORDER: readonly MasteryStatus[] = [
  'developing',
  'confident',
  'not_mastered',
  'new',
];

function statusOf(item: SkillProgress | undefined): MasteryStatus {
  return item?.mastery.status ?? 'new';
}

function findCurrentSkillId(byId: ReadonlyMap<string, SkillProgress>): string | null {
  for (const status of CURRENT_STATUS_ORDER) {
    for (const skill of MATH_SKILLS) {
      if (statusOf(byId.get(skill.id)) === status) {
        return skill.id;
      }
    }
  }
  return null;
}

function pathStatusLabel(status: MasteryStatus, isCurrent: boolean): string {
  if (!isCurrent && status === 'new') {
    return 'Впереди';
  }
  return masteryStatusLabel(status);
}

function toPathSkill(item: SkillProgress | undefined, skillId: string, title: string, isCurrent: boolean): LearningPathSkill {
  const masteryScore = item?.mastery.masteryScore ?? null;
  const status = statusOf(item);

  return {
    skillId,
    title,
    status,
    statusLabel: pathStatusLabel(status, isCurrent),
    masteryScore,
    scoreLabel: formatScoreCompact(masteryScore),
    progressValue: masteryScore === null ? 0 : masteryScore,
    isCurrent,
  };
}

function sectionMarker(
  sectionSkills: readonly LearningPathSkill[],
  currentSkillId: string | null,
): LearningPathMarker {
  if (currentSkillId && sectionSkills.some((skill) => skill.skillId === currentSkillId)) {
    return 'current';
  }
  if (sectionSkills.length > 0 && sectionSkills.every((skill) => skill.status === 'mastered')) {
    return 'completed';
  }
  return 'ahead';
}

/**
 * Чистая UI-модель пути обучения по MATH_SECTIONS / MATH_SKILLS.
 * Не пересчитывает masteryScore и не вызывает recommendation engine.
 */
export function getLearningPathView(skills: readonly SkillProgress[]): LearningPathView {
  const byId = new Map<string, SkillProgress>();
  for (const item of skills) {
    byId.set(item.skill.id, item);
  }

  const currentSkillId = findCurrentSkillId(byId);

  const sections = MATH_SECTIONS.map((section) => {
    const skillsInSection = MATH_SKILLS.filter((skill) => skill.sectionId === section.id).map((skill) =>
      toPathSkill(byId.get(skill.id), skill.id, skill.title, skill.id === currentSkillId),
    );

    return {
      sectionId: section.id,
      title: section.title,
      marker: sectionMarker(skillsInSection, currentSkillId),
      skills: skillsInSection,
    };
  });

  const currentSectionId =
    sections.find((section) => section.marker === 'current')?.sectionId ?? null;

  return {
    sections,
    currentSkillId,
    currentSectionId,
    isComplete: currentSkillId === null,
  };
}
