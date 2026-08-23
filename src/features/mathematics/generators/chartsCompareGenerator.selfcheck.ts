/**
 * Self-check M25: сравнение по SVG без утечки значений.
 */
import { chartLeaksValues } from './chartsReadGenerator';
import {
  M25_GENERATOR_ID,
  M25_SKILL_ID,
  generateM25Series,
  generateM25Task,
  isValidM25Level,
  questionLeaksBarValues,
  type ChartsCompareSubtype,
  type M25GeneratorParams,
} from './chartsCompareGenerator';

export function runM25GeneratorSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (c: boolean, m: string) => {
    if (!c) failures.push(m);
  };

  let threw = false;
  try {
    generateM25Task({ difficulty: 4, seed: 1 });
  } catch {
    threw = true;
  }
  check(threw, 'L4');

  // NEGATIVE / POSITIVE leak helpers
  const sampleBars = [
    { name: 'Аня', value: 15, divisions: 3 },
    { name: 'Боря', value: 10, divisions: 2 },
  ];
  check(questionLeaksBarValues('У Бори 15 баллов, у Ани 10 баллов. На сколько больше?', sampleBars), 'NEG: leak in question');
  check(questionLeaksBarValues('На сколько у «Бори» больше, чем у «Ани»?', sampleBars) === false, 'POS: clean compare question');
  check(isValidM25Level(1, 'who_greater', sampleBars), 'POS: L1 who_greater');
  check(!isValidM25Level(1, 'sum_with_distractor', sampleBars), 'NEG: L1 wrong subtype');
  check(!isValidM25Level(3, 'who_greater', sampleBars), 'NEG: L3 with only 2 bars who_greater');

  const series = generateM25Series({ seed: 20270325, countPerLevel: 10 });
  check(series.length === 30, '30');
  check(
    JSON.stringify(generateM25Series({ seed: 20270325, countPerLevel: 10 }).map((t) => t.id)) ===
      JSON.stringify(series.map((t) => t.id)),
    'deterministic',
  );

  for (const task of series) {
    const p = task.generatorParams as M25GeneratorParams;
    check(task.skillId === M25_SKILL_ID, `${task.id}: skill`);
    check(task.generatorId === M25_GENERATOR_ID, `${task.id}: gen`);
    check(task.taskType === 'imageTask', `${task.id}: imageTask`);
    check(Boolean(task.image?.startsWith('data:image/svg+xml')), `${task.id}: svg`);
    check(p.hasVisual === true, `${task.id}: hasVisual`);
    check(!chartLeaksValues(task.question, task.image, p.bars), `${task.id}: chartLeaks`);
    check(!questionLeaksBarValues(task.question, p.bars), `${task.id}: questionLeaks`);
    check(!/У \w+ \d+, у \w+ \d+/i.test(task.question), `${task.id}: no plain arithmetic prompt`);
    check(!/остальные столбцы не нужны/i.test(task.question), `${task.id}: no meta`);
    check(isValidM25Level(task.difficulty as 1 | 2 | 3, p.subtype, p.bars), `${task.id}: level`);
    // Не M24: вопрос не «Сколько показывает столбец X?» как единственное чтение
    check(!/^Сколько показывает столбец/i.test(task.question), `${task.id}: not M24 read`);
    if (task.difficulty < 3) {
      check(task.taskType === 'imageTask', `${task.id}: type`);
      const answers = task.answers ?? [];
      check(answers.length === 4, `${task.id}: 4 answers`);
      check(new Set(answers).size === 4, `${task.id}: unique answers`);
      check(answers.includes(String(task.correctAnswer)), `${task.id}: correct in answers`);
    } else {
      check(task.taskType === 'imageTask', `${task.id}: L3 imageTask`);
      check(typeof task.correctAnswer === 'number', `${task.id}: L3 number`);
    }
    // ответ согласован с bars
    if (p.subtype === 'who_greater') {
      const hi = p.bars.reduce((a, b) => (a.value >= b.value ? a : b));
      check(String(task.correctAnswer) === hi.name, `${task.id}: who ans`);
    }
    if (p.subtype === 'how_much_more' && typeof p.answer === 'number') {
      const vals = p.bars.map((b) => b.value).sort((x, y) => y - x);
      // для L1/L2/L3 how_much — разность двух упомянутых; проверяем что answer = |v_i - v_j| для какой-то пары
      const pairDiff = p.bars.some((a, i) =>
        p.bars.some((b, j) => i < j && Math.abs(a.value - b.value) === p.answer),
      );
      check(pairDiff || Math.abs(vals[0]! - vals[vals.length - 1]!) === p.answer, `${task.id}: diff from bars`);
    }
  }

  // single-value "M25" should be invalid via isValid for L1 who with 1 bar
  check(!isValidM25Level(1, 'who_greater' as ChartsCompareSubtype, [sampleBars[0]!]), 'NEG: one bar');

  return failures;
}

export function reportM25GeneratorSelfChecks(): void {
  const f = runM25GeneratorSelfChecks();
  if (f.length) {
    console.error('M25 FAILED:\n' + f.map((x) => ` - ${x}`).join('\n'));
    process.exitCode = 1;
    throw new Error(`M25 generator self-check failed:\n- ${f.join('\n- ')}`);
  }
  console.log('M25 generator self-check: OK');
}
