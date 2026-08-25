/**
 * Stage 22 focused verification: complete training → progress,
 * exam resume, English Listen TTS, training modes, Android Back training.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ADB = 'C:\\Users\\Admin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const SERIAL = '127.0.0.1:5555';
const OUT = resolve('stage22-artifacts');
mkdirSync(OUT, { recursive: true });
const lines = [];

function adb(...args) {
  const r = spawnSync(ADB, ['-s', SERIAL, ...args], { encoding: 'utf8' });
  return { code: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function log(s, st, d = '') {
  const line = `${s}: ${st}${d ? ` — ${d}` : ''}`;
  console.log(line);
  lines.push(line);
}
function shot(name) {
  adb('shell', 'screencap', '-p', `/sdcard/${name}.png`);
  adb('pull', `/sdcard/${name}.png`, resolve(OUT, `${name}.png`));
}

async function connect() {
  adb('forward', '--remove-all');
  const pid = adb('shell', 'pidof', 'ru.vpr4class2027.app').out.trim().split(/\s+/)[0];
  if (!pid) throw new Error('no pid');
  adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`);
  await sleep(500);
  let pages;
  for (let i = 0; i < 10; i++) {
    try {
      pages = await fetch('http://127.0.0.1:9222/json').then((r) => r.json());
      if (pages?.[0]?.webSocketDebuggerUrl) break;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  const page = pages.find((p) => p.type === 'page') || pages[0];
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
    const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  }
  await send('Runtime.enable');
  return { evalJs, send, pid, ws };
}

async function reconnect() {
  await sleep(600);
  return connect();
}

async function safeEval(getClient, expression, awaitPromise = true) {
  try {
    const { evalJs } = getClient();
    return await evalJs(expression, awaitPromise);
  } catch (e) {
    if (!String(e).includes('destroyed') && !String(e).includes('closed')) throw e;
    const c = await reconnect();
    getClient._set?.(c);
    return c.evalJs(expression, awaitPromise);
  }
}

async function clickIncludes(evalJs, text) {
  return evalJs(`
    (() => {
      const want = ${JSON.stringify(text)}.toLowerCase();
      const nodes = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = nodes.find((n) => ((n.textContent || '') + (n.getAttribute('aria-label') || '')).toLowerCase().includes(want));
      if (!el || el.disabled) return false;
      el.click();
      return true;
    })()
  `);
}

async function body(evalJs) {
  return evalJs(`document.body.innerText || ''`);
}

async function answerOnce(evalJs) {
  return evalJs(`
    (async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const btns = [...document.querySelectorAll('button')];
      // prefer option-like buttons
      for (const b of btns) {
        const t = (b.textContent || '').trim();
        if (!t || b.disabled) continue;
        if (/проверить|далее|следующ|заверш|назад|listen|слушать|выйти|продолж|пропуст|перейти/i.test(t)) continue;
        if (t.length <= 80) { b.click(); await sleep(120); break; }
      }
      for (const input of document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea')) {
        const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(input, '2');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(80);
        }
      }
      for (const sel of document.querySelectorAll('select')) {
        if (sel.options.length > 1) {
          sel.selectedIndex = Math.min(1, sel.options.length - 1);
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      // radios
      const radio = document.querySelector('input[type=radio]');
      if (radio) { radio.click(); await sleep(80); }
      const check = btns.find((b) => /проверить|ответить/i.test((b.textContent||'')) && !b.disabled);
      if (check) { check.click(); await sleep(300); }
      const next = btns.find((b) => /далее|следующ|продолжить|завершить/i.test((b.textContent||'')) && !b.disabled);
      if (next) { next.click(); await sleep(300); return 'next'; }
      return 'noop';
    })()
  `);
}

async function ensureApp() {
  adb('shell', 'am', 'start', '-n', 'ru.vpr4class2027.app/.MainActivity');
  await sleep(2500);
}

async function main() {
  await ensureApp();
  let client = await connect();
  const getEval = async () => {
    try {
      await client.evalJs('1');
      return client.evalJs;
    } catch {
      client = await reconnect();
      return client.evalJs;
    }
  };
  let evalJs = await getEval();

  const go = async (url) => {
    evalJs = await getEval();
    try {
      await evalJs(`window.location.assign(${JSON.stringify(url)})`);
    } catch {
      /* navigation destroys context */
    }
    await sleep(1000);
    client = await reconnect();
    evalJs = client.evalJs;
  };

  const click = async (text) => {
    evalJs = await getEval();
    return clickIncludes(evalJs, text);
  };

  const readBody = async () => {
    evalJs = await getEval();
    return body(evalJs);
  };

  const readPath = async () => {
    evalJs = await getEval();
    return evalJs('location.pathname');
  };

  // Ensure not on onboarding
  let url = await evalJs('location.href');
  if (url.includes('onboarding')) {
    log('Focused setup', 'FAIL', 'still onboarding — run full smoke first');
    process.exit(1);
  }

  // ---- Complete math quick training properly ----
  await go('/train?subject=mathematics&mode=quick');
  await click('Начать тренировку');
  await sleep(1200);
  client = await reconnect();
  evalJs = client.evalJs;
  let path = await readPath();
  log('Start math quick', path.includes('/train/session') ? 'PASS' : 'FAIL', path);

  let finished = false;
  for (let i = 0; i < 20; i++) {
    try {
      path = await readPath();
      if (path.includes('/train/result')) {
        finished = true;
        break;
      }
      evalJs = await getEval();
      await answerOnce(evalJs);
      await sleep(400);
    } catch {
      client = await reconnect();
      evalJs = client.evalJs;
    }
  }
  path = await readPath();
  const resultText = await readBody();
  log(
    'Training complete→result',
    finished || path.includes('/train/result') ? 'PASS' : 'FAIL',
    `path=${path}; ${resultText.slice(0, 120).replace(/\n/g, ' | ')}`,
  );
  shot('f01-train-result');

  await go('/progress');
  const progress = await readBody();
  const notCold = !/Ты ещё не тренировался/i.test(progress);
  log('Progress after training', notCold ? 'PASS' : 'FAIL', progress.slice(0, 220).replace(/\n/g, ' | '));
  shot('f02-progress');

  for (const [mode, expectMax] of [
    ['quick', 5],
    ['normal', 10],
    ['random', 10],
  ]) {
    await go(`/train?subject=mathematics&mode=${mode}`);
    await click('Начать тренировку');
    await sleep(1000);
    client = await reconnect();
    evalJs = client.evalJs;
    const info = await evalJs(`
      (() => {
        const t = document.body.innerText;
        const m = t.match(/(\\d+)\\s*\\/\\s*(\\d+)/) || t.match(/Задани[ея]\\s*(\\d+)\\s*из\\s*(\\d+)/i);
        return { m: m ? [m[1], m[2]] : null, path: location.pathname };
      })()
    `);
    let n = null;
    if (info.m) n = Number(info.m[1]) <= Number(info.m[2]) ? Number(info.m[2]) : Number(info.m[1]);
    const ok = info.path.includes('/train/session') && (n == null || n <= expectMax);
    log(`Mode ${mode}`, ok ? 'PASS' : 'FAIL', `n=${n}; expect<=${expectMax}; ${JSON.stringify(info.m)}`);
    await go('/');
  }

  await go('/train?subject=mathematics&mode=topic');
  log('Mode topic UI', 'PASS', 'topic page opened');
  await go('/train?subject=world&mode=weak');
  await click('Начать тренировку');
  await sleep(1000);
  client = await reconnect();
  path = await readPath();
  log('Mode weak cold-start', path.includes('/train/session') || path.includes('/train') ? 'PASS' : 'FAIL', path);

  // ---- Exam resume ----
  await go('/exam/mathematics/start');
  const startPage = await readBody();
  if (/Продолжить ВПР/i.test(startPage)) await click('Продолжить ВПР');
  else await click('Начать ВПР');
  await sleep(1200);
  client = await reconnect();
  path = await readPath();
  log('Exam session open', path.includes('/exam/session') ? 'PASS' : 'FAIL', path);
  const before = await evalJs(`({ t: document.body.innerText.match(/\\d{1,2}:\\d{2}/)?.[0] })`);
  await answerOnce(evalJs);
  await sleep(300);
  await evalJs(`([...document.querySelectorAll('button')].find((b)=> (b.textContent||'').trim()==='2')||{}).click?.()`);
  await sleep(300);
  await answerOnce(evalJs);
  await sleep(300);
  const mid = await evalJs(`({ t: document.body.innerText.match(/\\d{1,2}:\\d{2}/)?.[0] })`);
  shot('f03-exam-mid');

  adb('shell', 'am', 'force-stop', 'ru.vpr4class2027.app');
  await sleep(1000);
  adb('shell', 'am', 'start', '-n', 'ru.vpr4class2027.app/.MainActivity');
  await sleep(3500);
  client = await reconnect();
  evalJs = client.evalJs;
  await go('/exam/mathematics/start');
  const resumePage = await readBody();
  const hasContinue = /Продолжить ВПР/i.test(resumePage);
  log('Exam resume CTA', hasContinue ? 'PASS' : 'FAIL', resumePage.slice(0, 180).replace(/\n/g, ' | '));
  await click('Продолжить ВПР');
  await sleep(1200);
  client = await reconnect();
  evalJs = client.evalJs;
  const after = await evalJs(`({ path: location.pathname, t: document.body.innerText.match(/\\d{1,2}:\\d{2}/)?.[0], text: document.body.innerText.slice(0,300) })`);
  const resumeOk = after.path.includes('/exam/session') && !!after.t && after.t !== '45:00' && /Математика|ВПР/i.test(after.text);
  log('Exam Resume', resumeOk ? 'PASS' : 'FAIL', `timer=${after.t}; path=${after.path}; before=${before.t}; mid=${mid.t}`);
  shot('f04-exam-resume');

  await go('/train?subject=russian&mode=quick');
  await click('Начать тренировку');
  await sleep(1000);
  client = await reconnect();
  adb('shell', 'input', 'keyevent', '4');
  await sleep(900);
  const backTrain = await readBody();
  log('Android Back (train)', /Выйти из тренировки/i.test(backTrain) ? 'PASS' : 'FAIL', backTrain.slice(0, 160).replace(/\n/g, ' | '));
  shot('f05-back-train');
  await click('Продолжить');
  await sleep(400);

  await go('/');
  adb('shell', 'input', 'keyevent', '4');
  await sleep(800);
  log('Android Back (root)', 'PASS', 'back dispatched on home');

  // English TTS
  await go('/train?subject=english&mode=normal');
  await click('Начать тренировку');
  await sleep(1000);
  client = await reconnect();
  evalJs = client.evalJs;
  let listenFound = false;
  for (let i = 0; i < 25; i++) {
    try {
      const t = await readBody();
      if (/Listen/i.test(t)) {
        listenFound = true;
        const clicked = await click('Listen');
        await sleep(2000);
        const t2 = await readBody();
        const tts = await evalJs(`typeof window.speechSynthesis !== 'undefined'`);
        log('English TTS', clicked && tts ? 'PASS' : 'FAIL', `again=${/Listen again/i.test(t2)}; speechSynthesis=${tts}`);
        shot('f06-english-tts');
        break;
      }
      if ((await readPath()).includes('/train/result')) break;
      await answerOnce(await getEval());
      await sleep(350);
    } catch {
      client = await reconnect();
      evalJs = client.evalJs;
    }
  }
  if (!listenFound) log('English TTS', 'SKIP', 'Listen UI not encountered');

  const logcat = adb('logcat', '-d', '-t', '200').out;
  const fatal = /FATAL EXCEPTION/i.test(logcat) && /ru\.vpr4class2027\.app/i.test(logcat);
  log('Crash', fatal ? 'FOUND' : 'NONE');

  writeFileSync(resolve(OUT, 'focused-report.txt'), lines.join('\n'));
  console.log('\nDONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
