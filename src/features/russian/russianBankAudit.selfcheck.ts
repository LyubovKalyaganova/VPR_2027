/**
 * Аудит training pool русского языка: разнообразие, дубликаты, валидность.
 */
import { RUSSIAN_SKILLS } from '../../data/taxonomy/russian';
import { checkTask } from '../../engine/checkers';
import { isAnswerReady } from '../../engine/answerState';
import { buildRussianTrainingPool, selectWeightedRussianSessionTasks } from './russianTrainingSelection';
import { getRussianSkillWeightBySkillId } from './russianTrainingWeights';
import { generateRussianTask } from './generators/skillGenerators';
import { taskRepository } from '../../services/taskRepository';
import { choiceQualityIssue, matchingQualityIssue } from '../../utils/taskChoiceQuality';

const REASONING_SUBTYPES = new Set([
  'find_error_rule',
  'find_error',
  'first_step',
  'next_step',
  'choose_sequence',
  'next_morpheme_step',
  'choose_schema',
  'theme_vs_main',
  'extra_part',
  'best_plan',
  'order_events',
]);

export function runRussianBankAuditSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const pool = buildRussianTrainingPool({ perLevel: 3, seed: 20270823 });
  const repoPool = taskRepository.getRussianTasks();

  check(pool.length === 225, `pool generated ${pool.length} (expected 225)`);
  check(repoPool.length >= 150, `repo pool ${repoPool.length}`);

  const bySkill: Record<string, number> = {};
  const bySubtype: Record<string, number> = {};
  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const questions = new Map<string, number>();
  const qaPairs = new Map<string, number>();

  for (const task of pool) {
    check(task.subject === 'russian', `subject ${task.id}`);
    check(typeof task.skillId === 'string' && task.skillId.length > 0, `skillId ${task.id}`);
    check(typeof task.topicId === 'string', `topicId ${task.id}`);
    check(task.difficulty >= 1 && task.difficulty <= 3, `difficulty ${task.id}`);

    bySkill[task.skillId ?? ''] = (bySkill[task.skillId ?? ''] ?? 0) + 1;
    if (task.difficulty <= 3) byLevel[task.difficulty as 1 | 2 | 3] += 1;

    const st = String((task.generatorParams as { subtype?: string })?.subtype ?? 'none');
    bySubtype[st] = (bySubtype[st] ?? 0) + 1;

    const qKey = task.question.trim();
    questions.set(qKey, (questions.get(qKey) ?? 0) + 1);
    const qaKey = `${qKey}::${String(task.correctAnswer)}`;
    qaPairs.set(qaKey, (qaPairs.get(qaKey) ?? 0) + 1);

    check(task.question.trim().length > 5, `empty question ${task.id}`);
    const choiceIssue = choiceQualityIssue(task);
    check(!choiceIssue, choiceIssue ?? '');
    const matchIssue = matchingQualityIssue(task);
    check(!matchIssue, matchIssue ?? '');
    check(String(task.correctAnswer).length > 0, `empty answer ${task.id}`);

    if (task.taskType === 'singleChoice' || task.taskType === 'audio' || task.taskType === 'imageTask') {
      check((task.answers?.length ?? 0) >= 4, `choices ${task.id}`);
      check(Boolean(task.answers?.includes(String(task.correctAnswer))), `correct in choices ${task.id}`);
    }

    if (task.taskType === 'ordering') {
      check(Array.isArray(task.correctAnswer) && task.correctAnswer.length >= 2, `ordering ${task.id}`);
    }

    const sampleAnswer =
      task.taskType === 'ordering'
        ? (task.correctAnswer as string[])
        : task.taskType === 'numberAnswer'
          ? Number(task.correctAnswer)
          : String(task.correctAnswer);
    check(isAnswerReady(task, sampleAnswer as never), `answer ready ${task.id}`);
    if (task.taskType !== 'ordering') {
      check(checkTask(task, sampleAnswer as never), `checker ${task.id}`);
    }
  }

  for (const skill of RUSSIAN_SKILLS) {
    check((bySkill[skill.id] ?? 0) >= 3, `count ${skill.code}: ${bySkill[skill.id] ?? 0}`);
  }

  check(new Set(pool.map((t) => t.id)).size === pool.length, 'unique task ids');

  const dupQuestions = [...questions.entries()].filter(([, n]) => n > 6);
  check(dupQuestions.length <= 35, `duplicate question templates ${dupQuestions.length}`);

  const dupQa = [...qaPairs.entries()].filter(([, n]) => n > 5);
  check(dupQa.length <= 15, `duplicate Q+A pairs (>5×) ${dupQa.length}`);

  check(byLevel[1]! > 0 && byLevel[2]! > 0 && byLevel[3]! > 0, 'levels L1-L3');

  const prioritySkills = ['R01', 'R06', 'R07', 'R18', 'R19', 'R23'];
  for (const code of prioritySkills) {
    const skillId = RUSSIAN_SKILLS.find((s) => s.code === code)?.id;
    check((bySkill[skillId ?? ''] ?? 0) >= 3, `priority ${code}`);
  }

  let reasoningCount = 0;
  for (const task of pool) {
    const st = String((task.generatorParams as { subtype?: string })?.subtype ?? '');
    if (REASONING_SUBTYPES.has(st) || (task.generatorParams as { reasoningMode?: string })?.reasoningMode) {
      reasoningCount += 1;
    }
  }
  check(reasoningCount >= 20, `reasoning tasks ${reasoningCount}`);

  const r18Subs = new Set<string>();
  const r19Subs = new Set<string>();
  for (const st of ['theme', 'main_idea', 'heading', 'theme_vs_main'] as const) {
    r18Subs.add(String((generateRussianTask('R18', { difficulty: 2, seed: 100, subtype: st }).generatorParams as { subtype?: string }).subtype));
  }
  for (const st of ['order_events', 'extra_part', 'best_plan'] as const) {
    r19Subs.add(String((generateRussianTask('R19', { difficulty: 2, seed: 100, subtype: st }).generatorParams as { subtype?: string }).subtype));
  }
  check(r18Subs.has('theme') && r18Subs.has('main_idea') && r18Subs.has('heading'), `R18 subs ${[...r18Subs]}`);
  check(r19Subs.has('order_events') && r19Subs.has('extra_part') && r19Subs.has('best_plan'), `R19 subs ${[...r19Subs]}`);

  const r07 = generateRussianTask('R07', { difficulty: 2, seed: 777 });
  check(r07.taskType === 'audio', 'R07 audio type');
  check(Boolean(r07.transcript), 'R07 transcript');

  return failures;
}

