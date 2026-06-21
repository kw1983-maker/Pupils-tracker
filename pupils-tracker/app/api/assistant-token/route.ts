import { GoogleGenAI } from "@google/genai";

// Mints a short-lived *ephemeral token* for the Writing Assistant panel's Gemini Live
// session. Mirrors /api/tutor-token with an independent rate-limit map so both
// endpoints can be used concurrently without sharing quota.

export const runtime = "nodejs";

const FIREBASE_API_KEY = "AIzaSyC4wnHVQQ7NMmGOjHSBzii4hNZB9wJPPx0";

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

// Independent rate-limit map: 6 starts / minute / user.
const RL_LIMIT = 6;
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

  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json(
      { error: "unauthenticated", message: "Please sign in to use the writing assistant." },
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
      { error: "rate-limited", message: "Too many session starts. Wait a minute and try again." },
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
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
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
