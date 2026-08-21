import type { Attempt } from '../types';
import type { AttemptRecorder } from '../engine/attemptRecorder';

export class MemoryAttemptRecorder implements AttemptRecorder {
  private attempts: Attempt[] = [];

  record(attempt: Attempt): void {
    this.attempts.push(attempt);
  }

  getBySession(sessionId: string): Attempt[] {
    return this.attempts.filter((attempt) => attempt.sessionId === sessionId);
  }

  getAll(userId?: string): Attempt[] {
    const all = this.attempts;
    return userId ? all.filter((attempt) => attempt.userId === userId) : [...all];
  }

  getByQuestion(questionId: string): Attempt[] {
    return this.attempts.filter((attempt) => attempt.questionId === questionId);
  }

  getBySkill(skillId: string): Attempt[] {
    return this.attempts.filter((attempt) => attempt.skillId === skillId);
  }

  getByTopic(topicId: string): Attempt[] {
    return this.attempts.filter((attempt) => attempt.topicId === topicId);
  }

  getIncorrect(userId?: string): Attempt[] {
    return this.attempts.filter(
      (attempt) => !attempt.isCorrect && (userId === undefined || attempt.userId === userId),
    );
  }
}

export const memoryAttemptRecorder = new MemoryAttemptRecorder();
