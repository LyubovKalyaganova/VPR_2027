import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSubject } from '../data/demo/subjects';
import { skillTitleById, subjectIdFromSkillId, visibleSubjects, visibleSubjectIds } from '../data/taxonomy/catalog';
import { localAttemptRecorder } from '../db';
import { getAchievements, getNextAchievementHint } from '../services/achievementService';
import {
  formatScoreCompact,
  getChildProgress,
  getOverallSubjectScore,
  getReadinessCaption,
  getSubjectSkillProgress,
  getSubjectStatusLabel,
} from '../services/progressService';
import { getCombinedDailyPlan } from '../services/dailyPlanRunner';
import { getDailyPlanProgress, mergeDailyPlanProgress } from '../services/dailyPlanProgressService';
import { getMergedDailyPlanHistory } from '../services/dailyPlanHistoryService';
import type { DailyPlan } from '../services/dailyPlanService';
import { resolveRecommendationLaunch } from '../services/learningRecommendationRunner';
import {
  getLearningRecommendation,
  type LearningRecommendation,
  type LearningRecommendationAction,
} from '../services/learningRecommendationService';
import {
  selectDueSkills,
  selectMistakeTasks,
  useTrainingStore,
} from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId, TrainingMode } from '../types';
import { Button, Card, ProgressBar, RingProgress } from '../components/ui';
import styles from './HomePage.module.css';

function recommendationButtonLabel(recommendation: LearningRecommendation): string {
  switch (recommendation.type) {
    case 'continue-daily':
      return recommendation.title.startsWith('Начать') ? 'Начать план' : 'Продолжить план';
    case 'mistakes':
      return 'Разобрать ошибки';
    case 'review':
      return 'Повторить';
    case 'weak':
    case 'reinforcement':
      return 'Тренироваться';
    case 'new-skill':
      return 'Начать';
    case 'start':
      return 'Начать тренировку';
  }
}

function unavailableActionMessage(action: LearningRecommendationAction): string {
  switch (action) {
    case 'daily':
      return 'На сегодня заданий нет';
    case 'mistakes':
      return 'Пока нет ошибок для повторения';
    case 'review':
      return 'На сегодня повторение не требуется';
    case 'weak':
      return 'Пока нет заданий для тренировки';
    default:
      return 'Сейчас нет заданий для этой тренировки';
  }
}

