import styles from './answers.module.css';

interface NumberAnswerProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function NumberAnswer({ value, disabled, onChange }: NumberAnswerProps) {
  return (
    <input
      className={styles.input}
      value={value}
      disabled={disabled}
      inputMode="numeric"
      onChange={(event) => onChange(event.target.value)}
      placeholder="Введи число"
      autoComplete="off"
    />
  );
}
