import { GoogleGenAI, Modality } from "@google/genai";

// Generates an educational illustration via Gemini's image generation model.
// Called by the Tutor tab when the live tutor invokes the show_image tool.
// The real GEMINI_API_KEY never leaves the server — guarded by the same
// Firebase ID-token check used by the other tutor endpoints.

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

const RL_LIMIT = 10;
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

const IMAGE_MODEL = "gemini-2.5-flash-image";

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
      { error: "unauthenticated", message: "Please sign in to generate images." },
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
      { error: "rate-limited", message: "Too many image requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return Response.json(
      { error: "no-prompt", message: "Provide a description to generate an image." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Simple, clear educational illustration for primary school children aged 6–8: ${prompt}. Bright colours, friendly style, white background.`,
            },
          ],
        },
      ],
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = result.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      return Response.json(
        { error: "no-image", message: "The model did not return an image. Try a different description." },
        { status: 502 }
      );
    }

    return Response.json(
      { imageData: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? "image/png" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "generation-failed", message }, { status: 502 });
  }
}
