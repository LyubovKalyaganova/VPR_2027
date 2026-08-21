import { Link } from 'react-router-dom';
import { SUBJECTS } from '../data/demo/subjects';
import { PROGRESS_LEVELS } from '../data/demo/progress';
import { localAttemptRecorder } from '../db';
import {
  formatScoreCompact,
  formatScoreLabel,
  getChildProgress,
  getProgressLevelIndex,
  getReadinessCaption,
} from '../services/progressService';
import { useUserStore } from '../store/useUserStore';
import { Card, ProgressBar } from '../components/ui';
import styles from './ProgressPage.module.css';

export function ProgressPage() {
  const profile = useUserStore((state) => state.profile);
  const progress = getChildProgress(
    profile ? localAttemptRecorder.getAll(profile.userId) : [],
    profile?.userId ?? '',
  );
  const levelIndex = getProgressLevelIndex(progress);

  return (
    <div className={styles.page}>
      <Card className={styles.overall}>
        <div>
          <p className={styles.kicker}>Общая готовность</p>
          <h2>{formatScoreLabel(progress.mathScore)}</h2>
          <p>{getReadinessCaption(progress)}</p>
        </div>
        <ProgressBar value={progress.mathScore ?? 0} ariaLabel="Общая готовность" />
      </Card>

      <section>
        <h2>Карта прогресса</h2>
        <div className={styles.levels}>
          {PROGRESS_LEVELS.map((level, index) => (
            <div
              key={level.id}
              className={`${styles.level} ${index <= levelIndex ? styles.levelOn : ''}`}
            >
              <span>{index + 1}</span>
              <strong>{level.title}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>По предметам</h2>
        <div className={styles.subjects}>
          {SUBJECTS.map((subject) => {
            const score = progress.subjectScores[subject.id];
            return (
              <Link key={subject.id} to={`/subjects/${subject.id}`}>
                <Card padding="sm" className={styles.subjectRow}>
                  <span className={styles.dot} style={{ background: subject.accent }} />
                  <div>
                    <strong>{subject.title}</strong>
                    <ProgressBar value={score ?? 0} color={subject.accent} ariaLabel={subject.title} />
                  </div>
                  <b>{formatScoreCompact(score)}</b>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Слабые темы</h2>
        <div className={styles.weak}>
          {progress.weakSkills.length === 0 ? (
            <Card padding="sm" className={styles.weakItem}>
              <div>
                <strong>Пока нет слабых тем</strong>
                <span>Они появятся после тренировки по математике</span>
              </div>
            </Card>
          ) : (
            progress.weakSkills.map((item) => (
              <Card key={item.skill.id} padding="sm" className={styles.weakItem}>
                <div>
                  <strong>{item.skill.title}</strong>
                  <span>Рекомендуем потренировать эту тему</span>
                </div>
                <b>{formatScoreCompact(item.mastery.masteryScore)}</b>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
