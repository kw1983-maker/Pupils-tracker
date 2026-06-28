import { InferenceClient, InferenceClientHubApiError, InferenceClientProviderApiError } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const MAX_RETRIES = 5;

// HF free tier rejects overlapping requests with a 401. Serialize every HF call
// through this single-slot queue so the route never makes two concurrent calls
// (StrictMode double-fire, warm-up/lesson overlap, rapid image calls).
let hfQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = hfQueue.then(task, task);
  hfQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hfErrorMessage(err: unknown): string {
  if (err instanceof InferenceClientProviderApiError || err instanceof InferenceClientHubApiError) {
    return err.message || `HTTP ${err.httpResponse.status}`;
  }
  return err instanceof Error ? err.message : "HF request failed";
}

function isRetryable(err: unknown): boolean {
  if (err instanceof InferenceClientProviderApiError || err instanceof InferenceClientHubApiError) {
    const s = err.httpResponse.status;
    return s >= 500 || s === 429 || s === 401 || s === 403;
  }
  return err instanceof Error && /fetch|timeout|network/i.test(err.message);
}

function retryWaitMs(err: unknown): number {
  if (err instanceof InferenceClientProviderApiError || err instanceof InferenceClientHubApiError) {
    const s = err.httpResponse.status;
    if (s === 429) return 8_000;
    if (s === 401 || s === 403) return 4_000;
    if (s >= 500) return 12_000;
  }
  return 5_000;
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

  // Keep this wrapper in sync with buildImagePrompt() in components/pages/Tutor.tsx.
  const prompt = `Simple, friendly flat illustration for young children of: ${description}. Single clear subject, plain soft background, no text, no words, no letters, no numbers.`;
  const client = new InferenceClient(hfToken);

  return enqueue(async () => {
    let lastError = "HF request failed";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      console.log(`[image-generate] attempt ${attempt + 1}/${MAX_RETRIES}`);

      try {
        const url = await client.textToImage(
          {
            model: HF_MODEL,
            inputs: prompt,
            provider: "auto",
            parameters: { num_inference_steps: 4 },
          },
          { outputType: "dataUrl" }
        );
        console.log(`[image-generate] success on attempt ${attempt + 1}`);
        return NextResponse.json({ url });
      } catch (err) {
        lastError = hfErrorMessage(err);
        console.log(`[image-generate] attempt ${attempt + 1} error: ${lastError}`);

        if (!isRetryable(err) || attempt === MAX_RETRIES - 1) {
          const status =
            err instanceof InferenceClientProviderApiError || err instanceof InferenceClientHubApiError
              ? err.httpResponse.status
              : 503;
          return NextResponse.json({ error: lastError }, { status: status >= 400 ? status : 503 });
        }

        const waitMs = retryWaitMs(err);
        console.log(`[image-generate] retrying in ${Math.round(waitMs / 1000)}s`);
        await sleep(waitMs);
      }
    }

    console.log(`[image-generate] all ${MAX_RETRIES} attempts failed: ${lastError}`);
    return NextResponse.json({ error: lastError }, { status: 503 });
  });
}
