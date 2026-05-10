import { CapacitorConfig } from "@capacitor/cli";

const isProduction = process.env.NODE_ENV === "production";

const config: CapacitorConfig = {
  appId: "org.inshortsnepal.app",
  appName: "InShorts Nepal",
  webDir: "out",

  // ── Server config ────────────────────────────────────────────────────────
  // In production: APK loads your live website (all API routes work)
  // In development: APK loads your local dev server
  server: {
    url: isProduction
      ? "https://www.inshortsnepal.org"
      : "http://10.0.2.2:3005", // 10.0.2.2 = localhost from Android emulator
    cleartext: !isProduction, // allow http in dev only
    androidScheme: "https",
  },

  // ── Android specific ─────────────────────────────────────────────────────
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: !isProduction,
    backgroundColor: "#000000",
    buildOptions: {
      keystorePath: undefined, // set when signing for release
      keystoreAlias: undefined,
    },
  },

  // ── Plugins ──────────────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
