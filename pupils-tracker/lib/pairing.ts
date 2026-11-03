/**
 * Phone linking by QR code — the pure rules, shared by the API routes and
 * the tests. A pairing is single-use and short-lived, so a photo of the QR
 * code is worthless a couple of minutes later (or once the phone has used it).
 */

export const PAIR_TTL_MS = 2 * 60_000;
export const PAIR_QR_PREFIX = "classtrack-link:";

export interface Pairing {
  uid: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  deviceName?: string;
  /** Server HMAC over uid/times/doc id, so a pairing doc written by anyone
   *  but the server (e.g. through loose Firestore rules) is refused. */
  sig?: string;
}

export type ClaimCheck = "ok" | "missing" | "expired" | "used";

/** 32 random bytes as base64url — not guessable, fits a small QR code. */
export function newPairCode(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(32);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPairCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(code);
}

export function newPairing(uid: string, now: number): Pairing {
  return { uid, createdAt: now, expiresAt: now + PAIR_TTL_MS, used: false };
}

/**
 * Whether a phone may use this pairing. `signatureOk` is the server's check
 * of `pairing.sig` (see lib/pairing-server.ts); an unsigned or forged pairing
 * is treated as missing, as is one whose lifetime is longer than PAIR_TTL_MS.
 */
export function checkClaim(
  pairing: Pairing | null | undefined,
  now: number,
  signatureOk: boolean
): ClaimCheck {
  if (!pairing || !signatureOk) return "missing";
  if (
    typeof pairing.createdAt !== "number" ||
    typeof pairing.expiresAt !== "number" ||
    pairing.expiresAt - pairing.createdAt > PAIR_TTL_MS ||
    pairing.createdAt > now
  ) {
    return "missing";
  }
  if (pairing.used) return "used";
  if (now > pairing.expiresAt) return "expired";
  return "ok";
}

/** What the web app's "Link phone" dialog shows while it waits. */
export function pairingState(
  pairing: Pairing | null | undefined,
  now: number
): "waiting" | "linked" | "expired" {
  if (pairing?.used) return "linked";
  if (!pairing || now > pairing.expiresAt) return "expired";
  return "waiting";
}

/** The text inside the QR code, and back again. */
export function qrPayload(code: string): string {
  return PAIR_QR_PREFIX + code;
}

export function codeFromQr(text: string | null | undefined): string | null {
  if (!text?.startsWith(PAIR_QR_PREFIX)) return null;
  const code = text.slice(PAIR_QR_PREFIX.length).trim();
  return isPairCode(code) ? code : null;
}

/** Keeps a device name short and printable. */
export function cleanDeviceName(name: unknown): string {
  if (typeof name !== "string") return "Phone";
  const cleaned = name.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 40);
  return cleaned || "Phone";
}
