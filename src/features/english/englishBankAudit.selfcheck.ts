/**
 * Bank audit + weighted N=2000 for English.
 */
import type { Task } from '../../types';
import { ENGLISH_SKILLS } from '../../data/taxonomy/english';
import { checkTask } from '../../engine/checkers';
import { isAnswerReady } from '../../engine/answerState';
import { buildEnglishTrainingPool, selectWeightedEnglishSessionTasks } from './englishTrainingSelection';
import { getEnglishSkillWeightBySkillId } from './englishTrainingWeights';
import { generateEnglishTask } from './generators/skillGenerators';
import { taskRepository } from '../../services/taskRepository';
import { choiceQualityIssue, matchingQualityIssue } from '../../utils/taskChoiceQuality';

const REASONING_MODES = new Set(['locate_line', 'eliminate', 'next_step', 'rule_from_marker']);

function buildSampleAnswer(task: Task): unknown {
  switch (task.taskType) {
    case 'ordering':
      return task.correctAnswer as string[];
    case 'matching':
    case 'classification':
    case 'audio': {
      if (task.taskType === 'audio' && !(task.matchingLeft?.length)) {
        return String(task.correctAnswer);
      }
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

export function runEnglishBankAuditSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const pool = buildEnglishTrainingPool({ perLevel: 3, seed: 20270824 });
  const repoPool = taskRepository.getEnglishTasks();
  check(pool.length === 162, `pool ${pool.length}`);
  check(repoPool.length >= 108, `repo ${repoPool.length}`);

  const bySkill: Record<string, number> = {};
  const questions = new Map<string, number>();
  const qaPairs = new Map<string, number>();
  const transcripts = new Map<string, number>();
  let withPassage = 0;
  let withAudio = 0;
  let reasoningCount = 0;

  for (const task of pool) {
    check(task.subject === 'english', `subject ${task.id}`);
    check(Boolean(task.skillId), `skillId ${task.id}`);
    check(Boolean(task.topicId), `topicId ${task.id}`);
    bySkill[task.skillId ?? ''] = (bySkill[task.skillId ?? ''] ?? 0) + 1;
    if (task.passage) withPassage += 1;
    if (task.taskType === 'audio') {
      withAudio += 1;
      check(Boolean(task.transcript), `transcript ${task.id}`);
      check(task.listenLimit === 2, `listenLimit ${task.id}`);
      if (task.transcript) {
        transcripts.set(task.transcript, (transcripts.get(task.transcript) ?? 0) + 1);
      }
    }
    const st = String((task.generatorParams as { subtype?: string })?.subtype ?? '');
    const mode = String((task.generatorParams as { reasoningMode?: string })?.reasoningMode ?? '');
    if (REASONING_MODES.has(st) || REASONING_MODES.has(mode)) reasoningCount += 1;

    questions.set(task.question.trim(), (questions.get(task.question.trim()) ?? 0) + 1);
    const choiceIssue = choiceQualityIssue(task);
    check(!choiceIssue, choiceIssue ?? '');
    const matchIssue = matchingQualityIssue(task);
    check(!matchIssue, matchIssue ?? '');
    qaPairs.set(`${task.question}::${String(task.correctAnswer)}`, (qaPairs.get(`${task.question}::${String(task.correctAnswer)}`) ?? 0) + 1);

    if (task.taskType === 'singleChoice' || task.taskType === 'audio') {
      if (!task.matchingLeft?.length && (task.answers?.length ?? 0) > 0) {
        check((task.answers?.length ?? 0) >= 4, `choices ${task.id}`);
        check(Boolean(task.answers?.includes(String(task.correctAnswer))), `correct in choices ${task.id}`);
      }
    }
    if (task.taskType === 'matching' || (task.taskType === 'audio' && task.matchingLeft?.length)) {
      check((task.matchingLeft?.length ?? 0) >= 1, `matching left ${task.id}`);
    }

    const sample = buildSampleAnswer(task);
    check(isAnswerReady(task, sample as never), `answer ready ${task.id}`);
    if (task.taskType !== 'ordering') {
      check(checkTask(task, sample as never), `checker ${task.id}`);
    }
  }

  for (const skill of ENGLISH_SKILLS) {
    check((bySkill[skill.id] ?? 0) >= 3, `count ${skill.code}`);
  }
  check(new Set(pool.map((t) => t.id)).size === pool.length, 'unique ids');
  check([...questions.entries()].filter(([, n]) => n > 8).length <= 30, 'dup questions');
  check([...qaPairs.entries()].filter(([, n]) => n > 6).length <= 25, 'dup Q+A');
  check(withPassage >= 30, `passages ${withPassage}`);
  check(withAudio >= 9, `audio ${withAudio}`);
  check(reasoningCount >= 9, `reasoning ${reasoningCount}`);

  const e01 = generateEnglishTask('E01', { difficulty: 2, seed: 100 });
  check(e01.taskType === 'audio' && e01.listenLimit === 2, 'E01 audio policy');

  return failures;
}

export function runEnglishWeightedStatsAudit(): { failures: string[]; stats: Record<string, number> } {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };
  const N = 2000;
  const tasks = selectWeightedEnglishSessionTasks(N, { seed: 424242, shuffleOrder: false });
  check(tasks.length === N, `N=${tasks.length}`);
  check(tasks.every((t) => t.subject === 'english'), 'all english');

  const tierCounts = { CORE_HIGH: 0, CORE_MEDIUM: 0, SUPPORT: 0 };
  const codeCounts: Record<string, number> = {};
  for (const task of tasks) {
    const w = getEnglishSkillWeightBySkillId(task.skillId ?? '');
    if (w?.tier === 'CORE_HIGH') tierCounts.CORE_HIGH += 1;
    if (w?.tier === 'CORE_MEDIUM') tierCounts.CORE_MEDIUM += 1;
    if (w?.tier === 'SUPPORT') tierCounts.SUPPORT += 1;
    if (w?.code) codeCounts[w.code] = (codeCounts[w.code] ?? 0) + 1;
  }
  check(tierCounts.CORE_HIGH > tierCounts.CORE_MEDIUM, 'tier HIGH > MEDIUM');
  check(tierCounts.CORE_MEDIUM > tierCounts.SUPPORT, 'tier MEDIUM > SUPPORT');
  check((codeCounts.E14 ?? 0) >= 50, `E14 weight ${codeCounts.E14 ?? 0}`);
  check((codeCounts.E01 ?? 0) >= 40, `E01 ${codeCounts.E01 ?? 0}`);
  check((codeCounts.E04 ?? 0) >= 40, `E04 ${codeCounts.E04 ?? 0}`);
  check((codeCounts.E08 ?? 0) >= 40, `E08 ${codeCounts.E08 ?? 0}`);

  const stats = {
    CORE_HIGH: tierCounts.CORE_HIGH,
    CORE_MEDIUM: tierCounts.CORE_MEDIUM,
    SUPPORT: tierCounts.SUPPORT,
    E14_pct: Math.round(((codeCounts.E14 ?? 0) / N) * 1000) / 10,
    E01_pct: Math.round(((codeCounts.E01 ?? 0) / N) * 1000) / 10,
    E08_pct: Math.round(((codeCounts.E08 ?? 0) / N) * 1000) / 10,
    E18_pct: Math.round(((codeCounts.E18 ?? 0) / N) * 1000) / 10,
  };
  return { failures, stats };
}

export function reportEnglishBankAuditSelfChecks(): void {
  const bankFailures = runEnglishBankAuditSelfChecks();
  const { failures: weightFailures, stats } = runEnglishWeightedStatsAudit();
  const failures = [...bankFailures, ...weightFailures];
  if (failures.length) {
    throw new Error(`English bank audit failed:\n- ${failures.join('\n- ')}`);
  }
  console.log(`English bank audit: OK ${JSON.stringify(stats)}`);
}
