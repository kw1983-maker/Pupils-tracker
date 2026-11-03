import { createHash } from "node:crypto";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { signCustomToken, type ServiceAccountKey } from "./custom-token";

/**
 * Server-only Firebase helpers for the phone-linking routes. Needs the
 * service-account JSON (Firebase console → Project settings → Service
 * accounts → Generate new private key) pasted whole into the
 * FIREBASE_SERVICE_ACCOUNT env var.
 *
 * Deliberately does NOT import firebase-admin/auth: on Vercel it fails to
 * load (jwks-rsa require()s the ESM-only `jose` → ERR_REQUIRE_ESM). Sign-in
 * tokens are made in ./custom-token, and ID tokens are checked with Google's
 * Identity Toolkit, the same way app/api/tutor-token does.
 */
let cached: App | null = null;

// Public Firebase web config (already committed in lib/firebase.ts).
const FIREBASE_API_KEY = "AIzaSyC4wnHVQQ7NMmGOjHSBzii4hNZB9wJPPx0";

export class AdminNotConfiguredError extends Error {
  constructor() {
    super("FIREBASE_SERVICE_ACCOUNT is not set");
  }
}

interface ServiceAccount extends ServiceAccountKey {
  project_id: string;
}

function serviceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new AdminNotConfiguredError();
  const account = JSON.parse(raw) as ServiceAccount;
  // Tolerate a key pasted with literal "\n" sequences instead of newlines.
  return { ...account, private_key: account.private_key.replace(/\\n/g, "\n") };
}

function adminApp(): App {
  if (cached) return cached;
  if (getApps().length) return (cached = getApp());
  const account = serviceAccount();
  cached = initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
  });
  return cached;
}

export const adminDb = () => getFirestore(adminApp());

/** A Firebase custom token that signs a device in as `uid`. */
export function createCustomToken(uid: string, claims: Record<string, unknown> = {}): string {
  return signCustomToken(serviceAccount(), uid, claims);
}

/**
 * Key for signing phone pairings, derived from the service account's private
 * key — already a server-only secret, so no extra env var is needed.
 */
export function pairingSecret(): Buffer {
  const { private_key } = serviceAccount();
  return createHash("sha256").update(`classtrack-pairing:${private_key}`).digest();
}

/** The caller's uid from an `Authorization: Bearer <Firebase ID token>` header, or null. */
export async function uidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) return null;
  // Fail fast (503) when linking isn't configured, before calling Google.
  serviceAccount();
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId?: string }> };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}
