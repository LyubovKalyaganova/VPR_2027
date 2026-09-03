/**
 * Bank audit + weighted N=2000 for literary reading.
 */
import type { Task } from '../../types';
import { READING_SKILLS } from '../../data/taxonomy/literaryReading';
import { checkTask } from '../../engine/checkers';
import { isAnswerReady } from '../../engine/answerState';
import { buildReadingTrainingPool, selectWeightedReadingSessionTasks } from './literaryReadingTrainingSelection';
import { getReadingSkillWeightBySkillId } from './literaryReadingTrainingWeights';
import { generateReadingTask } from './generators/skillGenerators';
import { taskRepository } from '../../services/taskRepository';
import { choiceQualityIssue, matchingQualityIssue } from '../../utils/taskChoiceQuality';

const REASONING_SUBTYPES = new Set([
  'find_error',
  'first_step',
  'next_step',
  'choose_sequence',
  'justify_choice',
  'best_argument',
  'pick_evidence',
  'best_conclusion',
  'find_error_order',
]);

function buildSampleAnswer(task: Task): unknown {
  switch (task.taskType) {
    case 'ordering':
      return task.correctAnswer as string[];
    case 'matching':
    case 'classification': {
      const map: Record<string, string> = {};
      const raw = Array.isArray(task.correctAnswer) ? task.correctAnswer : [];
      for (const pair of raw) {
        const [left, right] = String(pair).split('|');
        if (left && right) map[left] = right;
      }
      return map;
    }
    case 'multipleChoice':
      return Array.isArray(task.correctAnswer) ? task.correctAnswer : [String(task.correctAnswer)];
    default:
      return String(task.correctAnswer);
  }
}

export function runReadingBankAuditSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const pool = buildReadingTrainingPool({ perLevel: 3, seed: 20270823 });
  const repoPool = taskRepository.getLiteraryReadingTasks();
  check(pool.length === 216, `pool ${pool.length}`);
  check(repoPool.length >= 144, `repo ${repoPool.length}`);

  const bySkill: Record<string, number> = {};
  const questions = new Map<string, number>();
  const qaPairs = new Map<string, number>();
  let withPassage = 0;
  let reasoningCount = 0;

  for (const task of pool) {
    check(task.subject === 'reading', `subject ${task.id}`);
    check(Boolean(task.skillId), `skillId ${task.id}`);
    check(Boolean(task.topicId), `topicId ${task.id}`);
    check(task.difficulty >= 1 && task.difficulty <= 3, `diff ${task.id}`);
    bySkill[task.skillId ?? ''] = (bySkill[task.skillId ?? ''] ?? 0) + 1;
    if (task.passage) withPassage += 1;
    const st = String((task.generatorParams as { subtype?: string })?.subtype ?? '');
    if (REASONING_SUBTYPES.has(st) || (task.generatorParams as { reasoningMode?: string })?.reasoningMode) {
      reasoningCount += 1;
    }
    questions.set(task.question.trim(), (questions.get(task.question.trim()) ?? 0) + 1);
    const choiceIssue = choiceQualityIssue(task);
    check(!choiceIssue, choiceIssue ?? '');
    const matchIssue = matchingQualityIssue(task);
    check(!matchIssue, matchIssue ?? '');
    qaPairs.set(`${task.question}::${String(task.correctAnswer)}`, (qaPairs.get(`${task.question}::${String(task.correctAnswer)}`) ?? 0) + 1);

    if (task.taskType === 'singleChoice' || (task.taskType === 'imageTask' && (task.answers?.length ?? 0) >= 4)) {
      check((task.answers?.length ?? 0) >= 4, `choices ${task.id}`);
      check(Boolean(task.answers?.includes(String(task.correctAnswer))), `correct in choices ${task.id}`);
    }
    if (task.taskType === 'ordering') {
      check(Array.isArray(task.correctAnswer) && task.correctAnswer.length >= 2, `ordering ${task.id}`);
    }

    const sample = buildSampleAnswer(task);
    check(isAnswerReady(task, sample as never), `answer ready ${task.id}`);
    if (task.taskType !== 'ordering') {
      check(checkTask(task, sample as never), `checker ${task.id}`);
    }
  }

  for (const skill of READING_SKILLS) {
    check((bySkill[skill.id] ?? 0) >= 3, `count ${skill.code}`);
  }
  check(new Set(pool.map((t) => t.id)).size === pool.length, 'unique ids');
  check([...questions.entries()].filter(([, n]) => n > 6).length <= 40, 'dup questions');
  check([...qaPairs.entries()].filter(([, n]) => n > 5).length <= 20, 'dup Q+A');
  check(withPassage >= 40, `passages ${withPassage}`);
  check(reasoningCount >= 15, `reasoning ${reasoningCount}`);

  const l09 = generateReadingTask('L09', { difficulty: 2, seed: 100, subtype: 'order_events' });
  check(l09.taskType === 'ordering', 'L09 ordering type');
  const l24 = generateReadingTask('L24', { difficulty: 2, seed: 777, subtype: 'find_error' });
  check(Boolean((l24.generatorParams as { reasoningMode?: string }).reasoningMode), 'L24 mode');

  return failures;
}

export function runReadingWeightedStatsAudit(): { failures: string[]; stats: Record<string, number> } {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };
  const N = 2000;
  const tasks = selectWeightedReadingSessionTasks(N, { seed: 424242, shuffleOrder: false });
  check(tasks.length === N, `N=${tasks.length}`);
  check(tasks.every((t) => t.subject === 'reading'), 'all reading');

  const tierCounts = { CORE_HIGH: 0, CORE_MEDIUM: 0, SUPPORT: 0, EXTENSION: 0 };
  const codeCounts: Record<string, number> = {};
  for (const task of tasks) {
    const w = getReadingSkillWeightBySkillId(task.skillId ?? '');
    if (w) {
      tierCounts[w.tier] += 1;
      codeCounts[w.code] = (codeCounts[w.code] ?? 0) + 1;
    }
  }
  check(tierCounts.CORE_HIGH > tierCounts.CORE_MEDIUM, 'HIGH > MED');
  check(tierCounts.CORE_MEDIUM > tierCounts.SUPPORT, 'MED > SUP');
  check(tierCounts.EXTENSION / N <= 0.1 + 0.02, `ext ${tierCounts.EXTENSION}`);
  check((codeCounts.L03 ?? 0) > 0 && (codeCounts.L12 ?? 0) > 0 && (codeCounts.L24 ?? 0) > 0, 'boost present');

  return {
    failures,
    stats: {
      ...tierCounts,
      L03_pct: Math.round(((codeCounts.L03 ?? 0) / N) * 1000) / 10,
      L12_pct: Math.round(((codeCounts.L12 ?? 0) / N) * 1000) / 10,
      L13_pct: Math.round(((codeCounts.L13 ?? 0) / N) * 1000) / 10,
      L24_pct: Math.round(((codeCounts.L24 ?? 0) / N) * 1000) / 10,
      EXTENSION_pct: Math.round((tierCounts.EXTENSION / N) * 1000) / 10,
    },
  };
}

export function reportReadingBankAuditSelfChecks(): void {
  const bankFailures = runReadingBankAuditSelfChecks();
  const { failures: weightFailures, stats } = runReadingWeightedStatsAudit();
  const failures = [...bankFailures, ...weightFailures];
  if (failures.length) {
    throw new Error(`Reading bank audit failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Reading bank audit: OK', JSON.stringify(stats));
}

export const reportLiteraryReadingBankAuditSelfChecks = reportReadingBankAuditSelfChecks;
