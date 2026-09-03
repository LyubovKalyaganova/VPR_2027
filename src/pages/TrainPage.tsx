import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { MATH_TOPICS, MATH_SKILLS } from '../data/taxonomy/math';
import { RUSSIAN_TOPICS, RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { WORLD_TOPICS, WORLD_SKILLS } from '../data/taxonomy/world';
import { ENGLISH_TOPICS, ENGLISH_SKILLS } from '../data/taxonomy/english';
import { READING_TOPICS, READING_SKILLS } from '../data/taxonomy/literaryReading';
import { localAttemptRecorder } from '../db';
import { visibleSubjects } from '../data/taxonomy/catalog';
import {
  curriculumProgressLabel,
  getUnlockedSkillIds,
  resolveSchoolMonth,
} from '../services/schoolCurriculum';
import { taskRepository } from '../services/taskRepository';
import { selectDueSkills, useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import type { TrainingMode } from '../types';
import {
  examModeForSubject,
  parseTrainSubject,
  subjectLabel,
  subjectTitle,
  trainingModesForSubject,
  type TrainSubject,
} from './trainSubject';
import styles from './TrainPage.module.css';

function isWeightedStartMode(value: TrainingMode): value is 'quick' | 'normal' | 'random' {
  return value === 'quick' || value === 'normal' || value === 'random';
}

function taskCountByTopic(subject: TrainSubject, topicId: string): number {
  return taskRepository.getByTopic(topicId).filter((task) => task.subject === subject).length;
}

function taskCountLabel(count: number): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) {
    return `${count} заданий`;
  }
  if (last === 1) {
    return `${count} задание`;
  }
  if (last >= 2 && last <= 4) {
    return `${count} задания`;
  }
  return `${count} заданий`;
}