function countPlanSources(plans: readonly DailyPlan[]) {
  let weak = 0;
  let review = 0;
  let reinforcement = 0;
  for (const plan of plans) {
    for (const item of plan.items) {
      if (item.source === 'weak') {
        weak += 1;
      } else if (item.source === 'review') {
        review += 1;
      } else {
        reinforcement += 1;
      }
    }
  }
  return { weak, review, reinforcement };
}

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useUserStore((state) => state.profile);
  const startDaily = useTrainingStore((state) => state.startDaily);
  const startMistakes = useTrainingStore((state) => state.startMistakes);
  const startReview = useTrainingStore((state) => state.startReview);
  const startWeak = useTrainingStore((state) => state.startWeak);
  const startRussianWeak = useTrainingStore((state) => state.startRussianWeak);
  const startWorldWeak = useTrainingStore((state) => state.startWorldWeak);
  const startLiteraryReadingWeak = useTrainingStore((state) => state.startLiteraryReadingWeak);
  const startEnglishWeak = useTrainingStore((state) => state.startEnglishWeak);
  const startMath = useTrainingStore((state) => state.startMath);
  const startRussian = useTrainingStore((state) => state.startRussian);
  const startWorld = useTrainingStore((state) => state.startWorld);
  const startLiteraryReading = useTrainingStore((state) => state.startLiteraryReading);
  const startEnglish = useTrainingStore((state) => state.startEnglish);
  const [planUnavailable, setPlanUnavailable] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const name = (profile?.name ?? 'друг').trim() || 'друг';
  const userId = profile?.userId;
  const subjects = visibleSubjects(profile?.selectedSubjects);
  const subjectIds = visibleSubjectIds(profile?.selectedSubjects);
  const progress = getChildProgress(
    userId ? localAttemptRecorder.getAll(userId) : [],
    userId ?? '',
  );

  const daily = useMemo(() => {
    if (!userId) {
      return null;
    }
    const nowIso = new Date().toISOString();
    const attempts = localAttemptRecorder.getAll(userId);
    const combined = getCombinedDailyPlan({
      userId,
      subjects: subjectIds,
      nowIso,
    });
    const planParts = combined.plans.map((plan) =>
      getDailyPlanProgress({
        plan,
        attempts,
        userId,
        nowIso,
      }),
    );
    const planProgress = mergeDailyPlanProgress(planParts);
    const history = getMergedDailyPlanHistory({
      userId,
      attempts,
    });
    const childProgress = getChildProgress(attempts, userId);
    const dueSkillIds = subjectIds.flatMap((subject) =>
      selectDueSkills(attempts, userId, subject, nowIso).map((skill) => skill.id),
    );
    const selectedSet = new Set(subjectIds);
    const weakSkillIds = childProgress.weakSkills
      .filter((item) => selectedSet.has(item.skill.subjectId))
      .map((item) => item.skill.id);
    const selectedSkills = subjectIds.flatMap((subject) => getSubjectSkillProgress(attempts, userId, subject));
    const hasSkillData = selectedSkills.some((item) => item.mastery.status !== 'new');
    const newSkillIds = hasSkillData
      ? selectedSkills.filter((item) => item.mastery.status === 'new').map((item) => item.skill.id)
      : [];
    const dueIdSet = new Set(dueSkillIds);
    const weakIdSet = new Set(weakSkillIds);
    const reinforcementSkillIds = selectedSkills
      .filter((item) => {
        const status = item.mastery.status;
        return (
          item.mastery.attemptsCount > 0 &&
          !dueIdSet.has(item.skill.id) &&
          !weakIdSet.has(item.skill.id) &&
          (status === 'developing' || status === 'confident' || status === 'mastered')
        );
      })
      .map((item) => item.skill.id);
    const mistakes = selectMistakeTasks(attempts, userId).filter((task) => selectedSet.has(task.subject));
    const recommendation = getLearningRecommendation({
      userId,
      dailyPlan: {
        total: planProgress.total,
        completed: planProgress.completed,
        remaining: planProgress.remaining,
        isCompleted: planProgress.isCompleted,
      },
      mistakes: { count: mistakes.length },
      dueSkillIds,
      weakSkillIds,
      newSkillIds,
      reinforcementSkillIds,
    });
    const achievementInput = {
      userId,
      attempts,
      mathSkills: childProgress.mathSkills,
      planSummaries: history,
    };
    const achievements = getAchievements(achievementInput);
    return {
      combined,
      sources: countPlanSources(combined.plans),
      planProgress,
      recommendation,
      nextHint: getNextAchievementHint(achievements, achievementInput),
    };
  }, [userId, location.key, subjectIds.join('|')]);

  const total = daily?.planProgress.total ?? 0;
  const completed = daily?.planProgress.completed ?? 0;
  const remaining = daily?.planProgress.remaining ?? 0;
  const isCompleted = daily?.planProgress.isCompleted ?? false;
  const planEmpty = Boolean(profile) && (planUnavailable || total === 0);
  const canStart = Boolean(userId) && total > 0 && !planUnavailable && !isCompleted;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const recommendation = daily?.recommendation;
  const recommendationSkillTitle = skillTitleById(recommendation?.skillId);
  const overallScore = getOverallSubjectScore(progress.subjectScores, subjectIds);
  const readinessScore = overallScore ?? progress.mathScore;

  function startWeighted(target: SubjectId, mode: Extract<TrainingMode, 'quick' | 'normal' | 'random'>) {
    if (target === 'russian') {
      return startRussian(userId!, mode);
    }
    if (target === 'world') {
      return startWorld(userId!, mode);
    }
    if (target === 'reading') {
      return startLiteraryReading(userId!, mode);
    }
    if (target === 'english') {
      return startEnglish(userId!, mode);
    }
    return startMath(userId!, mode);
  }

  function startWeakSubject(target: SubjectId) {
    if (target === 'russian') {
      return startRussianWeak(userId!);
    }
    if (target === 'world') {
      return startWorldWeak(userId!);
    }
    if (target === 'reading') {
      return startLiteraryReadingWeak(userId!);
    }
    if (target === 'english') {
      return startEnglishWeak(userId!);
    }
    return startWeak(userId!);
  }

  function handleStartPlan() {
    if (!userId || !canStart) {
      return;
    }
    const sessionId = startDaily(userId, subjectIds);
    if (!sessionId) {
      setPlanUnavailable(true);
      return;
    }
    navigate(`/train/session/${sessionId}`);
  }

  function handleRecommendationAction(current: LearningRecommendation) {
    if (!userId) {
      return;
    }
    setActionNotice(null);
    const launch = resolveRecommendationLaunch(current);
    if (!launch) {
      setActionNotice(unavailableActionMessage(current.action));
      return;
    }
    const target = subjectIdFromSkillId(current.skillId) ?? subjectIds[0] ?? 'mathematics';
    const sessionId =
      launch.start === 'startDaily'
        ? startDaily(userId, subjectIds)
        : launch.start === 'startMistakes'
          ? startMistakes(userId, subjectIds.length === 1 ? subjectIds[0] : undefined)
          : launch.start === 'startReview'
            ? startReview(userId, target)
            : launch.start === 'startWeak'
              ? startWeakSubject(target)
              : startWeighted(target, launch.mode);
    if (!sessionId) {
      setActionNotice(unavailableActionMessage(current.action));
      return;
    }
    navigate(`/train/session/${sessionId}`);
  }

  const planHint =
    subjectIds.length <= 1
      ? `${total} заданий на сегодня`
      : `${total} заданий на сегодня · по ${Math.round(total / Math.max(subjectIds.length, 1))} из каждого предмета`;

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>ВПР 4 класс 2027</p>
        <h1 className={styles.hello}>Привет, {name}!</h1>
        <p className={styles.lead}>
          Подготовка к ВПР по выбранным предметам. Тренируйся и проходи пробный вариант — это учебные задания, не официальная работа.
        </p>
      </header>

      <div className={styles.dashboard}>
        <div className={styles.dashboardCol}>
          <Card className={styles.hero}>
            <RingProgress value={readinessScore} />
            <div className={styles.heroText}>
              <h2>Твоя готовность</h2>
              <p>{getReadinessCaption(progress, subjectIds)}</p>
              <Link to="/subjects">
                <Button fullWidth>Выбрать предмет</Button>
              </Link>
            </div>
          </Card>

          {recommendation ? (
            <Card className={styles.nextStep}>
              <p className={styles.nextStepKicker}>Что делать дальше</p>
              <h2>{recommendation.title}</h2>
              <p className={styles.nextStepText}>{recommendation.reason}</p>
              {recommendationSkillTitle ? (
                <p className={styles.nextStepSkill}>{recommendationSkillTitle}</p>
              ) : null}
              {actionNotice ? <p className={styles.nextStepNotice}>{actionNotice}</p> : null}
              <Button fullWidth onClick={() => handleRecommendationAction(recommendation)}>
                {recommendationButtonLabel(recommendation)}
              </Button>
            </Card>
          ) : null}

          {daily?.nextHint ? (
            <Card padding="sm" className={styles.motivation}>
              <p>{daily.nextHint}</p>
            </Card>
          ) : null}
        </div>

        <div className={styles.dashboardCol}>
          <section className={styles.section}>
            <h2>Предметы</h2>
            <div className={styles.subjectList}>
              {subjects.map((subject) => {
                const score = progress.subjectScores[subject.id];
                return (
                  <Link key={subject.id} to={`/subjects/${subject.id}`} className={styles.subjectLink}>
                    <Card padding="sm" className={styles.subjectCard}>
                      <div className={styles.subjectHead}>
                        <span className={styles.dot} style={{ background: subject.accent }} />
                        <strong>{subject.title}</strong>
                        <b>{formatScoreCompact(score)}</b>
                      </div>
                      <ProgressBar value={score ?? 0} color={subject.accent} ariaLabel={subject.title} />
                      <span className={styles.status}>{getSubjectStatusLabel(subject.id, progress)}</span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          <Card className={styles.plan}>
            <h2>{isCompleted ? 'План на сегодня выполнен!' : 'План на сегодня'}</h2>
            {planEmpty ? (
              <p className={styles.hint}>На сегодня заданий нет</p>
            ) : daily ? (
              <>
                {isCompleted ? (
                  <p className={styles.hint}>
                    {completed} из {total} заданий
                  </p>
                ) : (
                  <>
                    <p className={styles.hint}>{planHint}</p>
                    <div className={styles.planProgress}>
                      <p className={styles.planProgressTitle}>
                        {completed} из {total} выполнено
                      </p>
                      <ProgressBar value={percent} ariaLabel="Выполнение плана на сегодня" />
                      <p className={styles.planRemaining}>Осталось: {remaining}</p>
                    </div>
                  </>
                )}
                {daily.combined.plans.length > 1 ? (
                  <ul className={styles.planCats}>
                    {daily.combined.plans.map((plan) => (
                      <li key={plan.subject}>
                        <span className={styles.planCount}>{plan.items.length}</span>
                        {getSubject(plan.subject)?.title ?? plan.subject}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className={styles.planCats}>
                    <li>
                      <span className={styles.planCount}>{daily.sources.weak}</span>
                      Надо подтянуть
                    </li>
                    <li>
                      <span className={styles.planCount}>{daily.sources.review}</span>
                      Повторение
                    </li>
                    <li>
                      <span className={styles.planCount}>{daily.sources.reinforcement}</span>
                      Закрепление
                    </li>
                  </ul>
                )}
              </>
            ) : null}
            {canStart ? (
              <Button fullWidth onClick={handleStartPlan}>
                {completed > 0 ? 'Продолжить план' : 'Начать план'}
              </Button>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
