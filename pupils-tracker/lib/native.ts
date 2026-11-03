"use client";

import { Capacitor } from "@capacitor/core";

/**
 * Thin wrappers around the Android app's native features (Capacitor plugins).
 * Every function is safe to call in a normal browser: it reports "not
 * available" instead of throwing, so the /phone page works on the web too.
 * Plugins are imported lazily so the main web app never loads them.
 */

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Opens the camera QR scanner and returns the first code's text, or null. */
export async function scanQrCode(): Promise<string | null> {
  if (!isNativeApp()) return null;
  const { BarcodeScanner, BarcodeFormat } = await import(
    "@capacitor-mlkit/barcode-scanning"
  );
  // The Google code scanner is a Play Services module that may need fetching
  // the first time; scan() fails until it is there.
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
    throw new Error("scanner-installing");
  }
  const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
  return barcodes[0]?.rawValue ?? null;
}

export interface PhoneNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
}

/** True once the teacher has allowed notifications (asks if not decided yet). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let { display } = await LocalNotifications.checkPermissions();
  if (display === "prompt" || display === "prompt-with-rationale") {
    ({ display } = await LocalNotifications.requestPermissions());
  }
  return display === "granted";
}

/** Replaces every pending reminder with `list`. Returns how many were scheduled. */
export async function replaceScheduledNotifications(
  list: PhoneNotification[]
): Promise<number> {
  if (!isNativeApp()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }
  const future = list.filter((n) => n.at.getTime() > Date.now());
  if (!future.length) return 0;
  await LocalNotifications.schedule({
    notifications: future.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: n.at, allowWhileIdle: true },
    })),
  });
  return future.length;
}

/** Small persistent key/value store (native Preferences, else localStorage). */
export async function prefGet(key: string): Promise<string | null> {
  if (isNativeApp()) {
    const { Preferences } = await import("@capacitor/preferences");
    return (await Preferences.get({ key })).value;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function prefSet(key: string, value: string): Promise<void> {
  if (isNativeApp()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — setting just won't persist */
  }
}
