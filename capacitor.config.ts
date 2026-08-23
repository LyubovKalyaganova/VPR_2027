import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.vpr4class2027.app',
  appName: 'ВПР 4 класс 2027',
  webDir: 'dist',
  android: {
    backgroundColor: '#f7f8fc',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
