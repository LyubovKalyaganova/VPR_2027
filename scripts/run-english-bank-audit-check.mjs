import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const mod = await server.ssrLoadModule('/src/features/english/englishBankAudit.selfcheck.ts');
  mod.reportEnglishBankAuditSelfChecks();
} finally {
  await server.close();
}
