import type { Achievement } from './achievementService';
import type { SkillProgress } from './progressService';

const EARNED_LIMIT = 3;

export type MotivationEarnedItem = {
  title: string;
  description: string;
};

export type MotivationView = {
  masteredPhrase: string;
  emptyMessage: string | null;
  earned: MotivationEarnedItem[];
  nextGoal: string | null;
};

export type GetMotivationViewInput = {
  mathSkills: readonly SkillProgress[];
  achievements: readonly Achievement[];
  nextHint: string | null;
};

function masteredCount(mathSkills: readonly SkillProgress[]): number {
  return mathSkills.filter((item) => item.mastery.status === 'mastered').length;
}

function masteredPhrase(count: number): string {
  if (count === 0) {
    return 'Первый освоенный навык ещё впереди';
  }
  return `Освоено навыков: ${count}`;
}

function earnedItems(achievements: readonly Achievement[]): MotivationEarnedItem[] {
  return achievements
    .filter((item) => item.achieved)
    .slice(0, EARNED_LIMIT)
    .map((item) => ({
      title: item.title,
      description: item.description,
    }));
}

/**
 * Чистая UI-модель мотивации из уже готовых SkillMastery и Achievement.
 * Не выдаёт достижения и не дублирует правила achievementService.
 */
export function getMotivationView(input: GetMotivationViewInput): MotivationView {
  const count = masteredCount(input.mathSkills);
  const earned = earnedItems(input.achievements);

  return {
    masteredPhrase: masteredPhrase(count),
    emptyMessage:
      earned.length === 0 && count === 0
        ? 'Начните первую тренировку — впереди первые достижения.'
        : null,
    earned,
    nextGoal: input.nextHint,
  };
}
