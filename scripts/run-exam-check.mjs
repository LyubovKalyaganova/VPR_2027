import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fn = process.argv[2] ?? 'reportExamFlowSelfChecks';

const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const mod = await server.ssrLoadModule('/src/services/exam/stage16Exam.selfcheck.ts');
  if (typeof mod[fn] !== 'function') {
    throw new Error(`Unknown exam self-check: ${fn}`);
  }
  mod[fn]();
  console.log(`Exam self-check ${fn}: OK`);
} finally {
  await server.close();
}
