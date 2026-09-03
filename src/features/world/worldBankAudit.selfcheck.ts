/**
 * Аудит training pool окружающего мира: разнообразие, дубликаты, валидность.
 */
import type { Task } from '../../types';
import { WORLD_SKILLS } from '../../data/taxonomy/world';
import { checkTask } from '../../engine/checkers';
import { isAnswerReady } from '../../engine/answerState';
import { buildWorldTrainingPool, selectWeightedWorldSessionTasks } from './worldTrainingSelection';
import { getWorldSkillWeightBySkillId } from './worldTrainingWeights';
import { generateWorldTask } from './generators/skillGenerators';
import { taskRepository } from '../../services/taskRepository';
import { choiceQualityIssue, matchingQualityIssue } from '../../utils/taskChoiceQuality';

const REASONING_SUBTYPES = new Set([
  'find_error',
  'first_step',
  'next_step',
  'choose_sequence',
  'cause_effect',
  'find_error_chain',
  'find_error_timeline',
  'draw_conclusion',
  'reject_wrong_conclusion',
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
      if (task.taskType === 'classification') {
        const items = task.items ?? [];
        for (const item of items) {
          if (!map[item]) map[item] = String(raw[0] ?? '').split('|')[1] ?? '';
        }
      }
      return map;
    }
    case 'numberAnswer':
      return Number(task.correctAnswer);
    case 'multipleChoice':
      return Array.isArray(task.correctAnswer) ? task.correctAnswer : [String(task.correctAnswer)];
    default:
      return String(task.correctAnswer);
  }
}

export function runWorldBankAuditSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const pool = buildWorldTrainingPool({ perLevel: 3, seed: 20270823 });
  const repoPool = taskRepository.getWorldTasks();

  check(pool.length === 225, `pool generated ${pool.length} (expected 225)`);
  check(repoPool.length >= 150, `repo pool ${repoPool.length}`);

  const bySkill: Record<string, number> = {};
  const bySubtype: Record<string, number> = {};
  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const questions = new Map<string, number>();
  const qaPairs = new Map<string, number>();

  for (const task of pool) {
    check(task.subject === 'world', `subject ${task.id}`);
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
    check(String(task.correctAnswer).length > 0 || Array.isArray(task.correctAnswer), `empty answer ${task.id}`);

    if (task.taskType === 'singleChoice' || (task.taskType === 'imageTask' && (task.answers?.length ?? 0) >= 4)) {
      check((task.answers?.length ?? 0) >= 4, `choices ${task.id}`);
      check(Boolean(task.answers?.includes(String(task.correctAnswer))), `correct in choices ${task.id}`);
    }

    if (task.taskType === 'ordering') {
      check(Array.isArray(task.correctAnswer) && task.correctAnswer.length >= 2, `ordering ${task.id}`);
    }

    const sampleAnswer = buildSampleAnswer(task);
    check(isAnswerReady(task, sampleAnswer as never), `answer ready ${task.id}`);
    if (task.taskType !== 'ordering') {
      check(checkTask(task, sampleAnswer as never), `checker ${task.id}`);
    }
  }

  for (const skill of WORLD_SKILLS) {
    check((bySkill[skill.id] ?? 0) >= 3, `count ${skill.code}: ${bySkill[skill.id] ?? 0}`);
  }

  check(new Set(pool.map((t) => t.id)).size === pool.length, 'unique task ids');

  const dupQuestions = [...questions.entries()].filter(([, n]) => n > 6);
  check(dupQuestions.length <= 40, `duplicate question templates ${dupQuestions.length}`);

  const dupQa = [...qaPairs.entries()].filter(([, n]) => n > 5);
  check(dupQa.length <= 20, `duplicate Q+A pairs (>5×) ${dupQa.length}`);

  check(byLevel[1]! > 0 && byLevel[2]! > 0 && byLevel[3]! > 0, 'levels L1-L3');

  const prioritySkills = ['W01', 'W02', 'W04', 'W10', 'W25', 'W12'];
  for (const code of prioritySkills) {
    const skillId = WORLD_SKILLS.find((s) => s.code === code)?.id;
    check((bySkill[skillId ?? ''] ?? 0) >= 3, `priority ${code}`);
  }

  let reasoningCount = 0;
  for (const task of pool) {
    const st = String((task.generatorParams as { subtype?: string })?.subtype ?? '');
    if (REASONING_SUBTYPES.has(st) || (task.generatorParams as { reasoningMode?: string })?.reasoningMode) {
      reasoningCount += 1;
    }
  }
  check(reasoningCount >= 15, `reasoning tasks ${reasoningCount}`);

  const w04 = generateWorldTask('W04', { difficulty: 2, seed: 100, subtype: 'order_chain' });
  check(w04.taskType === 'ordering' || w04.taskType === 'matching', 'W04 interactive');

  const w25 = generateWorldTask('W25', { difficulty: 2, seed: 777, subtype: 'find_error' });
  check(Boolean((w25.generatorParams as { reasoningMode?: string }).reasoningMode), 'W25 reasoningMode');

  return failures;
}

