import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exportName = process.argv[2] ?? 'reportStage19DeviceSelfChecks';

const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const mod = await server.ssrLoadModule('/src/services/stage19Device.selfcheck.ts');
  mod[exportName]();
  console.log(`Stage 19 device self-check (${exportName}): OK`);
} finally {
  await server.close();
}
