import { NextRequest, NextResponse } from "next/server";

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

const MAX_RETRIES = 5;

async function callHF(prompt: string, token: string): Promise<Response> {
  return fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
    // 90s per attempt — model generation itself is fast once loaded
    signal: AbortSignal.timeout(90_000),
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
    console.log(`[image-generate] attempt ${attempt + 1}/${MAX_RETRIES}`);

    let hfRes: Response;
    try {
      hfRes = await callHF(prompt, hfToken);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch failed";
      console.log(`[image-generate] attempt ${attempt + 1} error: ${lastError}`);
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }

    console.log(`[image-generate] attempt ${attempt + 1} status: ${hfRes.status}`);

    // Model cold-starting — wait the suggested time then retry
    if (hfRes.status === 503) {
      let waitMs = 15_000;
      try {
        const body = await hfRes.json();
        if (typeof body.estimated_time === "number") {
          // Wait the full suggested time plus a small buffer, no aggressive cap
          waitMs = body.estimated_time * 1000 + 3_000;
        }
        lastError = body.error ?? "Model loading";
      } catch { /* non-JSON 503 body */ }
      console.log(`[image-generate] model loading, waiting ${Math.round(waitMs / 1000)}s`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    // Rate limit
    if (hfRes.status === 429) {
      lastError = "Rate limit";
      console.log(`[image-generate] rate limited, waiting 8s`);
      await new Promise((r) => setTimeout(r, 8_000));
      continue;
    }

    if (!hfRes.ok) {
      const text = await hfRes.text().catch(() => hfRes.statusText);
      lastError = text;
      console.log(`[image-generate] non-ok response: ${hfRes.status} ${text.slice(0, 200)}`);
      return NextResponse.json({ error: text }, { status: hfRes.status });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = hfRes.headers.get("content-type") ?? "image/jpeg";
    const dataUrl = `data:${contentType};base64,${base64}`;
    console.log(`[image-generate] success on attempt ${attempt + 1}`);
    return NextResponse.json({ url: dataUrl });
  }

  console.log(`[image-generate] all ${MAX_RETRIES} attempts failed: ${lastError}`);
  return NextResponse.json({ error: lastError }, { status: 503 });
}
