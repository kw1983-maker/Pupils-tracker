import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface PixabayHit {
  webformatURL?: string;
  largeImageURL?: string;
  tags?: string;
}

interface PixabayResponse {
  hits?: PixabayHit[];
}

// Pixabay requires we don't hotlink the source page image; webformatURL is the
// approved ~640px preview meant for direct display, which suits a chat bubble.
function buildPixabayUrl(
  key: string,
  query: string,
  imageType: "photo" | "illustration" | "all"
): string {
  const params = new URLSearchParams({
    key,
    q: query,
    safesearch: "true",
    image_type: imageType,
    per_page: "20",
    order: "popular",
    lang: "en",
  });
  return `https://pixabay.com/api/?${params.toString()}`;
}

function hitUrl(hit: PixabayHit | undefined): string | null {
  return hit?.webformatURL ?? hit?.largeImageURL ?? null;
}

// The single most "popular" hit is often tangential (e.g. a cat illustration
// tagged "doll"). Pixabay lists each image's tags roughly by relevance, so we
// prefer a hit where the query is the primary subject (first tag, then first
// few tags) before falling back to the raw top result.
function pickBest(hits: PixabayHit[], query: string): string | null {
  const q = query.toLowerCase().trim();
  const tagsOf = (h: PixabayHit) => (h.tags ?? "").toLowerCase().split(",").map((t) => t.trim());

  const firstTagMatch = hits.find((h) => tagsOf(h)[0] === q);
  if (firstTagMatch) return hitUrl(firstTagMatch);

  const earlyTagMatch = hits.find((h) => tagsOf(h).slice(0, 3).includes(q));
  if (earlyTagMatch) return hitUrl(earlyTagMatch);

  return hitUrl(hits[0]);
}

async function bestHit(url: string, query: string): Promise<string | null> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = (await res.json()) as PixabayResponse;
  if (!data.hits?.length) return null;
  return pickBest(data.hits, query);
}

export async function POST(req: NextRequest) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "PIXABAY_API_KEY not configured" }, { status: 503 });
  }

  let query: string;
  try {
    const body = await req.json();
    query = String(body.query ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    // Photos of concrete objects (a doll, a ball, a dog) are the clearest and
    // most recognizable for young learners; Pixabay illustrations for everyday
    // nouns are stylized and hit-or-miss. Try photos first, then illustrations,
    // then anything.
    let url = await bestHit(buildPixabayUrl(key, query, "photo"), query);
    if (!url) url = await bestHit(buildPixabayUrl(key, query, "illustration"), query);
    if (!url) url = await bestHit(buildPixabayUrl(key, query, "all"), query);

    if (!url) {
      return NextResponse.json({ error: "no results" }, { status: 404 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pixabay request failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