export function TrainPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = parseTrainSubject(searchParams.get('subject'));
  const initialMode = searchParams.get('mode');
  const profile = useUserStore((state) => state.profile);
  const visibleIds = visibleSubjects(profile?.selectedSubjects).map((item) => item.id);
  const subject = visibleIds.includes(requested) ? requested : parseTrainSubject(visibleIds[0]);
  const startDemo = useTrainingStore((state) => state.startDemo);
  const startMath = useTrainingStore((state) => state.startMath);
  const startRussian = useTrainingStore((state) => state.startRussian);
  const startWorld = useTrainingStore((state) => state.startWorld);
  const startLiteraryReading = useTrainingStore((state) => state.startLiteraryReading);
  const startEnglish = useTrainingStore((state) => state.startEnglish);
  const startMathTopic = useTrainingStore((state) => state.startMathTopic);
  const startRussianTopic = useTrainingStore((state) => state.startRussianTopic);
  const startWorldTopic = useTrainingStore((state) => state.startWorldTopic);
  const startLiteraryReadingTopic = useTrainingStore((state) => state.startLiteraryReadingTopic);
  const startEnglishTopic = useTrainingStore((state) => state.startEnglishTopic);
  const startWeak = useTrainingStore((state) => state.startWeak);
  const startRussianWeak = useTrainingStore((state) => state.startRussianWeak);
  const startWorldWeak = useTrainingStore((state) => state.startWorldWeak);
  const startLiteraryReadingWeak = useTrainingStore((state) => state.startLiteraryReadingWeak);
  const startEnglishWeak = useTrainingStore((state) => state.startEnglishWeak);
  const startReview = useTrainingStore((state) => state.startReview);
  const startDaily = useTrainingStore((state) => state.startDaily);
  const startMistakes = useTrainingStore((state) => state.startMistakes);
  const [selected, setSelected] = useState<TrainingMode>(() => {
    if (initialMode === 'weak' || initialMode === 'topic' || initialMode === 'random') {
      return initialMode;
    }
    return 'quick';
  });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trainingModes = useMemo(() => trainingModesForSubject(subject), [subject]);
  const examMode = useMemo(() => examModeForSubject(subject), [subject]);
  const schoolMonth = resolveSchoolMonth(profile?.schoolMonth);
  const unlockedSkillIds = useMemo(
    () => new Set(getUnlockedSkillIds(subject, schoolMonth)),
    [subject, schoolMonth],
  );
  const allTopics =
    subject === 'russian'
      ? RUSSIAN_TOPICS
      : subject === 'world'
        ? WORLD_TOPICS
        : subject === 'reading'
          ? READING_TOPICS
          : subject === 'english'
            ? ENGLISH_TOPICS
            : MATH_TOPICS;
  const topics = useMemo(() => {
    const subjectSkills =
      subject === 'russian'
        ? RUSSIAN_SKILLS
        : subject === 'world'
          ? WORLD_SKILLS
          : subject === 'reading'
            ? READING_SKILLS
            : subject === 'english'
              ? ENGLISH_SKILLS
              : MATH_SKILLS;
    return allTopics.filter((topic) =>
      subjectSkills.some((skill) => skill.topicId === topic.id && unlockedSkillIds.has(skill.id)),
    );
  }, [allTopics, subject, unlockedSkillIds]);

  const selectedTopicCount = selectedTopicId ? taskCountByTopic(subject, selectedTopicId) : 0;
  const canStartTopic =
    Boolean(profile) && selected === 'topic' && selectedTopicId !== null && selectedTopicCount > 0;
  const canStartWeighted = Boolean(profile) && isWeightedStartMode(selected);
  const canStartWeak = Boolean(profile) && selected === 'weak';
  const canStartReview = Boolean(profile) && selected === 'review';
  const canStartDaily = Boolean(profile) && selected === 'daily';
  const canStartMistakes = Boolean(profile) && selected === 'mistakes';
  const canStart =
    selected === 'topic'
      ? canStartTopic
      : selected === 'weak'
        ? canStartWeak
        : selected === 'review'
          ? canStartReview
          : selected === 'daily'
            ? canStartDaily
            : selected === 'mistakes'
              ? canStartMistakes
              : canStartWeighted;

  function handleSubjectChange(next: TrainSubject) {
    setNotice(null);
    setSelectedTopicId(null);
    setSelected('quick');
    setSearchParams({ subject: next });
  }

  function handleSelectMode(modeId: TrainingMode) {
    setSelected(modeId);
    setNotice(null);
    if (modeId !== 'topic') {
      setSelectedTopicId(null);
    }
  }

  function handleStart() {
    if (!profile) {
      return;
    }
    if (selected === 'topic') {
      if (!selectedTopicId || selectedTopicCount === 0) {
        return;
      }
      const sessionId =
        subject === 'russian'
          ? startRussianTopic(profile.userId, selectedTopicId)
          : subject === 'world'
            ? startWorldTopic(profile.userId, selectedTopicId)
            : subject === 'reading'
              ? startLiteraryReadingTopic(profile.userId, selectedTopicId)
              : subject === 'english'
                ? startEnglishTopic(profile.userId, selectedTopicId)
                : startMathTopic(profile.userId, selectedTopicId);
      if (!sessionId) {
        setNotice('Не удалось подобрать задания по этой теме');
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'weak') {
      const sessionId =
        subject === 'russian'
          ? startRussianWeak(profile.userId)
          : subject === 'world'
            ? startWorldWeak(profile.userId)
            : subject === 'reading'
              ? startLiteraryReadingWeak(profile.userId)
              : subject === 'english'
                ? startEnglishWeak(profile.userId)
                : startWeak(profile.userId);
      if (!sessionId) {
        setNotice('Пока нет заданий, которые надо подтянуть');
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'review') {
      const sessionId = startReview(profile.userId, subject);
      if (!sessionId) {
        const due = selectDueSkills(localAttemptRecorder.getAll(profile.userId), profile.userId, subject);
        setNotice(
          due.length === 0 ? 'На сегодня повторение не требуется' : 'Пока нет заданий для повторения',
        );
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'daily') {
      const sessionId = startDaily(profile.userId, [subject]);
      if (!sessionId) {
        setNotice('На сегодня заданий нет');
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'mistakes') {
      const sessionId = startMistakes(profile.userId, subject);
      if (!sessionId) {
        setNotice('Пока нет ошибок для повторения');
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (!isWeightedStartMode(selected)) {
      return;
    }
    const sessionId =
      subject === 'russian'
        ? startRussian(profile.userId, selected)
        : subject === 'world'
          ? startWorld(profile.userId, selected)
          : subject === 'reading'
            ? startLiteraryReading(profile.userId, selected)
            : subject === 'english'
              ? startEnglish(profile.userId, selected)
              : startMath(profile.userId, selected);
    if (!sessionId) {
      setNotice('Не удалось подобрать задания. Попробуй другой режим.');
      return;
    }
    navigate(`/train/session/${sessionId}`);
  }

  function handleStartDemo() {
    if (!profile) {
      return;
    }
    const sessionId = startDemo(profile.userId);
    navigate(`/train/session/${sessionId}`);
  }

  const cardTitle =
    selected === 'topic'
      ? 'Повторение темы'
      : selected === 'review'
        ? 'Повторение'
        : selected === 'daily'
          ? 'Ежедневный план'
          : `Тренировка по ${subjectTitle(subject)}`;

  const cardText =
    selected === 'topic'
      ? 'Выбери тему. Это учебные задания, а не официальный вариант ВПР.'
      : selected === 'review'
        ? 'Задания, которые пора повторить'
        : selected === 'daily'
          ? 'Задания на сегодня по этому предмету'
          : 'Учебный набор заданий с подсказками и проверкой ответа.';

  return (
    <div className={styles.page}>
      <p className={styles.lead}>
        Выбери предмет и режим. Сейчас открыты темы: {curriculumProgressLabel(schoolMonth).toLowerCase()}. Режим ВПР —
        полный вариант, без ограничения по месяцу.
      </p>

      <section className={styles.subjectPicker} aria-label="Выбор предмета">
        {visibleSubjects(profile?.selectedSubjects).map((meta) => {
          const item = meta.id;
          return (
            <button
              key={item}
              type="button"
              className={`${styles.subjectChip} ${subject === item ? styles.subjectChipActive : ''}`}
              onClick={() => handleSubjectChange(item)}
            >
              <span className={styles.subjectDot} style={{ background: meta.accent }} />
              {subjectLabel(item)}
            </button>
          );
        })}
      </section>

      <h2 className={styles.sectionTitle}>Тренировка</h2>
      <div className={styles.list}>
        {trainingModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`${styles.mode} ${selected === mode.id ? styles.selected : ''}`}
            disabled={mode.disabled}
            onClick={() => handleSelectMode(mode.id)}
          >
            <strong>{mode.title}</strong>
            <span>{mode.text}</span>
          </button>
        ))}
      </div>

      {selected === 'topic' ? (
        <div className={styles.topics}>
          {topics.map((topic) => {
            const count = taskCountByTopic(subject, topic.id);
            const empty = count === 0;
            return (
              <button
                key={topic.id}
                type="button"
                className={`${styles.mode} ${selectedTopicId === topic.id ? styles.selected : ''}`}
                disabled={empty}
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <strong>{topic.title}</strong>
                <span className={styles.topicMeta}>
                  <span>{taskCountLabel(count)}</span>
                  {empty ? <span>Пока нет заданий</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <section className={styles.examSection}>
        <h2 className={styles.sectionTitle}>ВПР</h2>
        <button
          type="button"
          className={styles.examMode}
          onClick={() => navigate(`/exam/${subject}/start`)}
        >
          <strong>{examMode.title}</strong>
          <span>{examMode.text}</span>
        </button>
      </section>

      <Card>
        <h2>{cardTitle}</h2>
        <p>{cardText}</p>
      </Card>

      {notice ? <p className={styles.notice}>{notice}</p> : null}

      <Button fullWidth onClick={handleStart} disabled={!canStart}>
        Начать тренировку
      </Button>
      <Button variant="ghost" fullWidth onClick={handleStartDemo}>
        Пробная тренировка
      </Button>
    </div>
  );
}
