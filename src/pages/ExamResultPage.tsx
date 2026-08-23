import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { getExamBlueprint } from '../services/exam/examBlueprints';
import { taskRepository } from '../services/taskRepository';
import { useExamStore } from '../store/useExamStore';
import styles from './ExamResultPage.module.css';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ExamResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useExamStore((state) => (sessionId ? state.sessions[sessionId] : undefined));
  const result = session?.result;
  const blueprint = session ? getExamBlueprint(session.subjectId) : undefined;

  if (!sessionId || !session) {
    return <Navigate to="/subjects" replace />;
  }

  if (!result) {
    return (
      <div className={styles.page}>
        <Card>
          <h2>Результат недоступен</h2>
          <p className={styles.note}>Экзамен ещё не завершён или данные повреждены.</p>
        </Card>
        <Button fullWidth onClick={() => navigate(`/subjects/${session.subjectId}`)}>
          К предмету
        </Button>
      </div>
    );
  }

  const statusLabel =
    result.status === 'expired' ? 'Время истекло — экзамен завершён автоматически' : 'ВПР завершена';

  return (
    <div className={styles.page}>
      <Card className={styles.hero}>
        <p className={styles.kicker}>{statusLabel}</p>
        <h2>
          {result.earnedScore} / {result.maxScore}
        </h2>
        <p className={styles.meta}>
          {result.percentage}% · {result.correctCount} верно · {result.incorrectCount} ошибок ·{' '}
          {result.unansweredCount} без ответа
        </p>
        {result.grade ? <p className={styles.meta}>Оценка: {result.grade}</p> : null}
        <p className={styles.meta}>Время: {formatDuration(result.durationMs)}</p>
      </Card>

      <div className={styles.stats}>
        <Card padding="sm">
          <b>{result.correctCount}</b>
          <span>Верно</span>
        </Card>
        <Card padding="sm">
          <b>{result.incorrectCount}</b>
          <span>Ошибок</span>
        </Card>
        <Card padding="sm">
          <b>{result.unansweredCount}</b>
          <span>Без ответа</span>
        </Card>
        <Card padding="sm">
          <b>{result.maxScore}</b>
          <span>Макс. балл</span>
        </Card>
      </div>

      {blueprint?.scoringNote ? (
        <Card padding="sm">
          <p className={styles.note}>{blueprint.scoringNote}</p>
        </Card>
      ) : null}

      <Card>
        <h3>Разбор</h3>
        <div className={styles.breakdown}>
          {result.slotResults.map((slot, index) => {
            const task = taskRepository.getById(slot.taskId);
            const rowClass = !slot.answered
              ? styles.rowSkip
              : slot.isCorrect
                ? styles.rowOk
                : styles.rowBad;
            const mark = !slot.answered ? '—' : slot.isCorrect ? '✓' : '✗';
            return (
              <div key={slot.taskId} className={`${styles.row} ${rowClass}`}>
                <span>
                  №{slot.slotId || index + 1} {mark}{' '}
                  {slot.isCorrect ? 'правильно' : slot.answered ? 'ошибка' : 'нет ответа'}
                  {task?.skill ? ` · ${task.skill}` : ''}
                </span>
                <span>
                  {slot.earnedPoints}/{slot.points}
                </span>
              </div>
            );
          })}
        </div>
        {result.slotResults.some((slot) => slot.trainingAnalog) ? (
          <p className={styles.note}>
            Задания с training analog проверены по цифровому аналогу, не экспертной проверкой.
          </p>
        ) : null}
      </Card>

      <div className={styles.actions}>
        <Button fullWidth onClick={() => navigate(`/subjects/${session.subjectId}`)}>
          К прогрессу предмета
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate(`/exam/${session.subjectId}/start`)}>
          Новая ВПР
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate(`/train?subject=${session.subjectId}`)}>
          Тренировка
        </Button>
      </div>
    </div>
  );
}
