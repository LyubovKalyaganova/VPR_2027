import { Outlet, useLocation, useParams } from 'react-router-dom';
import { SUBJECTS } from '../../data/demo/subjects';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import styles from './AppShell.module.css';

function getTitle(pathname: string, subjectId?: string): {
  title: string;
  showBack: boolean;
  hideHeader: boolean;
  hideNav: boolean;
  backTo?: string;
} {
  if (pathname === '/') {
    return { title: 'ВПР 4 класс 2027', showBack: false, hideHeader: true, hideNav: false };
  }
  if (pathname === '/subjects') {
    return { title: 'Предметы', showBack: false, hideHeader: false, hideNav: false };
  }
  if (pathname.startsWith('/subjects/') && subjectId) {
    const subject = SUBJECTS.find((item) => item.id === subjectId);
    return { title: subject?.title ?? 'Предмет', showBack: true, hideHeader: false, hideNav: false };
  }
  if (pathname.startsWith('/exam/session')) {
    return { title: 'ВПР', showBack: false, hideHeader: false, hideNav: true };
  }
  if (pathname.startsWith('/exam/result')) {
    return { title: 'Результат ВПР', showBack: true, hideHeader: false, hideNav: true, backTo: '/subjects' };
  }
  if (pathname.startsWith('/exam/') && pathname.endsWith('/start')) {
    return {
      title: 'ВПР',
      showBack: true,
      hideHeader: false,
      hideNav: false,
      backTo: subjectId ? `/subjects/${subjectId}` : '/subjects',
    };
  }
  if (pathname.startsWith('/train/session')) {
    return { title: 'Задание', showBack: true, hideHeader: false, hideNav: true, backTo: '/train' };
  }
  if (pathname.startsWith('/train/result')) {
    return { title: 'Результат', showBack: true, hideHeader: false, hideNav: true, backTo: '/train' };
  }
  if (pathname === '/train') {
    return { title: 'Тренировка', showBack: false, hideHeader: false, hideNav: false };
  }
  if (pathname === '/progress') {
    return { title: 'Прогресс', showBack: false, hideHeader: false, hideNav: false };
  }
  if (pathname === '/profile') {
    return { title: 'Профиль', showBack: false, hideHeader: false, hideNav: false };
  }
  return { title: 'ВПР 4 класс 2027', showBack: false, hideHeader: false, hideNav: false };
}

export function AppShell() {
  const location = useLocation();
  const params = useParams();
  const { title, showBack, hideHeader, hideNav, backTo } = getTitle(location.pathname, params.subjectId);

  return (
    <div className={styles.shell}>
      {hideHeader ? null : <Header title={title} showBack={showBack} backTo={backTo} />}
      <main className={`${styles.main} ${hideNav ? styles.mainTight : ''}`}>
        <Outlet />
      </main>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}
