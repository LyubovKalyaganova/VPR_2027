import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getSkillsBySubject, getSubject } from '../data/demo/subjects';
import { localAttemptRecorder } from '../db';
import {
  formatScoreCompact,
  formatScoreLabel,
  getChildProgress,
  masteryStatusLabel,
} from '../services/progressService';
import { Button, Card, ProgressBar } from '../components/ui';
import { useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId } from '../types';
import styles from './SubjectPage.module.css';

function isSubjectId(value: string): value is SubjectId {
  return ['russian', 'mathematics', 'world', 'reading', 'english'].includes(value);
}

export function SubjectPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const startMath = useTrainingStore((state) => state.startMath);
  const progress = getChildProgress(
    profile ? localAttemptRecorder.getAll(profile.userId) : [],
    profile?.userId ?? '',
  );

  if (!subjectId || !isSubjectId(subjectId)) {
    return <Navigate to="/subjects" replace />;
  }

  const subject = getSubject(subjectId);
  const score = progress.subjectScores[subjectId];
  const mathSkills = subjectId === 'mathematics' ? progress.mathSkills : null;
  const otherSkills = mathSkills ? [] : getSkillsBySubject(subjectId);
  const weakIds = new Set(progress.weakSkills.map((item) => item.skill.id));

  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }

  return (
    <div className={styles.page}>
      <Card className={styles.summary}>
        <div>
          <p className={styles.kicker}>Карта навыков</p>
          <h2>{subject.title}</h2>
          <p>{subject.description}</p>
        </div>
        <strong>{formatScoreLabel(score)}</strong>
      </Card>

      <div className={styles.list}>
        {mathSkills
          ? mathSkills.map((item) => {
              const recommend = weakIds.has(item.skill.id);
              return (
                <Card key={item.skill.id} padding="sm" className={styles.skill}>
                  <div className={styles.skillHead}>
                    <h3>{item.skill.title}</h3>
                    <b>{formatScoreCompact(item.mastery.masteryScore)}</b>
                  </div>
                  <ProgressBar
                    value={item.mastery.masteryScore ?? 0}
                    color={subject.accent}
                    ariaLabel={item.skill.title}
                  />
                  <div className={styles.skillMeta}>
                    <span>{masteryStatusLabel(item.mastery.status)}</span>
                    {recommend ? <span className={styles.recommend}>Рекомендуем потренировать эту тему</span> : null}
                  </div>
                </Card>
              );
            })
          : otherSkills.map((skill) => (
              <Card key={skill.id} padding="sm" className={styles.skill}>
                <div className={styles.skillHead}>
                  <h3>{skill.title}</h3>
                  <b>—</b>
                </div>
                <ProgressBar value={0} color={subject.accent} ariaLabel={skill.title} />
                <div className={styles.skillMeta}>
                  <span>Нет данных</span>
                </div>
              </Card>
            ))}
      </div>

      {subjectId === 'mathematics' || subjectId === 'russian' || subjectId === 'world' ? (
        <Button
          fullWidth
          onClick={() => {
            if (!profile) {
              return;
            }
            if (subjectId === 'russian') {
              navigate('/train?subject=russian');
              return;
            }
            if (subjectId === 'world') {
              navigate('/train?subject=world');
              return;
            }
            const sessionId = startMath(profile.userId, 'quick');
            navigate(`/train/session/${sessionId}`);
          }}
        >
          Тренировать этот предмет
        </Button>
      ) : (
        <Link to="/train">
          <Button fullWidth>Тренировать этот предмет</Button>
        </Link>
      )}
    </div>
  );
}
