import type { Task } from '../types';

const BANNED = new Set([
  '—',
  '-',
  '–',
  'не знаю',
  'другое',
  '0',
  'not sure',
  'other',
  'none',
]);

const ALLOW_NE_ZNAYU_SKILLS = new Set(['russian.speech.situational']);

export function isBannedChoiceFiller(text: string): boolean {
  return BANNED.has(text.trim().toLowerCase()) || text.trim() === '—';
}

export function choiceQualityIssue(task: Task): string | null {
  const answers = task.answers ?? [];
  if (answers.length === 0) return null;
  const allowNeZnayu = ALLOW_NE_ZNAYU_SKILLS.has(task.skillId ?? '');
  for (const option of answers) {
    if (allowNeZnayu && option.trim().toLowerCase() === 'не знаю') continue;
    if (isBannedChoiceFiller(option)) {
      return `заполнитель «${option}» в ${task.id}`;
    }
  }
  const unique = new Set(answers.map((item) => item.trim()));
  if (unique.size !== answers.length) {
    return `повтор вариантов в ${task.id}`;
  }
  return null;
}

export function matchingQualityIssue(task: Task): string | null {
  const left = task.matchingLeft ?? [];
  if (left.length === 0) return null;
  if (new Set(left).size !== left.length) {
    return `повтор левой части ${task.id}`;
  }
  const rows = task.matchingRowOptions;
  if (rows && rows.length === left.length) {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] ?? [];
      if (new Set(row).size !== row.length) {
        return `повтор вариантов у ${left[i]} (${task.id})`;
      }
    }
    const letters = (task.passage ?? '').match(/([A-E])_____/g)?.map((m) => m[0]) ?? [];
    if (letters.length > 0) {
      const leftLetters = left.map((item) => item.trim()[0]);
      for (const letter of letters) {
        if (!leftLetters.includes(letter)) {
          return `пропуск ${letter} без варианта в ${task.id}`;
        }
      }
    }
    return null;
  }
  const right = task.matchingRight ?? [];
  if (right.length > 0 && new Set(right).size !== right.length) {
    return `задвоение правых вариантов в ${task.id}`;
  }
  return null;
}

export function taskContentKey(task: Task): string {
  return `${task.skillId ?? ''}|${task.question.trim()}|${String(task.correctAnswer)}`;
}
