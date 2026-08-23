export function computeExamEndTime(startTimeMs: number, durationMinutes: number): number {
  return startTimeMs + durationMinutes * 60 * 1000;
}

export function getExamRemainingMs(endTimeMs: number, nowMs = Date.now()): number {
  return Math.max(0, endTimeMs - nowMs);
}

export function isExamExpired(endTimeMs: number | null, nowMs = Date.now()): boolean {
  if (endTimeMs === null) {
    return false;
  }
  return nowMs >= endTimeMs;
}

export function formatExamCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isExamTimeLow(remainingMs: number, durationMinutes: number): boolean {
  const totalMs = durationMinutes * 60 * 1000;
  return remainingMs > 0 && remainingMs <= totalMs * 0.1;
}
