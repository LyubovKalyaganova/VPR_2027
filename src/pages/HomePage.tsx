import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../data/demo/subjects';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { localAttemptRecorder } from '../db';
import { getAchievements, getNextAchievementHint } from '../services/achievementService';
import {
  formatScoreCompact,
  getChildProgress,
  getReadinessCaption,
  getSubjectStatusLabel,
} from '../services/progressService';
import { getDailyPlan } from '../services/dailyPlanRunner';
import { getDailyPlanProgress } from '../services/dailyPlanProgressService';
import { getDailyPlanHistory, summaryFromDailyPlan } from '../services/dailyPlanHistoryService';
import { getCalendarDate } from '../services/dailyPlanStorage';
import type { DailyPlan } from '../services/dailyPlanService';
import { resolveRecommendationLaunch } from '../services/learningRecommendationRunner';
import {
  getLearningRecommendation,
  type LearningRecommendation,
  type LearningRecommendationAction,
  type LearningRecommendationType,
} from '../services/learningRecommendationService';
import {
  selectDueMathSkills,
  selectMistakeTasks,
  useTrainingStore,
} from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import { Button, Card, ProgressBar, RingProgress } from '../components/ui';
import styles from './HomePage.module.css';

function recommendationButtonLabel(type: LearningRecommendationType): string {
  switch (type) {
    case 'continue-daily':
      return 'Продолжить план';
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

function skillTitleById(skillId: string | undefined): string | undefined {
  if (!skillId) {
    return undefined;
  }
  return MATH_SKILLS.find((skill) => skill.id === skillId)?.title;
}

function averageSubjectScore(scores: Record<string, number | null>): number | null {
  const values = SUBJECTS.map((subject) => scores[subject.id]).filter(
    (value): value is number => value !== null,
  );
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countPlanSources(plan: DailyPlan) {
  let weak = 0;
  let review = 0;
  let reinforcement = 0;
  for (const item of plan.items) {
    if (item.source === 'weak') {
      weak += 1;
    } else if (item.source === 'review') {
      review += 1;
    } else {
      reinforcement += 1;
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
  const startMath = useTrainingStore((state) => state.startMath);
  const [planUnavailable, setPlanUnavailable] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const name = profile?.name ?? 'друг';
  const userId = profile?.userId;
  const progress = getChildProgress(
    userId ? localAttemptRecorder.getAll(userId) : [],
    userId ?? '',
  );

  const daily = useMemo(() => {
    if (!userId) {
      return null;
    }
    const nowIso = new Date().toISOString();
    const today = getCalendarDate(nowIso);
    const attempts = localAttemptRecorder.getAll(userId);
    const plan = getDailyPlan({
      userId,
      subject: 'mathematics',
      count: 5,
      nowIso,
    });
    const planProgress = getDailyPlanProgress({
      plan,
      attempts,
      userId,
      nowIso,
    });
    const todaySummary = summaryFromDailyPlan(plan, attempts, today);
    const history = getDailyPlanHistory({
      userId,
      subject: 'mathematics',
      nowIso,
      attempts,
    });
    const childProgress = getChildProgress(attempts, userId);
    const dueSkillIds = selectDueMathSkills(attempts, userId, nowIso).map((skill) => skill.id);
    const weakIdSet = new Set(childProgress.weakSkills.map((item) => item.skill.id));
    const weakSkillIds = childProgress.mathSkills
      .filter((item) => weakIdSet.has(item.skill.id))
      .map((item) => item.skill.id);
    const hasSkillData = childProgress.mathSkills.some((item) => item.mastery.status !== 'new');
    const newSkillIds = hasSkillData
      ? childProgress.mathSkills
          .filter((item) => item.mastery.status === 'new')
          .map((item) => item.skill.id)
      : [];
    const dueIdSet = new Set(dueSkillIds);
    const reinforcementSkillIds = childProgress.mathSkills
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
    const recommendation = getLearningRecommendation({
      userId,
      dailyPlan: {
        total: planProgress.total,
        completed: planProgress.completed,
        remaining: planProgress.remaining,
        isCompleted: planProgress.isCompleted,
      },
      mistakes: { count: selectMistakeTasks(attempts, userId).length },
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
      plan,
      sources: countPlanSources(plan),
      planProgress,
      todaySummary,
      recommendation,
      nextHint: getNextAchievementHint(achievements, achievementInput),
    };
  }, [userId, location.key]);

  const total = daily?.planProgress.total ?? 0;
  const completed = daily?.planProgress.completed ?? 0;
  const remaining = daily?.planProgress.remaining ?? 0;
  const isCompleted = daily?.planProgress.isCompleted ?? false;
  const planEmpty = Boolean(profile) && (planUnavailable || total === 0);
  const canStart = Boolean(userId) && total > 0 && !planUnavailable && !isCompleted;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const recommendation = daily?.recommendation;
  const recommendationSkillTitle = skillTitleById(recommendation?.skillId);
  const overallScore = averageSubjectScore(progress.subjectScores);
  const readinessScore = overallScore ?? progress.mathScore;

  function handleStartPlan() {
    if (!userId || !canStart) {
      return;
    }
    const sessionId = startDaily(userId);
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
    const sessionId =
      launch.start === 'startDaily'
        ? startDaily(userId)
        : launch.start === 'startMistakes'
          ? startMistakes(userId)
          : launch.start === 'startReview'
            ? startReview(userId)
            : launch.start === 'startWeak'
              ? startWeak(userId)
              : startMath(userId, launch.mode);
    if (!sessionId) {
      setActionNotice(unavailableActionMessage(current.action));
      return;
    }
    navigate(`/train/session/${sessionId}`);
  }

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>ВПР 4 класс 2027</p>
      <h1 className={styles.hello}>Привет, {name}!</h1>
      <p className={styles.lead}>Подготовка к ВПР по пяти предметам: выбирай предмет, тренируйся или проходи экзамен.</p>

      <Card className={styles.hero}>
        <RingProgress value={readinessScore} />
        <div className={styles.heroText}>
          <h2>Твоя готовность</h2>
          <p>{getReadinessCaption(progress)}</p>
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
            {recommendationButtonLabel(recommendation.type)}
          </Button>
        </Card>
      ) : null}

      {daily?.nextHint ? (
        <Card padding="sm" className={styles.motivation}>
          <p>{daily.nextHint}</p>
        </Card>
      ) : null}

      <section className={styles.section}>
        <h2>Предметы</h2>
        <div className={styles.subjectList}>
          {SUBJECTS.map((subject) => {
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
                <p className={styles.hint}>{total} заданий на сегодня · только математика</p>
                <div className={styles.planProgress}>
                  <p className={styles.planProgressTitle}>
                    {completed} из {total} выполнено
                  </p>
                  <ProgressBar value={percent} ariaLabel="Выполнение плана на сегодня" />
                  <p className={styles.planRemaining}>Осталось: {remaining}</p>
                </div>
              </>
            )}
            <ul className={styles.planCats}>
              <li>
                <span className={styles.planCount}>{daily.sources.weak}</span>
                Слабые места
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
          </>
        ) : null}
        {canStart ? (
          <Button fullWidth onClick={handleStartPlan}>
            {completed > 0 ? 'Продолжить план' : 'Начать план'}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
