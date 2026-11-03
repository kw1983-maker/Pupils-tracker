"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, RefreshCw, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Modal } from "./Modal";
import { Button } from "./Button";

type Phase =
  | { kind: "loading" }
  | { kind: "showing"; code: string; qrImage: string; expiresAt: number }
  | { kind: "linked"; deviceName: string }
  | { kind: "expired" }
  | { kind: "error"; text: string };

const POLL_MS = 2000;

/**
 * "Link phone": shows a one-time QR code (good for two minutes, one use) that
 * the Pupil Tracker Android app scans to sign in to this same account.
 */
export function LinkPhoneModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const run = useRef(0);

  const start = useCallback(async () => {
    if (!user) return;
    const myRun = ++run.current;
    setPhase({ kind: "loading" });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/pair/create", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        qr?: string;
        expiresAt?: number;
        error?: string;
      };
      if (myRun !== run.current) return;
      if (!res.ok || !data.code || !data.qr || !data.expiresAt) {
        setPhase({
          kind: "error",
          text:
            data.error === "not-configured"
              ? "Phone linking isn't set up on the server yet (FIREBASE_SERVICE_ACCOUNT is missing)."
              : "Couldn't make a code. Check your connection and try again.",
        });
        return;
      }
      const qrImage = await QRCode.toDataURL(data.qr, { margin: 1, width: 320 });
      if (myRun !== run.current) return;
      setPhase({ kind: "showing", code: data.code, qrImage, expiresAt: data.expiresAt });
    } catch {
      if (myRun === run.current) {
        setPhase({ kind: "error", text: "Couldn't make a code. Try again." });
      }
    }
  }, [user]);

  // A fresh code each time the dialog opens; closing abandons any in flight.
  useEffect(() => {
    if (!isOpen) {
      run.current++;
      return;
    }
    // Deferred so the state reset happens outside the effect body.
    const t = setTimeout(() => void start(), 0);
    return () => clearTimeout(t);
  }, [isOpen, start]);

  // While the code is up: tick the countdown and ask the server if it was used.
  const showingCode = phase.kind === "showing" ? phase.code : null;
  const showingExpiry = phase.kind === "showing" ? phase.expiresAt : 0;
  useEffect(() => {
    if (!showingCode || !user) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      if (Date.now() > showingExpiry) {
        setPhase({ kind: "expired" });
        return;
      }
      try {
        const res = await fetch("/api/pair/status", {
          method: "POST",
          headers: {
            authorization: `Bearer ${await user.getIdToken()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ code: showingCode }),
        });
        const data = (await res.json()) as { state?: string; deviceName?: string | null };
        if (data.state === "linked") {
          setPhase({ kind: "linked", deviceName: data.deviceName || "Your phone" });
        } else if (data.state === "expired") {
          setPhase({ kind: "expired" });
        }
      } catch {
        /* a missed poll is fine — try again next tick */
      }
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [showingCode, showingExpiry, user]);

  const secondsLeft =
    phase.kind === "showing" ? Math.max(0, Math.ceil((phase.expiresAt - now) / 1000)) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link phone"
      titleIcon={<Smartphone className="h-5 w-5 text-brand-500" />}
    >
      {phase.kind === "loading" && (
        <p className="py-10 text-center text-sm text-paper-400">Making a code…</p>
      )}

      {phase.kind === "showing" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm text-paper-500">
            Open the Pupil Tracker app on your phone and tap <strong>Scan QR code</strong>.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated QR data URL */}
          <img
            src={phase.qrImage}
            alt="QR code for linking your phone"
            width={256}
            height={256}
            className="rounded-card bg-surface p-2 shadow-float"
          />
          <p className="text-xs font-semibold text-paper-400" aria-live="polite">
            Works once · expires in {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </p>
          <p className="text-center text-xs text-paper-400">
            Anyone who scans this signs in as you, so don&apos;t show it to the class.
          </p>
        </div>
      )}

      {phase.kind === "linked" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <p className="font-display text-lg font-semibold text-paper-800">Phone linked</p>
          <p className="text-sm text-paper-500">{phase.deviceName} is now signed in to your account.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      )}

      {(phase.kind === "expired" || phase.kind === "error") && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-paper-600">
            {phase.kind === "expired" ? "That code has expired." : phase.text}
          </p>
          <Button onClick={() => void start()}>
            <RefreshCw className="h-4 w-4" /> Make a new code
          </Button>
        </div>
      )}
    </Modal>
  );
}
