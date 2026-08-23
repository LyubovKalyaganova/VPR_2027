/**
 * Проверка генератора M23. Не импортируется приложением.
 */
import type { Task } from '../../../types';
import {
  M23_GENERATOR_ID,
  M23_SKILL_ID,
  generateM23Series,
  generateM23Task,
  isValidM23Level,
  type M23GeneratorParams,
  type TablesCalculateSubtype,
} from './tablesCalculateGenerator';

const TEST_SEED = 20272323;

export function generateM23InspectionSeries(): Task[] {
  return generateM23Series({ seed: TEST_SEED, countPerLevel: 10 });
}

export function runM23GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  for (const level of [4, 5] as const) {
    let threw = false;
    try {
      generateM23Task({ difficulty: level, seed: 1 });
    } catch {
      threw = true;
    }
    check(threw, `L${level} должен бросать ошибку`);
  }

  const a = generateM23Task({ difficulty: 1, seed: 4242 });
  const b = generateM23Task({ difficulty: 1, seed: 4242 });
  check(a.id === b.id, 'одинаковый seed даёт то же задание');

  const series = generateM23InspectionSeries();
  check(series.length === 30, `серия 30, получено ${series.length}`);
  check(new Set(series.map((t) => t.id)).size === 30, 'id уникальны');

  const seen = new Set<TablesCalculateSubtype>();
  for (const task of series) {
    const p = task.generatorParams as M23GeneratorParams;
    seen.add(p.subtype);
    const label = task.id;
    check(task.skillId === M23_SKILL_ID, `${label}: skillId`);
    check(task.generatorId === M23_GENERATOR_ID, `${label}: generatorId`);
    check(task.sourceType === 'generated', `${label}: sourceType`);
    check(task.subject === 'mathematics', `${label}: subject`);
    check(String(task.correctAnswer) === String(p.answer), `${label}: answer sync`);
    check(
      isValidM23Level(task.difficulty as 1 | 2 | 3, p.subtype, p.values),
      `${label}: уровень`,
    );
    check(task.question.includes('|'), `${label}: таблица текстом`);
    if (p.subtype === 'sum_two_cells' || p.subtype === 'row_or_col_sum' || p.subtype === 'how_much_more' || p.subtype === 'multi_step') {
      check(
        /сумм|вместе|всего|на сколько|сложи|вычт|пропуск/i.test(task.question),
        `${label}: вопрос требует вычисления`,
      );
    }
    if (task.difficulty === 1 || task.difficulty === 2) {
      check(task.taskType === 'singleChoice', `${label}: singleChoice`);
      check((task.answers ?? []).length === 4, `${label}: 4 варианта`);
    } else {
      check(task.taskType === 'numberAnswer', `${label}: numberAnswer`);
    }
  }

  check(seen.has('sum_two_cells'), 'есть sum_two_cells');
  check(
    JSON.stringify(generateM23InspectionSeries().map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'серия детерминирована',
  );

  return failures;
}

export function reportM23GeneratorSelfChecks(): void {
  const series = generateM23InspectionSeries();
  console.log(
    ['Тестовая серия M23:', ...series.map((t, i) => {
      const p = t.generatorParams as M23GeneratorParams;
      return `${String(i + 1).padStart(2, '0')}  L${t.difficulty}  ${p.subtype}  → ${t.correctAnswer}`;
    })].join('\n'),
  );
  const failures = runM23GeneratorSelfChecks();
  if (failures.length) {
    throw new Error(`M23 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M23 generator self-check: OK');
}
