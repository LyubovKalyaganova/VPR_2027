import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exportName = process.argv[2] ?? 'reportStage17UxSelfChecks';

const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const mod = await server.ssrLoadModule('/src/services/stage17Ux.selfcheck.ts');
  mod[exportName]();
  console.log(`Stage 17 UX self-check (${exportName}): OK`);
} finally {
  await server.close();
}
