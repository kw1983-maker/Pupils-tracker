import { GoogleGenAI } from "@google/genai";
import {
  SONG_FETCH_TIMEOUT_MS,
  SONG_MAX_DURATION_SECONDS,
  DEFAULT_MUSIC_MODEL,
  DEFAULT_STYLE,
  buildComposeBody,
  buildPromptBody,
  clampLength,
  extendLyricsPrompt,
  isAudioPayload,
  lyricsPrompt,
  musicComposeUrl,
  parseMusicError,
  songTitle,
  type ComposeBody,
} from "@/lib/spelling-song";

// Generates a catchy spelling/topic song for young pupils. Two steps:
//   1. Gemini turns the teacher's spelling words into short, kid-friendly lyrics
//      (optional — falls back to a plain description prompt if it fails / no key).
//   2. ElevenLabs Music sings them. Unlike the old Suno flow, ElevenLabs Music is
//      synchronous: this route returns the finished MP3 bytes straight back to the
//      client (no job to poll). The song's title rides along in an X-Song-Title
//      header. The real ELEVENLABS_API_KEY never leaves the server — guarded by the
//      same Firebase ID-token check used across the app's AI routes.

export const runtime = "nodejs";
// Gemini lyrics + a 30–90s compose is well above the platform default (10–15s).
export const maxDuration = SONG_MAX_DURATION_SECONDS;

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
const MUSIC_MODEL = process.env.ELEVENLABS_MUSIC_MODEL?.trim() || DEFAULT_MUSIC_MODEL;

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

async function composeMusic(
  apiKey: string,
  body: ComposeBody
): Promise<{ res: Response; bytes: Uint8Array; contentType: string | null }> {
  const res = await fetch(musicComposeUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(SONG_FETCH_TIMEOUT_MS),
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { res, bytes, contentType: res.headers.get("content-type") };
}

function errorResponse(raw: string, status: number): Response {
  const parsed = parseMusicError(raw, status);
  const http =
    parsed.error === "bad-key"
      ? 502
      : parsed.error === "quota"
        ? 502
        : parsed.error === "bad-prompt"
          ? 400
          : 502;
  return Response.json(parsed, { status: http });
}

function decodeErrorBody(bytes: Uint8Array): string {
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
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

  const title = songTitle(topic, ownLyrics, words);

  // Pupils' own lyrics are extended (their words kept, unchanged) to fill the
  // chosen length; otherwise Gemini writes the lyrics from scratch. If Gemini
  // is unavailable, fall back to the pupils' lyrics as-is, or let ElevenLabs
  // write lyrics from a plain description.
  const lyrics = ownLyrics
    ? await extendOwnLyrics(process.env.GEMINI_API_KEY, ownLyrics, lengthMs)
    : await writeLyrics(process.env.GEMINI_API_KEY, words, topic, lengthMs);

  const composeOpts = {
    modelId: MUSIC_MODEL,
    style,
    topic,
    lyrics,
    words,
    lengthMs,
  };
  const primary = buildComposeBody(composeOpts);
  const fallback =
    primary.composition_plan && lyrics
      ? buildPromptBody(composeOpts)
      : null;

  try {
    let { res, bytes, contentType } = await composeMusic(apiKey, primary);

    // A v2 composition plan can 422 if the account/model rejects the plan
    // shape — retry the documented prompt path so generation still completes.
    if ((!res.ok || !isAudioPayload(contentType, bytes)) && fallback) {
      const retry = await composeMusic(apiKey, fallback);
      res = retry.res;
      bytes = retry.bytes;
      contentType = retry.contentType;
    }

    if (!res.ok || !isAudioPayload(contentType, bytes)) {
      return errorResponse(decodeErrorBody(bytes), res.status || 502);
    }

    // Buffer the finished MP3 (don't stream the upstream body): custom lyrics
    // headers must go out with a complete file, and a locked/empty stream was
    // returning a player that could not play.
    const headers: Record<string, string> = {
      "content-type": "audio/mpeg",
      "content-length": String(bytes.byteLength),
      "x-song-title": encodeURIComponent(title),
      "cache-control": "no-store",
      "access-control-expose-headers": "x-song-title, x-song-lyrics",
    };
    if (lyrics) {
      const encoded = encodeURIComponent(lyrics);
      // Keep well under header-size limits; song lyrics are short anyway.
      if (encoded.length <= 6000) headers["x-song-lyrics"] = encoded;
    }
    return new Response(Buffer.from(bytes), { headers });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return Response.json(
        {
          error: "generation-failed",
          message: "The song took too long to compose. Please try the short length, or try again.",
        },
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "generation-failed", message }, { status: 502 });
  }
}
