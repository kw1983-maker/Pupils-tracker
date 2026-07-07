import { GoogleGenAI } from "@google/genai";

// Generates a catchy spelling/topic song for young pupils. Two steps:
//   1. Gemini turns the teacher's spelling words into short, kid-friendly lyrics
//      (optional — falls back to a plain description prompt if it fails / no key).
//   2. ElevenLabs Music sings them. Unlike the old Suno flow, ElevenLabs Music is
//      synchronous: this route returns the finished MP3 bytes straight back to the
//      client (no job to poll). The song's title rides along in an X-Song-Title
//      header. The real ELEVENLABS_API_KEY never leaves the server — guarded by the
//      same Firebase ID-token check used across the app's AI routes.

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

// Songs cost credits and take ~20–40s, so keep the limit low.
const RL_LIMIT = 2;
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

const LYRICS_MODEL = "gemini-2.5-flash";
// ElevenLabs Music model — music_v2 has the best sung vocals. Overridable.
const MUSIC_MODEL = process.env.ELEVENLABS_MUSIC_MODEL?.trim() || "music_v2";
const MUSIC_URL =
  "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128";
const DEFAULT_STYLE = "cheerful children's nursery pop";

// The teacher picks a length; clamp to the three offered options (ms).
const ALLOWED_LENGTHS = new Set([30_000, 60_000, 90_000]);
function clampLength(ms: unknown): number {
  const n = typeof ms === "number" ? ms : Number(ms);
  return ALLOWED_LENGTHS.has(n) ? n : 30_000;
}

// How many short lines a song of this length needs so the sung lyrics fill the
// track instead of ElevenLabs padding/repeating a too-short set of lines.
function lineCountHint(lengthMs: number): string {
  if (lengthMs >= 90_000) return "24–30 short lines";
  if (lengthMs >= 60_000) return "16–20 short lines";
  return "8–12 short lines";
}

function lyricsPrompt(words: string[], topic: string, lengthMs: number): string {
  return [
    `You are a songwriter for primary school pupils aged 6–8.`,
    `Write short, cheerful, easy-to-sing song lyrics that help children`,
    `memorise these spelling words${topic ? ` (topic: ${topic})` : ""}:`,
    words.join(", "),
    ``,
    `Rules:`,
    `- Spell each word out letter by letter in a catchy, repetitive way`,
    `  (e.g. "C-A-T, cat!"), then use the word in a simple sentence.`,
    `- Write ${lineCountHint(lengthMs)} so the lyrics comfortably fill the song`,
    `  (repeating a chorus line is fine). Simple, happy, rhyming where natural.`,
    `- Return ONLY the lyrics as plain text — no title, notes, or markdown.`,
  ].join("\n");
}

