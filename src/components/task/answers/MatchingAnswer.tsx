import styles from './answers.module.css';

interface MatchingAnswerProps {
  left: string[];
  right: string[];
  rowOptions?: string[][];
  value: Record<string, string>;
  disabled: boolean;
  onChange: (value: Record<string, string>) => void;
}

export function MatchingAnswer({ left, right, rowOptions, value, disabled, onChange }: MatchingAnswerProps) {
  return (
    <div className={styles.list}>
      {left.map((item, index) => {
        const options = rowOptions?.[index] ?? right;
        return (
          <div key={`${item}-${index}`} className={styles.row}>
            <div className={styles.rowTitle}>{item}</div>
            <div className={styles.chips}>
              {options.map((option, optionIndex) => (
                <button
                  key={`${item}-${option}-${optionIndex}`}
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
        );
      })}
    </div>
  );
}
