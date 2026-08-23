import type { Task, TrainingMode } from '../types';
import { createId } from '../utils/id';
import { shuffle } from '../utils/shuffle';
import { collectHints, emptyAnswer, isAnswerReady } from './answerState';
import type { AttemptRecorder } from './attemptRecorder';
import { checkTask } from './checkers';
import type { SessionSummary, TaskPresentation, TaskSession, UserAnswer } from './session';

export type TaskLookup = (id: string) => Task | undefined;

function buildPresentation(task: Task): TaskPresentation {
  switch (task.taskType) {
    case 'singleChoice':
    case 'multipleChoice':
      return { options: shuffle(task.answers ?? []) };
    case 'imageTask':
      return task.answers && task.answers.length > 0 ? { options: shuffle(task.answers) } : {};
    case 'audio':
      if (task.matchingLeft && task.matchingLeft.length > 0) {
        return { matchingRight: shuffle(task.matchingRight ?? []) };
      }
      return { options: shuffle(task.answers ?? []) };
    case 'matching':
      return { matchingRight: shuffle(task.matchingRight ?? []) };
    case 'ordering':
    case 'classification':
      return { items: shuffle(task.items ?? task.answers ?? []) };
    default:
      return {};
  }
}

function cloneSession(session: TaskSession): TaskSession {
  return {
    ...session,
    currentAnswer:
      session.currentAnswer && typeof session.currentAnswer === 'object'
        ? Array.isArray(session.currentAnswer)
          ? [...session.currentAnswer]
          : { ...session.currentAnswer }
        : session.currentAnswer,
    presentations: { ...session.presentations },
    results: [...session.results],
  };
}

export class TaskEngine {
  constructor(
    private readonly getTask: TaskLookup,
    private readonly recorder: AttemptRecorder,
  ) {}

  requireTask(taskId: string): Task {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Задание ${taskId} не найдено`);
    }
    return task;
  }

  createSession(params: { userId: string; mode: TrainingMode; tasks: Task[] }): TaskSession {
    if (params.tasks.length === 0) {
      throw new Error('Нельзя начать тренировку без заданий');
    }

    const presentations: Record<string, TaskPresentation> = {};
    for (const task of params.tasks) {
      presentations[task.id] = buildPresentation(task);
    }

    const now = Date.now();
    return {
      id: createId('session'),
      userId: params.userId,
      mode: params.mode,
      taskIds: params.tasks.map((task) => task.id),
      currentIndex: 0,
      phase: 'answering',
      currentAnswer: emptyAnswer(params.tasks[0]),
      currentIsCorrect: null,
      hintsUsedOnCurrent: 0,
      presentations,
      results: [],
      startedAt: now,
      itemStartedAt: now,
    };
  }

  getCurrentTask(session: TaskSession): Task {
    const taskId = session.taskIds[session.currentIndex];
    if (!taskId) {
      throw new Error('В сессии нет текущего задания');
    }
    return this.requireTask(taskId);
  }

  getPresentation(session: TaskSession): TaskPresentation {
    const task = this.getCurrentTask(session);
    return session.presentations[task.id] ?? {};
  }

  canSubmit(session: TaskSession): boolean {
    if (session.phase !== 'answering') {
      return false;
    }
    return isAnswerReady(this.getCurrentTask(session), session.currentAnswer);
  }

  setAnswer(session: TaskSession, answer: UserAnswer): TaskSession {
    if (session.phase !== 'answering') {
      return session;
    }
    const next = cloneSession(session);
    next.currentAnswer = answer;
    return next;
  }

  useHint(session: TaskSession): TaskSession {
    if (session.phase !== 'answering') {
      return session;
    }
    const hints = collectHints(this.getCurrentTask(session));
    if (session.hintsUsedOnCurrent >= hints.length || session.hintsUsedOnCurrent >= 3) {
      return session;
    }
    const next = cloneSession(session);
    next.hintsUsedOnCurrent = (session.hintsUsedOnCurrent + 1) as 0 | 1 | 2 | 3;
    return next;
  }

  submit(session: TaskSession): TaskSession {
    if (!this.canSubmit(session)) {
      return session;
    }
    const task = this.getCurrentTask(session);
    const isCorrect = checkTask(task, session.currentAnswer);
    const timeSpent = Math.max(0, Date.now() - session.itemStartedAt);
    const hintsUsed = session.hintsUsedOnCurrent;

    this.recorder.record({
      attemptId: createId('attempt'),
      userId: session.userId,
      questionId: task.id,
      sessionId: session.id,
      date: new Date().toISOString(),
      answer: session.currentAnswer,
      isCorrect,
      timeSpent,
      hintsUsed,
      difficulty: task.difficulty,
      subject: task.subject,
      topic: task.topic,
      skill: task.skill,
      topicId: task.topicId,
      skillId: task.skillId,
      mode: session.mode,
    });

    const next = cloneSession(session);
    next.phase = 'feedback';
    next.currentIsCorrect = isCorrect;
    next.results = [
      ...session.results.filter((item) => item.taskId !== task.id),
      {
        taskId: task.id,
        isCorrect,
        hintsUsed,
        timeSpent,
        answer: session.currentAnswer,
      },
    ];
    return next;
  }

  next(session: TaskSession): TaskSession {
    if (session.phase !== 'feedback') {
      return session;
    }
    const next = cloneSession(session);
    const lastIndex = session.taskIds.length - 1;
    if (session.currentIndex >= lastIndex) {
      next.phase = 'completed';
      next.finishedAt = Date.now();
      return next;
    }
    next.currentIndex = session.currentIndex + 1;
    next.phase = 'answering';
    next.currentAnswer = emptyAnswer(this.requireTask(next.taskIds[next.currentIndex]));
    next.currentIsCorrect = null;
    next.hintsUsedOnCurrent = 0;
    next.itemStartedAt = Date.now();
    return next;
  }

  getSummary(session: TaskSession): SessionSummary {
    const total = session.results.length;
    const correct = session.results.filter((item) => item.isCorrect).length;
    const incorrect = total - correct;
    const durationMs = Math.max(0, (session.finishedAt ?? Date.now()) - session.startedAt);
    return {
      sessionId: session.id,
      total,
      correct,
      incorrect,
      percent: total === 0 ? 0 : Math.round((correct / total) * 100),
      hintsUsed: session.results.reduce((sum, item) => sum + item.hintsUsed, 0),
      durationMs,
      incorrectTaskIds: session.results.filter((item) => !item.isCorrect).map((item) => item.taskId),
    };
  }
}
