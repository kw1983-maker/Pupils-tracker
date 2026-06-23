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

const RL_LIMIT = 30;
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

export async function GET(request: Request) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return Response.json(
      { error: "missing-key", message: "UNSPLASH_ACCESS_KEY is not configured." },
      { status: 500 }
    );
  }

  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const uid = await verifyIdToken(idToken);
  if (!uid) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (rateLimited(uid)) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "missing-q" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&orientation=squarish&content_filter=high`,
      { headers: { authorization: `Client-ID ${accessKey}` } }
    );
    if (!res.ok) {
      return Response.json({ url: null });
    }
    const data = (await res.json()) as {
      results: Array<{
        urls: { small: string };
        user: { name: string; links: { html: string } };
      }>;
    };
    const photo = data.results[0];
    if (!photo) {
      return Response.json({ url: null });
    }
    return Response.json({
      url: photo.urls.small,
      credit: { name: photo.user.name, profileUrl: photo.user.links.html },
    });
  } catch {
    return Response.json({ url: null });
  }
}
