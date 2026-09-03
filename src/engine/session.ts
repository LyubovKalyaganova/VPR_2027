import type { Task, TrainingMode } from '../types';

export type UserAnswer = string | number | string[] | Record<string, string> | null;

export interface TaskPresentation {
  options?: string[];
  matchingRight?: string[];
  matchingRowOptions?: string[][];
  items?: string[];
}

export interface SessionItemResult {
  taskId: string;
  isCorrect: boolean;
  hintsUsed: 0 | 1 | 2 | 3;
  timeSpent: number;
  answer: UserAnswer;
}

export type SessionPhase = 'answering' | 'feedback' | 'completed';

export interface TaskSession {
  id: string;
  userId: string;
  mode: TrainingMode;
  taskIds: string[];
  currentIndex: number;
  phase: SessionPhase;
  currentAnswer: UserAnswer;
  currentIsCorrect: boolean | null;
  hintsUsedOnCurrent: 0 | 1 | 2 | 3;
  presentations: Record<string, TaskPresentation>;
  results: SessionItemResult[];
  /** Снимок заданий сессии: live-генерация не лежит в общем банке. */
  tasks?: Task[];
  startedAt: number;
  itemStartedAt: number;
  finishedAt?: number;
}

export interface SessionSummary {
  sessionId: string;
  total: number;
  correct: number;
  incorrect: number;
  percent: number;
  hintsUsed: number;
  durationMs: number;
  incorrectTaskIds: string[];
}
