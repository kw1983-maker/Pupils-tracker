import { NextRequest, NextResponse } from "next/server";

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

async function callHF(prompt: string, token: string): Promise<Response> {
  return fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
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

  let hfRes: Response;
  try {
    hfRes = await callHF(prompt, hfToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "HF request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // HF returns 503 with { estimated_time } while the model cold-starts.
  // Wait the suggested time (capped at 30 s) and retry once.
  if (hfRes.status === 503) {
    let waitMs = 10_000;
    try {
      const body = await hfRes.json();
      if (typeof body.estimated_time === "number") {
        waitMs = Math.min(body.estimated_time * 1000 + 2_000, 30_000);
      }
    } catch { /* ignore parse errors */ }

    await new Promise((r) => setTimeout(r, waitMs));

    try {
      hfRes = await callHF(prompt, hfToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "HF retry failed";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (!hfRes.ok) {
    const text = await hfRes.text().catch(() => hfRes.statusText);
    return NextResponse.json({ error: text }, { status: hfRes.status });
  }

  const arrayBuffer = await hfRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = hfRes.headers.get("content-type") ?? "image/jpeg";
  const dataUrl = `data:${contentType};base64,${base64}`;

  return NextResponse.json({ url: dataUrl });
}
