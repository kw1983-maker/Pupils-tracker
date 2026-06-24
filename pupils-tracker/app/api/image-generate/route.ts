import { NextRequest, NextResponse } from "next/server";

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

const MAX_RETRIES = 4;
const PER_ATTEMPT_TIMEOUT_MS = 30_000;

async function callHF(prompt: string, token: string): Promise<Response> {
  return fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
    signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
  });
}

export async function POST(req: NextRequest) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return NextResponse.json({ error: "HF_TOKEN not configured" }, { status: 503 });
  }

  let description: string;
  try {
    const body = await req.json();
    description = String(body.description ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json({ error: "Missing description" }, { status: 400 });
  }

  const prompt = `Educational illustration for primary school children: ${description}`;

  let lastError = "HF request failed";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let hfRes: Response;
    try {
      hfRes = await callHF(prompt, hfToken);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch failed";
      // Timeout or network error — wait briefly then retry
      await new Promise((r) => setTimeout(r, 3_000));
      continue;
    }

    // Model cold-starting: wait the suggested time then retry
    if (hfRes.status === 503) {
      let waitMs = 8_000;
      try {
        const body = await hfRes.json();
        if (typeof body.estimated_time === "number") {
          waitMs = Math.min(body.estimated_time * 1000 + 2_000, 25_000);
        }
        lastError = body.error ?? "Model loading";
      } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!hfRes.ok) {
      const text = await hfRes.text().catch(() => hfRes.statusText);
      lastError = text;
      // Rate limit — wait a bit
      if (hfRes.status === 429) {
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }
      return NextResponse.json({ error: text }, { status: hfRes.status });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = hfRes.headers.get("content-type") ?? "image/jpeg";
    const dataUrl = `data:${contentType};base64,${base64}`;
    return NextResponse.json({ url: dataUrl });
  }

  return NextResponse.json({ error: lastError }, { status: 503 });
}
