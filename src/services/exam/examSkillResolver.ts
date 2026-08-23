import type { SubjectId } from '../../types';
import { MATH_SKILL_WEIGHTS } from '../../features/mathematics/mathTrainingWeights';
import { RUSSIAN_SKILL_WEIGHTS } from '../../features/russian/russianTrainingWeights';
import { WORLD_SKILL_WEIGHTS } from '../../features/world/worldTrainingWeights';
import { READING_SKILL_WEIGHTS } from '../../features/reading/literaryReadingTrainingWeights';
import { ENGLISH_SKILL_WEIGHTS } from '../../features/english/englishTrainingWeights';

type WeightRow = { code: string; skillId: string };

function weightsFor(subjectId: SubjectId): readonly WeightRow[] {
  switch (subjectId) {
    case 'mathematics':
      return MATH_SKILL_WEIGHTS;
    case 'russian':
      return RUSSIAN_SKILL_WEIGHTS;
    case 'world':
      return WORLD_SKILL_WEIGHTS;
    case 'reading':
      return READING_SKILL_WEIGHTS;
    case 'english':
      return ENGLISH_SKILL_WEIGHTS;
  }
}

export function resolveSkillIds(subjectId: SubjectId, codes: readonly string[]): string[] {
  const table = weightsFor(subjectId);
  const ids: string[] = [];
  for (const code of codes) {
    const row = table.find((item) => item.code === code);
    if (row && !ids.includes(row.skillId)) {
      ids.push(row.skillId);
    }
  }
  return ids;
}

export function primarySkillId(subjectId: SubjectId, codes: readonly string[]): string | undefined {
  return resolveSkillIds(subjectId, codes)[0];
}

export function skillCodeForId(subjectId: SubjectId, skillId: string): string | undefined {
  return weightsFor(subjectId).find((row) => row.skillId === skillId)?.code;
}
