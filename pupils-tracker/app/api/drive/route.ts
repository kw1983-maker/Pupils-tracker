import type { NextRequest } from "next/server";

// Download proxy for public Google Drive files ("Anyone with the link can
// view"). The browser can't fetch Drive files directly (no CORS headers), so
// the board fetches them through this route. Only the two Google Drive hosts
// below are ever contacted — the route never fetches arbitrary URLs.

const ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

/** For large files Drive returns an HTML "can't scan for viruses" page with a
 *  confirm form; pull the form params out and build the real download URL. */
function confirmUrlFromHtml(html: string): string | null {
  if (!html.includes("drive.usercontent.google.com/download")) return null;
  const params = new URLSearchParams();
  for (const m of html.matchAll(
    /name="(id|export|confirm|uuid|authuser)"\s+value="([^"]*)"/g
  )) {
    params.set(m[1], m[2]);
  }
  if (!params.get("id")) return null;
  params.set("export", params.get("export") || "download");
  return `https://drive.usercontent.google.com/download?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!ID_RE.test(id)) {
    return Response.json({ error: "bad-id" }, { status: 400 });
  }

  try {
    let res = await fetch(
      `https://drive.google.com/uc?export=download&id=${id}`,
      { redirect: "follow" }
    );

    // HTML back means no file bytes: either the virus-scan confirm page
    // (large public file) or a sign-in / error page (private or missing).
    if ((res.headers.get("content-type") ?? "").includes("text/html")) {
      const confirmUrl = res.ok ? confirmUrlFromHtml(await res.text()) : null;
      if (confirmUrl) res = await fetch(confirmUrl, { redirect: "follow" });
    }

    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("text/html")) {
      return Response.json({ error: "not-shared" }, { status: 403 });
    }

    const headers = new Headers({
      "content-type": type || "application/octet-stream",
      "cache-control": "no-store",
    });
    const disposition = res.headers.get("content-disposition");
    if (disposition) headers.set("content-disposition", disposition);

    return new Response(res.body, { headers });
  } catch {
    return Response.json({ error: "fetch-failed" }, { status: 502 });
  }
}
