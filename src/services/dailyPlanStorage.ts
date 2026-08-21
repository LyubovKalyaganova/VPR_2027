import type { SubjectId } from '../types';
import type { DailyPlanItem, DailyPlanSource } from './dailyPlanService';

export const DAILY_PLANS_STORAGE_KEY = 'vpr-4-2027-daily-plans';
export const DAILY_PLANS_STORAGE_VERSION = 1;
const KEEP_DAYS = 14;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type StoredDailyPlan = {
  userId: string;
  date: string;
  subject: SubjectId;
  taskIds: string[];
  items: DailyPlanItem[];
};

export type DailyPlanStorageSnapshot = {
  version: number;
  plans: StoredDailyPlan[];
};

export type DailyPlanStorageBackend = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const SUBJECT_IDS: readonly SubjectId[] = ['russian', 'mathematics', 'world', 'reading', 'english'];

function isSubjectId(value: unknown): value is SubjectId {
  return typeof value === 'string' && (SUBJECT_IDS as readonly string[]).includes(value);
}

function isDailyPlanSource(value: unknown): value is DailyPlanSource {
  return value === 'weak' || value === 'review' || value === 'reinforcement';
}

function isCalendarDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Локальная календарная дата устройства по переданному ISO-моменту.
 * Не использует UTC-день, чтобы вечером не начинался следующий день раньше времени.
 */
export function getCalendarDate(nowIso: string): string {
  const parsed = Date.parse(nowIso);
  if (Number.isNaN(parsed)) {
    return formatLocalDate(new Date());
  }
  return formatLocalDate(new Date(parsed));
}

function shiftCalendarDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day);
  shifted.setDate(shifted.getDate() + days);
  return formatLocalDate(shifted);
}

export function createMemoryDailyPlanStorage(): DailyPlanStorageBackend {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

export const localDailyPlanStorage: DailyPlanStorageBackend = {
  getItem(key) {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(key, value);
    } catch {
      // Не роняем приложение при переполнении или недоступности storage.
    }
  },
};

function parseItem(value: unknown): DailyPlanItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const item = value as Partial<DailyPlanItem>;
  if (typeof item.taskId !== 'string' || item.taskId.length === 0) {
    return null;
  }
  if (typeof item.skillId !== 'string') {
    return null;
  }
  if (!isDailyPlanSource(item.source)) {
    return null;
  }
  return {
    taskId: item.taskId,
    skillId: item.skillId,
    source: item.source,
  };
}

function parseStoredPlan(value: unknown): StoredDailyPlan | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Partial<StoredDailyPlan> & { taskIds?: unknown; items?: unknown };
  if (typeof record.userId !== 'string' || record.userId.length === 0) {
    return null;
  }
  if (!isCalendarDate(record.date) || !isSubjectId(record.subject)) {
    return null;
  }
  const taskIds = Array.isArray(record.taskIds)
    ? record.taskIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const parsedItems = Array.isArray(record.items)
    ? record.items.map(parseItem).filter((item): item is DailyPlanItem => item !== null)
    : [];
  const itemsById = new Map(parsedItems.map((item) => [item.taskId, item]));
  const items = (taskIds.length > 0 ? taskIds : parsedItems.map((item) => item.taskId)).map((taskId) => {
    const existing = itemsById.get(taskId);
    return existing ?? { taskId, skillId: '', source: 'reinforcement' as const };
  });
  const ids = items.map((item) => item.taskId);
  return {
    userId: record.userId,
    date: record.date,
    subject: record.subject,
    taskIds: ids,
    items,
  };
}

export function parseDailyPlanStorage(raw: string | null): DailyPlanStorageSnapshot {
  if (!raw) {
    return { version: DAILY_PLANS_STORAGE_VERSION, plans: [] };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { version: DAILY_PLANS_STORAGE_VERSION, plans: [] };
    }
    const snapshot = parsed as { version?: unknown; plans?: unknown };
    const plans = Array.isArray(snapshot.plans)
      ? snapshot.plans.map(parseStoredPlan).filter((plan): plan is StoredDailyPlan => plan !== null)
      : [];
    return {
      version: typeof snapshot.version === 'number' ? snapshot.version : DAILY_PLANS_STORAGE_VERSION,
      plans,
    };
  } catch {
    return { version: DAILY_PLANS_STORAGE_VERSION, plans: [] };
  }
}

function readSnapshot(backend: DailyPlanStorageBackend): DailyPlanStorageSnapshot {
  return parseDailyPlanStorage(backend.getItem(DAILY_PLANS_STORAGE_KEY));
}

function writeSnapshot(backend: DailyPlanStorageBackend, snapshot: DailyPlanStorageSnapshot, today: string): void {
  const minDate = shiftCalendarDate(today, -KEEP_DAYS);
  const plans = snapshot.plans.filter((plan) => plan.date >= minDate);
  backend.setItem(
    DAILY_PLANS_STORAGE_KEY,
    JSON.stringify({
      version: DAILY_PLANS_STORAGE_VERSION,
      plans,
    }),
  );
}

function matchesPlan(
  plan: StoredDailyPlan,
  userId: string,
  subject: SubjectId,
  date: string,
): boolean {
  return plan.userId === userId && plan.subject === subject && plan.date === date;
}

export function getStoredDailyPlan(
  userId: string,
  subject: SubjectId,
  date: string,
  backend: DailyPlanStorageBackend = localDailyPlanStorage,
): StoredDailyPlan | null {
  const snapshot = readSnapshot(backend);
  return snapshot.plans.find((plan) => matchesPlan(plan, userId, subject, date)) ?? null;
}

export function listStoredDailyPlans(
  userId: string,
  subject: SubjectId,
  backend: DailyPlanStorageBackend = localDailyPlanStorage,
): StoredDailyPlan[] {
  return readSnapshot(backend).plans.filter((plan) => plan.userId === userId && plan.subject === subject);
}

export function saveDailyPlan(
  userId: string,
  subject: SubjectId,
  date: string,
  items: readonly DailyPlanItem[],
  backend: DailyPlanStorageBackend = localDailyPlanStorage,
): void {
  const record: StoredDailyPlan = {
    userId,
    date,
    subject,
    taskIds: items.map((item) => item.taskId),
    items: items.map((item) => ({
      taskId: item.taskId,
      skillId: item.skillId,
      source: item.source,
    })),
  };
  const snapshot = readSnapshot(backend);
  const plans = snapshot.plans.filter((plan) => !matchesPlan(plan, userId, subject, date));
  plans.push(record);
  writeSnapshot(backend, { version: DAILY_PLANS_STORAGE_VERSION, plans }, date);
}

export function clearDailyPlan(
  userId: string,
  subject: SubjectId,
  date: string,
  backend: DailyPlanStorageBackend = localDailyPlanStorage,
): void {
  const snapshot = readSnapshot(backend);
  const plans = snapshot.plans.filter((plan) => !matchesPlan(plan, userId, subject, date));
  writeSnapshot(backend, { version: DAILY_PLANS_STORAGE_VERSION, plans }, date);
}
