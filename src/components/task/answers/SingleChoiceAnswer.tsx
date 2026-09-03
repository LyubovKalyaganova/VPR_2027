import styles from './answers.module.css';

interface SingleChoiceAnswerProps {
  options: string[];
  value: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
  formatLabel?: (option: string) => string;
}

export function SingleChoiceAnswer({
  options,
  value,
  disabled,
  onChange,
  formatLabel,
}: SingleChoiceAnswerProps) {
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
          {formatLabel ? formatLabel(option) : option}
        </button>
      ))}
    </div>
  );
}
