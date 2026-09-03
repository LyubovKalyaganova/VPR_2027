import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, ProgressBar } from '../components/ui';
import { localAttemptRecorder } from '../db';
import { taskEngine, useTrainingStore } from '../store/useTrainingStore';
import { taskRepository } from '../services/taskRepository';
import {
  formatScoreCompact,
  getSessionSkillBreakdown,
  getTopicTitleForSubject,
  masteryStatusLabel,
} from '../services/progressService';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId, TrainingMode } from '../types';
import styles from './TrainResultPage.module.css';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds} сек`;
  }
  return `${minutes} мин ${seconds} сек`;
}

function resultTitle(mode: TrainingMode | undefined, topicTitle?: string): string {
  switch (mode) {
    case 'demo':
      return 'Пробная тренировка';
    case 'daily':
      return 'Ежедневный план';
    case 'weak':
      return 'Надо подтянуть';
    case 'mistakes':
      return 'Работа над ошибками';
    case 'review':
      return 'Повторение';
    case 'quick':
      return 'Быстрая тренировка';
    case 'normal':
      return 'Обычная тренировка';
    case 'random':
      return 'Случайная тренировка';
    case 'diagnostic':
      return 'Короткая проверка';
    case 'topic':
      return topicTitle ? `Тематическая тренировка · ${topicTitle}` : 'Тематическая тренировка';
    default:
      return 'Тренировка';
  }
}

function sessionSubject(session: { taskIds: string[] } | undefined): SubjectId | undefined {
  if (!session?.taskIds[0]) {
    return undefined;
  }
  return taskRepository.getById(session.taskIds[0])?.subject;
}

export function TrainResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const storedSummary = useTrainingStore((state) => (sessionId ? state.summaries[sessionId] : undefined));
  const session = useTrainingStore((state) => (sessionId ? state.sessions[sessionId] : undefined));
  const startMistakeReview = useTrainingStore((state) => state.startMistakeReview);
  const [notice, setNotice] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (storedSummary) {
      return storedSummary;
    }
    if (session?.phase === 'completed') {
      return taskEngine.getSummary(session);
    }
    return undefined;
  }, [storedSummary, session]);

  const subject = sessionSubject(session);
  const topicTask =
    session?.mode === 'topic' && session.taskIds[0]
      ? taskRepository.getById(session.taskIds[0])
      : undefined;
  const topicTitle =
    topicTask?.topicId && subject
      ? getTopicTitleForSubject(subject, topicTask.topicId)
      : topicTask?.topic;
  const title = resultTitle(session?.mode, topicTitle);

  const skillBreakdown =
    profile && sessionId
      ? getSessionSkillBreakdown(localAttemptRecorder.getAll(profile.userId), sessionId, profile.userId)
      : [];
  const needReview = skillBreakdown.filter(
    (item) =>
      item.mastery.status === 'not_mastered' ||
      item.mastery.status === 'developing' ||
      item.correct < item.total,
  );
  const strong = skillBreakdown.filter(
    (item) => item.mastery.status === 'mastered' || item.mastery.status === 'confident',
  );

  if (!sessionId || !session) {
    return <Navigate to="/train" replace />;
  }

  if (!summary) {
    return (
      <div className={styles.page}>
        <Card>
          <h2>Результат недоступен</h2>
          <p>Тренировка ещё не завершена или данные сессии устарели.</p>
        </Card>
        <Button fullWidth onClick={() => navigate('/train')}>
          Вернуться к тренировке
        </Button>
      </div>
    );
  }

  function handleMistakes() {
    if (!profile || !sessionId) {
      return;
    }
    setNotice(null);
    const nextId = startMistakeReview(profile.userId, sessionId);
    if (nextId) {
      navigate(`/train/session/${nextId}`);
      return;
    }
    setNotice('Не удалось подобрать задания для разбора ошибок');
  }

  function handleContinue() {
    if (subject) {
      navigate(`/train?subject=${subject}`);
      return;
    }
    navigate('/train');
  }

  function handleSubjectProgress() {
    if (subject) {
      navigate(`/subjects/${subject}`);
      return;
    }
    navigate('/subjects');
  }

  return (
    <div className={styles.page}>
      <Card className={styles.hero}>
        <p className={styles.kicker}>{title}</p>
        <h2>{summary.percent}%</h2>
        <p>
          {session?.mode === 'diagnostic'
            ? 'Стартовая проверка закончена. Полная картина готовности появится после тренировок — здесь только первые ориентиры.'
            : `Правильных: ${summary.correct} / ${summary.total}. Ошибок: ${summary.incorrect}.`}
        </p>
      </Card>

      <div className={styles.stats}>
        <Card padding="sm">
          <b>{summary.total}</b>
          <span>Заданий</span>
        </Card>
        <Card padding="sm">
          <b>{summary.correct}</b>
          <span>Верно</span>
        </Card>
        <Card padding="sm">
          <b>{summary.incorrect}</b>
          <span>Ошибок</span>
        </Card>
        <Card padding="sm">
          <b>{summary.hintsUsed}</b>
          <span>Подсказок</span>
        </Card>
      </div>

      {skillBreakdown.length > 0 ? (
        <Card>
          <h3>Навыки</h3>
          <div className={styles.skillList}>
            {skillBreakdown.map((item) => (
              <div key={item.skillId} className={styles.skillRow}>
                <div className={styles.skillHead}>
                  <span>
                    {item.title} ({item.correct}/{item.total})
                  </span>
                  <b>{formatScoreCompact(item.mastery.masteryScore)}</b>
                </div>
                <ProgressBar
                  value={item.mastery.masteryScore ?? 0}
                  color="var(--color-accent)"
                  ariaLabel={item.title}
                />
                <p className={styles.skillMeta}>{masteryStatusLabel(item.mastery.status)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {needReview.length > 0 ? (
        <Card padding="sm">
          <h3>Нужно повторить</h3>
          <ul className={styles.plainList}>
            {needReview.map((item) => (
              <li key={item.skillId}>{item.title}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {strong.length > 0 ? (
        <Card padding="sm">
          <h3>Сильные навыки</h3>
          <ul className={styles.plainList}>
            {strong.map((item) => (
              <li key={item.skillId}>{item.title}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h3>Время тренировки</h3>
        <p>{formatDuration(summary.durationMs)}</p>
      </Card>

      {notice ? <p className={styles.notice}>{notice}</p> : null}

      <div className={styles.actions}>
        {session?.mode === 'diagnostic' ? (
          <Button fullWidth onClick={() => navigate('/')}>
            К подготовке
          </Button>
        ) : (
          <>
            <Button fullWidth disabled={summary.incorrect === 0} onClick={handleMistakes}>
              Разобрать ошибки
            </Button>
            {needReview.length > 0 ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate(subject ? `/train?subject=${subject}&mode=weak` : '/train')}
              >
                Подтянуть эти темы
              </Button>
            ) : null}
            <Button variant="secondary" fullWidth onClick={handleContinue}>
              Ещё одна тренировка
            </Button>
            <Button variant="secondary" fullWidth onClick={handleSubjectProgress}>
              К прогрессу предмета
            </Button>
          </>
        )}
        {session?.mode === 'diagnostic' && summary.incorrect > 0 ? (
          <Button variant="secondary" fullWidth onClick={handleMistakes}>
            Разобрать ошибки
          </Button>
        ) : null}
      </div>
    </div>
  );
}
