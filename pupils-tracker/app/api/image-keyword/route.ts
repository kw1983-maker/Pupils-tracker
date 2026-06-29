import { GoogleGenAI } from "@google/genai";

// Picks ONE concrete, depictable subject to illustrate the tutor's latest turn,
// so the Web image search gets a clean keyword instead of a regex-guessed one.
// Uses a fast Gemini text model. The real GEMINI_API_KEY never leaves the
// server — guarded by the same Firebase ID-token check as the other routes.

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

// Per-turn keyword extraction fires often, so the window is more generous than
// the quiz route's.
const RL_LIMIT = 40;
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

const KEYWORD_MODEL = "gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = [
  "You choose ONE image-search phrase to illustrate a teaching moment for young",
  "children (ages 6-8) during a live lesson.",
  "",
  "You are given the tutor's latest spoken message and the lesson topic.",
  "Reply with ONLY a short image-search phrase: 1-3 lowercase words.",
  "",
  "Rules:",
  "- No sentences, no punctuation, no quotes, no explanation.",
  "- Pick the specific thing being taught, not the pupil's name or a question.",
  "- Avoid abstract words (fun, good, learning, right) and meta words (picture, image).",
  "- If there is no concrete thing worth showing this turn, reply with exactly: none",
  "",
  "When the tutor names a SPECIFIC object, return that object alone:",
  "  \"this is a ball\" -> ball",
  "  \"a jump rope is a toy\" -> jump rope",
  "  \"it is a square\" -> square",
  "  \"this is a teddy bear\" -> teddy bear",
  "",
  "When the lesson topic is BROAD (toys, animals, food, shapes) or the turn is",
  "only an intro with no specific object, return a kid-friendly 2-3 word phrase",
  "that stock photos can match clearly — NOT a bare category noun:",
  "  Bad: toys     Good: colorful children toys",
  "  Bad: animals  Good: cute farm animals",
  "  Bad: shapes   Good: geometric shapes colorful",
  "  Bad: fun      Good: none",
].join("\n");

function cleanKeyword(raw: string): string | null {
  const first = raw.split(/\r?\n/)[0] ?? "";
  const cleaned = first
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ")
    .trim();
  if (!cleaned || cleaned === "none") return null;
  return cleaned;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
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
  if (rateLimited(uid)) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    topic?: string;
  };
  const message = (body.message ?? "").trim();
  const topic = (body.topic ?? "").trim();

  if (!message) {
    return Response.json({ keyword: null });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: KEYWORD_MODEL,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 },
      contents: [
        {
          role: "user",
          parts: [{ text: `Lesson topic: ${topic || "(none)"}\n\nTutor said: ${message}` }],
        },
      ],
    });

    return Response.json(
      { keyword: cleanKeyword(result.text ?? "") },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "generation-failed", message }, { status: 502 });
  }
}
