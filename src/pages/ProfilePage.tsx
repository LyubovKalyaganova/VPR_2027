import { useState } from 'react';
import { SUBJECTS } from '../data/demo/subjects';
import { visibleSubjectIds } from '../data/taxonomy/catalog';
import { localAttemptRecorder } from '../db';
import { getAchievements, getNextAchievementHint } from '../services/achievementService';
import { getMergedDailyPlanHistory } from '../services/dailyPlanHistoryService';
import {
  formatScoreLabel,
  getChildProgress,
  getOverallSubjectScore,
  minutesFromMs,
} from '../services/progressService';
import { getMotivationView } from '../services/motivationView';
import { clearDeviceLearningStorage } from '../services/deviceReset';
import { useExamStore } from '../store/useExamStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId } from '../types';
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
  const profile = useUserStore((state) => state.profile);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const [resetOpen, setResetOpen] = useState(false);
  const attempts = profile ? localAttemptRecorder.getAll(profile.userId) : [];
  const progress = getChildProgress(attempts, profile?.userId ?? '');
  const selectedIds = visibleSubjectIds(profile?.selectedSubjects);
  const overallScore = getOverallSubjectScore(progress.subjectScores, selectedIds);
  const planHistory = profile
    ? getMergedDailyPlanHistory({
        userId: profile.userId,
        attempts,
      })
    : [];
  const achievementInput = profile
    ? {
        userId: profile.userId,
        attempts,
        mathSkills: progress.mathSkills,
        planSummaries: planHistory,
      }
    : null;
  const achievements = achievementInput ? getAchievements(achievementInput) : [];
  const motivation = getMotivationView({
    mathSkills: progress.mathSkills,
    achievements,
    nextHint: achievementInput ? getNextAchievementHint(achievements, achievementInput) : null,
  });

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
          <b>{formatScoreLabel(overallScore)}</b>
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

      <section className={styles.spanAll}>
        <h3>Ваш прогресс</h3>
        <Card padding="sm" className={styles.motivation}>
          <p className={styles.mastered}>{motivation.masteredPhrase}</p>
          {motivation.emptyMessage ? <p>{motivation.emptyMessage}</p> : null}
          {motivation.earned.length > 0 ? (
            <div className={styles.earnedList}>
              {motivation.earned.map((item) => (
                <div key={item.title} className={styles.earnedItem}>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>
          ) : null}
          {motivation.nextGoal ? (
            <p className={styles.nextGoal}>
              <span>Следующая цель</span>
              {motivation.nextGoal}
            </p>
          ) : null}
        </Card>
      </section>

      <section className={styles.spanAll}>
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

      <section className={styles.spanAll}>
        <h3>Предметы</h3>
        <p className={styles.sectionLead}>Можно изменить, если класс готовится не ко всем предметам.</p>
        <div className={styles.subjectList}>
          {SUBJECTS.map((subject) => {
            const selected = selectedIds.includes(subject.id);
            return (
              <button
                key={subject.id}
                type="button"
                className={`${styles.subject} ${selected ? styles.subjectOn : ''}`}
                onClick={() => {
                  const next: SubjectId[] = selected
                    ? selectedIds.filter((id) => id !== subject.id)
                    : [...selectedIds, subject.id];
                  if (next.length === 0) {
                    return;
                  }
                  updateProfile({ selectedSubjects: next });
                }}
              >
                <span className={styles.subjectMark} style={{ background: subject.accent }} />
                <strong>{subject.title}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <Card padding="sm" className={styles.teacherNote}>
        <h3>Для учителя</h3>
        <p>
          Данные остаются только на этом устройстве. Сейчас один профиль на телефон или планшет: чтобы начать заново
          под другим именем, нажмите «Очистить данные» (прогресс текущего ученика сотрётся). Переключения между
          несколькими учениками без сброса пока нет. Это учебный тренажёр, не официальная ВПР.
        </p>
      </Card>

      <Button className={styles.spanAll} variant="secondary" fullWidth onClick={() => setResetOpen(true)}>
        Очистить данные на этом устройстве
      </Button>

      <Modal
        open={resetOpen}
        title="Удалить все данные?"
        confirmLabel="Удалить"
        cancelLabel="Оставить"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          clearDeviceLearningStorage();
          void useUserStore.persist.clearStorage();
          void useTrainingStore.persist.clearStorage();
          void useExamStore.persist.clearStorage();
          useUserStore.setState({ profile: null });
          window.location.replace('/onboarding');
        }}
      >
        Имя, прогресс и история занятий на этом телефоне будут удалены. Сервер не используется — данные никуда не
        отправляются.
      </Modal>
    </div>
  );
}
