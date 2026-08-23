/**
 * Stage 17: UX routes, subject isolation, exam flow smoke (no FROZEN catalog changes).
 */
import { SUBJECTS } from '../data/demo/subjects';
import { getExamBlueprint } from './exam/examBlueprints';
import { canBuildExam } from './exam/examTaskSelector';
import {
  examModeForSubject,
  modesForSubject,
  subjectLabel,
  trainingModesForSubject,
  type TrainSubject,
} from '../pages/trainSubject';
import type { SubjectId } from '../types';

const TRAIN_SUBJECTS: TrainSubject[] = ['mathematics', 'russian', 'world', 'reading', 'english'];

const UX_ROUTES = [
  '/',
  '/subjects',
  '/subjects/mathematics',
  '/subjects/russian',
  '/subjects/world',
  '/subjects/reading',
  '/subjects/english',
  '/train',
  '/train?subject=mathematics',
  '/train?subject=russian',
  '/train?subject=world',
  '/train?subject=reading',
  '/train?subject=english',
  '/progress',
  '/exam/mathematics/start',
  '/exam/russian/start',
  '/exam/world/start',
  '/exam/reading/start',
  '/exam/english/start',
] as const;

const FORBIDDEN_UI_TERMS = ['weighted mix', 'training analog', 'skillId', 'subjectId', 'sessionId'];

export function runStage17UxSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(SUBJECTS.length === 5, 'expected 5 subjects');
  for (const subject of TRAIN_SUBJECTS) {
    check(Boolean(subjectLabel(subject)), `subject label for ${subject}`);
    const training = trainingModesForSubject(subject);
    const exam = examModeForSubject(subject);
    check(training.every((mode) => mode.id !== 'exam'), `exam separated from training for ${subject}`);
    check(exam.id === 'exam' && exam.title === 'Пройти ВПР', `exam title for ${subject}`);
    check(!training.some((mode) => mode.text.toLowerCase().includes('weighted')), `no weighted jargon for ${subject}`);
    const blueprint = getExamBlueprint(subject);
    check(Boolean(blueprint), `exam blueprint for ${subject}`);
    if (blueprint) {
      check(canBuildExam(blueprint), `exam buildable for ${subject}`);
    }
  }

  for (const route of UX_ROUTES) {
    check(route.startsWith('/'), `route starts with /: ${route}`);
  }

  for (const subjectId of TRAIN_SUBJECTS) {
    const modes = modesForSubject(subjectId);
    for (const mode of modes) {
      for (const term of FORBIDDEN_UI_TERMS) {
        check(
          !mode.title.toLowerCase().includes(term) && !mode.text.toLowerCase().includes(term),
          `forbidden term "${term}" in mode ${mode.id}/${subjectId}`,
        );
      }
    }
  }

  const subjectIds = SUBJECTS.map((item) => item.id);
  check(
    subjectIds.join(',') === 'russian,mathematics,world,reading,english',
    'subject order and ids stable',
  );

  return failures;
}

export function reportStage17UxSelfChecks(): void {
  const failures = runStage17UxSelfChecks();
  if (failures.length > 0) {
    throw new Error(`Stage 17 UX self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

export function reportStage17SubjectIsolationSelfChecks(): void {
  const failures: string[] = [];
  for (const subject of TRAIN_SUBJECTS) {
    const training = trainingModesForSubject(subject);
    const hasWeak = training.some((mode) => mode.id === 'weak' && !mode.disabled);
    if (!hasWeak) {
      failures.push(`weak mode missing for ${subject}`);
    }
    const exam = examModeForSubject(subject);
    if (exam.title !== 'Пройти ВПР') {
      failures.push(`exam label wrong for ${subject}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Stage 17 subject isolation failed:\n- ${failures.join('\n- ')}`);
  }
}

export function reportStage17ExamFlowSelfChecks(): void {
  const subjects: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];
  const failures: string[] = [];
  for (const subjectId of subjects) {
    const blueprint = getExamBlueprint(subjectId);
    if (!blueprint) {
      failures.push(`missing blueprint ${subjectId}`);
      continue;
    }
    if (blueprint.totalSlots <= 0 || blueprint.maxScore <= 0 || blueprint.durationMinutes <= 0) {
      failures.push(`invalid blueprint stats ${subjectId}`);
    }
    if (!canBuildExam(blueprint)) {
      failures.push(`cannot build exam ${subjectId}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Stage 17 exam flow failed:\n- ${failures.join('\n- ')}`);
  }
}
