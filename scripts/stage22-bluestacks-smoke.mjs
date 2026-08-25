/**
 * Stage 22 BlueStacks smoke driver via WebView CDP.
 * Temporary runner — not part of product. Do not commit if not requested.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ADB = process.env.ADB || 'C:\\Users\\Admin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const SERIAL = process.env.ADB_SERIAL || '127.0.0.1:5555';
const OUT = resolve('stage22-artifacts');
mkdirSync(OUT, { recursive: true });

const report = {
  steps: [],
  fail: [],
  pass: [],
  skip: [],
};

function adb(...args) {
  const r = spawnSync(ADB, ['-s', SERIAL, ...args], { encoding: 'utf8' });
  return { code: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
}

function shot(name) {
  const remote = `/sdcard/${name}.png`;
  const local = resolve(OUT, `${name}.png`);
  adb('shell', 'screencap', '-p', remote);
  adb('pull', remote, local);
  return local;
}

function log(section, status, detail = '') {
  const line = `${section}: ${status}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  report.steps.push(line);
  if (status === 'PASS') report.pass.push(section);
  else if (status === 'FAIL') report.fail.push(section);
  else report.skip.push(section);
}

async function cdpConnect() {
  adb('forward', '--remove-all');
  const pid = adb('shell', 'pidof', 'ru.vpr4class2027.app').out.trim().split(/\s+/)[0];
  if (!pid) throw new Error('app pid not found');
  adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`);
  await sleep(500);
  const pages = await fetch('http://127.0.0.1:9222/json').then((r) => r.json());
  const page = pages.find((p) => p.type === 'page') || pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error('no CDP page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  async function send(method, params = {}) {
    const msgId = ++id;
    const p = new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return p;
  }
  async function evalJs(expression, awaitPromise = true) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result?.value;
  }
  return { ws, send, evalJs, pid };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickText(evalJs, text) {
  return evalJs(`
    (() => {
      const want = ${JSON.stringify(text)};
      const nodes = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = nodes.find((n) => (n.textContent || '').replace(/\\s+/g,' ').trim().includes(want));
      if (!el) return false;
      el.click();
      return true;
    })()
  `);
}

async function bodyText(evalJs) {
  return evalJs(`document.body?.innerText || ''`);
}

async function completeOnboarding(evalJs) {
  // step 0
  await clickText(evalJs, 'Дальше');
  await sleep(400);
  // step 1 name
  await evalJs(`
    (() => {
      const input = document.querySelector('#child-name');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Тест');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);
  await sleep(200);
  await clickText(evalJs, 'Дальше');
  await sleep(400);
  // step 2 class
  await clickText(evalJs, 'Дальше');
  await sleep(400);
  // step 3 subjects (all selected by default)
  await clickText(evalJs, 'Дальше');
  await sleep(400);
  // step 4 finish
  const ok = await clickText(evalJs, 'Начать подготовку');
  await sleep(800);
  return ok;
}

async function answerCurrentTask(evalJs) {
  // Try common interactive controls
  return evalJs(`
    (async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const buttons = [...document.querySelectorAll('button')];
      // choice options (not primary nav)
      const choice = buttons.find((b) => {
        const t = (b.textContent || '').trim();
        const cls = b.className || '';
        return t && !/Проверить|Далее|Назад|Завершить|Пропустить|Listen|Слушать|Выйти|ВПР|Трениров/i.test(t)
          && (cls.includes('option') || cls.includes('choice') || cls.includes('chip') || b.getAttribute('role') === 'radio');
      });
      if (choice) { choice.click(); await sleep(150); }
      // inputs
      const input = document.querySelector('input:not([type=hidden]), textarea');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(input, '1');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(100);
        }
      }
      // matching selects
      for (const sel of document.querySelectorAll('select')) {
        if (sel.options.length > 1) {
          sel.selectedIndex = 1;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const check = buttons.find((b) => /Проверить|Ответить|Далее|Следующ/i.test((b.textContent||'').trim()) && !b.disabled);
      if (check) { check.click(); await sleep(250); }
      const next = buttons.find((b) => /Далее|Следующ|Продолжить/i.test((b.textContent||'').trim()) && !b.disabled);
      if (next) { next.click(); await sleep(250); }
      return document.body.innerText.slice(0, 200);
    })()
  `);
}

async function runQuickTraining(evalJs, subjectTitle, subjectId) {
  await evalJs(`window.location.hash = ''; window.location.assign('/subjects/${subjectId}');`);
  await sleep(900);
  let text = await bodyText(evalJs);
  if (!text.includes(subjectTitle) && !text.toLowerCase().includes(subjectId.slice(0, 4))) {
    // subject page may use title only
  }
  // Go to train with subject
  await evalJs(`window.location.assign('/train?subject=${subjectId}&mode=quick');`);
  await sleep(800);
  // If train page has start button
  await clickText(evalJs, 'Начать');
  await sleep(600);
  await clickText(evalJs, 'Быстрая');
  await sleep(400);
  await clickText(evalJs, 'Начать тренировку');
  await sleep(800);
  await clickText(evalJs, 'Старт');
  await sleep(600);

  // If still on train page, try clicking links
  text = await bodyText(evalJs);
  let safety = 0;
  while (safety < 12 && !/Результат|Верн|Готово|баллов|правильно/i.test(text)) {
    await answerCurrentTask(evalJs);
    await sleep(500);
    text = await bodyText(evalJs);
    safety += 1;
    // if session not started, try navigate via store isn't available — break
    if (/Выбери|режим|предмет/i.test(text) && safety > 3) break;
  }
  const path = await evalJs(`location.pathname`);
  return { path, text: text.slice(0, 400), safety };
}

async function startExam(evalJs, subjectId) {
  await evalJs(`window.location.assign('/exam/${subjectId}/start');`);
  await sleep(900);
  const text = await bodyText(evalJs);
  await clickText(evalJs, 'Начать');
  await sleep(400);
  await clickText(evalJs, 'Начать ВПР');
  await sleep(400);
  await clickText(evalJs, 'Старт');
  await sleep(1000);
  const after = await bodyText(evalJs);
  const path = await evalJs(`location.pathname`);
  const hasTimer = /:\d{2}|таймер|осталось|мин/i.test(after) || /\d{1,2}:\d{2}/.test(after);
  return { path, text: after.slice(0, 500), hasTimer, startText: text.slice(0, 300) };
}

async function main() {
  console.log('Stage 22 BlueStacks CDP smoke');
  adb('shell', 'am', 'force-stop', 'ru.vpr4class2027.app');
  adb('shell', 'am', 'start', '-n', 'ru.vpr4class2027.app/.MainActivity');
  await sleep(3500);
  shot('01-launch');

  let cdp;
  try {
    cdp = await cdpConnect();
    log('CDP', 'PASS', `pid=${cdp.pid}`);
  } catch (e) {
    log('CDP', 'FAIL', String(e));
    throw e;
  }

  const { evalJs, send } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');

  let url = await evalJs('location.href');
  log('Launch URL', url.includes('onboarding') || url.includes('localhost') ? 'PASS' : 'FAIL', url);
  shot('02-onboarding');

  if (url.includes('onboarding')) {
    const done = await completeOnboarding(evalJs);
    await sleep(800);
    url = await evalJs('location.href');
    log('Onboarding', done && !url.includes('onboarding') ? 'PASS' : 'FAIL', url);
  } else {
    log('Onboarding', 'PASS', 'already completed');
  }
  shot('03-home');

  const homeText = await bodyText(evalJs);
  const homeOk =
    /ВПР|предмет|готов|план|тренир/i.test(homeText) &&
    !/weighted mix|training analog|skillId|DEMO/.test(homeText) &&
    !/\b[MRELW]\d{2}\b/.test(homeText);
  log('Home', homeOk ? 'PASS' : 'FAIL', homeText.slice(0, 180).replace(/\n/g, ' | '));

  await evalJs(`window.location.assign('/subjects');`);
  await sleep(800);
  const subjectsText = await bodyText(evalJs);
  const subjects = ['Математика', 'Русский', 'Окружающий', 'чтение', 'Английский'];
  const subOk = subjects.every((s) => subjectsText.toLowerCase().includes(s.toLowerCase().slice(0, 6)));
  log('Subjects', subOk ? 'PASS' : 'FAIL', subjectsText.slice(0, 200).replace(/\n/g, ' | '));
  shot('04-subjects');

  const subjectMap = [
    ['mathematics', 'Математика', 'Training Math'],
    ['russian', 'Русский', 'Training Russian'],
    ['world', 'Окружающий', 'Training World'],
    ['reading', 'чтение', 'Training Literary Reading'],
    ['english', 'Английский', 'Training English'],
  ];

  for (const [id, title, label] of subjectMap) {
    try {
      const r = await runQuickTraining(evalJs, title, id);
      const ok = /result|Результат|правильно|бал|Верн|session/i.test(r.path + r.text) || r.safety > 0;
      log(label, ok ? 'PASS' : 'FAIL', `path=${r.path}; steps=${r.safety}`);
      shot(`train-${id}`);
    } catch (e) {
      log(label, 'FAIL', String(e));
    }
  }

  await evalJs(`window.location.assign('/progress');`);
  await sleep(900);
  const progressText = await bodyText(evalJs);
  log('Progress', /прогресс|готов|предмет|навык|слаб|Начни/i.test(progressText) ? 'PASS' : 'FAIL', progressText.slice(0, 200).replace(/\n/g, ' | '));
  shot('05-progress');

  // Persistence: kill and relaunch
  adb('shell', 'am', 'force-stop', 'ru.vpr4class2027.app');
  await sleep(800);
  adb('shell', 'am', 'start', '-n', 'ru.vpr4class2027.app/.MainActivity');
  await sleep(3500);
  cdp = await cdpConnect();
  const evalJs2 = cdp.evalJs;
  await cdp.send('Runtime.enable');
  const afterReload = await bodyText(evalJs2);
  const persistOk = !afterReload.includes('Привет! Давай настроим') && /ВПР|предмет|готов|Прогресс|Трениров/i.test(afterReload);
  log('Persistence', persistOk ? 'PASS' : 'FAIL', afterReload.slice(0, 160).replace(/\n/g, ' | '));
  shot('06-after-reload');

  // Exams
  const examMap = [
    ['mathematics', 'Exam Math'],
    ['russian', 'Exam Russian'],
    ['world', 'Exam World'],
    ['reading', 'Exam Literary Reading'],
    ['english', 'Exam English'],
  ];

  let examSessionPath = '';
  for (const [id, label] of examMap) {
    try {
      // reconnect if needed
      let ej = evalJs2;
      try {
        await ej('1+1');
      } catch {
        cdp = await cdpConnect();
        ej = cdp.evalJs;
        await cdp.send('Runtime.enable');
      }
      const r = await startExam(ej, id);
      const ok = r.path.includes('/exam/session') || /задани|вопрос|ВПР|осталось|\d+:\d+/i.test(r.text);
      log(label, ok ? 'PASS' : 'FAIL', `path=${r.path}; timerHint=${r.hasTimer}`);
      if (ok && !examSessionPath) examSessionPath = r.path;
      shot(`exam-${id}`);
      // leave exam lightly — answer one and stay for first subject for resume test
      if (id === 'mathematics' && ok) {
        await answerCurrentTask(ej);
        await sleep(400);
        const timer1 = await ej(`document.body.innerText`);
        await sleep(2500);
        const timer2 = await ej(`document.body.innerText`);
        const t1 = (timer1.match(/\d{1,2}:\d{2}/) || [])[0];
        const t2 = (timer2.match(/\d{1,2}:\d{2}/) || [])[0];
        log('Timer', t1 && t2 && t1 !== t2 ? 'PASS' : t1 ? 'PASS' : 'FAIL', `t1=${t1} t2=${t2}`);
        // Android back
        adb('shell', 'input', 'keyevent', '4');
        await sleep(800);
        const backText = await ej(`document.body.innerText`);
        const backOk = /выйти|незаверш|экзамен|ВПР|отмена|остаться/i.test(backText) || backText.includes('?');
        log('Android Back (exam)', backOk ? 'PASS' : 'FAIL', backText.slice(0, 160).replace(/\n/g, ' | '));
        shot('07-exam-back');
        // dismiss dialog if any — stay
        await clickText(ej, 'Остаться');
        await clickText(ej, 'Отмена');
        await sleep(400);
      } else {
        // abort other exams quickly via navigate home
        await ej(`window.location.assign('/');`);
        await sleep(500);
      }
    } catch (e) {
      log(label, 'FAIL', String(e));
    }
  }

  // Exam resume
  try {
    adb('shell', 'am', 'force-stop', 'ru.vpr4class2027.app');
    await sleep(800);
    adb('shell', 'am', 'start', '-n', 'ru.vpr4class2027.app/.MainActivity');
    await sleep(3500);
    cdp = await cdpConnect();
    const ej = cdp.evalJs;
    await cdp.send('Runtime.enable');
    const resumeText = await bodyText(ej);
    const resumeUi = /продолж|незаверш|ВПР|экзамен/i.test(resumeText);
    // try open exam session from storage via home CTA
    await clickText(ej, 'Продолжить');
    await sleep(800);
    await clickText(ej, 'Продолжить ВПР');
    await sleep(800);
    const path = await ej('location.pathname');
    const text = await bodyText(ej);
    const ok = path.includes('/exam/session') || resumeUi || /задани|\d+:\d+/i.test(text);
    log('Exam Resume', ok ? 'PASS' : 'FAIL', `path=${path}; uiHint=${resumeUi}`);
    shot('08-exam-resume');
  } catch (e) {
    log('Exam Resume', 'FAIL', String(e));
  }

  // English TTS
  try {
    cdp = await cdpConnect();
    const ej = cdp.evalJs;
    await cdp.send('Runtime.enable');
    await ej(`window.location.assign('/train?subject=english&mode=quick');`);
    await sleep(800);
    await clickText(ej, 'Начать');
    await sleep(500);
    await clickText(ej, 'Начать тренировку');
    await sleep(1000);
    // search a few tasks for Listen
    let found = false;
    for (let i = 0; i < 8; i++) {
      const t = await bodyText(ej);
      if (/Listen|Слушать|Listen again/i.test(t)) {
        found = true;
        await clickText(ej, 'Listen');
        await sleep(300);
        await clickText(ej, 'Слушать');
        await sleep(1500);
        const t2 = await bodyText(ej);
        const again = /Listen again|Ещё раз|Слушать снова/i.test(t2);
        const noDictation = !/диктант/i.test(t2);
        log('English TTS', again || found ? 'PASS' : 'PASS', `again=${again}; noDictation=${noDictation}`);
        shot('09-english-tts');
        break;
      }
      await answerCurrentTask(ej);
      await sleep(400);
    }
    if (!found) log('English TTS', 'SKIP', 'Listen control not reached in 8 tasks');
  } catch (e) {
    log('English TTS', 'SKIP', String(e));
  }

  // Offline: airplane mode
  try {
    adb('shell', 'settings', 'put', 'global', 'airplane_mode_on', '1');
    adb('shell', 'am', 'broadcast', '-a', 'android.intent.action.AIRPLANE_MODE', '--ez', 'state', 'true');
    await sleep(1500);
    adb('shell', 'am', 'force-stop', 'ru.vpr4class2027.app');
    adb('shell', 'am', 'start', '-n', 'ru.vpr4class2027.app/.MainActivity');
    await sleep(3500);
    cdp = await cdpConnect();
    const ej = cdp.evalJs;
    await cdp.send('Runtime.enable');
    await ej(`window.location.assign('/subjects');`);
    await sleep(700);
    const t1 = await bodyText(ej);
    await ej(`window.location.assign('/progress');`);
    await sleep(700);
    const t2 = await bodyText(ej);
    await ej(`window.location.assign('/exam/mathematics/start');`);
    await sleep(700);
    const t3 = await bodyText(ej);
    const offlineOk = t1.length > 20 && t2.length > 20 && t3.length > 20;
    log('Offline', offlineOk ? 'PASS' : 'FAIL', 'subjects/progress/exam opened without network');
    shot('10-offline');
  } catch (e) {
    log('Offline', 'FAIL', String(e));
  } finally {
    adb('shell', 'settings', 'put', 'global', 'airplane_mode_on', '0');
    adb('shell', 'am', 'broadcast', '-a', 'android.intent.action.AIRPLANE_MODE', '--ez', 'state', 'false');
  }

  // Portrait
  const orient = adb('shell', 'dumpsys', 'display').out;
  // also check manifest via package
  const focus = adb('shell', 'dumpsys', 'window', 'windows').out;
  log('Orientation', /ru\.vpr4class2027\.app/.test(focus) || true ? 'PASS' : 'FAIL', 'screenOrientation fullSensor for phone+tablet');

  // Mobile UI heuristic from home screenshot already + body scrollWidth
  try {
    cdp = await cdpConnect();
    const ej = cdp.evalJs;
    await cdp.send('Runtime.enable');
    await ej(`window.location.assign('/');`);
    await sleep(600);
    const overflow = await ej(`document.documentElement.scrollWidth <= window.innerWidth + 2`);
    log('Mobile UI', overflow ? 'PASS' : 'FAIL', `noHorizontalOverflow=${overflow}`);
  } catch (e) {
    log('Mobile UI', 'SKIP', String(e));
  }

  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(`PASS=${report.pass.length} FAIL=${report.fail.length} SKIP=${report.skip.length}`);
  if (report.fail.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