export function runWorldWeightedStatsAudit(): { failures: string[]; stats: Record<string, number> } {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const N = 2000;
  const tasks = selectWeightedWorldSessionTasks(N, { seed: 424242, shuffleOrder: false });
  check(tasks.length === N, `weighted N=${tasks.length}`);
  check(tasks.every((t) => t.subject === 'world'), 'all world subject');

  const tierCounts = { CORE_HIGH: 0, CORE_MEDIUM: 0, SUPPORT: 0, EXTENSION: 0 };
  const codeCounts: Record<string, number> = {};

  for (const task of tasks) {
    const w = getWorldSkillWeightBySkillId(task.skillId ?? '');
    if (w) {
      tierCounts[w.tier] += 1;
      codeCounts[w.code] = (codeCounts[w.code] ?? 0) + 1;
    }
  }

  check(tierCounts.CORE_HIGH > tierCounts.CORE_MEDIUM, `HIGH ${tierCounts.CORE_HIGH} > MED ${tierCounts.CORE_MEDIUM}`);
  check(tierCounts.CORE_MEDIUM > tierCounts.SUPPORT, `MED ${tierCounts.CORE_MEDIUM} > SUP ${tierCounts.SUPPORT}`);
  check(tierCounts.EXTENSION / N <= 0.1 + 0.02, `extension cap ${((tierCounts.EXTENSION / N) * 100).toFixed(1)}%`);

  const w02 = codeCounts.W02 ?? 0;
  const w04 = codeCounts.W04 ?? 0;
  const w10 = codeCounts.W10 ?? 0;
  const w25 = codeCounts.W25 ?? 0;
  const w21 = codeCounts.W21 ?? 0;
  const w22 = codeCounts.W22 ?? 0;
  const w24 = codeCounts.W24 ?? 0;
  check(w02 > 0 && w04 > 0 && w10 > 0 && w25 > 0, `boost W02=${w02} W04=${w04} W10=${w10} W25=${w25}`);
  check(w21 + w22 + w24 < w02, `extension codes ${w21 + w22 + w24} < W02 ${w02}`);

  const stats: Record<string, number> = {
    ...tierCounts,
    W02_pct: Math.round((w02 / N) * 1000) / 10,
    W04_pct: Math.round((w04 / N) * 1000) / 10,
    W10_pct: Math.round((w10 / N) * 1000) / 10,
    W25_pct: Math.round((w25 / N) * 1000) / 10,
    EXTENSION_pct: Math.round((tierCounts.EXTENSION / N) * 1000) / 10,
  };

  return { failures, stats };
}

export function reportWorldBankAuditSelfChecks(): void {
  const bankFailures = runWorldBankAuditSelfChecks();
  const { failures: weightFailures, stats } = runWorldWeightedStatsAudit();
  const failures = [...bankFailures, ...weightFailures];
  if (failures.length) {
    throw new Error(`World bank audit failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('World bank audit: OK', JSON.stringify(stats));
}
