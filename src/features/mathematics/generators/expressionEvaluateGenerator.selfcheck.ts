/**
 * Проверка генератора M08. Не импортируется приложением и не попадает в production-банк.
 */
import type { Task } from '../../../types';
import {
  M08_GENERATOR_ID,
  M08_SKILL_ID,
  classifyPriorities,
  countOps,
  evaluateExpression,
  evaluateIgnoringParens,
  evaluateLeftToRight,
  expressionFingerprint,
  generateM08Series,
  generateM08Task,
  hasParens,
  isValidM08Level,
  type ExpressionSubtype,
  type M08GeneratorParams,
} from './expressionEvaluateGenerator';

const TEST_SEED = 20270808;
const PER_LEVEL = 10;

const L1_SUBTYPES: ExpressionSubtype[] = ['same_priority_add_sub', 'same_priority_mul_div'];
const L2_SUBTYPES: ExpressionSubtype[] = ['mixed_no_parens'];
const L3_SUBTYPES: ExpressionSubtype[] = ['with_parens'];

function paramsOf(task: Task): M08GeneratorParams {
  return task.generatorParams as M08GeneratorParams;
}

function recordedValue(task: Task): number {
  return typeof task.correctAnswer === 'number' ? task.correctAnswer : Number(task.correctAnswer);
}

export function generateM08InspectionSeries(): Task[] {
  return generateM08Series({ seed: TEST_SEED, countPerLevel: PER_LEVEL });
}

export function formatM08InspectionReport(tasks: readonly Task[]): string {
  const lines = ['Тестовая серия M08 (не входит в production-банк):'];
  tasks.forEach((task, index) => {
    const params = paramsOf(task);
    lines.push(
      [
        String(index + 1).padStart(2, '0'),
        `L${task.difficulty}`,
        task.taskType,
        params.expression,
        `= ${recordedValue(task)}`,
        params.subtype,
        `ops=${params.opsCount}`,
        `prio=${params.priorities}`,
        `features=${params.features.join(',') || '—'}`,
      ].join('  '),
    );
  });
  return lines.join('\n');
}

