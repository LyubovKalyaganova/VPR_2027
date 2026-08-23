import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubjectId } from '../types';
import type { UserAnswer } from '../engine';
import { taskRepository } from '../services/taskRepository';
import {
  completeExamSession,
  createExamSession,
  expireExamSession,
  setExamAnswer,
  setExamCurrentIndex,
  startExamSession,
  syncExamExpiry,
} from '../services/exam/examSessionEngine';
import type { ExamSession } from '../services/exam/examTypes';

interface ExamState {
  sessions: Record<string, ExamSession>;
  createSession: (userId: string, subjectId: SubjectId) => string | null;
  startSession: (sessionId: string) => void;
  setAnswer: (sessionId: string, taskId: string, answer: UserAnswer) => void;
  setCurrentIndex: (sessionId: string, index: number) => void;
  completeSession: (sessionId: string) => ExamSession | null;
  expireSession: (sessionId: string) => ExamSession | null;
  syncExpiry: (sessionId: string) => ExamSession | null;
  getActiveForSubject: (userId: string, subjectId: SubjectId) => ExamSession | undefined;
}

function lookupTasks(session: ExamSession) {
  return session.taskIds
    .map((id) => taskRepository.getById(id))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      sessions: {},
      createSession: (userId, subjectId) => {
        try {
          const session = createExamSession(userId, subjectId);
          set((state) => ({
            sessions: { ...state.sessions, [session.id]: session },
          }));
          return session.id;
        } catch {
          return null;
        }
      },
      startSession: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }
        const started = startExamSession(session);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: started },
        }));
      },
      setAnswer: (sessionId, taskId, answer) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }
        const updated = setExamAnswer(session, taskId, answer);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updated },
        }));
      },
      setCurrentIndex: (sessionId, index) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }
        const updated = setExamCurrentIndex(session, index);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updated },
        }));
      },
      completeSession: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session || session.status !== 'in_progress') {
          return null;
        }
        const tasks = lookupTasks(session);
        const completed = completeExamSession(session, tasks);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: completed },
        }));
        return completed;
      },
      expireSession: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session || session.status !== 'in_progress') {
          return null;
        }
        const tasks = lookupTasks(session);
        const expired = expireExamSession(session, tasks);
        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: expired },
        }));
        return expired;
      },
      syncExpiry: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return null;
        }
        const tasks = lookupTasks(session);
        const synced = syncExamExpiry(session, tasks);
        if (synced.status !== session.status) {
          set((state) => ({
            sessions: { ...state.sessions, [sessionId]: synced },
          }));
        }
        return synced;
      },
      getActiveForSubject: (userId, subjectId) => {
        return Object.values(get().sessions).find(
          (session) =>
            session.userId === userId &&
            session.subjectId === subjectId &&
            session.status === 'in_progress',
        );
      },
    }),
    {
      name: 'vpr-4-2027-exam',
      partialize: (state) => ({ sessions: state.sessions }),
    },
  ),
);
