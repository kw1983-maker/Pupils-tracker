// Reports the teacher's remaining ElevenLabs credit balance so the modal can show
// an approximate "songs left" (Music costs ~900 credits/minute, and the length is
// chosen per song). Same Firebase ID-token guard as the generate route; the real
// ELEVENLABS_API_KEY never leaves the server.
//
// NOTE: the ElevenLabs API key must have the "user_read" permission for this to
// work — without it /v1/user/subscription returns 401 and the badge stays hidden.

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

export async function GET(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "missing-key" }, { status: 500 });
  }

  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const uid = await verifyIdToken(idToken);
  if (!uid) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) {
      // Most likely the key lacks the user_read permission — hide the badge.
      return Response.json({ error: "fetch-failed" }, { status: 502 });
    }
    const data = (await res.json()) as {
      character_count?: number;
      character_limit?: number;
    };
    const used = Math.max(0, Math.floor(data.character_count ?? 0));
    const limit = Math.max(0, Math.floor(data.character_limit ?? 0));
    const credits = Math.max(0, limit - used);
    return Response.json(
      { credits },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json({ error: "fetch-failed" }, { status: 502 });
  }
}
