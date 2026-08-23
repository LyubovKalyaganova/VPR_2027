/**
 * Stage 18: Capacitor/Android integration smoke checks (no FROZEN catalog changes).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS } from '../data/demo/subjects';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

export function runStage18AndroidSelfChecks(): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  const pkg = JSON.parse(read('package.json')) as {
    dependencies: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts: Record<string, string>;
  };

  check(Boolean(pkg.dependencies['@capacitor/core']), '@capacitor/core installed');
  check(Boolean(pkg.dependencies['@capacitor/android']), '@capacitor/android installed');
  check(Boolean(pkg.dependencies['@capacitor/app']), '@capacitor/app installed');
  check(Boolean(pkg.devDependencies?.['@capacitor/cli'] ?? pkg.dependencies['@capacitor/cli']), '@capacitor/cli installed');

  const capConfig = read('capacitor.config.ts');
  check(capConfig.includes("webDir: 'dist'"), 'capacitor webDir = dist');
  check(capConfig.includes('ВПР 4 класс 2027'), 'capacitor appName set');

  check(read('android/app/src/main/AndroidManifest.xml').includes('portrait'), 'android portrait lock');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  check(!manifest.includes('CAMERA'), 'no CAMERA permission');
  check(!manifest.includes('RECORD_AUDIO'), 'no RECORD_AUDIO permission');
  check(!manifest.includes('ACCESS_FINE_LOCATION'), 'no LOCATION permission');

  const strings = read('android/app/src/main/res/values/strings.xml');
  check(strings.includes('ВПР 4 класс 2027'), 'android app label');

  const gradle = read('android/app/build.gradle');
  check(gradle.includes('applicationId'), 'applicationId in build.gradle');

  const providers = read('src/app/providers.tsx');
  check(providers.includes('useExamStore.persist'), 'exam store hydration');

  const backHandler = read('src/components/layout/AndroidBackHandler.tsx');
  check(backHandler.includes('backButton'), 'android back handler');

  check(SUBJECTS.length === 5, 'five subjects available offline');
  check(read('index.html').includes('viewport-fit=cover'), 'safe area viewport meta');

  check(Boolean(pkg.scripts['cap:sync']), 'cap:sync script');
  check(Boolean(pkg.scripts['android:build']), 'android:build script');

  return failures;
}

export function reportStage18AndroidSelfChecks(): void {
  const failures = runStage18AndroidSelfChecks();
  if (failures.length > 0) {
    throw new Error(`Stage 18 Android self-check failed:\n- ${failures.join('\n- ')}`);
  }
}

export function reportStage18PersistenceSelfChecks(): void {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };

  check(read('src/store/useUserStore.ts').includes("name: 'vpr-4-2027-user'"), 'user persist key');
  check(read('src/store/useTrainingStore.ts').includes('persist'), 'training persist');
  check(read('src/store/useExamStore.ts').includes("name: 'vpr-4-2027-exam'"), 'exam persist key');
  check(read('src/app/providers.tsx').includes('useExamStore.persist.hasHydrated'), 'exam hydration gate');

  if (failures.length > 0) {
    throw new Error(`Stage 18 persistence self-check failed:\n- ${failures.join('\n- ')}`);
  }
}
