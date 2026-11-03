"use client";

import { useState } from "react";
import { GraduationCap, QrCode } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { scanQrCode } from "@/lib/native";
import { codeFromQr } from "@/lib/pairing";
import { Button } from "@/components/ui/Button";
import { LoginScreen } from "@/components/ui/LoginScreen";

/** "Pixel 8" from an Android user agent, else a plain fallback. */
function deviceName(): string {
  const m = navigator.userAgent.match(/Android [\d.]+; ([^;)]+)/);
  return m?.[1]?.replace(/ Build\/.*/, "").trim() || "Android phone";
}

/**
 * First screen in the Android app: scan the QR code from the web app's
 * "Link phone" dialog to sign in to the same account (Google's sign-in popup
 * can't open inside the app). Username sign-in stays available as a fallback.
 */
export function PhoneLinkScreen() {
  const { loginWithLinkCode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [useUsername, setUseUsername] = useState(false);

  if (useUsername) return <LoginScreen />;

  const scan = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const text = await scanQrCode();
      if (text === null) return; // cancelled
      const code = codeFromQr(text);
      if (!code) {
        setMessage("That isn't a Pupil Tracker link code. Use Link phone in the web app.");
        return;
      }
      const err = await loginWithLinkCode(code, deviceName(), () => setWaiting(true));
      if (err) setMessage(err);
    } catch (e) {
      setMessage(
        (e as Error).message === "scanner-installing"
          ? "Getting the scanner ready — try again in a few seconds."
          : "Couldn't open the camera. Allow camera access and try again."
      );
    } finally {
      setBusy(false);
      setWaiting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <GraduationCap className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold text-paper-800">Link to your tracker</h1>
        <p className="text-sm text-paper-500">
          On the computer, open the Pupil Tracker, tap <strong>•••</strong> then{" "}
          <strong>Link phone</strong>, and scan the code it shows.
        </p>
      </div>
      <Button className="w-full max-w-xs" onClick={scan} disabled={busy}>
        <QrCode className="h-5 w-5" />{" "}
        {waiting ? "Waiting for the computer…" : busy ? "Linking…" : "Scan QR code"}
      </Button>
      {waiting && (
        <p role="status" className="max-w-xs text-sm font-semibold text-brand-600">
          Now tap <strong>Allow</strong> on the computer to let this phone in.
        </p>
      )}
      {message && (
        <p role="alert" className="max-w-xs text-sm font-semibold text-danger-ink">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={() => setUseUsername(true)}
        className="rounded-md text-xs font-semibold text-paper-400 underline outline-none focus-visible:shadow-ring"
      >
        Sign in with a username instead
      </button>
    </main>
  );
}
