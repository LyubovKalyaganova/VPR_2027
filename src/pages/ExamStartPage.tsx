import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Button, Card } from '../components/ui';
import { getExamBlueprint } from '../services/exam/examBlueprints';
import { canBuildExam } from '../services/exam/examTaskSelector';
import { useExamStore } from '../store/useExamStore';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId } from '../types';
import styles from './ExamStartPage.module.css';

function isSubjectId(value: string | undefined): value is SubjectId {
  return ['mathematics', 'russian', 'world', 'reading', 'english'].includes(value ?? '');
}

export function ExamStartPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const createSession = useExamStore((state) => state.createSession);
  const startSession = useExamStore((state) => state.startSession);
  const getActiveForSubject = useExamStore((state) => state.getActiveForSubject);
  const [error, setError] = useState<string | null>(null);

  if (!subjectId || !isSubjectId(subjectId)) {
    return <Navigate to="/subjects" replace />;
  }

  const blueprint = getExamBlueprint(subjectId);
  if (!blueprint) {
    return (
      <div className={styles.page}>
        <Card>
          <h2>ВПР недоступна</h2>
          <p className={styles.note}>Для этого предмета пока нет варианта ВПР.</p>
        </Card>
        <Button fullWidth onClick={() => navigate('/subjects')}>
          К предметам
        </Button>
      </div>
    );
  }

  const buildable = canBuildExam(blueprint);
  const active =
    profile && (getActiveForSubject(profile.userId, subjectId) ?? undefined);

  function handleStart() {
    if (!profile || !buildable) {
      return;
    }
    setError(null);
    if (active?.status === 'in_progress') {
      navigate(`/exam/session/${active.id}`);
      return;
    }
    const sessionId = createSession(profile.userId, subjectId as SubjectId);
    if (!sessionId) {
      setError('Не удалось начать ВПР. Попробуй позже или выбери другой предмет.');
      return;
    }
    startSession(sessionId);
    navigate(`/exam/session/${sessionId}`);
  }

  function handleContinue() {
    if (active) {
      navigate(`/exam/session/${active.id}`);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.hero}>
        <p className={styles.kicker}>Режим ВПР</p>
        <h2>ВПР — {blueprint.title}</h2>
        <p>Тренировочный вариант по структуре ВПР 4 класса. Это не официальный бланк.</p>
      </Card>

      <Card>
        <div className={styles.stats}>
          <div className={styles.statRow}>
            <span>Заданий</span>
            <strong>{blueprint.totalSlots}</strong>
          </div>
          <div className={styles.statRow}>
            <span>Максимальный балл</span>
            <strong>{blueprint.maxScore}</strong>
          </div>
          <div className={styles.statRow}>
            <span>Время</span>
            <strong>{blueprint.durationMinutes} мин</strong>
          </div>
        </div>
      </Card>

      {blueprint.scoringNote ? (
        <Card padding="sm">
          <p className={styles.note}>{blueprint.scoringNote}</p>
        </Card>
      ) : null}

      {!buildable ? (
        <Card padding="sm">
          <p className={styles.warn}>Сейчас недостаточно заданий для полного варианта ВПР.</p>
        </Card>
      ) : null}

      <Card padding="sm">
        <p className={styles.note}>
          После начала запустится таймер. Подсказок нет. Можно вернуться к предыдущим заданиям.
        </p>
      </Card>

      {error ? (
        <Card padding="sm">
          <p className={styles.warn}>{error}</p>
        </Card>
      ) : null}

      <div className={styles.actions}>
        {active?.status === 'in_progress' ? (
          <Button fullWidth onClick={handleContinue}>
            Продолжить ВПР
          </Button>
        ) : (
          <Button fullWidth disabled={!profile || !buildable} onClick={handleStart}>
            Начать ВПР
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={() => navigate(`/subjects/${subjectId}`)}>
          Назад к предмету
        </Button>
      </div>
    </div>
  );
}
