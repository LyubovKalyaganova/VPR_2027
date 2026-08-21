import styles from './answers.module.css';

interface MultipleChoiceAnswerProps {
  options: string[];
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}

export function MultipleChoiceAnswer({ options, value, disabled, onChange }: MultipleChoiceAnswerProps) {
  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }
    onChange([...value, option]);
  }

  return (
    <div className={styles.list}>
      <p className={styles.hint}>Можно выбрать несколько ответов</p>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.option} ${value.includes(option) ? styles.selected : ''}`}
          disabled={disabled}
          onClick={() => toggle(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
