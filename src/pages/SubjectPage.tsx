import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { getSubject } from '../data/demo/subjects';
import { localAttemptRecorder } from '../db';
import { SkillProgressCard } from '../components/progress/SkillProgressCard';
import {
  formatScoreCompact,
  formatScoreLabel,
  getChildProgress,
  getSubjectSkillProgress,
  getTopicProgressForSubject,
  getWeakSkillProgress,
} from '../services/progressService';
import { Button, Card, ProgressBar } from '../components/ui';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId } from '../types';
import styles from './SubjectPage.module.css';

function isSubjectId(value: string): value is SubjectId {
  return ['russian', 'mathematics', 'world', 'reading', 'english'].includes(value);
}

function trainPath(subjectId: SubjectId): string {
  return `/train?subject=${subjectId}`;
}

export function SubjectPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const attempts = profile ? localAttemptRecorder.getAll(profile.userId) : [];
  const progress = getChildProgress(attempts, profile?.userId ?? '');

  if (!subjectId || !isSubjectId(subjectId)) {
    return <Navigate to="/subjects" replace />;
  }

  const subject = getSubject(subjectId);
  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }

  const score = progress.subjectScores[subjectId];
  const skills = getSubjectSkillProgress(attempts, profile?.userId ?? '', subjectId);
  const weakSkills = getWeakSkillProgress(skills);
  const weakIds = new Set(weakSkills.map((item) => item.skill.id));
  const topics = getTopicProgressForSubject(attempts, profile?.userId ?? '', subjectId).filter(
    (topic) => topic.score !== null,
  );
  const strong = skills
    .filter((item) => item.mastery.status === 'mastered' || item.mastery.status === 'confident')
    .slice(0, 5);

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

      {weakSkills.length === 0 && skills.every((item) => item.mastery.status === 'new') ? (
        <Card padding="sm">
          <p className={styles.emptyHint}>
            Пока нет истории тренировок по этому предмету. Начните с быстрой или обычной тренировки.
          </p>
        </Card>
      ) : null}

      {weakSkills.length > 0 ? (
        <Card padding="sm">
          <h3 className={styles.sectionTitle}>Нужно повторить</h3>
          <ul className={styles.plainList}>
            {weakSkills.slice(0, 5).map((item) => (
              <li key={item.skill.id}>
                {item.skill.title} · {formatScoreCompact(item.mastery.masteryScore)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {strong.length > 0 ? (
        <Card padding="sm">
          <h3 className={styles.sectionTitle}>Сильные стороны</h3>
          <ul className={styles.plainList}>
            {strong.map((item) => (
              <li key={item.skill.id}>
                {item.skill.title} · {formatScoreCompact(item.mastery.masteryScore)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {topics.length > 0 ? (
        <Card padding="sm">
          <h3 className={styles.sectionTitle}>Темы</h3>
          <div className={styles.topicList}>
            {topics.map((topic) => (
              <div key={topic.topicId} className={styles.topicRow}>
                <div className={styles.skillHead}>
                  <span>{topic.title}</span>
                  <b>{formatScoreCompact(topic.score)}</b>
                </div>
                <ProgressBar value={topic.score ?? 0} color={subject.accent} ariaLabel={topic.topicId} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className={styles.list}>
        {skills.map((item) => (
          <SkillProgressCard
            key={item.skill.id}
            title={item.skill.title}
            mastery={item.mastery}
            accent={subject.accent}
            recommend={weakIds.has(item.skill.id)}
          />
        ))}
      </div>

      <Button
        fullWidth
        onClick={() => {
          if (!profile) {
            return;
          }
          navigate(trainPath(subjectId));
        }}
      >
        Тренировать этот предмет
      </Button>
      {weakSkills.length > 0 ? (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            if (!profile) {
              return;
            }
            navigate(`${trainPath(subjectId)}&mode=weak`);
          }}
        >
          Тренировать слабые места
        </Button>
      ) : null}
      <Button
        variant="secondary"
        fullWidth
        onClick={() => {
          navigate(`/exam/${subjectId}/start`);
        }}
      >
        Пройти ВПР
      </Button>
    </div>
  );
}
