import { collectHints, formatCorrectAnswer } from '../../engine';
import type { Task } from '../../types';
import { Card } from '../ui';
import styles from './FeedbackPanel.module.css';

interface FeedbackPanelProps {
  task: Task;
  isCorrect: boolean;
  hintsUsed: number;
}

export function FeedbackPanel({ task, isCorrect, hintsUsed }: FeedbackPanelProps) {
  const usedHints = collectHints(task).slice(0, hintsUsed);

  return (
    <Card className={`${styles.panel} ${isCorrect ? styles.ok : styles.bad}`}>
      <h2>{isCorrect ? 'Правильно!' : 'Давай разберёмся.'}</h2>
      <p>
        <strong>Правильный ответ:</strong> {formatCorrectAnswer(task)}
      </p>
      <p>{task.explanation}</p>
      {usedHints.length > 0 ? (
        <p>
          <strong>Подсказка:</strong> {usedHints[usedHints.length - 1]}
        </p>
      ) : null}
    </Card>
  );
}
