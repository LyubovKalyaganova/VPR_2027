import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatorSource = readFileSync(
  resolve(root, 'src/features/mathematics/generators/perimeterGenerator.ts'),
  'utf8',
);
if (generatorSource.includes('Math.random')) {
  throw new Error('M19 generator must not use Math.random()');
}

const server = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const module = await server.ssrLoadModule(
    '/src/features/mathematics/generators/perimeterGenerator.selfcheck.ts',
  );
  module.reportM19GeneratorSelfChecks();
} finally {
  await server.close();
}
