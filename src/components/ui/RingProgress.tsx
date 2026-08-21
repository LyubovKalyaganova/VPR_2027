import styles from './RingProgress.module.css';

interface RingProgressProps {
  value: number | null;
  size?: number;
  stroke?: number;
  color?: string;
}

export function RingProgress({
  value,
  size = 132,
  stroke = 10,
  color = 'var(--color-accent)',
}: RingProgressProps) {
  const hasValue = value !== null;
  const clamped = hasValue ? Math.max(0, Math.min(100, value)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eef0f6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.value}>
        <strong>{hasValue ? `${clamped}%` : '—'}</strong>
        <span>готовность</span>
      </div>
    </div>
  );
}
