import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumireai.app',
  appName: 'Lumiere',
  webDir: 'dist/client',
  server: {
    url: 'https://lumiere-assistant.vercel.app/',
    cleartext: true
  }
};

export default config;
