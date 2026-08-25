import { useCallback, useEffect, useState } from 'react';
import type { Task } from '../../../types';
import type { UserAnswer } from '../../../engine';
import { cancelSpeech, playAudioUrl, speakText } from '../../../services/speechPlayback';
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

export function AudioAnswer({ task, options, value, disabled, onChange }: AudioAnswerProps) {
  const isEnglish = task.subject === 'english';
  const listenLimit = isEnglish ? (task.listenLimit ?? 2) : Number.POSITIVE_INFINITY;
  const [playCount, setPlayCount] = useState(0);
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'unavailable'>('idle');
  const speechText = task.transcript ?? String(task.generatorParams?.spokenWord ?? '');
  const audioUrl = task.audio;
  const hasMatching = Boolean(task.matchingLeft?.length);
  const canPlay = isEnglish ? playCount < listenLimit : true;
  const speechLocked = isEnglish && playback !== 'unavailable' && playCount === 0;

  const handlePlay = useCallback(async () => {
    if ((!speechText && !audioUrl) || !canPlay) {
      return;
    }
    const result = audioUrl
      ? await playAudioUrl(audioUrl)
      : await speakText(
          isEnglish ? speechText : speechText.replace(/-/g, ' '),
          isEnglish ? 'en-GB' : 'ru-RU',
        );
    if (result === 'unavailable') {
      setPlayback('unavailable');
      return;
    }
    setPlayback('playing');
    if (isEnglish) {
      setPlayCount((count) => count + 1);
    } else {
      setPlayCount(1);
    }
  }, [audioUrl, speechText, canPlay, isEnglish]);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const answerDisabled = disabled || speechLocked;

  const answers = hasMatching ? (
    <MatchingAnswer
      left={task.matchingLeft ?? []}
      right={task.matchingRight ?? ['1', '2', '3']}
      value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
      disabled={answerDisabled}
      onChange={onChange}
    />
  ) : (
    <SingleChoiceAnswer
      options={options}
      value={typeof value === 'string' ? value : null}
      disabled={answerDisabled}
      onChange={onChange}
    />
  );

  if (isEnglish) {
    return (
      <div className={styles.pool}>
        <p className={styles.hint}>
          Listen to the recording. You can play it {listenLimit} times.
          {playCount > 0 ? ` Playback ${playCount} of ${listenLimit}.` : ''}
        </p>
        {playback === 'unavailable' ? (
          <p className={styles.hint}>
            На этом устройстве озвучка недоступна. Можно ответить по заданию — учитель позже включит звук на
            другом телефоне.
          </p>
        ) : (
          <button
            type="button"
            className={styles.option}
            onClick={() => {
              void handlePlay();
            }}
            disabled={disabled || (!speechText && !audioUrl) || !canPlay}
          >
            {playCount === 0
              ? '▶ Listen'
              : canPlay
                ? `▶ Listen again (${playCount}/${listenLimit})`
                : `▶ Limit reached (${listenLimit}/${listenLimit})`}
          </button>
        )}
        {answers}
      </div>
    );
  }

  return (
    <div className={styles.pool}>
      <p className={styles.hint}>Прослушай слово и выбери правильное написание. Это подготовка к диктанту.</p>
      {playback === 'unavailable' ? (
        <p className={styles.hint}>Озвучка на этом устройстве не сработала. Выбери написание по памяти или спроси учителя.</p>
      ) : (
        <button
          type="button"
          className={styles.option}
          onClick={() => {
            void handlePlay();
          }}
          disabled={disabled || (!speechText && !audioUrl)}
        >
          {playCount > 0 ? '▶ Прослушать ещё раз' : '▶ Прослушать слово'}
        </button>
      )}
      <SingleChoiceAnswer
        options={options}
        value={typeof value === 'string' ? value : null}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
