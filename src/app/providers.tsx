import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';

function allStoresHydrated(): boolean {
  return (
    useUserStore.persist.hasHydrated() &&
    useTrainingStore.persist.hasHydrated() &&
    useExamStore.persist.hasHydrated()
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(allStoresHydrated());

  useEffect(() => {
    const markHydrated = () => {
      if (allStoresHydrated()) {
        setHydrated(true);
      }
    };
    const unsubUser = useUserStore.persist.onFinishHydration(markHydrated);
    const unsubTraining = useTrainingStore.persist.onFinishHydration(markHydrated);
    const unsubExam = useExamStore.persist.onFinishHydration(markHydrated);
    markHydrated();
    return () => {
      unsubUser();
      unsubTraining();
      unsubExam();
    };
  }, []);

  if (!hydrated) {
    return <div className="bootScreen">Загрузка</div>;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}
