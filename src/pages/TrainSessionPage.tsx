import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { FeedbackPanel } from '../components/feedback';
import { AnswerArea, HintPanel, TaskPrompt, TaskShell } from '../components/task';
import { Button } from '../components/ui';
import { collectHints } from '../engine';
import { getSubject } from '../data/demo/subjects';
import { taskEngine, useTrainingStore } from '../store/useTrainingStore';
import styles from './TrainSessionPage.module.css';

export function TrainSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useTrainingStore((state) => (sessionId ? state.sessions[sessionId] : undefined));
  const setAnswer = useTrainingStore((state) => state.setAnswer);
  const useHint = useTrainingStore((state) => state.useHint);
  const submit = useTrainingStore((state) => state.submit);
  const next = useTrainingStore((state) => state.next);

  if (!sessionId || !session) {
    return <Navigate to="/train" replace />;
  }

  if (session.phase === 'completed') {
    return <Navigate to={`/train/result/${sessionId}`} replace />;
  }

  let task;
  try {
    task = taskEngine.getCurrentTask(session);
  } catch {
    return <Navigate to="/train" replace />;
  }
  const presentation = taskEngine.getPresentation(session);
  const subject = getSubject(task.subject);
  const hints = collectHints(task);
  const canHint = session.phase === 'answering' && session.hintsUsedOnCurrent < hints.length;
  const canCheck = taskEngine.canSubmit(session);
  const isLast = session.currentIndex === session.taskIds.length - 1;

  function handleNext() {
    const updated = next(sessionId!);
    if (updated?.phase === 'completed') {
      navigate(`/train/result/${sessionId}`);
    }
  }

  return (
    <TaskShell
      subjectTitle={subject?.title ?? 'Тренировка'}
      current={session.currentIndex + 1}
      total={session.taskIds.length}
      showDemoBadge={session.mode === 'demo'}
      showCheckBadge={session.mode === 'diagnostic'}
    >
      <div className={styles.body} data-task-type={task.taskType} data-task-id={task.id}>
        <TaskPrompt task={task} />
        <AnswerArea
          task={task}
          presentation={presentation}
          answer={session.currentAnswer}
          disabled={session.phase !== 'answering'}
          onChange={(answer) => setAnswer(sessionId, answer)}
        />
        <HintPanel hints={hints} usedCount={session.hintsUsedOnCurrent} />
        {session.phase === 'feedback' && session.currentIsCorrect !== null ? (
          <FeedbackPanel task={task} isCorrect={session.currentIsCorrect} hintsUsed={session.hintsUsedOnCurrent} />
        ) : null}
        <div className={styles.actions}>
          {session.phase === 'answering' ? (
            <>
              <Button fullWidth disabled={!canCheck} onClick={() => submit(sessionId)}>
                Проверить
              </Button>
              <Button variant="secondary" fullWidth disabled={!canHint} onClick={() => useHint(sessionId)}>
                Подсказка
              </Button>
            </>
          ) : (
            <Button fullWidth onClick={handleNext}>
              {isLast ? 'К результату' : 'Дальше'}
            </Button>
          )}
        </div>
      </div>
    </TaskShell>
  );
}
