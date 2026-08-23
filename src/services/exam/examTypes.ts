import type { SubjectId, Task } from '../../types';
import type { TaskPresentation, UserAnswer } from '../../engine';

export type ExamSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';

export type ExamSlotLevel = 'B' | 'P';

export interface ExamSlotSpec {
  slotId: string;
  label: string;
  points: number;
  hostSkillCodes: readonly string[];
  hostSkillIds: readonly string[];
  focus: string;
  level?: ExamSlotLevel;
  trainingAnalog?: boolean;
}

export type ExamGradingScale = Record<'2' | '3' | '4' | '5', readonly [number, number]>;

export interface ExamBlueprint {
  subjectId: SubjectId;
  title: string;
  source: string;
  durationMinutes: number;
  totalSlots: number;
  maxScore: number;
  gradingScale: ExamGradingScale | null;
  slots: ExamSlotSpec[];
  scoringNote?: string;
}

export interface ExamSlotResult {
  slotId: string;
  taskId: string;
  points: number;
  earnedPoints: number;
  isCorrect: boolean;
  answered: boolean;
  answer: UserAnswer;
  trainingAnalog?: boolean;
}

export interface ExamResultSummary {
  sessionId: string;
  subjectId: SubjectId;
  status: ExamSessionStatus;
  earnedScore: number;
  maxScore: number;
  percentage: number;
  grade: '2' | '3' | '4' | '5' | null;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  durationMs: number;
  slotResults: ExamSlotResult[];
}

export interface ExamSession {
  id: string;
  userId: string;
  subjectId: SubjectId;
  blueprintId: string;
  status: ExamSessionStatus;
  taskIds: string[];
  slots: ExamSlotSpec[];
  answers: Record<string, UserAnswer>;
  presentations: Record<string, TaskPresentation>;
  currentIndex: number;
  startTime: number | null;
  endTime: number | null;
  completedAt: number | null;
  maxScore: number;
  seed: number;
  result?: ExamResultSummary;
}

export interface ExamSelectionResult {
  tasks: Task[];
  slots: ExamSlotSpec[];
  missingSlots: string[];
}
