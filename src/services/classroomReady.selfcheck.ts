import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dailyPlanCountForSelection, skillsForSubject, visibleSubjectIds } from '../data/taxonomy/catalog';
import { pickDiagnosticTasks } from './diagnosticTasks';
import { getDailyPlan } from './dailyPlanRunner';
import { createMemoryDailyPlanStorage } from './dailyPlanStorage';
import { getExamBlueprint } from './exam/examBlueprints';
import { modesForSubject, type TrainSubject } from '../pages/trainSubject';
import type { SubjectId } from '../types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SUBJECTS: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

export function runClassroomReadySelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(dailyPlanCountForSelection(1) === 5, 'single-subject daily count');
  check(dailyPlanCountForSelection(5) === 2, 'five-subject daily count');
  check(visibleSubjectIds(['english']).length === 1, 'visible subjects filter');
  check(skillsForSubject('russian').length === 25, 'russian skills');
  check(skillsForSubject('english').length === 18, 'english skills');

  const diagnostic = pickDiagnosticTasks(SUBJECTS, 20270825);
  check(diagnostic.length === 5, `diagnostic count ${diagnostic.length}`);
  check(diagnostic.every((task) => task.taskType !== 'audio'), 'diagnostic without audio');
  check(new Set(diagnostic.map((task) => task.subject)).size === 5, 'diagnostic all subjects');

  const storage = createMemoryDailyPlanStorage();
  for (const subject of SUBJECTS) {
    const plan = getDailyPlan({
      userId: 'classroom-ready-user',
      subject,
      count: 2,
      nowIso: '2026-08-25T09:00:00.000Z',
      storage,
    });
    check(plan.items.length > 0, `daily plan ${subject} not empty`);
    check(plan.items.every((item) => Boolean(item.taskId)), `daily plan ${subject} task ids`);
  }

  const examStart = read('src/pages/ExamStartPage.tsx');
  check(!examStart.includes('Официальная структура'), 'exam start not claiming official structure');
  check(examStart.includes('не официальный бланк'), 'exam start honest wording');

  const home = read('src/pages/HomePage.tsx');
  check(home.includes('не официальная работа'), 'home honest wording');

  const profile = read('src/pages/ProfilePage.tsx');
  check(profile.includes('Для учителя'), 'profile teacher note');
  check(profile.includes('Очистить данные на этом устройстве'), 'profile device reset');
  check(profile.includes('selectedSubjects'), 'profile can change subjects');

  const onboard = read('src/pages/OnboardingPage.tsx');
  check(onboard.includes('Короткая проверка'), 'onboarding diagnostic');
  check(onboard.includes('Пропустить и начать'), 'onboarding can skip diagnostic');

  const result = read('src/pages/TrainResultPage.tsx');
  check(result.includes('К подготовке'), 'diagnostic returns to home');

  const trainPage = read('src/pages/TrainPage.tsx');
  check(!trainPage.includes('Экзаменационный режим'), 'no duplicate exam-mode label');
  check(!trainPage.includes('Перейти к ВПР'), 'no second exam CTA');
  check(trainPage.includes("navigate(`/exam/${subject}/start`)"), 'ВПР button goes to exam start');

  const audio = read('src/components/task/answers/AudioAnswer.tsx');
  check(audio.includes('озвучка недоступна') || audio.includes('Озвучка на этом устройстве'), 'audio fallback copy');

  check(
    modesForSubject('english').some((mode) => mode.text.includes('по английскому языку')),
    'english training uses dative after по',
  );

  for (const subject of SUBJECTS) {
    const note = getExamBlueprint(subject)?.scoringNote ?? '';
    check(!note.toLowerCase().includes('training analog'), `scoring note child-friendly ${subject}`);
    const modes = modesForSubject(subject as TrainSubject);
    for (const id of ['daily', 'mistakes', 'review'] as const) {
      const mode = modes.find((item) => item.id === id);
      check(Boolean(mode) && !mode?.disabled, `${subject} ${id} enabled`);
    }
  }

  return failures;
}

export function reportClassroomReadySelfChecks(): void {
  const failures = runClassroomReadySelfChecks();
  if (failures.length > 0) {
    throw new Error(`Classroom-ready self-check failed:\n- ${failures.join('\n- ')}`);
  }
}
