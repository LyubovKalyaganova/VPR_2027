import type { ReactNode } from 'react';
import { ProgressBar } from '../ui';
import styles from './TaskShell.module.css';

interface TaskShellProps {
  subjectTitle: string;
  current: number;
  total: number;
  children: ReactNode;
}

export function TaskShell({ subjectTitle, current, total, children }: TaskShellProps) {
  const percent = total === 0 ? 0 : (current / total) * 100;

  return (
    <div className={styles.shell} data-task-progress={`${current}-of-${total}`}>
      <div className={styles.meta}>
        <span className={styles.demo}>DEMO</span>
        <span className={styles.subject}>{subjectTitle}</span>
        <strong>
          {current} из {total}
        </strong>
      </div>
      <ProgressBar value={percent} ariaLabel={`Задание ${current} из ${total}`} />
      {children}
    </div>
  );
}
