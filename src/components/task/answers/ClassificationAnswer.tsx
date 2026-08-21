import styles from './answers.module.css';

interface ClassificationAnswerProps {
  items: string[];
  categories: string[];
  value: Record<string, string>;
  disabled: boolean;
  onChange: (value: Record<string, string>) => void;
}

export function ClassificationAnswer({
  items,
  categories,
  value,
  disabled,
  onChange,
}: ClassificationAnswerProps) {
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item} className={styles.row}>
          <div className={styles.rowTitle}>{item}</div>
          <div className={styles.chips}>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.chip} ${value[item] === category ? styles.selected : ''}`}
                disabled={disabled}
                onClick={() => onChange({ ...value, [item]: category })}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
