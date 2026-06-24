import { NextRequest, NextResponse } from "next/server";

const HF_API_URL =
  "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

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
    hfRes = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signal: (AbortSignal as any).timeout?.(55_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "HF request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
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
