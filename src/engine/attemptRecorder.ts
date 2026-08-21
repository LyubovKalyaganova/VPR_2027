import type { Attempt } from '../types';

export interface AttemptRecorder {
  record(attempt: Attempt): void;
  getBySession(sessionId: string): Attempt[];
  getAll(userId?: string): Attempt[];
  getByQuestion(questionId: string): Attempt[];
  getBySkill(skillId: string): Attempt[];
  getByTopic(topicId: string): Attempt[];
  getIncorrect(userId?: string): Attempt[];
}
