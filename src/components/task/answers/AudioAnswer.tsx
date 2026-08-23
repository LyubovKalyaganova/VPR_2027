import { useCallback, useEffect, useState } from 'react';
import type { Task } from '../../../types';
import type { UserAnswer } from '../../../engine';
import { MatchingAnswer } from './MatchingAnswer';
import { SingleChoiceAnswer } from './SingleChoiceAnswer';
import styles from './answers.module.css';

interface AudioAnswerProps {
  task: Task;
  options: string[];
  value: UserAnswer;
  disabled: boolean;
  onChange: (answer: UserAnswer) => void;
}

function speakText(text: string, lang: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = lang.startsWith('en') ? 0.9 : 0.85;
  window.speechSynthesis.speak(utterance);
}

export function AudioAnswer({ task, options, value, disabled, onChange }: AudioAnswerProps) {
  const isEnglish = task.subject === 'english';
  const listenLimit = isEnglish ? (task.listenLimit ?? 2) : Number.POSITIVE_INFINITY;
  const [playCount, setPlayCount] = useState(0);
  const speechText = task.transcript ?? String(task.generatorParams?.spokenWord ?? '');
  const hasMatching = Boolean(task.matchingLeft?.length);
  const canPlay = isEnglish ? playCount < listenLimit : true;

  const handlePlay = useCallback(() => {
    if (!speechText || !canPlay) {
      return;
    }
    speakText(isEnglish ? speechText : speechText.replace(/-/g, ' '), isEnglish ? 'en-GB' : 'ru-RU');
    if (isEnglish) {
      setPlayCount((count) => count + 1);
    } else {
      setPlayCount(1);
    }
  }, [speechText, canPlay, isEnglish]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (isEnglish) {
    return (
      <div className={styles.pool}>
        <p className={styles.hint}>
          Listen to the recording. You can play it {listenLimit} times.
          {playCount > 0 ? ` Playback ${playCount} of ${listenLimit}.` : ''}
        </p>
        <button type="button" className={styles.option} onClick={handlePlay} disabled={disabled || !speechText || !canPlay}>
          {playCount === 0 ? '▶ Listen' : canPlay ? `▶ Listen again (${playCount}/${listenLimit})` : `▶ Limit reached (${listenLimit}/${listenLimit})`}
        </button>
        {hasMatching ? (
          <MatchingAnswer
            left={task.matchingLeft ?? []}
            right={task.matchingRight ?? ['1', '2', '3']}
            value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
            disabled={disabled || playCount === 0}
            onChange={onChange}
          />
        ) : (
          <SingleChoiceAnswer
            options={options}
            value={typeof value === 'string' ? value : null}
            disabled={disabled || playCount === 0}
            onChange={onChange}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.pool}>
      <p className={styles.hint}>Прослушай слово и выбери правильное написание. Это подготовка к диктанту.</p>
      <button type="button" className={styles.option} onClick={handlePlay} disabled={disabled || !speechText}>
        {playCount > 0 ? '▶ Прослушать ещё раз' : '▶ Прослушать слово'}
      </button>
      {playedHint(playCount, task.transcript)}
      <SingleChoiceAnswer
        options={options}
        value={typeof value === 'string' ? value : null}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function playedHint(playCount: number, transcript?: string) {
  if (playCount > 0 && transcript) {
    return <p className={styles.hint}>Подсказка после прослушивания: {transcript}</p>;
  }
  return null;
}
