/**
 * Stage 16 exam self-checks — blueprints, selection, scoring, timer, persistence, flow.
 */
import { getAllExamBlueprints, getExamBlueprint } from './examBlueprints';
import { createExamSession, startExamSession, completeExamSession } from './examSessionEngine';
import { gradeFromScale, scoreExamSession } from './examScoring';
import {
  computeExamEndTime,
  formatExamCountdown,
  getExamRemainingMs,
  isExamExpired,
  isExamTimeLow,
} from './examTimer';
import { assertFullExamSelection, canBuildExam } from './examTaskSelector';
import type { ExamSession } from './examTypes';
import { taskRepository } from '../taskRepository';
import type { SubjectId } from '../../types';

const SUBJECTS: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];

export function runExamBlueprintsSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(getAllExamBlueprints().length === 5, '5 blueprints');
  for (const subject of SUBJECTS) {
    const bp = getExamBlueprint(subject);
    check(Boolean(bp), `blueprint ${subject}`);
    if (!bp) continue;
    check(bp.slots.length === bp.totalSlots, `${subject} slots count`);
    check(bp.maxScore > 0, `${subject} maxScore`);
    check(bp.durationMinutes > 0, `${subject} duration`);
    const sum = bp.slots.reduce((acc, slot) => acc + slot.points, 0);
    check(sum === bp.maxScore, `${subject} points sum`);
  }
  return failures;
}

export function runExamSelectionSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const subject of SUBJECTS) {
    const bp = getExamBlueprint(subject);
    if (!bp) {
      failures.push(`no blueprint ${subject}`);
      continue;
    }
    check(canBuildExam(bp), `${subject} can build`);
    try {
      const result = assertFullExamSelection(bp, 42);
      check(result.tasks.length === bp.totalSlots, `${subject} task count`);
      check(result.tasks.every((task) => task.subject === subject), `${subject} isolation`);
      const ids = result.tasks.map((t) => t.id);
      check(new Set(ids).size === ids.length, `${subject} unique ids`);
    } catch (error) {
      failures.push(`${subject} selection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures;
}

export function runExamScoringSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const scale = { '2': [0, 9], '3': [10, 14], '4': [15, 21], '5': [22, 25] } as const;
  check(gradeFromScale(8, scale) === '2', 'english grade 2');
  check(gradeFromScale(12, scale) === '3', 'english grade 3');
  check(gradeFromScale(22, scale) === '5', 'english grade 5');

  const bp = getExamBlueprint('english');
  if (bp) {
    const sel = assertFullExamSelection(bp, 99);
    const session: ExamSession = {
      id: 'exam-test',
      userId: 'u1',
      subjectId: 'english',
      blueprintId: 'english',
      status: 'in_progress',
      taskIds: sel.tasks.map((t) => t.id),
      slots: sel.slots,
      answers: {},
      presentations: {},
      currentIndex: 0,
      startTime: Date.now() - 60000,
      endTime: Date.now() + 60000,
      completedAt: null,
      maxScore: bp.maxScore,
      seed: 99,
    };
    for (const task of sel.tasks) {
      session.answers[task.id] = task.correctAnswer;
    }
    const scored = scoreExamSession(session, bp, sel.tasks, 'completed');
    check(scored.earnedScore >= 0 && scored.earnedScore <= bp.maxScore, 'english score range');
    check(scored.maxScore === bp.maxScore, 'english maxScore');
  }
  return failures;
}

export function runExamTimerSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const start = 1_000_000;
  const end = computeExamEndTime(start, 45);
  check(end - start === 45 * 60 * 1000, 'end time 45m');
  check(getExamRemainingMs(end, end - 1000) === 1000, 'remaining 1s');
  check(isExamExpired(end, end), 'expired at end');
  check(formatExamCountdown(125000).startsWith('02:'), 'format mm:ss');
  check(isExamTimeLow(4 * 60 * 1000, 45), 'low time warning');
  return failures;
}

export function runExamPersistenceSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const session = createExamSession('persist-user', 'english', 123);
  check(session.status === 'not_started', 'created not_started');
  const started = startExamSession(session, 2_000_000);
  check(started.status === 'in_progress', 'started');
  check(started.endTime !== null, 'endTime set');
  check(getExamRemainingMs(started.endTime!, 2_000_000 + 30 * 60 * 1000) > 0, 'remaining after reload');
  return failures;
}

export function runExamFlowSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const subject of SUBJECTS) {
    const bp = getExamBlueprint(subject);
    if (!bp || !canBuildExam(bp)) {
      failures.push(`flow ${subject}: cannot build`);
      continue;
    }
    const session = createExamSession(`flow-${subject}`, subject, 1000 + subject.length);
    const started = startExamSession(session, Date.now());
    const tasks = started.taskIds
      .map((id) => taskRepository.getById(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    const completed = completeExamSession(started, tasks);
    check(completed.status === 'completed', `${subject} completed`);
    check(Boolean(completed.result), `${subject} has result`);
  }
  return failures;
}

function throwIfFailed(failures: string[], label: string): void {
  if (failures.length > 0) {
    throw new Error(`${label} failed:\n- ${failures.join('\n- ')}`);
  }
}

export function reportExamBlueprintsSelfChecks(): void {
  throwIfFailed(runExamBlueprintsSelfChecks(), 'exam blueprints');
}

export function reportExamSelectionSelfChecks(): void {
  throwIfFailed(runExamSelectionSelfChecks(), 'exam selection');
}

export function reportExamScoringSelfChecks(): void {
  throwIfFailed(runExamScoringSelfChecks(), 'exam scoring');
}

export function reportExamTimerSelfChecks(): void {
  throwIfFailed(runExamTimerSelfChecks(), 'exam timer');
}

export function reportExamPersistenceSelfChecks(): void {
  throwIfFailed(runExamPersistenceSelfChecks(), 'exam persistence');
}

export function reportExamFlowSelfChecks(): void {
  throwIfFailed(runExamFlowSelfChecks(), 'exam flow');
}
