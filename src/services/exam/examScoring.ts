import { checkTask } from '../../engine/checkers';
import { isAnswerReady } from '../../engine/answerState';
import type { Task } from '../../types';
import type { UserAnswer } from '../../engine';
import type {
  ExamBlueprint,
  ExamGradingScale,
  ExamResultSummary,
  ExamSession,
  ExamSessionStatus,
  ExamSlotResult,
} from './examTypes';

export function gradeFromScale(score: number, scale: ExamGradingScale | null): '2' | '3' | '4' | '5' | null {
  if (!scale) {
    return null;
  }
  const entries = Object.entries(scale) as Array<['2' | '3' | '4' | '5', readonly [number, number]]>;
  for (const [grade, [min, max]] of entries) {
    if (score >= min && score <= max) {
      return grade;
    }
  }
  if (score > scale['5'][1]) {
    return '5';
  }
  return '2';
}

function slotPoints(slotIndex: number, blueprint: ExamBlueprint, task: Task): number {
  const slot = blueprint.slots[slotIndex];
  if (slot) {
    return slot.points;
  }
  return task.maxScore ?? 1;
}

export function scoreExamSession(
  session: ExamSession,
  blueprint: ExamBlueprint,
  tasks: Task[],
  status: ExamSessionStatus,
): ExamResultSummary {
  const slotResults: ExamSlotResult[] = [];
  let earnedScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  tasks.forEach((task, index) => {
    const slot = blueprint.slots[index];
    const points = slotPoints(index, blueprint, task);
    const answer = session.answers[task.id] ?? null;
    const answered = isAnswerReady(task, answer);
    let isCorrect = false;
    if (answered) {
      isCorrect = checkTask(task, answer as UserAnswer);
    } else {
      unansweredCount += 1;
    }
    const earnedPoints = isCorrect ? points : 0;
    earnedScore += earnedPoints;
    if (answered) {
      if (isCorrect) {
        correctCount += 1;
      } else {
        incorrectCount += 1;
      }
    }
    slotResults.push({
      slotId: slot?.slotId ?? String(index + 1),
      taskId: task.id,
      points,
      earnedPoints,
      isCorrect,
      answered,
      answer,
      trainingAnalog: slot?.trainingAnalog,
    });
  });

  const maxScore = blueprint.maxScore;
  const durationMs =
    session.completedAt && session.startTime
      ? Math.max(0, session.completedAt - session.startTime)
      : session.startTime
        ? Math.max(0, Date.now() - session.startTime)
        : 0;

  return {
    sessionId: session.id,
    subjectId: session.subjectId,
    status,
    earnedScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0,
    grade: gradeFromScale(earnedScore, blueprint.gradingScale),
    correctCount,
    incorrectCount,
    unansweredCount,
    durationMs,
    slotResults,
  };
}
