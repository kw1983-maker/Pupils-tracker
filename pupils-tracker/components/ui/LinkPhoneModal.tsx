"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, RefreshCw, ShieldAlert, ShieldX, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Modal } from "./Modal";
import { Button } from "./Button";

type Phase =
  | { kind: "loading" }
  | { kind: "showing"; code: string; qrImage: string; expiresAt: number }
  | { kind: "requested"; code: string; deviceName: string; match: string }
  | { kind: "deciding"; code: string; deviceName: string; match: string }
  | { kind: "linked"; deviceName: string }
  | { kind: "denied" }
  | { kind: "expired" }
  | { kind: "error"; text: string };

const POLL_MS = 2000;

/**
 * "Link phone": shows a one-time QR code (good for two minutes, one use).
 * When a phone scans it, this dialog names the phone and asks "Allow this
 * phone?" — only after Allow does the phone get signed in. Someone else who
 * scans the code (it's on the projector) is just a request you can refuse.
 */
export function LinkPhoneModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const run = useRef(0);

  const authed = useCallback(
    async (path: string, body: object) => {
      if (!user) throw new Error("signed-out");
      const res = await fetch(path, {
        method: "POST",
        headers: {
          authorization: `Bearer ${await user.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return {
        res,
        data: (await res.json().catch(() => ({}))) as {
          code?: string;
          qr?: string;
          expiresAt?: number;
          state?: string;
          deviceName?: string | null;
          matchCode?: string | null;
          error?: string;
        },
      };
    },
    [user]
  );

  const start = useCallback(async () => {
    if (!user) return;
    const myRun = ++run.current;
    setPhase({ kind: "loading" });
    try {
      const { res, data } = await authed("/api/pair/create", {});
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
  }, [user, authed]);

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

  // While a code is up or a phone is waiting: ask the server what's happened.
  const pollCode =
    phase.kind === "showing" || phase.kind === "requested" ? phase.code : null;
  const showingExpiry = phase.kind === "showing" ? phase.expiresAt : 0;
  useEffect(() => {
    if (!pollCode || !user) return;
    const myRun = run.current;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const { data } = await authed("/api/pair/status", { code: pollCode });
        if (myRun !== run.current) return;
        setPhase((p) => {
          // A decision already in flight wins over a stale poll result.
          if (p.kind !== "showing" && p.kind !== "requested") return p;
          if (data.state === "requested") {
            return {
              kind: "requested",
              code: pollCode,
              deviceName: data.deviceName || "A phone",
              match: data.matchCode || "----",
            };
          }
          if (data.state === "expired") return { kind: "expired" };
          if (data.state === "denied") return { kind: "denied" };
          if (data.state === "linked") return { kind: "linked", deviceName: "Your phone" };
          return p;
        });
      } catch {
        /* a missed poll is fine — try again next tick */
      }
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [pollCode, user, authed]);

  // The QR code itself runs out after two minutes if nobody scans it.
  useEffect(() => {
    if (phase.kind === "showing" && now > showingExpiry + 1000) {
      const t = setTimeout(() => setPhase({ kind: "expired" }), 0);
      return () => clearTimeout(t);
    }
  }, [phase.kind, now, showingExpiry]);

  const decide = async (allow: boolean) => {
    if (phase.kind !== "requested") return;
    const { code, deviceName, match } = phase;
    setPhase({ kind: "deciding", code, deviceName, match });
    try {
      const { res, data } = await authed("/api/pair/decide", { code, allow });
      if (res.ok && data.state === "allowed") setPhase({ kind: "linked", deviceName });
      else if (res.ok && data.state === "denied") setPhase({ kind: "denied" });
      else setPhase({ kind: "expired" });
    } catch {
      setPhase({ kind: "requested", code, deviceName, match });
    }
  };

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
            You&apos;ll be asked to allow the phone before it can sign in.
          </p>
        </div>
      )}

      {(phase.kind === "requested" || phase.kind === "deciding") && (
        <div className="flex flex-col items-center gap-3 py-4 text-center" role="alert">
          <ShieldAlert className="h-12 w-12 text-warning" />
          <p className="font-display text-lg font-semibold text-paper-800">Allow this phone?</p>
          <p className="text-sm text-paper-600">
            A phone that says it is <strong>{phase.deviceName}</strong> scanned the code and
            wants to sign in to your account.
          </p>
          <p className="text-sm text-paper-500">Match code</p>
          <p className="font-display text-4xl font-semibold tracking-[0.3em] text-paper-800">
            {phase.match}
          </p>
          <p className="text-xs text-paper-400">
            Only tap Allow if your own phone shows this same number. If it doesn&apos;t, tap
            Not me.
          </p>
          <div className="mt-1 grid w-full grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => void decide(false)}
              disabled={phase.kind === "deciding"}
            >
              Not me
            </Button>
            <Button onClick={() => void decide(true)} disabled={phase.kind === "deciding"}>
              Allow
            </Button>
          </div>
        </div>
      )}

      {phase.kind === "linked" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <p className="font-display text-lg font-semibold text-paper-800">Phone linked</p>
          <p className="text-sm text-paper-500">
            {phase.deviceName} is signing in to your account.
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      )}

      {phase.kind === "denied" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <ShieldX className="h-12 w-12 text-danger" />
          <p className="font-display text-lg font-semibold text-paper-800">Phone refused</p>
          <p className="text-sm text-paper-500">
            That phone wasn&apos;t let in, and the code can&apos;t be used again.
          </p>
          <Button onClick={() => void start()}>
            <RefreshCw className="h-4 w-4" /> Make a new code
          </Button>
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
