import type { CapacitorConfig } from "@capacitor/cli";

// Hybrid wrap: the native shell loads the hosted web app.
// The Next.js server keeps handling API routes, OAuth, webhooks, crons, etc.
// Flip `server.url` to your staging or prod domain before building.
const config: CapacitorConfig = {
  appId: "com.ebril.rewards",
  appName: "ebril",
  webDir: "public",
  server: {
    url: process.env.APP_BASE_URL || "https://rewards.ebril.com",
    cleartext: false,
    androidScheme: "https",
  },
  backgroundColor: "#15100E",
  ios: {
    contentInset: "always",
    backgroundColor: "#15100E",
    limitsNavigationsToAppBoundDomains: true,
    scheme: "ebril",
  },
  android: {
    backgroundColor: "#15100E",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: "#15100E",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#15100E",
    },
  },
};

export default config;
