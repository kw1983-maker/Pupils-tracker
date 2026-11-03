import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Pairing, PhoneRequest } from "./pairing";

/**
 * Server-only hardening for phone linking (used by app/api/pair/*):
 *  - Firestore doc ids are a SHA-256 of the code, so even read access to the
 *    `pairings` / `pairing_claims` collections never reveals a usable code;
 *  - the phone's ticket is only stored as a hash;
 *  - every record the server writes carries an HMAC made with a server
 *    secret, so a doc forged or edited by anyone else is refused.
 */

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const pairDocId = sha256Hex;
export const ticketHash = sha256Hex;

function hmac(secret: Buffer, text: string): string {
  return createHmac("sha256", secret).update(text).digest("hex");
}

function sameHex(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || !/^[0-9a-f]+$/.test(given)) return false;
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- pairing (the code shown as a QR) ----

export function signPairing(
  p: Pick<Pairing, "uid" | "createdAt" | "expiresAt">,
  docId: string,
  secret: Buffer
): string {
  return hmac(secret, `pairing|${docId}|${p.uid}|${p.createdAt}|${p.expiresAt}`);
}

export function verifyPairing(p: Pairing, docId: string, secret: Buffer): boolean {
  if (typeof p.uid !== "string") return false;
  return sameHex(p.sig, signPairing(p, docId, secret));
}

// ---- request (a phone that scanned, waiting for Allow) ----

type RequestCore = Pick<PhoneRequest, "uid" | "deviceName" | "requestedAt" | "ticketHash">;

function requestText(r: RequestCore, docId: string): string {
  return `${docId}|${r.uid}|${r.deviceName}|${r.requestedAt}|${r.ticketHash}`;
}

export function signRequest(r: RequestCore, docId: string, secret: Buffer): string {
  return hmac(secret, `request|${requestText(r, docId)}`);
}

export function signDecision(
  r: RequestCore,
  decision: "allow" | "deny",
  docId: string,
  secret: Buffer
): string {
  return hmac(secret, `decision|${decision}|${requestText(r, docId)}`);
}

/** Both signature checks for a stored request, ready for requestState(). */
export function verifyRequest(
  r: PhoneRequest,
  docId: string,
  secret: Buffer
): { requestSigOk: boolean; decisionSigOk: boolean } {
  if (typeof r.uid !== "string" || typeof r.ticketHash !== "string") {
    return { requestSigOk: false, decisionSigOk: false };
  }
  const requestSigOk = sameHex(r.sig, signRequest(r, docId, secret));
  const decisionSigOk =
    (r.decision === "allow" || r.decision === "deny") &&
    sameHex(r.decisionSig, signDecision(r, r.decision, docId, secret));
  return { requestSigOk, decisionSigOk };
}

/** True when `ticket` is the one the scanning phone was given. */
export function ticketMatches(r: PhoneRequest, ticket: string): boolean {
  return sameHex(r.ticketHash, ticketHash(ticket));
}