export function runM08GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  try {
    generateM08Task({ difficulty: 4, seed: 1 });
    check(false, 'L4 должен выбрасывать ошибку');
  } catch {
    check(true, 'L4 отклонён');
  }
  try {
    generateM08Task({ difficulty: 5, seed: 1 });
    check(false, 'L5 должен выбрасывать ошибку');
  } catch {
    check(true, 'L5 отклонён');
  }

  const series = generateM08InspectionSeries();
  check(series.length === 30, `ожидалось 30 заданий, получено ${series.length}`);

  const byLevel: Record<1 | 2 | 3, Task[]> = { 1: [], 2: [], 3: [] };
  const fingerprints: string[] = [];
  let sawLtrTrap = false;
  let sawParensChange = false;

  for (const task of series) {
    const difficulty = task.difficulty as 1 | 2 | 3;
    byLevel[difficulty].push(task);
    fingerprints.push(expressionFingerprint(paramsOf(task).tokens));
  }

  check(byLevel[1].length === PER_LEVEL, 'L1: 10 заданий');
  check(byLevel[2].length === PER_LEVEL, 'L2: 10 заданий');
  check(byLevel[3].length === PER_LEVEL, 'L3: 10 заданий');
  check(new Set(fingerprints).size === fingerprints.length, 'в серии нет дублей выражений');
  check(new Set(series.map((task) => task.id)).size === series.length, 'id заданий уникальны');

  for (const [levelText, group] of Object.entries(byLevel)) {
    const difficulty = Number(levelText) as 1 | 2 | 3;
    const allowed =
      difficulty === 1 ? L1_SUBTYPES : difficulty === 2 ? L2_SUBTYPES : L3_SUBTYPES;

    for (const task of group) {
      const params = paramsOf(task);
      const computed = evaluateExpression(params.tokens);
      const label = `${task.id} (${params.expression})`;

      check(computed !== null, `${label}: выражение вычислимо`);
      check(task.skillId === M08_SKILL_ID, `${label}: skillId канонический`);
      check(task.skillId !== 'M08', `${label}: краткий код не подменяет skillId`);
      check(task.difficulty === difficulty, `${label}: difficulty`);
      check(task.subject === 'mathematics', `${label}: subject`);
      check(task.sourceType === 'generated', `${label}: sourceType generated`);
      check(task.generatorId === M08_GENERATOR_ID, `${label}: generatorId`);
      check(task.vprVersion === 2027, `${label}: vprVersion`);
      check(computed === recordedValue(task), `${label}: ответ равен пересчёту`);
      check(params.value === computed, `${label}: value пересчитан`);
      check(isValidM08Level(params.tokens, difficulty), `${label}: структура уровня ${difficulty}`);
      check(allowed.includes(params.subtype), `${label}: подтип ${params.subtype} разрешён на L${difficulty}`);
      check(task.question.includes(params.expression), `${label}: условие содержит выражение`);
      check(countOps(params.tokens) === params.opsCount, `${label}: opsCount согласован`);
      check(hasParens(params.tokens) === params.hasParens, `${label}: hasParens согласован`);
      check(classifyPriorities(params.tokens) === params.priorities, `${label}: priorities согласованы`);

      if (difficulty === 1) {
        check(!params.hasParens, `${label}: L1 без скобок`);
        check(params.priorities === 'same_add_sub' || params.priorities === 'same_mul_div', `${label}: L1 один приоритет`);
        check(params.opsCount >= 2 && params.opsCount <= 3, `${label}: L1 — 2–3 действия`);
        check(!isValidM08Level(params.tokens, 2), `${label}: L1 не проходит как L2`);
        check(!isValidM08Level(params.tokens, 3), `${label}: L1 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L1 → singleChoice`);
      }

      if (difficulty === 2) {
        check(!params.hasParens, `${label}: L2 без скобок`);
        check(params.priorities === 'mixed', `${label}: L2 смешанный приоритет`);
        check(params.opsCount >= 2 && params.opsCount <= 3, `${label}: L2 — 2–3 действия`);
        check(!isValidM08Level(params.tokens, 1), `${label}: L2 не проходит как L1`);
        check(!isValidM08Level(params.tokens, 3), `${label}: L2 не проходит как L3`);
        check(task.taskType === 'singleChoice', `${label}: L2 → singleChoice`);
        const ltr = evaluateLeftToRight(params.tokens);
        if (ltr !== null && computed !== null && ltr !== computed) {
          sawLtrTrap = true;
        }
      }

      if (difficulty === 3) {
        check(params.hasParens, `${label}: L3 со скобками`);
        check(params.opsCount >= 3 && params.opsCount <= 4, `${label}: L3 — 3–4 действия`);
        check(!isValidM08Level(params.tokens, 1), `${label}: L3 не проходит как L1`);
        check(!isValidM08Level(params.tokens, 2), `${label}: L3 не проходит как L2`);
        check(task.taskType === 'numberAnswer', `${label}: L3 → numberAnswer`);
        check(task.correctAnswer === computed, `${label}: correctAnswer число`);
        const ignored = evaluateIgnoringParens(params.tokens);
        const ltr = evaluateLeftToRight(params.tokens);
        check(
          (ignored !== null && ignored !== computed) || (ltr !== null && ltr !== computed),
          `${label}: скобки содержательны`,
        );
        if (ignored !== null && computed !== null && ignored !== computed) {
          sawParensChange = true;
        }
      }

      if (task.taskType === 'singleChoice') {
        const answers = task.answers ?? [];
        check(answers.length === 4, `${label}: 4 варианта`);
        check(new Set(answers).size === 4, `${label}: варианты уникальны`);
        check(answers.every((item) => /^\d+$/.test(item)), `${label}: варианты числовые`);
        check(
          answers.filter((item) => item === String(computed)).length === 1,
          `${label}: ровно один правильный`,
        );
        for (const wrong of answers.filter((item) => item !== String(computed))) {
          check(Number(wrong) > 0, `${label}: дистрактор ${wrong} положительный`);
          check(Number(wrong) !== computed, `${label}: дистрактор ≠ ответу`);
        }
      }
    }
  }

  check(sawLtrTrap, 'в серии L2 есть left-to-right ловушка');
  check(sawParensChange, 'в серии L3 есть отличие при игноре скобок');

  const sameSeedAgain = generateM08InspectionSeries();
  check(
    JSON.stringify(sameSeedAgain.map((task) => task.id)) === JSON.stringify(series.map((task) => task.id)),
    'одинаковый seed даёт ту же серию',
  );

  return failures;
}

export function reportM08GeneratorSelfChecks(): void {
  const series = generateM08InspectionSeries();
  const failures = runM08GeneratorSelfChecks();
  console.log(formatM08InspectionReport(series));
  if (failures.length > 0) {
    throw new Error(`M08 generator self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('M08 generator self-check: 30 заданий валидны, дубликатов нет.');
}
