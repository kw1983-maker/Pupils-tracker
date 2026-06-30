import { GoogleGenAI } from "@google/genai";

// Optical character recognition for a single scanned/image PDF page, so the
// Spelling Board can read image-only textbooks aloud. Takes a rendered page
// image and returns its readable text in natural reading order. Guarded by the
// same Firebase ID-token check used by the other Gemini routes; the real
// GEMINI_API_KEY never leaves the server.

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

const RL_LIMIT = 20;
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

const OCR_MODEL = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = [
  "You are an OCR engine for primary-school teaching pages.",
  "Read all the visible words from the image in natural reading order",
  "(top to bottom, left to right; follow columns/boxes sensibly).",
  "Return ONLY the text — no commentary, labels, or markdown.",
  "Preserve line breaks between distinct lines. Skip page numbers and",
  "decorative watermarks. If there is no readable text, return nothing.",
].join(" ");

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
      { error: "unauthenticated", message: "Please sign in to read pages aloud." },
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
      { error: "rate-limited", message: "Too many read requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    image?: { mimeType: string; base64: string };
  };
  const image = body.image ?? null;
  if (!image?.base64) {
    return Response.json(
      { error: "no-image", message: "No page image was provided." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: OCR_MODEL,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0 },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          ],
        },
      ],
    });

    const text = (result.text ?? "").trim();
    return Response.json({ text }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "ocr-failed", message }, { status: 502 });
  }
}
