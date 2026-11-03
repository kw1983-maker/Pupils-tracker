"use client";

import { useEffect } from "react";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { db } from "./firebase";
import { onAppPause, onAppResume } from "./native";

// Away longer than this and the cloud connection is likely stale (the phone
// was locked, the app was in the background, the projector PC slept).
const STALE_AFTER_MS = 20_000;
// Several signals often fire together on wake (App resume, visibilitychange,
// online); one reconnect is enough.
const MIN_GAP_MS = 5_000;

/**
 * After the app comes back (screen unlocked, app reopened, Wi-Fi back), drop
 * and reopen the Firestore connection at once instead of waiting out its
 * reconnect back-off, so the first point given reaches the other device
 * quickly. Unsaved writes stay queued and listeners resume on the new
 * connection. Mount once per page.
 */
export function useReconnectOnResume() {
  useEffect(() => {
    let hiddenAt: number | null = null;
    let lastRun = 0;
    let running = false;

    const reconnect = async () => {
      const now = Date.now();
      if (running || now - lastRun < MIN_GAP_MS) return;
      running = true;
      lastRun = now;
      try {
        await disableNetwork(db);
        await enableNetwork(db);
      } catch (err) {
        console.warn("Reconnect failed:", err);
        // Never leave the app offline because of this.
        enableNetwork(db).catch(() => {});
      } finally {
        running = false;
      }
    };

    // Both the page (visibilitychange) and the Android app (pause/resume)
    // report leaving and coming back; whichever arrives first counts.
    const markAway = () => {
      hiddenAt ??= Date.now();
    };
    const markBack = () => {
      if (hiddenAt === null) return;
      const away = Date.now() - hiddenAt;
      hiddenAt = null;
      // A quick trip (e.g. the camera on the Photo tab) keeps its connection.
      if (away > STALE_AFTER_MS) void reconnect();
    };
    const onVisibility = () =>
      document.visibilityState === "hidden" ? markAway() : markBack();
    const onOnline = () => void reconnect();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    // The Android app's own signals (newer APKs only).
    const offPause = onAppPause(markAway);
    const offResume = onAppResume(markBack);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      offPause();
      offResume();
    };
  }, []);
}
