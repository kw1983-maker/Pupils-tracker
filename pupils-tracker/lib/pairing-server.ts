import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Pairing } from "./pairing";

/**
 * Server-only hardening for phone linking (used by app/api/pair/*):
 *  - the Firestore doc id is a SHA-256 of the code, so even read access to the
 *    `pairings` collection never reveals a usable code;
 *  - each pairing carries an HMAC made with a server secret, so a doc forged
 *    by anyone but the server can't be swapped for a sign-in token.
 */

export function pairDocId(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function payload(p: Pick<Pairing, "uid" | "createdAt" | "expiresAt">, docId: string): string {
  return `${docId}|${p.uid}|${p.createdAt}|${p.expiresAt}`;
}

export function signPairing(
  p: Pick<Pairing, "uid" | "createdAt" | "expiresAt">,
  docId: string,
  secret: Buffer
): string {
  return createHmac("sha256", secret).update(payload(p, docId)).digest("hex");
}

export function verifyPairing(p: Pairing, docId: string, secret: Buffer): boolean {
  if (typeof p.sig !== "string" || typeof p.uid !== "string") return false;
  const expected = Buffer.from(signPairing(p, docId, secret), "hex");
  const given = Buffer.from(p.sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
