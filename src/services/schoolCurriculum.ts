import type { SchoolMonth, SubjectId } from '../types';
import { MATH_SKILLS } from '../data/taxonomy/math';
import { RUSSIAN_SKILLS } from '../data/taxonomy/russian';
import { WORLD_SKILLS } from '../data/taxonomy/world';
import { READING_SKILLS } from '../data/taxonomy/literaryReading';
import { ENGLISH_SKILLS } from '../data/taxonomy/english';

export type { SchoolMonth };

export const SCHOOL_MONTHS: readonly { id: SchoolMonth; title: string; short: string }[] = [
  { id: 1, title: 'Сентябрь', short: 'Сен' },
  { id: 2, title: 'Октябрь', short: 'Окт' },
  { id: 3, title: 'Ноябрь', short: 'Ноя' },
  { id: 4, title: 'Декабрь', short: 'Дек' },
  { id: 5, title: 'Январь', short: 'Янв' },
  { id: 6, title: 'Февраль', short: 'Фев' },
  { id: 7, title: 'Март', short: 'Мар' },
  { id: 8, title: 'Апрель', short: 'Апр' },
  { id: 9, title: 'Май', short: 'Май' },
];

/** Месяц открытия по коду навыка (M01, R01, …). */
const UNLOCK_BY_CODE: Readonly<Record<string, SchoolMonth>> = {
  // Математика: база → величины/геометрия → данные → текстовые → движение/логика
  M01: 1, M02: 1, M03: 1, M04: 1, M05: 1, M06: 1,
  M07: 2, M08: 2, M09: 2, M10: 2, M11: 2,
  M12: 3, M13: 3, M14: 3, M15: 3, M16: 3, M19: 3, M20: 3,
  M17: 4, M18: 4, M21: 4, M22: 4, M23: 4, M24: 4, M25: 4,
  M26: 5, M27: 5, M28: 5,
  M29: 6,
  M30: 7, M31: 7, M32: 7,
  M33: 8, M34: 8,
  M35: 9,

  // Русский: опора 1–3 → орфография → морфология → текст/речь
  R01: 1, R05: 1, R08: 1, R09: 1,
  R02: 2, R03: 2, R04: 2, R06: 2,
  R07: 3, R10: 3, R11: 3, R12: 3,
  R13: 4, R14: 4, R15: 4,
  R16: 5, R17: 5,
  R18: 6, R19: 6, R20: 6,
  R21: 7, R22: 7, R23: 7,
  R24: 8, R25: 8,

  // Окружающий мир: природа/здоровье → зоны → общество → остальное
  W01: 1, W05: 1, W06: 1, W07: 1,
  W02: 2, W03: 2, W04: 2,
  W08: 3, W09: 3,
  W10: 4, W11: 4, W12: 4,
  W13: 5, W14: 5,
  W15: 6, W16: 6, W17: 6,
  W18: 7, W19: 7, W20: 7,
  W21: 8, W22: 8, W23: 8,
  W24: 9, W25: 9,

  // Чтение: жанры → понимание → герои → высказывание
  L01: 1, L02: 1, L04: 1, L05: 1,
  L06: 2, L07: 2, L09: 2,
  L08: 3, L10: 3, L11: 3,
  L12: 4, L14: 4, L15: 4,
  L16: 5, L17: 5,
  L18: 6, L19: 6, L20: 6,
  L03: 7, L13: 7, L21: 7,
  L22: 8, L23: 8,
  L24: 9,

  // Английский: лексика/простые времена → чтение → аудирование/ВПР-форматы
  E12: 1, E13: 1, E09: 1, E17: 1,
  E07: 2, E04: 2, E05: 2,
  E06: 3, E08: 3,
  E01: 4, E02: 4, E03: 4,
  E10: 5, E11: 5,
  E14: 6, E15: 6,
  E16: 7,
  E18: 8,
};

const SKILLS_BY_SUBJECT: Record<SubjectId, readonly { id: string; code: string }[]> = {
  mathematics: MATH_SKILLS,
  russian: RUSSIAN_SKILLS,
  world: WORLD_SKILLS,
  reading: READING_SKILLS,
  english: ENGLISH_SKILLS,
};

export function isSchoolMonth(value: unknown): value is SchoolMonth {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9;
}

/** Календарный месяц → учебный (лето считаем сентябрём — старт года). */
export function schoolMonthFromDate(date = new Date()): SchoolMonth {
  const month = date.getMonth() + 1; // 1–12
  if (month >= 9) {
    return (month - 8) as SchoolMonth; // 9→1 … 12→4
  }
  if (month >= 1 && month <= 5) {
    return (month + 4) as SchoolMonth; // 1→5 … 5→9
  }
  return 1; // июнь–август → сентябрь
}

export function schoolMonthTitle(month: SchoolMonth): string {
  return SCHOOL_MONTHS.find((item) => item.id === month)?.title ?? 'Сентябрь';
}

export function resolveSchoolMonth(profileMonth: SchoolMonth | null | undefined, now = new Date()): SchoolMonth {
  if (isSchoolMonth(profileMonth)) {
    return profileMonth;
  }
  return schoolMonthFromDate(now);
}

export function unlockMonthForCode(code: string): SchoolMonth {
  return UNLOCK_BY_CODE[code] ?? 9;
}

export function isCodeUnlocked(code: string, schoolMonth: SchoolMonth): boolean {
  return unlockMonthForCode(code) <= schoolMonth;
}

export function isSkillIdUnlocked(skillId: string, schoolMonth: SchoolMonth): boolean {
  for (const skills of Object.values(SKILLS_BY_SUBJECT)) {
    const found = skills.find((skill) => skill.id === skillId);
    if (found) {
      return isCodeUnlocked(found.code, schoolMonth);
    }
  }
  return schoolMonth >= 9;
}

export function getUnlockedCodes(subject: SubjectId, schoolMonth: SchoolMonth): string[] {
  return SKILLS_BY_SUBJECT[subject]
    .filter((skill) => isCodeUnlocked(skill.code, schoolMonth))
    .map((skill) => skill.code);
}

export function getUnlockedSkillIds(subject: SubjectId, schoolMonth: SchoolMonth): string[] {
  return SKILLS_BY_SUBJECT[subject]
    .filter((skill) => isCodeUnlocked(skill.code, schoolMonth))
    .map((skill) => skill.id);
}

export function filterCodesBySchoolMonth<T extends string>(
  codes: readonly T[],
  schoolMonth: SchoolMonth,
): T[] {
  const unlocked = codes.filter((code) => isCodeUnlocked(code, schoolMonth));
  return unlocked.length > 0 ? unlocked : [...codes];
}

export function curriculumProgressLabel(schoolMonth: SchoolMonth): string {
  return `Темы до ${schoolMonthTitle(schoolMonth).toLowerCase()} включительно`;
}
