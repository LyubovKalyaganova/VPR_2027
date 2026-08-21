import type { SkillStatus } from '../../types';
import { statusLabel } from '../../data/demo/progress';
import styles from './Badge.module.css';

interface BadgeProps {
  status: SkillStatus;
}

export function Badge({ status }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[status]}`}>{statusLabel(status)}</span>;
}
