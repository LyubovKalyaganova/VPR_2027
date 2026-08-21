export type LearningRecommendationType =
  | 'continue-daily'
  | 'mistakes'
  | 'review'
  | 'weak'
  | 'new-skill'
  | 'reinforcement'
  | 'start';

export type LearningRecommendationAction =
  | 'daily'
  | 'mistakes'
  | 'review'
  | 'weak'
  | 'normal'
  | 'random';

export type LearningRecommendation = {
  type: LearningRecommendationType;
  title: string;
  description: string;
  reason: string;
  action: LearningRecommendationAction;
  skillId?: string;
};

export type DailyPlanRecommendationState = {
  total: number;
  completed: number;
  remaining?: number;
  isCompleted?: boolean;
};

export type MistakesRecommendationState = {
  count: number;
  mode?: string;
};

export type RecommendationAttemptHint = {
  mode?: string;
};

export type GetLearningRecommendationInput = {
  userId: string;
  dailyPlan?: DailyPlanRecommendationState;
  mistakes?: MistakesRecommendationState;
  dueSkillIds?: readonly string[];
  weakSkillIds?: readonly string[];
  newSkillIds?: readonly string[];
  reinforcementSkillIds?: readonly string[];
  /**
   * Не используется для расчёта. Если переданы записи с mode === 'demo',
   * они игнорируются и не становятся основанием рекомендации.
   */
  attempts?: readonly RecommendationAttemptHint[];
};

function firstSkillId(skillIds: readonly string[] | undefined): string | undefined {
  if (!skillIds) {
    return undefined;
  }
  for (const skillId of skillIds) {
    if (typeof skillId === 'string' && skillId.length > 0) {
      return skillId;
    }
  }
  return undefined;
}

function remainingCount(plan: DailyPlanRecommendationState): number {
  if (typeof plan.remaining === 'number' && Number.isFinite(plan.remaining)) {
    return Math.max(0, plan.remaining);
  }
  return Math.max(0, plan.total - plan.completed);
}

function remainingDescription(remaining: number): string {
  if (remaining === 1) {
    return 'Осталось выполнить 1 задание.';
  }
  if (remaining >= 2 && remaining <= 4) {
    return `Осталось выполнить ${remaining} задания.`;
  }
  return `Осталось выполнить ${remaining} заданий.`;
}

function hasActiveDailyPlan(plan: DailyPlanRecommendationState | undefined): boolean {
  if (!plan || plan.total <= 0) {
    return false;
  }
  return plan.completed < plan.total;
}

function hasRealMistakes(mistakes: MistakesRecommendationState | undefined): boolean {
  if (!mistakes || mistakes.mode === 'demo') {
    return false;
  }
  return mistakes.count > 0;
}

function continueDaily(plan: DailyPlanRecommendationState): LearningRecommendation {
  return {
    type: 'continue-daily',
    title: 'Продолжить план на сегодня',
    description: remainingDescription(remainingCount(plan)),
    reason: 'Сегодня ещё остались задания в плане.',
    action: 'daily',
  };
}

function mistakesRecommendation(): LearningRecommendation {
  return {
    type: 'mistakes',
    title: 'Разобрать ошибки',
    description: 'Повторите задания, в которых были ошибки.',
    reason: 'Есть задания с ошибками, которые стоит разобрать.',
    action: 'mistakes',
  };
}

function reviewRecommendation(skillId: string): LearningRecommendation {
  return {
    type: 'review',
    title: 'Пора повторить',
    description: 'Некоторые навыки уже пора повторить.',
    reason: 'Некоторые навыки уже пора повторить.',
    action: 'review',
    skillId,
  };
}

function weakRecommendation(skillId: string): LearningRecommendation {
  return {
    type: 'weak',
    title: 'Укрепить навык',
    description: 'Немного практики поможет стать увереннее.',
    reason: 'Есть навыки, которым нужна дополнительная практика.',
    action: 'weak',
    skillId,
  };
}

function newSkillRecommendation(skillId: string): LearningRecommendation {
  return {
    type: 'new-skill',
    title: 'Попробовать новую тему',
    description: 'Выполните несколько заданий, чтобы начать изучение этой темы.',
    reason: 'План выполнен — можно попробовать новую тему.',
    action: 'normal',
    skillId,
  };
}

function reinforcementRecommendation(skillId: string): LearningRecommendation {
  return {
    type: 'reinforcement',
    title: 'Закрепить результат',
    description: 'Попробуйте ещё несколько заданий, чтобы закрепить знания.',
    reason: 'Полезно ещё немного потренироваться для уверенности.',
    action: 'normal',
    skillId,
  };
}

function startRecommendation(): LearningRecommendation {
  return {
    type: 'start',
    title: 'Начать обучение',
    description: 'Выполните несколько заданий, и мы определим, что стоит потренировать дальше.',
    reason: 'Начните с небольшой тренировки.',
    action: 'normal',
  };
}

/**
 * Одна главная учебная рекомендация по уже рассчитанным данным.
 * Не читает storage, Zustand, DOM и не пересчитывает mastery/review/adaptive.
 */
export function getLearningRecommendation(
  input: GetLearningRecommendationInput,
): LearningRecommendation {
  const dueSkillId = firstSkillId(input.dueSkillIds);
  const weakSkillId = firstSkillId(input.weakSkillIds);
  const newSkillId = firstSkillId(input.newSkillIds);
  const reinforcementSkillId = firstSkillId(input.reinforcementSkillIds);

  // 1. Незавершённый Daily Plan
  if (hasActiveDailyPlan(input.dailyPlan) && input.dailyPlan) {
    return continueDaily(input.dailyPlan);
  }

  // 2. Актуальные ошибки
  if (hasRealMistakes(input.mistakes)) {
    return mistakesRecommendation();
  }

  // 3. Due / повторение
  if (dueSkillId) {
    return reviewRecommendation(dueSkillId);
  }

  // 4. Слабый навык
  if (weakSkillId) {
    return weakRecommendation(weakSkillId);
  }

  // 5. Новый навык
  if (newSkillId) {
    return newSkillRecommendation(newSkillId);
  }

  // 6. Закрепление
  if (reinforcementSkillId) {
    return reinforcementRecommendation(reinforcementSkillId);
  }

  // 7. Пустой профиль / нет оснований
  return startRecommendation();
}
