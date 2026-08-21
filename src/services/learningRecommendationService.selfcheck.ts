import {
  getLearningRecommendation,
  type GetLearningRecommendationInput,
  type LearningRecommendation,
} from './learningRecommendationService';

const USER = 'user-recommendation-8a';
const ADD = 'math.calculation.multi_digit.addition';
const SUB = 'math.calculation.multi_digit.subtraction';
const MUL = 'math.calculation.multiplication';

function recommend(overrides: Partial<GetLearningRecommendationInput> = {}): LearningRecommendation {
  return getLearningRecommendation({
    userId: USER,
    dailyPlan: { total: 0, completed: 0 },
    mistakes: { count: 0 },
    dueSkillIds: [],
    weakSkillIds: [],
    newSkillIds: [],
    reinforcementSkillIds: [],
    ...overrides,
  });
}

function snapshot(value: LearningRecommendation): string {
  return JSON.stringify(value);
}

export function runLearningRecommendationSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const emptyChild = recommend();
  check(emptyChild.type === 'start', 'A: новый ребёнок → start');
  check(emptyChild.action === 'normal', 'A: start использует action normal');
  check(emptyChild.skillId === undefined, 'A: start без skillId');

  const unfinishedPlan = recommend({
    dailyPlan: { total: 5, completed: 3, remaining: 2, isCompleted: false },
  });
  check(unfinishedPlan.type === 'continue-daily', 'B: незавершённый план → continue-daily');
  check(unfinishedPlan.action === 'daily', 'B: action daily');
  check(unfinishedPlan.description.includes('2'), 'B: описание указывает оставшиеся задания');
  check(unfinishedPlan.skillId === undefined, 'B: continue-daily без skillId');

  const planAndMistakes = recommend({
    dailyPlan: { total: 5, completed: 2, remaining: 3 },
    mistakes: { count: 4 },
    dueSkillIds: [ADD],
    weakSkillIds: [SUB],
  });
  check(planAndMistakes.type === 'continue-daily', 'C: план + ошибки → continue-daily');

  const completedPlanMistakes = recommend({
    dailyPlan: { total: 5, completed: 5, remaining: 0, isCompleted: true },
    mistakes: { count: 2 },
    dueSkillIds: [ADD],
    weakSkillIds: [SUB],
  });
  check(completedPlanMistakes.type === 'mistakes', 'D: завершённый план + ошибки → mistakes');
  check(completedPlanMistakes.action === 'mistakes', 'D: action mistakes');

  const mistakesAndReview = recommend({
    mistakes: { count: 1 },
    dueSkillIds: [ADD],
    weakSkillIds: [SUB],
  });
  check(mistakesAndReview.type === 'mistakes', 'E: ошибки + review → mistakes');

  const onlyReview = recommend({
    dueSkillIds: [ADD],
    weakSkillIds: [],
  });
  check(onlyReview.type === 'review', 'F: есть review → review');
  check(onlyReview.action === 'review', 'F: action review');
  check(onlyReview.skillId === ADD, 'F: skillId первого due');

  const reviewAndWeak = recommend({
    dueSkillIds: [ADD],
    weakSkillIds: [SUB],
    newSkillIds: [MUL],
  });
  check(reviewAndWeak.type === 'review', 'G: review + weak → review');
  check(reviewAndWeak.skillId === ADD, 'G: побеждает due, не weak');

  const onlyWeak = recommend({
    weakSkillIds: [SUB],
    newSkillIds: [MUL],
    reinforcementSkillIds: [ADD],
  });
  check(onlyWeak.type === 'weak', 'H: есть weak → weak');
  check(onlyWeak.action === 'weak', 'H: action weak');
  check(onlyWeak.skillId === SUB, 'H: skillId слабого навыка');

  const onlyNew = recommend({
    newSkillIds: [MUL, ADD],
    reinforcementSkillIds: [ADD],
  });
  check(onlyNew.type === 'new-skill', 'I: есть new skill → new-skill');
  check(onlyNew.action === 'normal', 'I: action normal');
  check(onlyNew.skillId === MUL, 'I: первый new skill в переданном порядке');

  const onlyReinforcement = recommend({
    reinforcementSkillIds: [ADD, SUB],
  });
  check(onlyReinforcement.type === 'reinforcement', 'J: только reinforcement → reinforcement');
  check(onlyReinforcement.action === 'normal', 'J: action normal');
  check(onlyReinforcement.skillId === ADD, 'J: первый reinforcement skillId');

  const noSources = recommend({
    dailyPlan: { total: 0, completed: 0 },
    mistakes: { count: 0 },
    dueSkillIds: [],
    weakSkillIds: [],
    newSkillIds: [],
    reinforcementSkillIds: [],
  });
  check(noSources.type === 'start', 'K: все источники отсутствуют → start');

  const demoMistakes = recommend({
    mistakes: { count: 5, mode: 'demo' },
    attempts: [{ mode: 'demo' }],
  });
  check(demoMistakes.type === 'start', 'L: DEMO-ошибки не дают mistakes');

  const demoDoesNotHideMistakes = recommend({
    mistakes: { count: 1 },
    attempts: [{ mode: 'demo' }],
  });
  check(demoDoesNotHideMistakes.type === 'mistakes', 'L: реальные ошибки не маскируются DEMO');

  const first = recommend({
    dueSkillIds: [ADD, SUB],
    weakSkillIds: [MUL],
  });
  const second = recommend({
    dueSkillIds: [ADD, SUB],
    weakSkillIds: [MUL],
  });
  check(snapshot(first) === snapshot(second), 'M: одинаковый вход → одинаковый результат');

  const weakOrder = recommend({
    weakSkillIds: [SUB, ADD, MUL],
  });
  const weakOrderAgain = recommend({
    weakSkillIds: [SUB, ADD, MUL],
  });
  check(weakOrder.skillId === SUB, 'N: несколько weak → первый в переданном порядке');
  check(weakOrder.skillId === weakOrderAgain.skillId, 'N: выбор weak детерминирован');

  const newOrder = recommend({
    newSkillIds: [ADD, SUB, MUL],
  });
  const newOrderAgain = recommend({
    newSkillIds: [ADD, SUB, MUL],
  });
  check(newOrder.skillId === ADD, 'O: несколько new skills → первый в переданном порядке');
  check(newOrder.skillId === newOrderAgain.skillId, 'O: выбор new skill детерминирован');

  const finishedPlanReview = recommend({
    dailyPlan: { total: 5, completed: 5, isCompleted: true },
    dueSkillIds: [ADD],
    weakSkillIds: [SUB],
  });
  check(finishedPlanReview.type === 'review', 'P: завершённый план не блокирует review');

  const finishedPlanWeak = recommend({
    dailyPlan: { total: 5, completed: 5 },
    weakSkillIds: [SUB],
  });
  check(finishedPlanWeak.type === 'weak', 'P: завершённый план не блокирует weak');

  const zeroPlanMistakes = recommend({
    dailyPlan: { total: 0, completed: 0, remaining: 0 },
    mistakes: { count: 2 },
  });
  check(zeroPlanMistakes.type === 'mistakes', 'Q: total === 0 не считается активным планом');

  const dueIds = Object.freeze([ADD, SUB]);
  const weakIds = Object.freeze([MUL]);
  const newIds = Object.freeze([ADD]);
  const reinforcementIds = Object.freeze([SUB]);
  const dueBefore = [...dueIds];
  const weakBefore = [...weakIds];
  const newBefore = [...newIds];
  const reinforcementBefore = [...reinforcementIds];
  getLearningRecommendation({
    userId: USER,
    dailyPlan: { total: 5, completed: 1 },
    mistakes: { count: 1 },
    dueSkillIds: dueIds,
    weakSkillIds: weakIds,
    newSkillIds: newIds,
    reinforcementSkillIds: reinforcementIds,
  });
  check(
    dueIds.length === dueBefore.length && dueIds.every((id, index) => id === dueBefore[index]),
    'R: dueSkillIds не мутируется',
  );
  check(
    weakIds.length === weakBefore.length && weakIds.every((id, index) => id === weakBefore[index]),
    'R: weakSkillIds не мутируется',
  );
  check(
    newIds.length === newBefore.length && newIds.every((id, index) => id === newBefore[index]),
    'R: newSkillIds не мутируется',
  );
  check(
    reinforcementIds.length === reinforcementBefore.length &&
      reinforcementIds.every((id, index) => id === reinforcementBefore[index]),
    'R: reinforcementSkillIds не мутируется',
  );

  check(emptyChild.reason.includes('трениров'), '8G-G: start имеет reason');
  check(!/ошибк|слабое|повторить тему/i.test(emptyChild.title + emptyChild.reason), '8G: новый ребёнок без ложных ошибок/weak/review');

  check(typeof unfinishedPlan.reason === 'string' && unfinishedPlan.reason.length > 0, '8G-A: continue-daily имеет reason');
  check(typeof completedPlanMistakes.reason === 'string' && completedPlanMistakes.reason.includes('ошибк'), '8G-B: mistakes имеет reason');
  check(typeof onlyReview.reason === 'string' && onlyReview.reason.includes('повторить'), '8G-C: review имеет reason');
  check(typeof onlyWeak.reason === 'string' && onlyWeak.reason.includes('практик'), '8G-D: weak имеет reason');
  check(typeof onlyNew.reason === 'string' && onlyNew.reason.length > 0, '8G-E: new-skill имеет reason');
  check(typeof onlyReinforcement.reason === 'string' && onlyReinforcement.reason.length > 0, '8G-F: reinforcement имеет reason');
  check(demoMistakes.reason === emptyChild.reason, '8G-H: DEMO не меняет reason пустого профиля');
  check(first.reason === second.reason, '8G-I: одинаковый вход → одинаковый reason');
  check(weakOrder.skillId === SUB, '8G-K: несколько skill → первый в переданном порядке');

  const SKILL_A = 'skill-a';
  const SKILL_B = 'skill-b';
  const SKILL_C = 'skill-c';
  const SKILL_D = 'skill-d';
  const SKILL_REVIEW = 'skill-review';
  const SKILL_WEAK = 'skill-weak';
  const SKILL_NEW = 'skill-new';
  const SKILL_REINFORCE = 'skill-reinforce';

  function hasReason(result: LearningRecommendation, type: LearningRecommendation['type']): boolean {
    return (
      result.type === type &&
      typeof result.reason === 'string' &&
      result.reason.trim().length > 0 &&
      !result.reason.includes(SKILL_A) &&
      !result.reason.includes('math.calculation')
    );
  }

  const d1a = recommend({
    dailyPlan: { total: 5, completed: 2 },
    mistakes: { count: 3 },
  });
  check(d1a.type === 'continue-daily' && d1a.action === 'daily', '8D-1: план 2/5 + ошибки → continue-daily');
  check(d1a.skillId === undefined, '8D-17: continue-daily без skillId');

  const d1b = recommend({
    dailyPlan: { total: 5, completed: 4 },
    mistakes: { count: 2 },
  });
  check(d1b.type === 'continue-daily' && d1b.action === 'daily', '8D-1: план 4/5 + ошибки → continue-daily');

  const d2 = recommend({
    dailyPlan: { total: 5, completed: 1 },
    dueSkillIds: [SKILL_A],
  });
  check(d2.type === 'continue-daily' && d2.action === 'daily', '8D-2: незавершённый план + review → continue-daily');

  const d3 = recommend({
    dailyPlan: { total: 5, completed: 3 },
    weakSkillIds: [SKILL_B],
  });
  check(d3.type === 'continue-daily', '8D-3: незавершённый план + weak → continue-daily');

  const d4 = recommend({
    dailyPlan: { total: 5, completed: 2 },
    mistakes: { count: 3 },
    dueSkillIds: [SKILL_A],
    weakSkillIds: [SKILL_B],
    newSkillIds: [SKILL_C],
    reinforcementSkillIds: [SKILL_D],
  });
  check(d4.type === 'continue-daily' && d4.action === 'daily', '8D-4: план + все источники → только continue-daily');
  check(d4.skillId === undefined, '8D-4: конфликт не подставляет чужой skillId');

  const d5 = recommend({
    dailyPlan: { total: 5, completed: 5, isCompleted: true },
    mistakes: { count: 2 },
  });
  check(d5.type === 'mistakes' && d5.action === 'mistakes', '8D-5: завершённый план + ошибки → mistakes');
  check(d5.skillId === undefined, '8D-17: mistakes без skillId');

  const d6 = recommend({
    dailyPlan: { total: 5, completed: 5, isCompleted: true },
    mistakes: { count: 0 },
    dueSkillIds: [SKILL_A],
  });
  check(d6.type === 'review' && d6.action === 'review' && d6.skillId === SKILL_A, '8D-6: завершённый план + due → review');

  const d7 = recommend({
    mistakes: { count: 0 },
    dueSkillIds: [SKILL_REVIEW],
    weakSkillIds: [SKILL_WEAK],
  });
  check(d7.type === 'review' && d7.action === 'review' && d7.skillId === SKILL_REVIEW, '8D-7: review выше weak');

  const d8 = recommend({
    dueSkillIds: [SKILL_REVIEW],
    newSkillIds: [SKILL_NEW],
    reinforcementSkillIds: [SKILL_REINFORCE],
  });
  check(d8.type === 'review' && d8.skillId === SKILL_REVIEW, '8D-8: review выше new и reinforcement');

  const d9 = recommend({
    dueSkillIds: [],
    weakSkillIds: [SKILL_WEAK],
    newSkillIds: [SKILL_NEW],
    reinforcementSkillIds: [SKILL_REINFORCE],
  });
  check(d9.type === 'weak' && d9.action === 'weak' && d9.skillId === SKILL_WEAK, '8D-9: weak выше new и reinforcement');

  const d10 = recommend({
    dueSkillIds: [],
    weakSkillIds: [],
    newSkillIds: [SKILL_NEW],
    reinforcementSkillIds: [SKILL_REINFORCE],
  });
  check(d10.type === 'new-skill' && d10.action === 'normal' && d10.skillId === SKILL_NEW, '8D-10: new-skill выше reinforcement');

  const d11 = recommend({
    reinforcementSkillIds: [SKILL_REINFORCE],
  });
  check(d11.type === 'reinforcement' && d11.action === 'normal' && d11.skillId === SKILL_REINFORCE, '8D-11: только reinforcement');

  const d12a = getLearningRecommendation({ userId: USER });
  check(d12a.type === 'start' && d12a.action === 'normal' && d12a.skillId === undefined, '8D-12: dailyPlan undefined → start');
  const d12b = recommend({ dailyPlan: { total: 0, completed: 0 } });
  check(d12b.type === 'start' && d12b.skillId === undefined, '8D-12: total=0 → start');
  check(
    d12a.type !== 'weak' &&
      d12a.type !== 'review' &&
      d12a.type !== 'mistakes' &&
      d12a.type !== 'continue-daily',
    '8D-12: пустой профиль без ложных типов',
  );

  const d13 = recommend({
    dailyPlan: { total: 0, completed: 0 },
    mistakes: { count: 2 },
    dueSkillIds: [SKILL_A],
    weakSkillIds: [SKILL_B],
  });
  check(d13.type === 'mistakes', '8D-13: total=0 не активен, побеждают ошибки');

  const d14 = recommend({
    dailyPlan: { total: 5, completed: 5 },
    dueSkillIds: [SKILL_A],
  });
  check(d14.type === 'review' && d14.skillId === SKILL_A, '8D-14: 5/5 без isCompleted не считается незавершённым');

  const d15 = recommend({
    dailyPlan: { total: 5, completed: 2, isCompleted: true },
    mistakes: { count: 4 },
    dueSkillIds: [SKILL_A],
  });
  check(d15.type === 'continue-daily' && d15.action === 'daily', '8D-15: isCompleted=true не отменяет total>0 && completed<total');

  const d16demo = recommend({ mistakes: { count: 3, mode: 'demo' } });
  check(d16demo.type === 'start', '8D-16: DEMO count не даёт mistakes');
  const d16real = recommend({ mistakes: { count: 3, mode: 'mistakes' } });
  check(d16real.type === 'mistakes' && d16real.action === 'mistakes', '8D-16: mode=mistakes даёт mistakes');

  check(unfinishedPlan.action === 'daily' && unfinishedPlan.skillId === undefined, '8D-18: continue-daily → daily');
  check(d5.action === 'mistakes', '8D-18: mistakes → mistakes');
  check(onlyReview.action === 'review', '8D-18: review → review');
  check(onlyWeak.action === 'weak', '8D-18: weak → weak');
  check(onlyNew.action === 'normal', '8D-18: new-skill → normal');
  check(onlyReinforcement.action === 'normal', '8D-18: reinforcement → normal');
  check(emptyChild.action === 'normal', '8D-18: start → normal');

  const detInput = {
    dailyPlan: { total: 5, completed: 2 },
    mistakes: { count: 1 },
    dueSkillIds: [SKILL_A, SKILL_B],
    weakSkillIds: [SKILL_WEAK],
  };
  const det1 = recommend(detInput);
  const det2 = recommend(detInput);
  const det3 = recommend(detInput);
  check(snapshot(det1) === snapshot(det2) && snapshot(det2) === snapshot(det3), '8D-19: три одинаковых вызова → одинаковый JSON');

  check(recommend({ dueSkillIds: ['skill-1', 'skill-2', 'skill-3'] }).skillId === 'skill-1', '8D-20: due берёт первый');
  check(recommend({ weakSkillIds: ['skill-1', 'skill-2', 'skill-3'] }).skillId === 'skill-1', '8D-20: weak берёт первый');
  check(recommend({ newSkillIds: ['skill-1', 'skill-2', 'skill-3'] }).skillId === 'skill-1', '8D-20: new берёт первый');
  check(recommend({ reinforcementSkillIds: ['skill-1', 'skill-2', 'skill-3'] }).skillId === 'skill-1', '8D-20: reinforcement берёт первый');

  check(hasReason(d1a, 'continue-daily'), '8D-22: reason continue-daily');
  check(hasReason(d5, 'mistakes'), '8D-22: reason mistakes');
  check(hasReason(d6, 'review'), '8D-22: reason review');
  check(hasReason(d9, 'weak'), '8D-22: reason weak');
  check(hasReason(d10, 'new-skill'), '8D-22: reason new-skill');
  check(hasReason(d11, 'reinforcement'), '8D-22: reason reinforcement');
  check(hasReason(d12a, 'start'), '8D-22: reason start');

  return failures;
}

export function reportLearningRecommendationSelfChecks(): void {
  const failures = runLearningRecommendationSelfChecks();
  if (failures.length > 0) {
    throw new Error(`learning recommendation self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

reportLearningRecommendationSelfChecks();
console.log('learning recommendation self-check passed');
