export type SubjectId =
  | 'russian'
  | 'mathematics'
  | 'world'
  | 'reading'
  | 'english';

export interface Subject {
  id: SubjectId;
  title: string;
  shortTitle: string;
  description: string;
  accent: string;
}

export interface Topic {
  id: string;
  subjectId: SubjectId;
  section: string;
  title: string;
}

export interface Skill {
  id: string;
  subjectId: SubjectId;
  topicId: string;
  title: string;
}

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type SourceType = 'demo' | 'training' | 'vpr' | 'diagnostic' | 'generated';

export type TaskType =
  | 'singleChoice'
  | 'multipleChoice'
  | 'shortAnswer'
  | 'numberAnswer'
  | 'matching'
  | 'ordering'
  | 'classification'
  | 'fillBlank'
  | 'audio'
  | 'constructedResponse'
  | 'imageTask'
  | 'tableTask';

export interface Task {
  id: string;
  subject: SubjectId;
  section: string;
  topic: string;
  skill: string;
  /**
   * Стабильный ID темы из таксономии. Необязателен на переходном этапе:
   * DEMO-задания пока используют текстовые `topic` / `skill`.
   * Математические тренировочные задания должны заполнять `topicId`
   * из CONTENT_MATRIX_MATH.md (21 тема).
   */
  topicId?: string;
  /**
   * Стабильный канонический ID навыка. Необязателен для DEMO.
   * Для математики — один из 35 ID матрицы M01–M35
   * (например `math.calculation.multi_digit.addition`, не краткий код `M03`).
   */
  skillId?: string;
  /**
   * Уровень сложности 1–5 из матрицы / ТЗ §5.
   * Это и есть level задания; отдельное поле `level` не вводится.
   */
  difficulty: Difficulty;
  vprTaskType?: string;
  vprVersion: number;
  taskType: TaskType;
  question: string;
  answers?: string[];
  correctAnswer: string | string[] | number;
  acceptableAnswers?: string[];
  explanation: string;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  sourceType: SourceType;
  textId?: string;
  image?: string;
  audio?: string;
  transcript?: string;
  listenLimit?: number;
  solution?: string;
  tags?: string[];
  generatorId?: string;
  generatorParams?: Record<string, unknown>;
  maxScore?: number;
  matchingLeft?: string[];
  matchingRight?: string[];
  categories?: string[];
  items?: string[];
  passage?: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  class: 4;
  avatar: string;
  selectedSubjects: SubjectId[];
  createdAt: string;
  onboardingCompleted: boolean;
}

/**
 * Статусы демо-UI (бейджи, демо-прогресс). Не путать со статусами SkillMastery.
 */
export type SkillStatus = 'mastered' | 'needsPractice' | 'needsAttention' | 'weak';

/**
 * Статусы освоения навыка по MASTERY_SPEC.md §3 и §19.
 */
export type MasteryStatus = 'new' | 'not_mastered' | 'developing' | 'confident' | 'mastered';

/**
 * Типы ошибок по MASTERY_SPEC.md §12.
 * На MVP точная причина из Attempt не определяется (§12–§13).
 */
export type ErrorType =
  | 'wrongAnswer'
  | 'careless'
  | 'calculation'
  | 'concept'
  | 'unit'
  | 'reading'
  | 'unknown';

/**
 * Текущее состояние освоения навыка. Считается из Attempt, не хранится отдельно.
 * Поля — MASTERY_SPEC.md §4; masteryScore = null для нового ребёнка (§29).
 */
export interface SkillMastery {
  userId: string;
  skillId: string;
  masteryScore: number | null;
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  lastAttemptAt: string | null;
  lastCorrectAt: string | null;
  currentStreak: number;
  incorrectStreak: number;
  lastDifficulty: Difficulty | null;
  lastHintsUsed: number;
  nextReviewAt: string | null;
  reviewIntervalDays: number;
  status: MasteryStatus;
}

export type TrainingMode =
  | 'quick'
  | 'normal'
  | 'mistakes'
  | 'topic'
  | 'weak'
  | 'review'
  | 'daily'
  | 'random'
  | 'demo'
  | 'exam'
  | 'diagnostic';

export interface Attempt {
  attemptId: string;
  userId: string;
  questionId: string;
  sessionId: string;
  date: string;
  answer: unknown;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
  subject: SubjectId;
  topic: string;
  skill: string;
  /**
   * Стабильный ID темы из таксономии. Для DEMO может отсутствовать.
   */
  topicId?: string;
  /**
   * Стабильный ID навыка из таксономии. Для DEMO может отсутствовать.
   */
  skillId?: string;
  mode: TrainingMode;
}
