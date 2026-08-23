import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  server: {
    middlewareMode: true,
    hmr: false,
  },
  appType: 'custom',
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
});

try {
  const module = await server.ssrLoadModule(
    '/src/features/mathematics/generators/additionGenerator.selfcheck.ts',
  );
  module.reportM03GeneratorSelfChecks();
} finally {
  await server.close();
}
