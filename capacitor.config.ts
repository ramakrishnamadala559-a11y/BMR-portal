import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bmr.portal',
  appName: 'Home Stay',
  webDir: 'public',
  server: {
    url: 'https://bmr-portal.vercel.app',
    cleartext: true
  }
};

export default config;
