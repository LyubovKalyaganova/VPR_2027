import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../data/demo/subjects';
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
import { useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import { Button, Card, ProgressBar, RingProgress } from '../components/ui';
import styles from './HomePage.module.css';

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
  const [planUnavailable, setPlanUnavailable] = useState(false);
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

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>ВПР 4 класс 2027</p>
      <h1 className={styles.hello}>Привет, {name}!</h1>
      <p className={styles.lead}>Вот как выглядит твоя подготовка сейчас.</p>

      <Card className={styles.hero}>
        <RingProgress value={progress.mathScore} />
        <div className={styles.heroText}>
          <h2>Твоя готовность</h2>
          <p>{getReadinessCaption(progress)}</p>
          <Link to="/train">
            <Button fullWidth>Продолжить подготовку</Button>
          </Link>
        </div>
      </Card>

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
                <p className={styles.hint}>{total} заданий</p>
                <div className={styles.planProgress}>
                  <p className={styles.planProgressTitle}>
                    {completed} из {total} выполнено
                  </p>
                  <ProgressBar value={percent} ariaLabel="Выполнение плана на сегодня" />
                  <p className={styles.planRemaining}>Осталось: {remaining}</p>
                </div>
              </>
            )}
            <ul className={styles.planStats}>
              <li>Всего — {daily.todaySummary.total}</li>
              <li>Выполнено — {daily.todaySummary.completed}</li>
              <li>Осталось — {daily.todaySummary.remaining}</li>
              <li>Правильно — {daily.todaySummary.correct}</li>
              <li>Ошибки — {daily.todaySummary.incorrect}</li>
            </ul>
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