async function writeLyrics(
  apiKey: string | undefined,
  words: string[],
  topic: string,
  lengthMs: number
): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: LYRICS_MODEL,
      contents: [{ role: "user", parts: [{ text: lyricsPrompt(words, topic, lengthMs) }] }],
    });
    const text = (result.text ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

// Pupils' own lyrics are often just a few lines — far short of what a 30–90s
// song needs, so ElevenLabs pads/repeats the track to fill the requested
// length. Ask Gemini to extend them (keeping the pupils' lines unchanged and
// first) so the displayed lyrics match what's actually sung throughout.
function extendLyricsPrompt(ownLyrics: string, lengthMs: number): string {
  return [
    `You are a songwriter for primary school pupils aged 6–8. A pupil wrote`,
    `the start of a song. Keep their exact lines unchanged and in the same`,
    `order, then add a few more simple, cheerful, rhyming lines (repeating one`,
    `of their lines as a chorus is fine) so the whole song comfortably fills`,
    `about ${lineCountHint(lengthMs)} when sung.`,
    ``,
    `The pupil's lines:`,
    ownLyrics,
    ``,
    `Return ONLY the full final lyrics as plain text — the pupil's lines`,
    `first, unchanged, followed by any added lines. No title, notes, or`,
    `markdown.`,
  ].join("\n");
}

async function extendOwnLyrics(
  apiKey: string | undefined,
  ownLyrics: string,
  lengthMs: number
): Promise<string> {
  if (!apiKey) return ownLyrics;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: LYRICS_MODEL,
      contents: [{ role: "user", parts: [{ text: extendLyricsPrompt(ownLyrics, lengthMs) }] }],
    });
    const text = (result.text ?? "").trim();
    return text || ownLyrics;
  } catch {
    return ownLyrics;
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
      { error: "unauthenticated", message: "Please sign in to make a song." },
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
      { error: "rate-limited", message: "Songs take a moment — please wait a minute before making another." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    words?: string[];
    topic?: string;
    style?: string;
    lyrics?: string;
    lengthMs?: number;
  };

  const words = (body.words ?? [])
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 20);
  const topic = (body.topic ?? "").trim();
  const style = (body.style ?? "").trim() || DEFAULT_STYLE;
  const lengthMs = clampLength(body.lengthMs);
  // Pupils' own lyrics, if provided — sung as written. When present, words are
  // optional.
  const ownLyrics = (body.lyrics ?? "").trim().slice(0, 4800);

  if (!ownLyrics && words.length === 0) {
    return Response.json(
      { error: "no-words", message: "Add some spelling words or write your own lyrics to make a song." },
      { status: 400 }
    );
  }

  const title = topic
    ? `${topic} Song`
    : ownLyrics
      ? "Our song"
      : `Spelling Song: ${words.slice(0, 3).join(", ")}`;

  // Pupils' own lyrics are extended (their words kept, unchanged) to fill the
  // chosen length; otherwise Gemini writes the lyrics from scratch. If Gemini
  // is unavailable, fall back to the pupils' lyrics as-is, or let ElevenLabs
  // write lyrics from a plain description.
  const lyrics = ownLyrics
    ? await extendOwnLyrics(process.env.GEMINI_API_KEY, ownLyrics, lengthMs)
    : await writeLyrics(process.env.GEMINI_API_KEY, words, topic, lengthMs);

  const prompt = lyrics
    ? [
        `A ${style} song for children aged 6–8. Clear, cheerful sung vocals that`,
        `enunciate every letter and word so pupils can sing along.`,
        topic ? `Topic: ${topic}.` : "",
        ``,
        `Lyrics:`,
        lyrics,
      ]
        .filter(Boolean)
        .join("\n")
    : `A fun, simple ${style} for children aged 6–8 with clear sung vocals that spell out and repeat these words letter by letter: ${words.join(
        ", "
      )}.${topic ? ` Topic: ${topic}.` : ""}`;

  try {
    const res = await fetch(MUSIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: lengthMs,
        model_id: MUSIC_MODEL,
        force_instrumental: false,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      return Response.json(
        { error: "bad-key", message: "The music service rejected the API key. Check ELEVENLABS_API_KEY." },
        { status: 502 }
      );
    }
    if (res.status === 402 || res.status === 429) {
      return Response.json(
        {
          error: "quota",
          message:
            "The music service is out of credits or busy right now — please try again later.",
        },
        { status: 502 }
      );
    }
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      return Response.json(
        {
          error: "generation-failed",
          message: "The music service couldn't make the song. Please try again.",
          detail: detail.slice(0, 300),
        },
        { status: 502 }
      );
    }

    // Stream the finished MP3 straight back to the client; the title rides in a
    // header the modal reads for the audio player / download name. The final
    // lyrics — Gemini-written, or the pupils' own lyrics extended to fill the
    // song — ride in x-song-lyrics so the board's sing-along panel shows what's
    // actually sung, not just the pupils' original (possibly shorter) input.
    const headers: Record<string, string> = {
      "content-type": "audio/mpeg",
      "x-song-title": encodeURIComponent(title),
      "cache-control": "no-store",
    };
    if (lyrics) {
      const encoded = encodeURIComponent(lyrics);
      // Keep well under header-size limits; song lyrics are short anyway.
      if (encoded.length <= 6000) headers["x-song-lyrics"] = encoded;
    }
    return new Response(res.body, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "generation-failed", message }, { status: 502 });
  }
}
