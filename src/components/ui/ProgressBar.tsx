import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  color?: string;
  ariaLabel?: string;
}

export function ProgressBar({ value, color = 'var(--color-accent)', ariaLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className={styles.fill} style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
