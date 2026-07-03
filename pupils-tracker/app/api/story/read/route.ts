import { GoogleGenAI } from "@google/genai";

// Narrates a story emotionally with ElevenLabs Eleven v3. Gemini first inserts v3
// audio tags ([excited], [whispers], [thunder]…) so the reading has emotion and
// simple sound effects; then ElevenLabs text-to-speech sings it out. Synchronous:
// the finished MP3 streams straight back (title in a header). Same Firebase
// ID-token guard as the other AI routes; the real ELEVENLABS_API_KEY stays server
// side.

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

// Narration costs credits and takes a few seconds, so keep the limit low.
const RL_LIMIT = 3;
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

const TAG_MODEL = "gemini-2.5-flash";
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_v3";
const DEFAULT_VOICE =
  process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb"; // George
const MAX_STORY = 3000;

function tagPrompt(story: string): string {
  return [
    `Add ElevenLabs Eleven v3 "audio tags" to this children's story so a narrator`,
    `reads it with warmth, emotion and a few gentle sound effects.`,
    ``,
    `Rules:`,
    `- Insert emotion tags inline where they fit: [warmly] [excited] [whispers]`,
    `  [softly] [sadly] [curious] [laughs] [gasps] [giggles].`,
    `- Add a FEW simple, story-appropriate sound effects sparingly (at most one`,
    `  every couple of sentences): e.g. [thunder] [rain] [birds chirping]`,
    `  [door creaks] [footsteps] [splash] [wind].`,
    `- Keep ALL the original words and their order — only add tags in [square`,
    `  brackets]. Nothing scary or loud.`,
    `- Return ONLY the tagged story text, no explanation.`,
    ``,
    `Story:`,
    story,
  ].join("\n");
}

async function addTags(
  apiKey: string | undefined,
  story: string
): Promise<string> {
  if (!apiKey) return story; // v3 is still expressive without explicit tags
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: TAG_MODEL,
      contents: [{ role: "user", parts: [{ text: tagPrompt(story) }] }],
    });
    const text = (result.text ?? "").trim();
    return text || story;
  } catch {
    return story;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "missing-key", message: "ELEVENLABS_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json(
      { error: "unauthenticated", message: "Please sign in to read a story." },
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
      { error: "rate-limited", message: "Stories take a moment — please wait before reading another." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    story?: string;
    voiceId?: string;
    title?: string;
  };
  const story = (body.story ?? "").trim().slice(0, MAX_STORY);
  const voiceId = (body.voiceId ?? "").trim() || DEFAULT_VOICE;
  const title = (body.title ?? "").trim().slice(0, 120) || "A story";
  if (!story) {
    return Response.json(
      { error: "no-story", message: "Write or paste a story to read aloud." },
      { status: 400 }
    );
  }

  const tagged = await addTags(process.env.GEMINI_API_KEY, story);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceId
      )}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({ text: tagged, model_id: TTS_MODEL }),
      }
    );

    if (res.status === 401 || res.status === 403) {
      return Response.json(
        { error: "bad-key", message: "The narration service rejected the API key. Check ELEVENLABS_API_KEY." },
        { status: 502 }
      );
    }
    if (res.status === 402 || res.status === 429) {
      return Response.json(
        {
          error: "quota",
          message:
            "The narration service is out of credits or busy right now — please try again later.",
        },
        { status: 502 }
      );
    }
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      return Response.json(
        {
          error: "read-failed",
          message: "The story couldn't be read this time. Please try again.",
          detail: detail.slice(0, 300),
        },
        { status: 502 }
      );
    }

    return new Response(res.body, {
      headers: {
        "content-type": "audio/mpeg",
        "x-story-title": encodeURIComponent(title),
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "read-failed", message }, { status: 502 });
  }
}
