import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bmr.portal',
  appName: 'BMR Portal',
  webDir: 'public',
  server: {
    url: 'http://192.168.29.87:3000',
    cleartext: true
  }
};

export default config;
