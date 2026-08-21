import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { MATH_TOPICS } from '../data/taxonomy/math';
import { localAttemptRecorder } from '../db';
import { taskRepository } from '../services/taskRepository';
import { selectDueMathSkills, useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';
import type { TrainingMode } from '../types';
import styles from './TrainPage.module.css';

function isMathStartMode(value: TrainingMode): value is 'quick' | 'normal' | 'random' {
  return value === 'quick' || value === 'normal' || value === 'random';
}

function mathTaskCountByTopic(topicId: string): number {
  return taskRepository.getByTopic(topicId).filter((task) => task.subject === 'mathematics').length;
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

const MODES: Array<{ id: TrainingMode; title: string; text: string; disabled?: boolean }> = [
  { id: 'quick', title: 'Быстрая тренировка', text: '5 заданий из учебного математического банка' },
  { id: 'normal', title: 'Обычная тренировка', text: 'До 10 заданий из учебного математического банка' },
  { id: 'mistakes', title: 'Работа над ошибками', text: 'Повторение заданий, где были ошибки' },
  { id: 'topic', title: 'Повторение темы', text: 'Задания одной выбранной темы, до 10' },
  { id: 'weak', title: 'Слабые места', text: 'Тренировка по вашим слабым местам' },
  { id: 'review', title: 'Повторение', text: 'Задания, которые пора повторить' },
  { id: 'daily', title: 'Ежедневный план', text: '5 заданий на сегодня: слабые места, повторение и закрепление' },
  { id: 'random', title: 'Случайная тренировка', text: 'Случайные задания из математического банка, до 10' },
  { id: 'exam', title: 'Реальная ВПР', text: 'Пробный вариант появится позже', disabled: true },
];

export function TrainPage() {
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const startDemo = useTrainingStore((state) => state.startDemo);
  const startMath = useTrainingStore((state) => state.startMath);
  const startMathTopic = useTrainingStore((state) => state.startMathTopic);
  const startWeak = useTrainingStore((state) => state.startWeak);
  const startReview = useTrainingStore((state) => state.startReview);
  const startDaily = useTrainingStore((state) => state.startDaily);
  const startMistakes = useTrainingStore((state) => state.startMistakes);
  const [selected, setSelected] = useState<TrainingMode>('quick');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedTopicCount = selectedTopicId ? mathTaskCountByTopic(selectedTopicId) : 0;
  const canStartTopic =
    Boolean(profile) && selected === 'topic' && selectedTopicId !== null && selectedTopicCount > 0;
  const canStartMath = Boolean(profile) && isMathStartMode(selected);
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
              : canStartMath;

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
      const sessionId = startMathTopic(profile.userId, selectedTopicId);
      if (!sessionId) {
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'weak') {
      const sessionId = startWeak(profile.userId);
      if (!sessionId) {
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'review') {
      const sessionId = startReview(profile.userId);
      if (!sessionId) {
        const due = selectDueMathSkills(localAttemptRecorder.getAll(profile.userId), profile.userId);
        setNotice(
          due.length === 0 ? 'На сегодня повторение не требуется' : 'Пока нет заданий для повторения',
        );
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'daily') {
      const sessionId = startDaily(profile.userId);
      if (!sessionId) {
        setNotice('На сегодня заданий нет');
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (selected === 'mistakes') {
      const sessionId = startMistakes(profile.userId);
      if (!sessionId) {
        setNotice('Пока нет ошибок для повторения');
        return;
      }
      navigate(`/train/session/${sessionId}`);
      return;
    }
    if (!isMathStartMode(selected)) {
      return;
    }
    const sessionId = startMath(profile.userId, selected);
    navigate(`/train/session/${sessionId}`);
  }

  function handleStartDemo() {
    if (!profile) {
      return;
    }
    const sessionId = startDemo(profile.userId);
    navigate(`/train/session/${sessionId}`);
  }

  return (
    <div className={styles.page}>
      <p className={styles.lead}>
        Сейчас доступна учебная тренировка по математике. Задания используются для разработки и проверки приложения.
      </p>

      <div className={styles.list}>
        {MODES.map((mode) => (
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
          {MATH_TOPICS.map((topic) => {
            const count = mathTaskCountByTopic(topic.id);
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

      <Card>
        <h2>
          {selected === 'topic'
            ? 'Повторение темы'
            : selected === 'review'
              ? 'Повторение'
              : selected === 'daily'
                ? 'Ежедневный план'
                : 'Начать тренировку по математике'}
        </h2>
        <p>
          {selected === 'topic'
            ? 'Выбери тему со свободными учебными заданиями. Это не официальный вариант ВПР.'
            : selected === 'review'
              ? 'Задания, которые пора повторить'
              : selected === 'daily'
                ? '5 заданий на сегодня: слабые места, повторение и закрепление'
                : 'Это учебный набор, а не официальные задания ВПР.'}
        </p>
      </Card>

      {notice ? <p>{notice}</p> : null}

      <Button fullWidth onClick={handleStart} disabled={!canStart}>
        Начать тренировку
      </Button>
      <Button variant="secondary" fullWidth onClick={handleStartDemo}>
        DEMO-тренировка
      </Button>
    </div>
  );
}
