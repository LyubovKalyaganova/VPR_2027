import type { AttemptRecorder } from '../engine/attemptRecorder';
import type { Attempt } from '../types';

export const ATTEMPTS_STORAGE_KEY = 'vpr-4-2027-attempts';

function isAttemptLike(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<Attempt>;
  return (
    typeof item.attemptId === 'string' &&
    typeof item.userId === 'string' &&
    typeof item.questionId === 'string' &&
    typeof item.sessionId === 'string' &&
    typeof item.isCorrect === 'boolean'
  );
}

function readStoredAttempts(): Attempt[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isAttemptLike);
  } catch {
    return [];
  }
}

function writeStoredAttempts(attempts: Attempt[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // Не роняем приложение при переполнении или недоступности storage.
  }
}

export class LocalAttemptRecorder implements AttemptRecorder {
  private attempts: Attempt[] | null = null;

  private load(): Attempt[] {
    if (this.attempts === null) {
      this.attempts = readStoredAttempts();
    }
    return this.attempts;
  }

  record(attempt: Attempt): void {
    const current = this.load();
    current.push(attempt);
    writeStoredAttempts(current);
  }

  getBySession(sessionId: string): Attempt[] {
    return this.load().filter((attempt) => attempt.sessionId === sessionId);
  }

  getAll(userId?: string): Attempt[] {
    const all = this.load();
    return userId ? all.filter((attempt) => attempt.userId === userId) : [...all];
  }

  getByQuestion(questionId: string): Attempt[] {
    return this.load().filter((attempt) => attempt.questionId === questionId);
  }

  getBySkill(skillId: string): Attempt[] {
    return this.load().filter((attempt) => attempt.skillId === skillId);
  }

  getByTopic(topicId: string): Attempt[] {
    return this.load().filter((attempt) => attempt.topicId === topicId);
  }

  getIncorrect(userId?: string): Attempt[] {
    return this.load().filter(
      (attempt) => !attempt.isCorrect && (userId === undefined || attempt.userId === userId),
    );
  }
}

export const localAttemptRecorder = new LocalAttemptRecorder();
