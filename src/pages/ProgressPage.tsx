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
import { getSkillMasteryView } from '../services/skillMasteryView';
import { getLearningPathView, type LearningPathMarker } from '../services/learningPathView';
import { useUserStore } from '../store/useUserStore';
import type { MasteryStatus } from '../types';
import { Card, ProgressBar } from '../components/ui';
import styles from './ProgressPage.module.css';

const STATUS_CLASS: Record<MasteryStatus, string> = {
  new: styles.statusNew,
  not_mastered: styles.statusNotMastered,
  developing: styles.statusDeveloping,
  confident: styles.statusConfident,
  mastered: styles.statusMastered,
};

const BAR_COLOR: Record<MasteryStatus, string> = {
  new: '#c5cad6',
  not_mastered: 'var(--color-danger)',
  developing: 'var(--color-warning)',
  confident: 'var(--color-accent)',
  mastered: 'var(--color-success)',
};

const PATH_MARK: Record<LearningPathMarker, string> = {
  completed: '✓',
  current: '●',
  ahead: '○',
};

const PATH_CLASS: Record<LearningPathMarker, string> = {
  completed: styles.pathCompleted,
  current: styles.pathCurrentNode,
  ahead: styles.pathAhead,
};

export function ProgressPage() {
  const profile = useUserStore((state) => state.profile);
  const progress = getChildProgress(
    profile ? localAttemptRecorder.getAll(profile.userId) : [],
    profile?.userId ?? '',
  );
  const skillSections = getSkillMasteryView(progress.mathSkills);
  const learningPath = getLearningPathView(progress.mathSkills);
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
        <p className={styles.kicker}>Ваш путь по математике</p>
        <h2>Путь обучения</h2>
        <p>
          Уже освоенные темы остаются позади, текущая тема находится в центре пути, а новые темы ждут
          впереди.
        </p>
        <div className={styles.path}>
          {learningPath.sections.map((section, index) => (
            <div key={section.sectionId} className={styles.pathStep}>
              <div className={`${styles.pathNode} ${PATH_CLASS[section.marker]}`}>
                <span className={styles.pathMark} aria-hidden="true">
                  {PATH_MARK[section.marker]}
                </span>
                <strong>{section.title}</strong>
              </div>
              {section.marker === 'current'
                ? section.skills.map((item) =>
                    item.isCurrent ? (
                      <Card key={item.skillId} padding="sm" className={styles.pathCurrent}>
                        <div className={styles.skillHead}>
                          <strong>{item.title}</strong>
                          <b>{item.scoreLabel}</b>
                        </div>
                        <div className={styles.skillMeta}>
                          <span className={`${styles.status} ${STATUS_CLASS[item.status]}`}>
                            {item.statusLabel}
                          </span>
                          <span className={styles.here}>Вы сейчас здесь</span>
                        </div>
                      </Card>
                    ) : (
                      <div key={item.skillId} className={styles.pathSkill}>
                        <span>{item.title}</span>
                        <span>{item.statusLabel}</span>
                      </div>
                    ),
                  )
                : null}
              {index < learningPath.sections.length - 1 ? (
                <div className={styles.pathLine} aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

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

      <section>
        <h2>Навыки</h2>
        <div className={styles.skills}>
          {skillSections.map((section) => (
            <div key={section.sectionId} className={styles.skillGroup}>
              <h3>{section.title}</h3>
              {section.skills.map((item) => (
                <Card key={item.skillId} padding="sm" className={styles.skillCard}>
                  <div className={styles.skillHead}>
                    <strong>{item.title}</strong>
                    <b>{item.scoreLabel}</b>
                  </div>
                  <ProgressBar
                    value={item.progressValue}
                    color={BAR_COLOR[item.status]}
                    ariaLabel={item.title}
                  />
                  <div className={styles.skillMeta}>
                    <span className={`${styles.status} ${STATUS_CLASS[item.status]}`}>
                      {item.statusLabel}
                    </span>
                    {item.attemptsCount > 0 ? (
                      <span className={styles.attempts}>{item.attemptsCount} заданий</span>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
