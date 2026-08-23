import { createId } from '../../utils/id';
import { localAttemptRecorder } from '../../db';
import { emptyAnswer, isAnswerReady } from '../../engine/answerState';
import type { SubjectId, Task } from '../../types';
import type { UserAnswer } from '../../engine';
import { assertExamBlueprint } from './examBlueprints';
import { buildExamPresentations } from './examPresentation';
import { scoreExamSession } from './examScoring';
import { computeExamEndTime, isExamExpired } from './examTimer';
import { assertFullExamSelection } from './examTaskSelector';
import type { ExamResultSummary, ExamSession, ExamSessionStatus } from './examTypes';

export function createExamSession(userId: string, subjectId: SubjectId, seed = Date.now() >>> 0): ExamSession {
  const blueprint = assertExamBlueprint(subjectId);
  const selection = assertFullExamSelection(blueprint, seed);
  const taskIds = selection.tasks.map((task) => task.id);
  const presentations = buildExamPresentations(selection.tasks);
  const answers: Record<string, UserAnswer> = {};
  for (const task of selection.tasks) {
    answers[task.id] = emptyAnswer(task);
  }

  return {
    id: createId('exam'),
    userId,
    subjectId,
    blueprintId: subjectId,
    status: 'not_started',
    taskIds,
    slots: selection.slots,
    answers,
    presentations,
    currentIndex: 0,
    startTime: null,
    endTime: null,
    completedAt: null,
    maxScore: blueprint.maxScore,
    seed,
  };
}

export function startExamSession(session: ExamSession, nowMs = Date.now()): ExamSession {
  if (session.status !== 'not_started') {
    return session;
  }
  const blueprint = assertExamBlueprint(session.subjectId);
  const endTime = computeExamEndTime(nowMs, blueprint.durationMinutes);
  return {
    ...session,
    status: 'in_progress',
    startTime: nowMs,
    endTime,
  };
}

export function setExamAnswer(session: ExamSession, taskId: string, answer: UserAnswer): ExamSession {
  if (session.status !== 'in_progress') {
    return session;
  }
  return {
    ...session,
    answers: {
      ...session.answers,
      [taskId]: answer,
    },
  };
}

export function setExamCurrentIndex(session: ExamSession, index: number): ExamSession {
  if (session.status !== 'in_progress') {
    return session;
  }
  const clamped = Math.max(0, Math.min(index, session.taskIds.length - 1));
  return {
    ...session,
    currentIndex: clamped,
  };
}

export function recordExamAttempts(
  session: ExamSession,
  tasks: Task[],
  result: ExamResultSummary,
): void {
  const nowIso = new Date().toISOString();
  for (const slot of result.slotResults) {
    const task = tasks.find((item) => item.id === slot.taskId);
    if (!task) {
      continue;
    }
    localAttemptRecorder.record({
      attemptId: createId('attempt'),
      userId: session.userId,
      questionId: task.id,
      sessionId: session.id,
      date: nowIso,
      answer: slot.answer,
      isCorrect: slot.isCorrect,
      timeSpent: 0,
      hintsUsed: 0,
      difficulty: task.difficulty,
      subject: task.subject,
      topic: task.topic,
      skill: task.skill,
      topicId: task.topicId,
      skillId: task.skillId,
      mode: 'exam',
    });
  }
}

export function finalizeExamSession(
  session: ExamSession,
  tasks: Task[],
  status: ExamSessionStatus,
  nowMs = Date.now(),
): ExamSession {
  const blueprint = assertExamBlueprint(session.subjectId);
  const completedAt = nowMs;
  const draft: ExamSession = {
    ...session,
    status,
    completedAt,
  };
  const result = scoreExamSession(draft, blueprint, tasks, status);
  recordExamAttempts(draft, tasks, result);
  return {
    ...draft,
    result,
  };
}

export function completeExamSession(session: ExamSession, tasks: Task[], nowMs = Date.now()): ExamSession {
  return finalizeExamSession(session, tasks, 'completed', nowMs);
}

export function expireExamSession(session: ExamSession, tasks: Task[], nowMs = Date.now()): ExamSession {
  return finalizeExamSession(session, tasks, 'expired', nowMs);
}

export function syncExamExpiry(session: ExamSession, tasks: Task[], nowMs = Date.now()): ExamSession {
  if (session.status !== 'in_progress' || !session.endTime) {
    return session;
  }
  if (!isExamExpired(session.endTime, nowMs)) {
    return session;
  }
  return expireExamSession(session, tasks, nowMs);
}

export function getExamTasks(session: ExamSession, lookup: (id: string) => Task | undefined): Task[] {
  return session.taskIds
    .map((id) => lookup(id))
    .filter((task): task is Task => Boolean(task));
}

export function countAnsweredTasks(session: ExamSession, tasks: Task[]): number {
  let count = 0;
  for (const task of tasks) {
    const answer = session.answers[task.id];
    if (isAnswerReady(task, answer)) {
      count += 1;
    }
  }
  return count;
}
