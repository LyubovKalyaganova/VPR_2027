import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnswerArea, TaskPrompt } from '../components/task';
import { Button, Card, Modal } from '../components/ui';
import { emptyAnswer, isAnswerReady } from '../engine/answerState';
import { taskRepository } from '../services/taskRepository';
import { countAnsweredTasks } from '../services/exam/examSessionEngine';
import {
  formatExamCountdown,
  getExamRemainingMs,
  isExamExpired,
  isExamTimeLow,
} from '../services/exam/examTimer';
import { assertExamBlueprint } from '../services/exam/examBlueprints';
import { useExamStore } from '../store/useExamStore';
import styles from './ExamSessionPage.module.css';

export function ExamSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useExamStore((state) => (sessionId ? state.sessions[sessionId] : undefined));
  const setAnswer = useExamStore((state) => state.setAnswer);
  const setCurrentIndex = useExamStore((state) => state.setCurrentIndex);
  const completeSession = useExamStore((state) => state.completeSession);
  const expireSession = useExamStore((state) => state.expireSession);
  const syncExpiry = useExamStore((state) => state.syncExpiry);
  const [now, setNow] = useState(Date.now());
  const [confirmFinish, setConfirmFinish] = useState(false);

  const tasks = useMemo(() => {
    if (!session) {
      return [];
    }
    return session.taskIds
      .map((id) => taskRepository.getById(id))
      .filter((task): task is NonNullable<typeof task> => Boolean(task));
  }, [session]);

  const blueprint = session ? assertExamBlueprint(session.subjectId) : null;
  const currentTask = session ? tasks[session.currentIndex] : undefined;
  const presentation = currentTask ? session!.presentations[currentTask.id] ?? {} : {};

  const remainingMs = session?.endTime ? getExamRemainingMs(session.endTime, now) : 0;
  const timeLow = blueprint ? isExamTimeLow(remainingMs, blueprint.durationMinutes) : false;

  const handleExpire = useCallback(() => {
    if (!sessionId) {
      return;
    }
    expireSession(sessionId);
    navigate(`/exam/result/${sessionId}`);
  }, [expireSession, navigate, sessionId]);

  useEffect(() => {
    if (!sessionId || !session || session.status !== 'in_progress') {
      return;
    }
    const tick = window.setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      if (session.endTime && isExamExpired(session.endTime, currentNow)) {
        syncExpiry(sessionId);
        handleExpire();
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [handleExpire, session, sessionId, syncExpiry]);

  if (!sessionId || !session) {
    return <Navigate to="/subjects" replace />;
  }

  if (session.status === 'completed' || session.status === 'expired') {
    return <Navigate to={`/exam/result/${sessionId}`} replace />;
  }

  if (session.status === 'not_started') {
    return <Navigate to={`/exam/${session.subjectId}/start`} replace />;
  }

  if (!currentTask || !blueprint) {
    return (
      <div className={styles.page}>
        <Card>
          <p>Не удалось загрузить задания экзамена.</p>
        </Card>
        <Button fullWidth onClick={() => navigate(`/subjects/${session.subjectId}`)}>
          К предмету
        </Button>
      </div>
    );
  }

  const answeredCount = countAnsweredTasks(session, tasks);
  const unanswered = tasks.length - answeredCount;

  function handleFinishConfirm() {
    setConfirmFinish(false);
    const finished = completeSession(sessionId!);
    if (finished) {
      navigate(`/exam/result/${sessionId}`);
    }
  }

  function isSlotAnswered(index: number): boolean {
    const task = tasks[index];
    if (!task) {
      return false;
    }
    return isAnswerReady(task, session!.answers[task.id]);
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.timerBar} ${timeLow ? styles.timerLow : ''}`}>
        <span>ВПР · {blueprint.title}</span>
        <strong>{formatExamCountdown(remainingMs)}</strong>
      </div>

      <div className={styles.nav} aria-label="Навигация по заданиям">
        {tasks.map((task, index) => (
          <button
            key={task.id}
            type="button"
            className={`${styles.navBtn} ${index === session.currentIndex ? styles.navBtnCurrent : ''} ${isSlotAnswered(index) ? styles.navBtnAnswered : ''}`}
            onClick={() => setCurrentIndex(sessionId, index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <Card>
        <p>
          Задание {session.currentIndex + 1} из {tasks.length}
        </p>
      </Card>

      <div className={styles.body} data-task-type={currentTask.taskType}>
        <TaskPrompt task={currentTask} />
        <AnswerArea
          task={currentTask}
          presentation={presentation}
          answer={session.answers[currentTask.id] ?? emptyAnswer(currentTask)}
          disabled={false}
          onChange={(answer) => setAnswer(sessionId, currentTask.id, answer)}
        />
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          fullWidth
          disabled={session.currentIndex === 0}
          onClick={() => setCurrentIndex(sessionId, session.currentIndex - 1)}
        >
          Назад
        </Button>
        {session.currentIndex < tasks.length - 1 ? (
          <Button fullWidth onClick={() => setCurrentIndex(sessionId, session.currentIndex + 1)}>
            Дальше
          </Button>
        ) : (
          <Button fullWidth onClick={() => setConfirmFinish(true)}>
            Завершить ВПР
          </Button>
        )}
      </div>

      <Modal
        open={confirmFinish}
        title="Завершить ВПР?"
        confirmLabel="Завершить"
        cancelLabel="Продолжить"
        onClose={() => setConfirmFinish(false)}
        onConfirm={handleFinishConfirm}
      >
        {unanswered > 0 ? (
          <p>Ты ответил не на все задания ({unanswered} без ответа). Завершить ВПР?</p>
        ) : (
          <p>Все задания заполнены. Завершить ВПР?</p>
        )}
      </Modal>
    </div>
  );
}
