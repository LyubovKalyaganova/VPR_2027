import { Link } from 'react-router-dom';
import { SUBJECTS } from '../data/demo/subjects';
import { localAttemptRecorder } from '../db';
import {
  formatScoreCompact,
  getChildProgress,
  getSubjectStatusLabel,
} from '../services/progressService';
import { useUserStore } from '../store/useUserStore';
import { Card, ProgressBar } from '../components/ui';
import styles from './SubjectsPage.module.css';

export function SubjectsPage() {
  const profile = useUserStore((state) => state.profile);
  const progress = getChildProgress(
    profile ? localAttemptRecorder.getAll(profile.userId) : [],
    profile?.userId ?? '',
  );

  return (
    <div className={styles.page}>
      <p className={styles.lead}>Выбери предмет, чтобы посмотреть карту навыков и начать тренировку.</p>
      <div className={styles.grid}>
        {SUBJECTS.map((subject) => {
          const score = progress.subjectScores[subject.id];
          return (
            <Link key={subject.id} to={`/subjects/${subject.id}`}>
              <Card className={styles.card}>
                <div className={styles.icon} style={{ background: subject.accent }}>
                  {subject.shortTitle.slice(0, 1)}
                </div>
                <div className={styles.body}>
                  <h2>{subject.title}</h2>
                  <p>{subject.description}</p>
                  <ProgressBar value={score ?? 0} color={subject.accent} ariaLabel={subject.title} />
                  <div className={styles.meta}>
                    <strong>{formatScoreCompact(score)}</strong>
                    <span>{getSubjectStatusLabel(subject.id, progress)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
