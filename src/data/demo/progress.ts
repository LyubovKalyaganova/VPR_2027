import type { SkillStatus, SubjectId } from '../../types';
import { DEMO_SKILLS, OVERALL_READINESS, SUBJECT_PROGRESS } from './subjects';

export const DEMO_STREAK = 4;
export const DEMO_COMPLETED_TASKS = 128;
export const DEMO_CORRECT_ANSWERS = 97;
export const DEMO_MINUTES = 186;
export const DEMO_TODAY_TASKS = 15;
export const DEMO_TODAY_MINUTES = 15;

export const PROGRESS_LEVELS = [
  { id: 'start', title: 'Старт' },
  { id: 'student', title: 'Ученик' },
  { id: 'expert', title: 'Знаток' },
  { id: 'master', title: 'Мастер' },
  { id: 'vprReady', title: 'ВПР готов' },
] as const;

export const CURRENT_LEVEL_INDEX = 2;

export function scoreToStatus(score: number): SkillStatus {
  if (score >= 85) {
    return 'mastered';
  }
  if (score >= 70) {
    return 'needsPractice';
  }
  if (score >= 50) {
    return 'needsAttention';
  }
  return 'weak';
}

export function statusLabel(status: SkillStatus): string {
  switch (status) {
    case 'mastered':
      return 'Освоено';
    case 'needsPractice':
      return 'Требует тренировки';
    case 'needsAttention':
      return 'Требует внимания';
    case 'weak':
      return 'Слабый навык';
  }
}

export const WEAK_TOPICS = DEMO_SKILLS.filter((skill) => skill.demoScore < 70)
  .sort((a, b) => a.demoScore - b.demoScore)
  .slice(0, 5);

export const DEMO_RECOMMENDATION = {
  subjectId: 'mathematics' as SubjectId,
  title: 'Задачи на движение',
  text: 'Сегодня лучше потренировать движение — это самая слабая тема в демо-данных.',
};

export { OVERALL_READINESS, SUBJECT_PROGRESS };
