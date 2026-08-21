import styles from './answers.module.css';

interface ShortAnswerProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function ShortAnswer({ value, disabled, onChange }: ShortAnswerProps) {
  return (
    <input
      className={styles.input}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Напиши ответ"
      autoComplete="off"
    />
  );
}
