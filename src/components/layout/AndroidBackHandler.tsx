import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Modal } from '../ui';
import { useExamStore } from '../../store/useExamStore';
import { useTrainingStore } from '../../store/useTrainingStore';

const ROOT_ROUTES = new Set(['/', '/subjects', '/train', '/progress', '/profile']);

function resolveBackTarget(pathname: string, subjectId?: string): string | null {
  if (pathname.startsWith('/subjects/') && subjectId) {
    return '/subjects';
  }
  if (pathname.startsWith('/exam/') && pathname.endsWith('/start') && subjectId) {
    return `/subjects/${subjectId}`;
  }
  if (pathname.startsWith('/exam/result/')) {
    return '/subjects';
  }
  if (pathname.startsWith('/train/result/')) {
    return '/train';
  }
  if (pathname.startsWith('/train/session')) {
    return '/train';
  }
  if (pathname.startsWith('/exam/session')) {
    const sessionId = pathname.split('/')[3];
    const session = sessionId ? useExamStore.getState().sessions[sessionId] : undefined;
    const fromSession = session?.subjectId;
    return fromSession ? `/subjects/${fromSession}` : subjectId ? `/subjects/${subjectId}` : '/subjects';
  }
  return null;
}

export function AndroidBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [examExitOpen, setExamExitOpen] = useState(false);
  const [trainExitOpen, setTrainExitOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let removeListener: (() => void) | undefined;

    void CapApp.addListener('backButton', () => {
      const pathname = location.pathname;

      if (pathname.startsWith('/exam/session/')) {
        const sessionId = params.sessionId;
        const session = sessionId ? useExamStore.getState().sessions[sessionId] : undefined;
        if (session?.status === 'in_progress') {
          setExamExitOpen(true);
          return;
        }
      }

      if (pathname.startsWith('/train/session/')) {
        const sessionId = params.sessionId;
        const session = sessionId ? useTrainingStore.getState().sessions[sessionId] : undefined;
        if (session && session.phase !== 'completed') {
          setTrainExitOpen(true);
          return;
        }
      }

      const backTarget = resolveBackTarget(pathname, params.subjectId);
      if (backTarget) {
        navigate(backTarget);
        return;
      }

      if (ROOT_ROUTES.has(pathname)) {
        void CapApp.exitApp();
        return;
      }

      navigate(-1);
    }).then((handle) => {
      removeListener = () => {
        void handle.remove();
      };
    });

    return () => {
      removeListener?.();
    };
  }, [location.pathname, navigate, params.sessionId, params.subjectId]);

  function confirmExamExit() {
    setExamExitOpen(false);
    const sessionId = params.sessionId;
    const session = sessionId ? useExamStore.getState().sessions[sessionId] : undefined;
    const subjectId = session?.subjectId;
    navigate(subjectId ? `/exam/${subjectId}/start` : '/subjects');
  }

  function confirmTrainExit() {
    setTrainExitOpen(false);
    navigate('/train');
  }

  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <>
      <Modal
        open={examExitOpen}
        title="Выйти из ВПР?"
        confirmLabel="Выйти"
        cancelLabel="Продолжить"
        onClose={() => setExamExitOpen(false)}
        onConfirm={confirmExamExit}
      >
        <p>Таймер продолжит идти. Ты сможешь вернуться к экзамену позже с экрана предмета.</p>
      </Modal>
      <Modal
        open={trainExitOpen}
        title="Выйти из тренировки?"
        confirmLabel="Выйти"
        cancelLabel="Продолжить"
        onClose={() => setTrainExitOpen(false)}
        onConfirm={confirmTrainExit}
      >
        <p>Тренировка сохранится. Можно вернуться позже.</p>
      </Modal>
    </>
  );
}
