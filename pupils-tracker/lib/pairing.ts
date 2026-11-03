/**
 * Phone linking by QR code — the pure rules, shared by the API routes and
 * the tests. The flow:
 *
 *  1. The computer makes a code (good for PAIR_TTL_MS, one use) and shows it
 *     as a QR code.
 *  2. The phone scans it. The code is spent and becomes a *request* naming the
 *     phone; the phone keeps a secret ticket that only it knows.
 *  3. The computer asks "Allow this phone?". Only if the teacher taps Allow
 *     can the phone — with its ticket — collect its sign-in token.
 *
 * So someone who scans the code on the projector first just shows up as a
 * request the teacher can refuse.
 */

export const PAIR_TTL_MS = 2 * 60_000;
/** How long a scanned request waits for Allow/Not me. */
export const APPROVE_TTL_MS = 2 * 60_000;
/** How long an allowed phone has to collect its sign-in after the scan. */
export const COLLECT_TTL_MS = 5 * 60_000;
export const PAIR_QR_PREFIX = "classtrack-link:";

/** A code waiting to be scanned: pairings/{sha256(code)}. */
export interface Pairing {
  uid: string;
  createdAt: number;
  expiresAt: number;
  /** Server HMAC over uid/times/doc id, so a pairing doc written by anyone
   *  but the server (e.g. through loose Firestore rules) is refused. */
  sig?: string;
}

/** A phone that scanned the code and is waiting: pairing_claims/{sha256(code)}. */
export interface PhoneRequest {
  uid: string;
  deviceName: string;
  requestedAt: number;
  /** SHA-256 of the ticket only the scanning phone holds. */
  ticketHash: string;
  /** Server HMAC over the fields above. */
  sig: string;
  decision?: "allow" | "deny";
  /** Server HMAC over the request plus the decision. */
  decisionSig?: string;
}

export type ClaimCheck = "ok" | "missing" | "expired" | "used";
export type RequestState = "pending" | "allowed" | "denied" | "expired" | "invalid";
/** What the computer's "Link phone" dialog shows. */
export type DialogState = "waiting" | "requested" | "linked" | "denied" | "expired";

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

/** Same shape as a pair code; the phone's private proof that it did the scan. */
export const newTicket = newPairCode;
export const isTicket = isPairCode;

export function newPairing(uid: string, now: number): Pairing {
  return { uid, createdAt: now, expiresAt: now + PAIR_TTL_MS };
}

/**
 * Whether a phone may scan this pairing. `signatureOk` is the server's check
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
  if (now > pairing.expiresAt) return "expired";
  return "ok";
}

/**
 * Where a scanned request stands. Signatures are checked by the server and
 * passed in; anything unsigned, forged or dated in the future is "invalid".
 */
export function requestState(
  request: PhoneRequest | null | undefined,
  now: number,
  checks: { requestSigOk: boolean; decisionSigOk: boolean }
): RequestState {
  if (!request || !checks.requestSigOk) return "invalid";
  if (typeof request.requestedAt !== "number" || request.requestedAt > now) return "invalid";
  if (request.decision) {
    if (!checks.decisionSigOk) return "invalid";
    if (request.decision === "deny") return "denied";
    return now - request.requestedAt > COLLECT_TTL_MS ? "expired" : "allowed";
  }
  return now - request.requestedAt > APPROVE_TTL_MS ? "expired" : "pending";
}

/** Combines the code and any request into what the computer's dialog shows. */
export function linkDialogState(request: RequestState | null, pairing: ClaimCheck): DialogState {
  if (request) {
    if (request === "pending") return "requested";
    if (request === "allowed") return "linked";
    if (request === "denied") return "denied";
    return "expired";
  }
  return pairing === "ok" ? "waiting" : "expired";
}

/**
 * Four digits shown on BOTH the phone and the computer's "Allow this phone?"
 * screen. The device name is whatever the phone says it is, so this is how
 * the teacher knows the request really came from the phone in their hand.
 * Derived from the hash of the phone's private ticket.
 */
export function matchCode(ticketHashHex: string): string {
  const n = parseInt(ticketHashHex.slice(0, 8), 16);
  return String(Number.isFinite(n) ? n % 10000 : 0).padStart(4, "0");
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
