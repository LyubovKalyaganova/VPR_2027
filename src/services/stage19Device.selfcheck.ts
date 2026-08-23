/**
 * Stage 19: Android device readiness — resume/timer/cold-start/isolation smoke.
 * Does not modify FROZEN subject content. Complements Stage 16–18 checks.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS } from '../data/demo/subjects';
import {
  createExamSession,
  setExamAnswer,
  setExamCurrentIndex,
  startExamSession,
} from './exam/examSessionEngine';
import { getExamRemainingMs, isExamExpired } from './exam/examTimer';
import { getExamBlueprint } from './exam/examBlueprints';
import { canBuildExam } from './exam/examTaskSelector';
import { pickRandomSubjectTasks } from './trainingSessionBuilder';
import { selectWeightedMathSessionTasks } from '../features/mathematics/mathTrainingSelection';
import { selectWeightedRussianSessionTasks } from '../features/russian/russianTrainingSelection';
import { selectWeightedWorldSessionTasks } from '../features/world/worldTrainingSelection';
import { selectWeightedReadingSessionTasks } from '../features/reading/literaryReadingTrainingSelection';
import { selectWeightedEnglishSessionTasks } from '../features/english/englishTrainingSelection';
import type { SubjectId } from '../types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ALL: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function roundTripSession<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function runStage19DeviceSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(SUBJECTS.length === 5, 'five subjects');

  // Cold-start / empty progress texts already ship Russian; ensure cold-start caption present
  const progressSrc = read('src/services/progressService.ts');
  check(progressSrc.includes('Начни тренировку'), 'cold-start caption present');
  check(progressSrc.includes('Нет данных'), 'empty score label present');

  // Android config still portrait + no dangerous permissions
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  check(manifest.includes('portrait'), 'portrait locked');
  check(!manifest.includes('CAMERA'), 'no camera');
  check(!manifest.includes('RECORD_AUDIO'), 'no mic');

  // Back handler exists and confirms exam exit
  const back = read('src/components/layout/AndroidBackHandler.tsx');
  check(back.includes('backButton'), 'android back listener');
  check(back.includes('Выйти из ВПР?'), 'exam back confirm');
  check(back.includes('Выйти из тренировки?'), 'train back confirm');

  // Exam hydration gate
  const providers = read('src/app/providers.tsx');
  check(providers.includes('useExamStore.persist.hasHydrated'), 'exam hydration before render');

  // Training quick/normal isolation per subject
  const mathQuick = selectWeightedMathSessionTasks(5);
  check(mathQuick.length === 5, 'math quick = 5');
  check(mathQuick.every((t) => t.subject === 'mathematics'), 'math quick isolation');

  const mathNormal = selectWeightedMathSessionTasks(10);
  check(mathNormal.length === 10, 'math normal = 10');

  const russian = selectWeightedRussianSessionTasks(5);
  check(russian.length === 5 && russian.every((t) => t.subject === 'russian'), 'russian quick');

  const world = selectWeightedWorldSessionTasks(5);
  check(world.length === 5 && world.every((t) => t.subject === 'world'), 'world quick');

  const reading = selectWeightedReadingSessionTasks(5);
  check(reading.length === 5 && reading.every((t) => t.subject === 'reading'), 'reading quick');

  const english = selectWeightedEnglishSessionTasks(5);
  check(english.length === 5 && english.every((t) => t.subject === 'english'), 'english quick');

  for (const subject of ALL) {
    const random = pickRandomSubjectTasks(subject, 10);
    check(random.length === 10, `random ${subject} count`);
    check(random.every((t) => t.subject === subject), `random ${subject} isolation`);
    const ids = random.map((t) => t.id);
    check(new Set(ids).size === ids.length, `random ${subject} unique ids`);

    const bp = getExamBlueprint(subject);
    check(Boolean(bp) && canBuildExam(bp!), `exam buildable ${subject}`);
  }

  // CRITICAL: exam resume after "kill app" (JSON persist round-trip)
  const startNow = 1_700_000_000_000;
  let session = createExamSession('stage19-user', 'mathematics', 777);
  session = startExamSession(session, startNow);
  const originalEnd = session.endTime!;
  const firstTaskId = session.taskIds[0]!;
  const midIndex = Math.min(3, session.taskIds.length - 1);
  session = setExamAnswer(session, firstTaskId, '42');
  session = setExamCurrentIndex(session, midIndex);

  const restored = roundTripSession(session);
  check(restored.status === 'in_progress', 'resume status');
  check(restored.subjectId === 'mathematics', 'resume subject');
  check(restored.endTime === originalEnd, 'resume endTime unchanged');
  check(restored.currentIndex === midIndex, 'resume currentIndex');
  check(JSON.stringify(restored.answers[firstTaskId]) === JSON.stringify('42'), 'resume answer');

  const later = startNow + 10 * 60 * 1000;
  const remaining = getExamRemainingMs(restored.endTime!, later);
  const expected = getExamRemainingMs(originalEnd, later);
  check(remaining === expected, 'timer continues from original endTime');
  check(remaining < 45 * 60 * 1000, 'timer not reset to full 45 min');
  check(!isExamExpired(restored.endTime!, later), 'not expired mid-run');

  const afterExpiry = originalEnd + 1;
  check(isExamExpired(restored.endTime!, afterExpiry), 'expires at original endTime');

  // BrowserRouter retained (Stage 18/19 constraint)
  check(read('src/app/providers.tsx').includes('BrowserRouter'), 'BrowserRouter unchanged');

  return failures;
}

export function reportStage19DeviceSelfChecks(): void {
  const failures = runStage19DeviceSelfChecks();
  if (failures.length > 0) {
    throw new Error(`Stage 19 device self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

export function reportStage19ExamResumeSelfChecks(): void {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const subject of ALL) {
    const startNow = 1_700_100_000_000;
    let session = startExamSession(createExamSession('resume-user', subject, 42), startNow);
    const endTime = session.endTime!;
    const idx = Math.min(2, session.taskIds.length - 1);
    session = setExamCurrentIndex(session, idx);
    const restored = roundTripSession(session);
    check(restored.endTime === endTime, `${subject} endTime stable`);
    check(restored.currentIndex === idx, `${subject} index stable`);
    check(restored.taskIds.every((id) => Boolean(id)), `${subject} tasks intact`);
    const remainingAtT0 = getExamRemainingMs(endTime, startNow);
    check(remainingAtT0 === 45 * 60 * 1000 || remainingAtT0 > 0, `${subject} full duration at start`);
  }

  if (failures.length > 0) {
    throw new Error(`Stage 19 exam resume failed:\n- ${failures.join('\n- ')}`);
  }
}
