import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
}

export function Header({ title, showBack = false, backTo }: HeaderProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  }

  return (
    <header className={styles.header}>
      {showBack ? (
        <button type="button" className={styles.back} onClick={handleBack} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>
      ) : (
        <span className={styles.spacer} />
      )}
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.spacer} />
    </header>
  );
}
