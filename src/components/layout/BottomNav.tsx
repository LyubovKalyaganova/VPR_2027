import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const ITEMS = [
  { to: '/', label: 'Главная', icon: HomeIcon },
  { to: '/subjects', label: 'Предметы', icon: SubjectsIcon },
  { to: '/train', label: 'Тренировка', icon: TrainIcon },
  { to: '/progress', label: 'Прогресс', icon: ProgressIcon },
  { to: '/profile', label: 'Профиль', icon: ProfileIcon },
] as const;

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Основное меню">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <item.icon />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function SubjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.8" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 19 19 5" />
      <path d="M8 5h11v11" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
    </svg>
  );
}
