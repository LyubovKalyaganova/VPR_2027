import styles from './answers.module.css';

interface MatchingAnswerProps {
  left: string[];
  right: string[];
  value: Record<string, string>;
  disabled: boolean;
  onChange: (value: Record<string, string>) => void;
}

export function MatchingAnswer({ left, right, value, disabled, onChange }: MatchingAnswerProps) {
  return (
    <div className={styles.list}>
      {left.map((item) => (
        <div key={item} className={styles.row}>
          <div className={styles.rowTitle}>{item}</div>
          <div className={styles.chips}>
            {right.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${value[item] === option ? styles.selected : ''}`}
                disabled={disabled}
                onClick={() => onChange({ ...value, [item]: option })}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
