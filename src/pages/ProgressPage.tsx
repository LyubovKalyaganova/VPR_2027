import { Link } from 'react-router-dom';
import { SUBJECTS } from '../data/demo/subjects';
import { visibleSubjects } from '../data/taxonomy/catalog';
import { PROGRESS_LEVELS } from '../data/demo/progress';
import { localAttemptRecorder } from '../db';
import {
  formatScoreCompact,
  formatScoreLabel,
  getChildProgress,
  getOverallSubjectScore,
  getProgressLevelIndex,
  getReadinessCaption,
  getSubjectSkillProgress,
  getWeakSkillProgress,
} from '../services/progressService';
import { getSkillMasteryView } from '../services/skillMasteryView';
import { getLearningPathView, type LearningPathMarker } from '../services/learningPathView';
import { useUserStore } from '../store/useUserStore';
import type { MasteryStatus, SubjectId } from '../types';
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

const SUBJECT_IDS: SubjectId[] = ['mathematics', 'russian', 'world', 'reading', 'english'];

export function ProgressPage() {
  const profile = useUserStore((state) => state.profile);
  const userId = profile?.userId ?? '';
  const attempts = profile ? localAttemptRecorder.getAll(userId) : [];
  const progress = getChildProgress(attempts, userId);
  const subjects = visibleSubjects(profile?.selectedSubjects);
  const selectedIds = subjects.map((subject) => subject.id);
  const overallScore = getOverallSubjectScore(progress.subjectScores, selectedIds) ?? progress.mathScore;
  const skillSections = getSkillMasteryView(progress.mathSkills);
  const learningPath = getLearningPathView(progress.mathSkills);
  const levelIndex = getProgressLevelIndex(progress);
  const hasAttempts = progress.stats.totalAttempts > 0;
  const hasMathData = progress.mathSkills.some((item) => item.mastery.status !== 'new');

  return (
    <div className={styles.page}>
      {!hasAttempts ? (
        <Card padding="sm" className={styles.emptyState}>
          <h2>Ты ещё не тренировался</h2>
          <p>Начни с любого предмета — здесь появятся результаты и темы, которые надо подтянуть.</p>
          <Link to="/subjects" className={styles.emptyLink}>
            Выбрать предмет
          </Link>
        </Card>
      ) : null}

      <Card className={styles.overall}>
        <div>
          <p className={styles.kicker}>Общая готовность</p>
          <h2>{formatScoreLabel(overallScore)}</h2>
          <p>{getReadinessCaption(progress, selectedIds)}</p>
        </div>
        <ProgressBar value={overallScore ?? 0} ariaLabel="Общая готовность" />
      </Card>

      <section className={styles.panel}>
        <h2>По предметам</h2>
        <div className={styles.subjects}>
          {subjects.map((subject) => {
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

      <section className={styles.panel}>
        <h2>Надо подтянуть</h2>
        <div className={styles.weak}>
          {progress.weakSkills.length === 0 ? (
            <Card padding="sm" className={styles.weakItem}>
              <div>
                <strong>Пока подтягивать нечего</strong>
                <span>Темы появятся после тренировок, если что-то пойдёт хуже</span>
              </div>
            </Card>
          ) : (
            progress.weakSkills
              .filter((item) => selectedIds.includes(item.skill.subjectId))
              .slice(0, 8)
              .map((item) => {
              const subject = SUBJECTS.find((entry) => entry.id === item.skill.subjectId);
              return (
                <Card key={item.skill.id} padding="sm" className={styles.weakItem}>
                  <div>
                    <strong>{item.skill.title}</strong>
                    <span>
                      {subject?.title ?? 'Предмет'} · рекомендуем потренировать
                    </span>
                  </div>
                  <b>{formatScoreCompact(item.mastery.masteryScore)}</b>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {hasMathData ? (
        <section className={styles.spanAll}>
          <p className={styles.kicker}>Путь по математике</p>
          <h2>Что уже освоено</h2>
          <p className={styles.sectionLead}>
            Освоенные темы остаются позади, текущая — в центре, новые ждут впереди.
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
                            <span className={styles.here}>Ты сейчас здесь</span>
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
      ) : null}

      {hasMathData && levelIndex >= 0 ? (
        <section className={styles.panel}>
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
      ) : null}

      {hasMathData ? (
        <section className={styles.spanAll}>
          <h2>Навыки · математика</h2>
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
      ) : null}

      {SUBJECT_IDS.filter((id) => id !== 'mathematics' && selectedIds.includes(id)).map((subjectId) => {
        const skills = getSubjectSkillProgress(attempts, userId, subjectId);
        const practiced = skills.some((item) => item.mastery.status !== 'new');
        if (!practiced) {
          return null;
        }
        const weak = getWeakSkillProgress(skills).slice(0, 3);
        const subject = SUBJECTS.find((entry) => entry.id === subjectId);
        return (
          <section key={subjectId} className={styles.panel}>
            <h2>Навыки · {subject?.title ?? subjectId}</h2>
            {weak.length > 0 ? (
              <Card padding="sm" className={styles.weakItem}>
                <p className={styles.sectionLead}>Стоит повторить: {weak.map((item) => item.skill.title).join(', ')}</p>
              </Card>
            ) : (
              <Card padding="sm" className={styles.weakItem}>
                <p className={styles.sectionLead}>Пока подтягивать нечего — так держать!</p>
              </Card>
            )}
          </section>
        );
      })}
    </div>
  );
}