export function runRussianWeightedStatsAudit(): { failures: string[]; stats: Record<string, number> } {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const N = 2000;
  const tasks = selectWeightedRussianSessionTasks(N, { seed: 424242, shuffleOrder: false });
  check(tasks.length === N, `weighted N=${tasks.length}`);
  check(tasks.every((t) => t.subject === 'russian'), 'all russian subject');

  const tierCounts = { CORE_HIGH: 0, CORE_MEDIUM: 0, SUPPORT: 0, EXTENSION: 0 };
  const codeCounts: Record<string, number> = {};
  let extensionTasks = 0;

  for (const task of tasks) {
    const w = getRussianSkillWeightBySkillId(task.skillId ?? '');
    if (w) {
      tierCounts[w.tier] += 1;
      codeCounts[w.code] = (codeCounts[w.code] ?? 0) + 1;
      if ((task.generatorParams as { extension?: boolean })?.extension) extensionTasks += 1;
    }
  }

  check(tierCounts.CORE_HIGH > tierCounts.CORE_MEDIUM, `HIGH ${tierCounts.CORE_HIGH} > MED ${tierCounts.CORE_MEDIUM}`);
  check(tierCounts.CORE_MEDIUM > tierCounts.SUPPORT, `MED ${tierCounts.CORE_MEDIUM} > SUP ${tierCounts.SUPPORT}`);
  check(extensionTasks / N <= 0.12 + 0.02, `extension cap ${((extensionTasks / N) * 100).toFixed(1)}%`);

  const r07 = codeCounts.R07 ?? 0;
  const r24 = codeCounts.R24 ?? 0;
  const r25 = codeCounts.R25 ?? 0;
  check(r07 > r24 && r07 > r25, `R07 ${r07} > R24/R25 ${r24}/${r25}`);

  const stats: Record<string, number> = {
    ...tierCounts,
    R07_pct: Math.round((r07 / N) * 1000) / 10,
    R18_pct: Math.round(((codeCounts.R18 ?? 0) / N) * 1000) / 10,
    R19_pct: Math.round(((codeCounts.R19 ?? 0) / N) * 1000) / 10,
    R23_pct: Math.round(((codeCounts.R23 ?? 0) / N) * 1000) / 10,
    EXTENSION_pct: Math.round((extensionTasks / N) * 1000) / 10,
  };

  return { failures, stats };
}

export function reportRussianBankAuditSelfChecks(): void {
  const bankFailures = runRussianBankAuditSelfChecks();
  const { failures: weightFailures, stats } = runRussianWeightedStatsAudit();
  const failures = [...bankFailures, ...weightFailures];
  if (failures.length) {
    throw new Error(`Russian bank audit failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Russian bank audit: OK', JSON.stringify(stats));
}
