import type { Skill, Subject, SubjectId, Topic } from '../../types';

export const SUBJECTS: Subject[] = [
  {
    id: 'russian',
    title: 'Русский язык',
    shortTitle: 'Русский',
    description: 'Правописание, предложение и работа с текстом',
    accent: 'var(--subject-russian)',
  },
  {
    id: 'mathematics',
    title: 'Математика',
    shortTitle: 'Математика',
    description: 'Вычисления, величины и текстовые задачи',
    accent: 'var(--subject-mathematics)',
  },
  {
    id: 'world',
    title: 'Окружающий мир',
    shortTitle: 'Окр. мир',
    description: 'Природа, человек, общество и родная страна',
    accent: 'var(--subject-world)',
  },
  {
    id: 'reading',
    title: 'Литературное чтение',
    shortTitle: 'Чтение',
    description: 'Тексты, авторы и понимание прочитанного',
    accent: 'var(--subject-reading)',
  },
  {
    id: 'english',
    title: 'Английский язык',
    shortTitle: 'English',
    description: 'Слова, чтение, грамматика и аудирование',
    accent: 'var(--subject-english)',
  },
];

export const TOPICS: Topic[] = [
  { id: 'rus-spelling', subjectId: 'russian', section: 'Правописание', title: 'Орфография' },
  { id: 'rus-sentence', subjectId: 'russian', section: 'Предложение', title: 'Грамматическая основа' },
  { id: 'math-calc', subjectId: 'mathematics', section: 'Вычисления', title: 'Вычисления' },
  { id: 'math-motion', subjectId: 'mathematics', section: 'Текстовые задачи', title: 'Задачи на движение' },
  { id: 'world-nature', subjectId: 'world', section: 'Природа', title: 'Природа и человек' },
  { id: 'read-text', subjectId: 'reading', section: 'Работа с текстом', title: 'Понимание текста' },
  { id: 'eng-vocab', subjectId: 'english', section: 'Vocabulary', title: 'Словарный запас' },
];

export interface DemoSkill extends Skill {
  demoScore: number;
}

export const DEMO_SKILLS: DemoSkill[] = [
  { id: 'rus-1', subjectId: 'russian', topicId: 'rus-spelling', title: 'Правописание', demoScore: 84 },
  { id: 'rus-2', subjectId: 'russian', topicId: 'rus-spelling', title: 'Ударение', demoScore: 78 },
  { id: 'rus-3', subjectId: 'russian', topicId: 'rus-sentence', title: 'Части речи', demoScore: 71 },
  { id: 'rus-4', subjectId: 'russian', topicId: 'rus-sentence', title: 'Предложение', demoScore: 88 },
  { id: 'rus-5', subjectId: 'russian', topicId: 'rus-sentence', title: 'Работа с текстом', demoScore: 82 },
  { id: 'math-1', subjectId: 'mathematics', topicId: 'math-calc', title: 'Вычисления', demoScore: 94 },
  { id: 'math-2', subjectId: 'mathematics', topicId: 'math-calc', title: 'Порядок действий', demoScore: 88 },
  { id: 'math-3', subjectId: 'mathematics', topicId: 'math-calc', title: 'Величины', demoScore: 72 },
  { id: 'math-4', subjectId: 'mathematics', topicId: 'math-calc', title: 'Геометрия', demoScore: 68 },
  { id: 'math-5', subjectId: 'mathematics', topicId: 'math-calc', title: 'Таблицы', demoScore: 91 },
  { id: 'math-6', subjectId: 'mathematics', topicId: 'math-motion', title: 'Текстовые задачи', demoScore: 51 },
  { id: 'math-7', subjectId: 'mathematics', topicId: 'math-motion', title: 'Движение', demoScore: 48 },
  { id: 'math-8', subjectId: 'mathematics', topicId: 'math-motion', title: 'Логика', demoScore: 64 },
  { id: 'world-1', subjectId: 'world', topicId: 'world-nature', title: 'Природа', demoScore: 76 },
  { id: 'world-2', subjectId: 'world', topicId: 'world-nature', title: 'Человек и здоровье', demoScore: 81 },
  { id: 'world-3', subjectId: 'world', topicId: 'world-nature', title: 'Природные зоны', demoScore: 58 },
  { id: 'world-4', subjectId: 'world', topicId: 'world-nature', title: 'История России', demoScore: 63 },
  { id: 'world-5', subjectId: 'world', topicId: 'world-nature', title: 'Экология', demoScore: 70 },
  { id: 'read-1', subjectId: 'reading', topicId: 'read-text', title: 'Жанры', demoScore: 86 },
  { id: 'read-2', subjectId: 'reading', topicId: 'read-text', title: 'Авторы и произведения', demoScore: 74 },
  { id: 'read-3', subjectId: 'reading', topicId: 'read-text', title: 'Последовательность событий', demoScore: 69 },
  { id: 'read-4', subjectId: 'reading', topicId: 'read-text', title: 'Значение слов', demoScore: 88 },
  { id: 'read-5', subjectId: 'reading', topicId: 'read-text', title: 'Интерпретация', demoScore: 77 },
  { id: 'eng-1', subjectId: 'english', topicId: 'eng-vocab', title: 'Vocabulary', demoScore: 73 },
  { id: 'eng-2', subjectId: 'english', topicId: 'eng-vocab', title: 'Reading', demoScore: 68 },
  { id: 'eng-3', subjectId: 'english', topicId: 'eng-vocab', title: 'Grammar', demoScore: 61 },
  { id: 'eng-4', subjectId: 'english', topicId: 'eng-vocab', title: 'Spelling', demoScore: 79 },
  { id: 'eng-5', subjectId: 'english', topicId: 'eng-vocab', title: 'Listening', demoScore: 55 },
];

export const SUBJECT_PROGRESS: Record<SubjectId, number> = {
  russian: 81,
  mathematics: 74,
  world: 69,
  reading: 82,
  english: 71,
};

export const OVERALL_READINESS = 76;

export const SUBJECT_STATUS: Record<SubjectId, string> = {
  russian: 'Хорошо идёт',
  mathematics: 'Есть слабые темы',
  world: 'Нужно повторение',
  reading: 'Уверенный уровень',
  english: 'Стоит подтянуть',
};

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((subject) => subject.id === id);
}

export function getSkillsBySubject(id: SubjectId): DemoSkill[] {
  return DEMO_SKILLS.filter((skill) => skill.subjectId === id);
}
