import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localAttemptRecorder } from '../db';
import { getAchievements } from '../services/achievementService';
import { getDailyPlanHistory } from '../services/dailyPlanHistoryService';
import {
  formatScoreLabel,
  getChildProgress,
  minutesFromMs,
} from '../services/progressService';
import { useUserStore } from '../store/useUserStore';
import { Avatar, Button, Card, Modal } from '../components/ui';
import styles from './ProfilePage.module.css';

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function formatHistoryDate(date: string): string {
  const [year, month, day] = date.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || !day || monthIndex < 0 || monthIndex > 11) {
    return date;
  }
  return `${Number(day)} ${MONTHS_GENITIVE[monthIndex]}`;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const resetOnboarding = useUserStore((state) => state.resetOnboarding);
  const [resetOpen, setResetOpen] = useState(false);
  const attempts = profile ? localAttemptRecorder.getAll(profile.userId) : [];
  const progress = getChildProgress(attempts, profile?.userId ?? '');
  const planHistory = profile
    ? getDailyPlanHistory({
        userId: profile.userId,
        subject: 'mathematics',
        attempts,
      })
    : [];
  const achievements = profile
    ? getAchievements({
        userId: profile.userId,
        attempts,
        mathSkills: progress.mathSkills,
        planSummaries: planHistory,
      })
    : [];

  if (!profile) {
    return null;
  }

  return (
    <div className={styles.page}>
      <Card className={styles.hero}>
        <Avatar name={profile.name} color={profile.avatar} size={64} />
        <div>
          <h2>{profile.name}</h2>
          <p>4 класс</p>
        </div>
      </Card>

      <div className={styles.stats}>
        <Card padding="sm">
          <b>{formatScoreLabel(progress.mathScore)}</b>
          <span>Готовность</span>
        </Card>
        <Card padding="sm">
          <b>{progress.stats.currentStreak}</b>
          <span>Серия</span>
        </Card>
        <Card padding="sm">
          <b>{progress.stats.totalAttempts}</b>
          <span>Заданий</span>
        </Card>
        <Card padding="sm">
          <b>{progress.stats.correctAttempts}</b>
          <span>Верных ответов</span>
        </Card>
      </div>

      <Card>
        <h3>Время занятий</h3>
        <p>Всего: {minutesFromMs(progress.stats.totalTimeSpent)} минут.</p>
      </Card>

      <section>
        <h3>История ежедневных планов</h3>
        {planHistory.length === 0 ? (
          <Card padding="sm">
            <p>Истории пока нет</p>
          </Card>
        ) : (
          <div className={styles.historyList}>
            {planHistory.map((day) => (
              <Card key={day.date} padding="sm" className={styles.historyCard}>
                <strong>{formatHistoryDate(day.date)}</strong>
                <span>
                  {day.completed} из {day.total} заданий
                </span>
                <span>
                  {day.isCompleted ? 'План выполнен' : `Осталось ${day.remaining}`}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>Мои достижения</h3>
        <div className={styles.badges}>
          {achievements.map((item) => (
            <Card
              key={item.id}
              padding="sm"
              className={`${styles.badge} ${item.achieved ? styles.badgeOn : styles.badgeOff}`}
            >
              <strong>{item.title}</strong>
              <span>{item.achieved ? 'Получено' : item.description}</span>
            </Card>
          ))}
        </div>
      </section>

      <Button variant="secondary" fullWidth onClick={() => setResetOpen(true)}>
        Пройти знакомство заново
      </Button>

      <Modal
        open={resetOpen}
        title="Сбросить знакомство?"
        confirmLabel="Сбросить"
        cancelLabel="Оставить"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetOnboarding();
          setResetOpen(false);
          navigate('/onboarding', { replace: true });
        }}
      >
        Имя и выбранные предметы на этом устройстве будут очищены. Задания и сервер при этом не используются.
      </Modal>
    </div>
  );
}
