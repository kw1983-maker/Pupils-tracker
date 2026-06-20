import { GoogleGenAI } from "@google/genai";
import type { QuizQuestion } from "@/lib/types";

// Generates a multiple-choice quiz from teacher-supplied lesson material.
// Uses a standard Gemini text/multimodal model (not the Live audio model).
// The real GEMINI_API_KEY never leaves the server — guarded by the same
// Firebase ID-token check used by the tutor-token endpoint.

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

const QUIZ_MODEL = "gemini-2.5-flash";

function buildPrompt(count: number): string {
  return [
    `You are a quiz generator for primary school pupils aged 6–8.`,
    `Given the lesson material below, create exactly ${count} multiple-choice questions.`,
    ``,
    `Rules:`,
    `- Simple, clear language suitable for young children`,
    `- Exactly 4 options per question, labelled "A. …", "B. …", "C. …", "D. …"`,
    `- Exactly one correct answer (correctIndex is 0 for A, 1 for B, 2 for C, 3 for D)`,
    `- A short, encouraging explanation (1–2 sentences) for the correct answer`,
    `- Cover different aspects of the material — do not repeat the same idea`,
    ``,
    `Return ONLY a valid JSON array with no markdown, code fences, or extra text:`,
    `[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0,"explanation":"..."}]`,
  ].join("\n");
}

function isValidQuiz(arr: unknown): arr is QuizQuestion[] {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(
    (q) =>
      typeof q.question === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((o: unknown) => typeof o === "string") &&
      typeof q.correctIndex === "number" &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3 &&
      typeof q.explanation === "string"
  );
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
      { error: "unauthenticated", message: "Please sign in to generate a quiz." },
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
      { error: "rate-limited", message: "Too many quiz requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    lessonText?: string;
    image?: { mimeType: string; base64: string };
    count?: number;
  };

  const lessonText = (body.lessonText ?? "").trim();
  const image = body.image ?? null;
  const count = Math.min(10, Math.max(5, Math.round(body.count ?? 8)));

  if (!lessonText && !image) {
    return Response.json(
      { error: "no-content", message: "Provide lesson text or an image to generate a quiz." },
      { status: 400 }
    );
  }

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  if (lessonText) parts.push({ text: `Lesson material:\n${lessonText}` });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: QUIZ_MODEL,
      config: {
        systemInstruction: buildPrompt(count),
        responseMimeType: "application/json",
      },
      contents: [{ role: "user", parts }],
    });

    const raw = result.text ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "parse-failed", message: "The model returned invalid JSON. Please try again." },
        { status: 502 }
      );
    }

    if (!isValidQuiz(parsed)) {
      return Response.json(
        { error: "invalid-quiz", message: "The model returned an unexpected quiz format. Please try again." },
        { status: 502 }
      );
    }

    const questions = parsed.slice(0, count);
    return Response.json({ questions }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "generation-failed", message }, { status: 502 });
  }
}
