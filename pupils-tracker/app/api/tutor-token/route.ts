import { GoogleGenAI } from "@google/genai";

// Mints a short-lived *ephemeral token* for the Tutor tab's Gemini Live
// session. The real GEMINI_API_KEY never leaves the server — the browser
// connects to the Live WebSocket using only this throwaway token, which is
// single-use and expires in ~30 minutes. Mirrors the server-route style of
// app/api/drive/route.ts.
//
// Ephemeral tokens are a Gemini Developer API feature and are only supported
// on the v1alpha API surface, so both the client here and the browser must
// pin apiVersion: "v1alpha".

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "missing-key", message: "GEMINI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1, // one Live connection per token
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(), // token valid 30 min
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(), // 2 min to start the session
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    if (!token.name) {
      return Response.json({ error: "no-token" }, { status: 502 });
    }

    return Response.json({ token: token.name }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: "token-failed", message }, { status: 502 });
  }
}
