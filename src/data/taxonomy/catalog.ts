import { SUBJECTS } from '../demo/subjects';
import type { Subject, SubjectId } from '../../types';
import { ENGLISH_SKILLS } from './english';
import { MATH_SKILLS } from './math';
import { READING_SKILLS } from './literaryReading';
import { RUSSIAN_SKILLS } from './russian';
import { WORLD_SKILLS } from './world';

export const SUBJECT_ORDER: readonly SubjectId[] = [
  'russian',
  'mathematics',
  'world',
  'reading',
  'english',
];

export type CatalogSkillRef = {
  id: string;
  title: string;
};

export function skillsForSubject(subject: SubjectId): readonly CatalogSkillRef[] {
  switch (subject) {
    case 'mathematics':
      return MATH_SKILLS;
    case 'russian':
      return RUSSIAN_SKILLS;
    case 'world':
      return WORLD_SKILLS;
    case 'reading':
      return READING_SKILLS;
    case 'english':
      return ENGLISH_SKILLS;
  }
}

export function allCatalogSkills(): CatalogSkillRef[] {
  return SUBJECT_ORDER.flatMap((subject) => [...skillsForSubject(subject)]);
}

export function skillTitleById(skillId: string | undefined): string | undefined {
  if (!skillId) {
    return undefined;
  }
  return allCatalogSkills().find((skill) => skill.id === skillId)?.title;
}

export function subjectIdFromSkillId(skillId: string | undefined): SubjectId | undefined {
  if (!skillId) {
    return undefined;
  }
  if (skillId.startsWith('math.')) {
    return 'mathematics';
  }
  if (skillId.startsWith('russian.')) {
    return 'russian';
  }
  if (skillId.startsWith('world.')) {
    return 'world';
  }
  if (skillId.startsWith('reading.')) {
    return 'reading';
  }
  if (skillId.startsWith('english.')) {
    return 'english';
  }
  return undefined;
}

export function visibleSubjects(selected?: readonly SubjectId[] | null): Subject[] {
  if (!selected || selected.length === 0) {
    return SUBJECTS;
  }
  const allowed = new Set(selected);
  const filtered = SUBJECTS.filter((subject) => allowed.has(subject.id));
  return filtered.length > 0 ? filtered : SUBJECTS;
}

export function visibleSubjectIds(selected?: readonly SubjectId[] | null): SubjectId[] {
  return visibleSubjects(selected).map((subject) => subject.id);
}

/**
 * Сколько заданий плана на один предмет.
 * Один предмет — полноценные 5. Несколько — короче, чтобы дневной объём оставался посильным.
 */
export function dailyPlanCountForSelection(selectedCount: number): number {
  if (selectedCount <= 1) {
    return 5;
  }
  if (selectedCount === 2) {
    return 3;
  }
  return 2;
}
