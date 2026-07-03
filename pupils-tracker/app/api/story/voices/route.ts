// Lists the ElevenLabs voices available on the account so the Story-time modal can
// offer a narrator dropdown (avoids hardcoding voice IDs). Same Firebase ID-token
// guard as the other AI routes; the API key stays on the server. Fails soft — an
// empty list just makes the modal fall back to the default voice.

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

interface ElevenVoice {
  voice_id?: string;
  name?: string;
}

export async function GET(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "missing-key", voices: [] }, { status: 500 });
  }

  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json({ error: "unauthenticated", voices: [] }, { status: 401 });
  }
  const uid = await verifyIdToken(idToken);
  if (!uid) {
    return Response.json({ error: "unauthenticated", voices: [] }, { status: 401 });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) {
      return Response.json({ error: "fetch-failed", voices: [] }, { status: 502 });
    }
    const data = (await res.json()) as { voices?: ElevenVoice[] };
    const voices = (data.voices ?? [])
      .filter((v) => v.voice_id && v.name)
      .map((v) => ({ voiceId: v.voice_id as string, name: v.name as string }));
    return Response.json(
      { voices },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json({ error: "fetch-failed", voices: [] }, { status: 502 });
  }
}
