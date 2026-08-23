import { getPassage } from '../../data/texts/demoPassages';
import type { Task } from '../../types';
import { Card } from '../ui';
import styles from './TaskPrompt.module.css';

interface TaskPromptProps {
  task: Task;
}

export function TaskPrompt({ task }: TaskPromptProps) {
  const passage = task.passage ?? getPassage(task.textId);
  const imageSrc = task.image?.trim() ? task.image : null;

  return (
    <div className={styles.wrap}>
      {passage ? <Card className={styles.passage}>{passage}</Card> : null}
      {imageSrc ? (
        <img src={imageSrc} alt="Иллюстрация к заданию" className={styles.image} />
      ) : null}
      <p className={styles.question}>{task.question}</p>
    </div>
  );
}
