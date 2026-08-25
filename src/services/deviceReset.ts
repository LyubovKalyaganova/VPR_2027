import { ATTEMPTS_STORAGE_KEY, localAttemptRecorder } from '../db';
import { DAILY_PLANS_STORAGE_KEY } from './dailyPlanStorage';

export const USER_STORAGE_KEY = 'vpr-4-2027-user';
export const TRAINING_STORAGE_KEY = 'vpr-4-2027-training';
export const EXAM_STORAGE_KEY = 'vpr-4-2027-exam';

const DEVICE_KEYS = [
  ATTEMPTS_STORAGE_KEY,
  DAILY_PLANS_STORAGE_KEY,
  USER_STORAGE_KEY,
  TRAINING_STORAGE_KEY,
  EXAM_STORAGE_KEY,
] as const;

/**
 * Полная очистка локальных данных ребёнка на этом устройстве.
 * Не ходит в сеть. Вызывающий код должен ещё сбросить Zustand-сторы.
 */
export function clearDeviceLearningStorage(): void {
  localAttemptRecorder.clearAll();
  if (typeof localStorage === 'undefined') {
    return;
  }
  for (const key of DEVICE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Не роняем UI, если storage недоступен.
    }
  }
}
