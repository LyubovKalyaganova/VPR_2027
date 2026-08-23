import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../../../types';
import type { UserAnswer } from '../../../engine';
import { SingleChoiceAnswer } from './SingleChoiceAnswer';
import styles from './answers.module.css';

interface AudioAnswerProps {
  task: Task;
  options: string[];
  value: UserAnswer;
  disabled: boolean;
  onChange: (answer: UserAnswer) => void;
}

function speakText(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

export function AudioAnswer({ task, options, value, disabled, onChange }: AudioAnswerProps) {
  const [played, setPlayed] = useState(false);
  const spokenRef = useRef<string | null>(null);
  const speechText = task.transcript?.replace(/-/g, ' ') ?? String(task.generatorParams?.spokenWord ?? '');

  const handlePlay = useCallback(() => {
    if (!speechText) {
      return;
    }
    speakText(speechText);
    spokenRef.current = speechText;
    setPlayed(true);
  }, [speechText]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className={styles.pool}>
      <p className={styles.hint}>Прослушай слово и выбери правильное написание. Это подготовка к диктанту.</p>
      <button type="button" className={styles.option} onClick={handlePlay} disabled={disabled || !speechText}>
        {played ? '▶ Прослушать ещё раз' : '▶ Прослушать слово'}
      </button>
      {played && task.transcript ? (
        <p className={styles.hint}>Подсказка после прослушивания: {task.transcript}</p>
      ) : null}
      <SingleChoiceAnswer
        options={options}
        value={typeof value === 'string' ? value : null}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
