import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useTrainingStore } from '../store/useTrainingStore';
import { useUserStore } from '../store/useUserStore';

export function AppProviders({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(
    useUserStore.persist.hasHydrated() && useTrainingStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsubUser = useUserStore.persist.onFinishHydration(() => {
      if (useTrainingStore.persist.hasHydrated()) {
        setHydrated(true);
      }
    });
    const unsubTraining = useTrainingStore.persist.onFinishHydration(() => {
      if (useUserStore.persist.hasHydrated()) {
        setHydrated(true);
      }
    });
    setHydrated(useUserStore.persist.hasHydrated() && useTrainingStore.persist.hasHydrated());
    return () => {
      unsubUser();
      unsubTraining();
    };
  }, []);

  if (!hydrated) {
    return <div className="bootScreen">Загрузка</div>;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}
