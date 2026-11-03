import { createHash } from "node:crypto";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin, used by the phone-linking routes to mint a
 * sign-in token for the teacher's own account. Needs the service-account
 * JSON (Firebase console → Project settings → Service accounts → Generate
 * new private key) pasted whole into the FIREBASE_SERVICE_ACCOUNT env var.
 */
let cached: App | null = null;

export class AdminNotConfiguredError extends Error {
  constructor() {
    super("FIREBASE_SERVICE_ACCOUNT is not set");
  }
}

function adminApp(): App {
  if (cached) return cached;
  if (getApps().length) return (cached = getApp());
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new AdminNotConfiguredError();
  const account = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  cached = initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\n/g, "\n"),
    }),
  });
  return cached;
}

export const adminAuth = () => getAuth(adminApp());

/**
 * Key for signing phone pairings, derived from the service account's private
 * key — already a server-only secret, so no extra env var is needed.
 */
export function pairingSecret(): Buffer {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new AdminNotConfiguredError();
  const { private_key } = JSON.parse(raw) as { private_key: string };
  return createHash("sha256").update(`classtrack-pairing:${private_key}`).digest();
}
export const adminDb = () => getFirestore(adminApp());

/** The caller's uid from an `Authorization: Bearer <Firebase ID token>` header, or null. */
export async function uidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return (await adminAuth().verifyIdToken(token)).uid;
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) throw err;
    return null;
  }
}
