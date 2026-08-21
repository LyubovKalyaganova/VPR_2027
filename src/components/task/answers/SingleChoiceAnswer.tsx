import styles from './answers.module.css';

interface SingleChoiceAnswerProps {
  options: string[];
  value: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function SingleChoiceAnswer({ options, value, disabled, onChange }: SingleChoiceAnswerProps) {
  return (
    <div className={styles.list}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.option} ${value === option ? styles.selected : ''}`}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
