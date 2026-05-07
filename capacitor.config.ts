import type { CapacitorConfig } from '@capacitor/cli';

// Brand identifiers are kept in env vars so we can flip the production
// hostname (and eventually the bundle ID, once Apple/Google migration is
// done) without touching this file. See docs/BRAND_IDENTIFIER_MIGRATION.md.
const BRAND_HOSTNAME = process.env.CAPACITOR_HOSTNAME || 'sabq.org';
const BRAND_URL = process.env.CAPACITOR_URL || `https://${BRAND_HOSTNAME}/lite`;
// NOTE: The appId still uses the legacy "com.sabq.lite" namespace because
// changing it requires App Store Connect and Google Play Console
// coordination (new app listing + push cert reissue). Do not change here
// before the migration plan in docs/BRAND_IDENTIFIER_MIGRATION.md is run.
const APP_ID = process.env.CAPACITOR_APP_ID || 'com.sabq.lite';

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: 'بروبرتي ME Lite',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: BRAND_HOSTNAME,
    // Load directly from live server - swipe news feed
    url: BRAND_URL,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#1a73e8',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a73e8',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: 'mobile',
    backgroundColor: '#000000',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#ffffff',
  },
};

export default config;
