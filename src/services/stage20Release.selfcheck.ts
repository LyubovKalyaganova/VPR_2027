/**
 * Stage 20: Release candidate audit — content, VPR, training, progress, Android, scope.
 * Orchestrates existing self-checks; does not modify FROZEN catalogs.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { WORLD_SKILLS } from '../data/taxonomy/world';
import { READING_SKILLS } from '../data/taxonomy/literaryReading';
import { ENGLISH_SKILLS } from '../data/taxonomy/english';
import { taskRepository } from './taskRepository';
import { reportRussianBankAuditSelfChecks } from '../features/russian/russianBankAudit.selfcheck';
import { reportWorldBankAuditSelfChecks } from '../features/world/worldBankAudit.selfcheck';
import { reportReadingBankAuditSelfChecks } from '../features/reading/literaryReadingBankAudit.selfcheck';
import { reportEnglishBankAuditSelfChecks } from '../features/english/englishBankAudit.selfcheck';
import { reportStage15TrainingFlowSelfChecks } from './stage15TrainingFlow.selfcheck';
import { reportProgressSelfChecks } from './progressService.selfcheck';
import { reportMasterySelfChecks } from './masteryService.selfcheck';
import { reportAdaptiveSelectorSelfChecks } from './adaptiveTaskSelector.selfcheck';
import { reportStage14ProgressSelfChecks } from './stage14Progress.selfcheck';
import {
  reportExamBlueprintsSelfChecks,
  reportExamFlowSelfChecks,
  reportExamPersistenceSelfChecks,
  reportExamScoringSelfChecks,
  reportExamSelectionSelfChecks,
  reportExamTimerSelfChecks,
} from './exam/stage16Exam.selfcheck';
import { reportStage18AndroidSelfChecks, reportStage18PersistenceSelfChecks } from './stage18Android.selfcheck';
import { reportStage19DeviceSelfChecks, reportStage19ExamResumeSelfChecks } from './stage19Device.selfcheck';
import { reportStage17SubjectIsolationSelfChecks, reportStage17UxSelfChecks } from './stage17Ux.selfcheck';
import type { SubjectId } from '../types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function assertFrozenSkillCounts(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };
  check(MATH_SKILLS.length === 35, `M01–M35 count=${MATH_SKILLS.length}`);
  check(RUSSIAN_SKILLS.length === 25, `R01–R25 count=${RUSSIAN_SKILLS.length}`);
  check(WORLD_SKILLS.length === 25, `W01–W25 count=${WORLD_SKILLS.length}`);
  check(READING_SKILLS.length === 24, `L01–L24 count=${READING_SKILLS.length}`);
  check(ENGLISH_SKILLS.length === 18, `E01–E18 count=${ENGLISH_SKILLS.length}`);

  const allCodes = [
    ...MATH_SKILLS.map((s) => s.code),
    ...RUSSIAN_SKILLS.map((s) => s.code),
    ...WORLD_SKILLS.map((s) => s.code),
    ...READING_SKILLS.map((s) => s.code),
    ...ENGLISH_SKILLS.map((s) => s.code),
  ];
  check(!allCodes.some((c) => /^M3[6-9]|^M[4-9]\d/.test(c)), 'no M36+');
  check(!allCodes.some((c) => /^R2[6-9]|^R[3-9]\d/.test(c)), 'no R26+');
  check(!allCodes.some((c) => /^W2[6-9]|^W[3-9]\d/.test(c)), 'no W26+');
  check(!allCodes.some((c) => /^L2[5-9]|^L[3-9]\d/.test(c)), 'no L25+');
  check(!allCodes.some((c) => /^E1[9-9]|^E[2-9]\d/.test(c)), 'no E19+');
  return failures;
}

function auditProductionPool(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const subjects: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];
  const allIds = new Set<string>();

  for (const subject of subjects) {
    const tasks =
      subject === 'mathematics'
        ? taskRepository.getMathTasks()
        : subject === 'russian'
          ? taskRepository.getRussianTasks()
          : subject === 'world'
            ? taskRepository.getWorldTasks()
            : subject === 'reading'
              ? taskRepository.getLiteraryReadingTasks()
              : taskRepository.getEnglishTasks();

    check(tasks.length > 0, `${subject} pool not empty`);

    for (const task of tasks) {
      check(task.subject === subject, `${task.id} wrong subject`);
      check(Boolean(task.id), `${subject} missing id`);
      check(Boolean(task.skillId), `${task.id} missing skillId`);
      check(Boolean(task.topicId), `${task.id} missing topicId`);
      check(Boolean(task.taskType), `${task.id} missing taskType`);
      check(task.difficulty >= 1 && task.difficulty <= 5, `${task.id} difficulty`);
      check(task.sourceType !== 'demo', `${task.id} demo in production pool`);
      check(!allIds.has(task.id), `duplicate id ${task.id}`);
      allIds.add(task.id);
    }
  }

  const demoTasks = taskRepository.getDemoTasks();
  check(demoTasks.length > 0, 'demo bank exists');
  check(demoTasks.every((t) => t.sourceType === 'demo'), 'demo tasks marked demo');

  return failures;
}

function auditScopeFiles(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const typesIndex = read('src/types/index.ts');
  check(!typesIndex.includes('M36'), 'types/index no M36');
  check(read('capacitor.config.ts').includes('ru.vpr4class2027.app'), 'applicationId stable');
  check(read('package.json').includes('"test:release-audit"'), 'release-audit script');
  check(read('android/app/build.gradle').includes('applicationId "ru.vpr4class2027.app"'), 'gradle applicationId');

  return failures;
}

function throwIf(failures: string[], section: string): void {
  if (failures.length > 0) {
    throw new Error(`${section} failed:\n- ${failures.join('\n- ')}`);
  }
}

export function reportStage20ContentAudit(): void {
  throwIf(auditProductionPool(), 'content pool');
  throwIf(assertFrozenSkillCounts(), 'frozen skill counts');
  reportRussianBankAuditSelfChecks();
  reportWorldBankAuditSelfChecks();
  reportReadingBankAuditSelfChecks();
  reportEnglishBankAuditSelfChecks();
}

export function reportStage20VprAudit(): void {
  reportExamBlueprintsSelfChecks();
  reportExamSelectionSelfChecks();
  reportExamScoringSelfChecks();
  reportExamTimerSelfChecks();
  reportExamPersistenceSelfChecks();
  reportExamFlowSelfChecks();
  reportStage19ExamResumeSelfChecks();
}

export function reportStage20TrainingAudit(): void {
  reportStage15TrainingFlowSelfChecks();
  reportStage17SubjectIsolationSelfChecks();
}

export function reportStage20ProgressAudit(): void {
  reportProgressSelfChecks();
  reportMasterySelfChecks();
  reportAdaptiveSelectorSelfChecks();
  reportStage14ProgressSelfChecks();
}

export function reportStage20AndroidAudit(): void {
  reportStage18AndroidSelfChecks();
  reportStage18PersistenceSelfChecks();
  reportStage19DeviceSelfChecks();
}

export function reportStage20ScopeAudit(): void {
  throwIf(assertFrozenSkillCounts(), 'scope skills');
  throwIf(auditScopeFiles(), 'scope files');
}

export function reportStage20ReleaseAudit(): void {
  reportStage20ScopeAudit();
  reportStage20ContentAudit();
  reportStage20VprAudit();
  reportStage20TrainingAudit();
  reportStage20ProgressAudit();
  reportStage20AndroidAudit();
  reportStage17UxSelfChecks();
}
