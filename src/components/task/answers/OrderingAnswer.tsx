import { Button } from '../../ui';
import styles from './answers.module.css';

interface OrderingAnswerProps {
  items: string[];
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}

export function OrderingAnswer({ items, value, disabled, onChange }: OrderingAnswerProps) {
  const remaining = items.filter((item) => !value.includes(item));

  return (
    <div className={styles.list}>
      <p className={styles.hint}>Нажимай события в нужном порядке</p>
      {value.length > 0 ? (
        <div className={styles.pool}>
          {value.map((item, index) => (
            <div key={item} className={`${styles.option} ${styles.selected}`}>
              {index + 1}. {item}
            </div>
          ))}
        </div>
      ) : null}
      <div className={styles.pool}>
        {remaining.map((item) => (
          <button key={item} type="button" className={styles.option} disabled={disabled} onClick={() => onChange([...value, item])}>
            {item}
          </button>
        ))}
      </div>
      {value.length > 0 ? (
        <Button variant="ghost" disabled={disabled} onClick={() => onChange([])}>
          Сбросить порядок
        </Button>
      ) : null}
    </div>
  );
}
