import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android companion app. It opens the live /phone page of the deployed
 * tracker, so phone screens update with every web deploy — only changes to
 * native plugins or this file need a new APK. `capacitor-www/` is the small
 * offline fallback page bundled inside the app.
 */
const config: CapacitorConfig = {
  appId: "com.classtrack.pupiltracker",
  appName: "Pupil Tracker",
  webDir: "capacitor-www",
  server: {
    url: "https://pupils-tracker-r7zb.vercel.app/phone",
    errorPath: "index.html",
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
