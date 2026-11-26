import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shasil.astrixal',
  appName: 'ASTRIXAL',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false
  }
};

export default config;
