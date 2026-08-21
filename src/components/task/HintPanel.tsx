import { Card } from '../ui';
import styles from './HintPanel.module.css';

interface HintPanelProps {
  hints: string[];
  usedCount: number;
}

export function HintPanel({ hints, usedCount }: HintPanelProps) {
  if (usedCount === 0) {
    return null;
  }

  return (
    <Card padding="sm" className={styles.panel}>
      {hints.slice(0, usedCount).map((hint, index) => (
        <p key={hint}>
          <strong>Подсказка {index + 1}.</strong> {hint}
        </p>
      ))}
    </Card>
  );
}
