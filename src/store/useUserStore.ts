import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { schoolMonthFromDate } from '../services/schoolCurriculum';
import type { SchoolMonth, SubjectId, UserProfile } from '../types';

interface UserState {
  profile: UserProfile | null;
  completeOnboarding: (data: {
    name: string;
    avatar: string;
    selectedSubjects: SubjectId[];
    schoolMonth?: SchoolMonth;
  }) => void;
  updateProfile: (
    patch: Partial<Pick<UserProfile, 'name' | 'avatar' | 'selectedSubjects' | 'schoolMonth'>>,
  ) => void;
  resetOnboarding: () => void;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}`;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      completeOnboarding: ({ name, avatar, selectedSubjects, schoolMonth }) => {
        const profile: UserProfile = {
          userId: createId(),
          name: name.trim(),
          class: 4,
          avatar,
          selectedSubjects,
          schoolMonth: schoolMonth ?? schoolMonthFromDate(),
          createdAt: new Date().toISOString(),
          onboardingCompleted: true,
        };
        set({ profile });
      },
      updateProfile: (patch) => {
        const current = get().profile;
        if (!current) {
          return;
        }
        set({ profile: { ...current, ...patch } });
      },
      resetOnboarding: () => set({ profile: null }),
    }),
    {
      name: 'vpr-4-2027-user',
    },
  ),
);
