/**
 * Self-check: generators E01–E18.
 */
import { ENGLISH_SKILL_CODES, ENGLISH_SKILLS } from '../../data/taxonomy/english';
import {
  ENGLISH_GENERATORS,
  generateE01Series,
  generateE18Series,
  fingerprintEnglishTask,
  generateEnglishTask,
} from './generators/skillGenerators';
import { VPR_2027_ENGLISH_TASKS } from './generators/contentBanks';

export function runEnglishGeneratorsSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(ENGLISH_SKILL_CODES.length === 18, `codes ${ENGLISH_SKILL_CODES.length}`);
  check(Object.keys(ENGLISH_GENERATORS).length === 18, `generators ${Object.keys(ENGLISH_GENERATORS).length}`);
  check(!ENGLISH_SKILL_CODES.includes('E19' as never), 'no E19');

  for (const code of ENGLISH_SKILL_CODES) {
    for (const level of [1, 2, 3] as const) {
      try {
        const task = generateEnglishTask(code, { difficulty: level, seed: 1000 + level });
        check(task.skillId === ENGLISH_SKILLS.find((s) => s.code === code)?.id, `${code} skillId`);
        check(task.subject === 'english', `${code} subject`);
      } catch (error) {
        failures.push(`${code} L${level}: ${String(error)}`);
      }
    }
  }

  check(generateE01Series({ seed: 1, countPerLevel: 5 }).length === 15, 'E01 series');
  const e01Audio = generateEnglishTask('E01', { difficulty: 2, seed: 777 });
  check(e01Audio.taskType === 'audio' && Boolean(e01Audio.transcript), 'E01 audio');
  check(e01Audio.listenLimit === 2, 'E01 listenLimit');
  check(
    generateE18Series({ seed: 1, countPerLevel: 5 }).some(
      (t) => (t.generatorParams as { reasoningMode?: string }).reasoningMode,
    ),
    'E18 reasoning',
  );

  const fps = new Set(generateE01Series({ seed: 99, countPerLevel: 8 }).map(fingerprintEnglishTask));
  check(fps.size >= 20, `E01 fingerprints ${fps.size}`);

  for (const vpr of VPR_2027_ENGLISH_TASKS) {
    for (const code of vpr.skills) {
      check(ENGLISH_SKILL_CODES.includes(code as never), `VPR ${vpr.n} → ${code}`);
    }
  }

  return failures;
}

export function reportEnglishGeneratorsSelfChecks(): void {
  const failures = runEnglishGeneratorsSelfChecks();
  if (failures.length) {
    throw new Error(`English generators self-check failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('English generators self-check: OK (18/18)');
}
