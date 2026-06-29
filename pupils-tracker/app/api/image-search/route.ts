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

// Bare category nouns (toys, animals) return confusing lifestyle photos on
// Pixabay; rewrite to clearer kid-friendly phrases when the model slips.
const BROAD_CATEGORIES: Record<string, string> = {
  toys: "colorful children toys",
  toy: "colorful children toys",
  animals: "cute animals children",
  animal: "cute animals children",
  food: "healthy food children",
  shapes: "geometric shapes colorful",
  shape: "geometric shapes colorful",
  fruit: "fresh fruit colorful",
  fruits: "fresh fruit colorful",
  vehicles: "children vehicles",
  vehicle: "children vehicles",
  colors: "primary colors children",
  color: "primary colors children",
};

function enrichQuery(query: string): { search: string; isCategory: boolean } {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  const words = normalized.split(" ").filter(Boolean);
  if (words.length >= 2) return { search: normalized, isCategory: false };

  const enriched = BROAD_CATEGORIES[normalized];
  if (enriched) return { search: enriched, isCategory: true };

  return { search: normalized, isCategory: false };
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

function tagsOf(hit: PixabayHit): string[] {
  return (hit.tags ?? "").toLowerCase().split(",").map((t) => t.trim());
}

function tagMatchesWord(tag: string, word: string): boolean {
  if (tag === word) return true;
  if (word.endsWith("s") && tag === word.slice(0, -1)) return true;
  if (tag.endsWith("s") && word === tag.slice(0, -1)) return true;
  return false;
}

// Score hits by how many query words appear in the primary tags, so a clipart
// tagged "toys, colorful" beats a lifestyle photo tangentially tagged "toys".
function pickBest(hits: PixabayHit[], query: string): string | null {
  if (!hits.length) return null;
  const queryWords = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  function score(hit: PixabayHit): number {
    const tags = tagsOf(hit);
    const early = tags.slice(0, 5);
    let s = 0;
    for (const w of queryWords) {
      if (early.includes(w)) s += 3;
      else if (early.some((t) => tagMatchesWord(t, w))) s += 2;
      else if (tags.some((t) => tagMatchesWord(t, w))) s += 1;
    }
    const first = early[0];
    if (first && queryWords.some((w) => tagMatchesWord(first, w))) s += 4;
    return s;
  }

  let best = hits[0]!;
  let bestScore = score(best);
  for (const h of hits.slice(1)) {
    const s = score(h);
    if (s > bestScore) {
      bestScore = s;
      best = h;
    }
  }
  return hitUrl(bestScore > 0 ? best : hits[0]);
}

async function bestHit(url: string, query: string): Promise<string | null> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = (await res.json()) as PixabayResponse;
  if (!data.hits?.length) return null;
  return pickBest(data.hits, query);
}

async function searchPixabay(
  key: string,
  search: string,
  illustrationFirst: boolean
): Promise<string | null> {
  const order: Array<"photo" | "illustration" | "all"> = illustrationFirst
    ? ["illustration", "photo", "all"]
    : ["photo", "illustration", "all"];

  for (const imageType of order) {
    const url = await bestHit(buildPixabayUrl(key, search, imageType), search);
    if (url) return url;
  }
  return null;
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
    const { search, isCategory } = enrichQuery(query);
    const url = await searchPixabay(key, search, isCategory);

    if (!url) {
      return NextResponse.json({ error: "no results" }, { status: 404 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pixabay request failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
