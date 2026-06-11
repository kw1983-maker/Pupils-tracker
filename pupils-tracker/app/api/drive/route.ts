import type { NextRequest } from "next/server";

// Download proxy for public Google Drive files ("Anyone with the link can
// view"). The browser can't fetch Drive files directly (no CORS headers), so
// the board fetches them through this route. Only the three Google hosts
// below (drive.google.com, drive.usercontent.google.com, docs.google.com)
// are ever contacted — the route never fetches arbitrary URLs.
//
// Google Slides presentations (?kind=slides) and Drive-hosted PowerPoint
// files are fetched as PDFs via the Slides export endpoint. Audio/video
// files stream through unchanged (the board's media elements point straight
// at this route). Note: Range requests aren't supported, so media always
// streams from byte 0 — seeking past the buffered region may stall until
// enough has downloaded.

const ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

const PPT_MIME =
  /vnd\.openxmlformats-officedocument\.presentationml|vnd\.ms-powerpoint/;
const PPT_FILENAME = /\.pp[st]x?"?(?:;|$)/i;

/** Export a presentation (native Slides or Drive-hosted PowerPoint) as PDF.
 *  Works for "anyone with the link" shares; Google converts pptx on the fly. */
function fetchPresentationPdf(id: string): Promise<Response> {
  return fetch(`https://docs.google.com/presentation/d/${id}/export/pdf`, {
    redirect: "follow",
  });
}

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
  const kind = request.nextUrl.searchParams.get("kind") ?? "file";
  if (kind !== "file" && kind !== "slides") {
    return Response.json({ error: "bad-kind" }, { status: 400 });
  }

  try {
    let res: Response;
    if (kind === "slides") {
      // A not-shared presentation redirects to a sign-in page (text/html),
      // which the check below classifies as not-shared.
      res = await fetchPresentationPdf(id);
    } else {
      res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, {
        redirect: "follow",
      });

      // HTML back means no file bytes: either the virus-scan confirm page
      // (large public file) or a sign-in / error page (private or missing).
      if ((res.headers.get("content-type") ?? "").includes("text/html")) {
        const confirmUrl = res.ok ? confirmUrlFromHtml(await res.text()) : null;
        if (confirmUrl) res = await fetch(confirmUrl, { redirect: "follow" });
      }

      // PowerPoint stored on Drive: drop the pptx bytes and re-fetch the
      // same file as a PDF via the Slides export (Drive converts on the fly).
      const dlType = res.headers.get("content-type") ?? "";
      const disposition = res.headers.get("content-disposition") ?? "";
      if (
        res.ok &&
        (PPT_MIME.test(dlType) ||
          (dlType.includes("application/octet-stream") &&
            PPT_FILENAME.test(disposition)))
      ) {
        void res.body?.cancel();
        res = await fetchPresentationPdf(id);
      }
    }

    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("text/html")) {
      // Sign-in/error pages and 401/403 mean the file isn't shared publicly;
      // anything else (429, 5xx) is transient and worth retrying.
      const notShared =
        type.includes("text/html") || res.status === 401 || res.status === 403;
      return Response.json(
        { error: notShared ? "not-shared" : "fetch-failed" },
        { status: notShared ? 403 : 502 }
      );
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
