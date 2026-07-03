import { GoogleGenAI } from "@google/genai";

// Writes a short, kid-friendly story from a topic, for the board's "Story time"
// feature. Returns clean text (no audio tags) that the teacher can review/edit
// before it's narrated by /api/story/read. Guarded by the same Firebase ID-token
// check used across the app's AI routes; the Gemini key stays on the server.

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

// Writing is cheap and fast, so a modest limit is plenty.
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

const STORY_MODEL = "gemini-2.5-flash";
const LENGTHS: Record<string, string> = {
  short: "about 120 words (a quick 1-minute story)",
  medium: "about 220 words (a 2-minute story)",
  long: "about 320 words (a 3-minute story)",
};

function storyPrompt(topic: string, age: string, length: string): string {
  const words = LENGTHS[length] ?? LENGTHS.medium;
  return [
    `You are a warm storyteller for primary school pupils${
      age ? ` aged ${age}` : " aged 6–8"
    }.`,
    `Write an original, gentle, imaginative story about: ${topic}.`,
    ``,
    `Rules:`,
    `- Length: ${words}.`,
    `- Simple vocabulary, short sentences, a clear beginning, middle and happy end.`,
    `- A little gentle excitement or wonder is welcome; nothing scary or upsetting.`,
    `- Start with a title line, then a blank line, then the story.`,
    `- Plain text only — no markdown, no narrator notes, no sound-effect directions.`,
  ].join("\n");
}

export async function POST(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return Response.json(
      { error: "missing-key", message: "GEMINI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json(
      { error: "unauthenticated", message: "Please sign in to write a story." },
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
      { error: "rate-limited", message: "Please wait a moment before writing another story." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    topic?: string;
    age?: string;
    length?: string;
  };
  const topic = (body.topic ?? "").trim().slice(0, 300);
  const age = (body.age ?? "").trim().slice(0, 20);
  const length = (body.length ?? "medium").trim();
  if (!topic) {
    return Response.json(
      { error: "no-topic", message: "Type what the story should be about." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const result = await ai.models.generateContent({
      model: STORY_MODEL,
      contents: [
        { role: "user", parts: [{ text: storyPrompt(topic, age, length) }] },
      ],
    });
    const text = (result.text ?? "").trim();
    if (!text) {
      return Response.json(
        { error: "write-failed", message: "Couldn't write a story this time — please try again." },
        { status: 502 }
      );
    }

    // First non-empty line is the title; the rest is the story body.
    const lines = text.split(/\r?\n/);
    let title = "A story";
    let story = text;
    const firstIdx = lines.findIndex((l) => l.trim());
    if (firstIdx !== -1) {
      title = lines[firstIdx].replace(/^#+\s*/, "").trim().slice(0, 120) || title;
      story = lines.slice(firstIdx + 1).join("\n").trim() || text;
    }

    return Response.json(
      { title, story },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "write-failed", message }, { status: 502 });
  }
}
