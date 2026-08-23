import { Card, ProgressBar } from '../ui';
import type { SkillMastery } from '../../types';
import { formatScoreCompact, masteryStatusLabel } from '../../services/progressService';
import styles from './SkillProgressCard.module.css';

export type SkillProgressCardProps = {
  title: string;
  mastery: SkillMastery;
  accent: string;
  recommend?: boolean;
};

export function SkillProgressCard({ title, mastery, accent, recommend = false }: SkillProgressCardProps) {
  return (
    <Card padding="sm" className={styles.skill}>
      <div className={styles.skillHead}>
        <h3>{title}</h3>
        <b>{formatScoreCompact(mastery.masteryScore)}</b>
      </div>
      <ProgressBar value={mastery.masteryScore ?? 0} color={accent} ariaLabel={title} />
      <div className={styles.skillMeta}>
        <span>{masteryStatusLabel(mastery.status)}</span>
        {mastery.attemptsCount > 0 ? <span>{mastery.attemptsCount} попыток</span> : null}
        {recommend ? <span className={styles.recommend}>Рекомендуем потренировать</span> : null}
      </div>
    </Card>
  );
}
