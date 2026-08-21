import styles from './answers.module.css';

interface FillBlankAnswerProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function FillBlankAnswer({ value, disabled, onChange }: FillBlankAnswerProps) {
  return (
    <input
      className={styles.input}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Вставь букву или слово"
      autoComplete="off"
    />
  );
}
