import { GoogleGenAI } from "@google/genai";

// Mints a short-lived *ephemeral token* for the Tutor tab's Gemini Live
// session. The real GEMINI_API_KEY never leaves the server — the browser
// connects to the Live WebSocket using only this throwaway token, which is
// single-use and expires in ~30 minutes.
//
// Because this runs on a public URL, the endpoint is guarded: the caller must
// present a valid Firebase ID token (the same login the app already requires),
// which we verify server-side via Google's Identity Toolkit using the public
// Firebase web key. A light per-user rate limit caps abuse of the free-tier
// Gemini quota. Ephemeral tokens are a v1alpha feature, so we pin that version.

export const runtime = "nodejs";

// Public Firebase web config (already committed in lib/firebase.ts).
const FIREBASE_API_KEY = "AIzaSyC4wnHVQQ7NMmGOjHSBzii4hNZB9wJPPx0";

/** Verify a Firebase ID token and return the user's uid, or null if invalid. */
async function verifyIdToken(idToken: string): Promise<string | null> {
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

// Best-effort in-memory rate limit (per warm instance): 8 starts / minute / user.
const RL_LIMIT = 8;
const RL_WINDOW_MS = 60_000;
const recent = new Map<string, number[]>();
function rateLimited(uid: string): boolean {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= RL_LIMIT) {
    recent.set(uid, hits);
    return true;
  }
  hits.push(now);
  recent.set(uid, hits);
  return false;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "missing-key", message: "GEMINI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  // Require a signed-in user (Firebase ID token via Authorization: Bearer …).
  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json(
      { error: "unauthenticated", message: "Please sign in to use the tutor." },
      { status: 401 }
    );
  }
  const uid = await verifyIdToken(idToken);
  if (!uid) {
    return Response.json(
      { error: "unauthenticated", message: "Your session has expired — please sign in again." },
      { status: 401 }
    );
  }
  if (rateLimited(uid)) {
    return Response.json(
      { error: "rate-limited", message: "Too many lesson starts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1, // one Live connection per token
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(), // token valid 30 min
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(), // 2 min to start the session
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    if (!token.name) {
      return Response.json({ error: "no-token" }, { status: 502 });
    }

    return Response.json({ token: token.name }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: "token-failed", message }, { status: 502 });
  }
}
