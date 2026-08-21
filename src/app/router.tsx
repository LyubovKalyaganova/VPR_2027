import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { HomePage } from '../pages/HomePage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProgressPage } from '../pages/ProgressPage';
import { SubjectPage } from '../pages/SubjectPage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { TrainPage } from '../pages/TrainPage';
import { TrainResultPage } from '../pages/TrainResultPage';
import { TrainSessionPage } from '../pages/TrainSessionPage';
import { useUserStore } from '../store/useUserStore';

function RequireOnboarding({ children }: { children: ReactNode }) {
  const profile = useUserStore((state) => state.profile);

  if (!profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function RedirectIfReady({ children }: { children: ReactNode }) {
  const profile = useUserStore((state) => state.profile);

  if (profile?.onboardingCompleted) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <RedirectIfReady>
            <OnboardingPage />
          </RedirectIfReady>
        }
      />
      <Route
        element={
          <RequireOnboarding>
            <AppShell />
          </RequireOnboarding>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/subjects/:subjectId" element={<SubjectPage />} />
        <Route path="/train" element={<TrainPage />} />
        <Route path="/train/session/:sessionId" element={<TrainSessionPage />} />
        <Route path="/train/result/:sessionId" element={<TrainResultPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
