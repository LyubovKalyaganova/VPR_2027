import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { taskRepository } from '../services/taskRepository';
import { useUserStore } from '../store/useUserStore';
import { useTrainingStore } from '../store/useTrainingStore';
import type { TrainingMode } from '../types';
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
      return 'DEMO-тренировка';
    case 'daily':
      return 'Ежедневный план';
    case 'weak':
      return 'Слабые места';
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
    case 'topic':
      return topicTitle ? `Тематическая тренировка · ${topicTitle}` : 'Тематическая тренировка';
    default:
      return 'Тренировка';
  }
}

export function TrainResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const summary = useTrainingStore((state) => (sessionId ? state.summaries[sessionId] : undefined));
  const session = useTrainingStore((state) => (sessionId ? state.sessions[sessionId] : undefined));
  const startMistakeReview = useTrainingStore((state) => state.startMistakeReview);
  const topicTask = session?.mode === 'topic' && session.taskIds[0]
    ? taskRepository.getById(session.taskIds[0])
    : undefined;
  const title = resultTitle(session?.mode, topicTask?.topic);

  if (!sessionId || !summary) {
    return <Navigate to="/train" replace />;
  }

  function handleMistakes() {
    if (!profile || !sessionId) {
      return;
    }
    const nextId = startMistakeReview(profile.userId, sessionId);
    if (nextId) {
      navigate(`/train/session/${nextId}`);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.hero}>
        <p className={styles.kicker}>{title}</p>
        <h2>{summary.percent}%</h2>
        <p>Так пока выглядит результат занятия. Это учебный набор, не вариант ВПР.</p>
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

      <Card>
        <h3>Время тренировки</h3>
        <p>{formatDuration(summary.durationMs)}</p>
      </Card>

      <div className={styles.actions}>
        <Button fullWidth disabled={summary.incorrect === 0} onClick={handleMistakes}>
          Разобрать ошибки
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate('/train')}>
          Вернуться к тренировке
        </Button>
      </div>
    </div>
  );
}
