import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Drives the real `POST /api/spelling-song` handler with a stubbed ElevenLabs
 * and Firebase, so the whole path — auth, lyric budget, compose body, audio
 * validation, plan→prompt fallback, response headers — is covered without a key.
 *
 * The route rate-limits per uid in module scope, so every test re-imports the
 * module fresh and the Firebase stub returns a unique uid.
 */

const MP3 = new Uint8Array([
  0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x0a, 0xff, 0xfb, 0x90, 0x64, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

type MusicHandler = (body: unknown, url: string) => Response | Promise<Response>;

let musicCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
let uidCounter = 0;

function stubFetch(music: MusicHandler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("identitytoolkit")) {
      uidCounter += 1;
      return Response.json({ users: [{ localId: `teacher-${uidCounter}` }] });
    }
    if (url.includes("api.elevenlabs.io/v1/music")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      musicCalls.push({ url, body });
      return music(body, url);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function audioResponse(bytes: Uint8Array = MP3) {
  return new Response(bytes.slice().buffer, {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
}

function songRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/spelling-song", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer valid-id-token",
    },
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  vi.resetModules();
  return await import("@/app/api/spelling-song/route");
}

beforeEach(() => {
  musicCalls = [];
  vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("ELEVENLABS_MUSIC_MODEL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/spelling-song", () => {
  it("returns a playable MP3 with the title and lyrics headers", async () => {
    stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    const res = await POST(
      songRequest({
        lyrics: "We love to spell,\nC-A-T spells cat!",
        topic: "Animals",
        lengthMs: 30_000,
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(decodeURIComponent(res.headers.get("x-song-title") ?? "")).toBe(
      "Animals Song"
    );
    expect(decodeURIComponent(res.headers.get("x-song-lyrics") ?? "")).toContain(
      "C-A-T spells cat!"
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.byteLength).toBe(MP3.byteLength);
    expect(Number(res.headers.get("content-length"))).toBe(MP3.byteLength);
  });

  it("asks ElevenLabs for a format that matches music_v2", async () => {
    stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    await POST(songRequest({ words: ["cat", "dog"], lengthMs: 30_000 }));

    expect(musicCalls[0]?.url).toContain("output_format=auto");
    expect(musicCalls[0]?.url).not.toContain("mp3_44100_128");
  });

  it("sends pupils' lyrics as a composition plan so they get sung", async () => {
    stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    await POST(songRequest({ lyrics: "C-A-T, cat!", lengthMs: 60_000 }));

    const plan = musicCalls[0]?.body.composition_plan as
      | { chunks: Array<{ text: string; duration_ms: number }> }
      | undefined;
    expect(plan?.chunks[0]?.text).toContain("C-A-T, cat!");
    expect(plan?.chunks[0]?.duration_ms).toBe(60_000);
  });

  it("retries with a plain prompt when the plan is rejected", async () => {
    stubFetch((body) =>
      body && (body as Record<string, unknown>).composition_plan
        ? Response.json(
            { detail: [{ msg: "composition_plan not supported" }] },
            { status: 422 }
          )
        : audioResponse()
    );
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ lyrics: "C-A-T, cat!" }));

    expect(musicCalls).toHaveLength(2);
    expect(musicCalls[1]?.body.prompt).toContain("C-A-T, cat!");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("reports a JSON error body served as audio/mpeg instead of a silent track", async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ detail: { message: "no music access" } }), {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        })
    );
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      message: "no music access",
    });
  });

  it("explains an expired ElevenLabs key", async () => {
    stubFetch(() => new Response("unauthorized", { status: 401 }));
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ error: "bad-key" });
  });

  it("explains an out-of-credits account", async () => {
    stubFetch(() => new Response("payment required", { status: 402 }));
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    await expect(res.json()).resolves.toMatchObject({ error: "quota" });
  });

  it("turns an upstream timeout into an actionable message", async () => {
    stubFetch(() => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    });
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    expect(res.status).toBe(504);
    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(/too long/i);
  });

  it("rejects an unsigned request before spending credits", async () => {
    stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    const res = await POST(
      new Request("http://localhost/api/spelling-song", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ words: ["cat"] }),
      })
    );

    expect(res.status).toBe(401);
    expect(musicCalls).toHaveLength(0);
  });

  it("asks for words or lyrics before calling the music service", async () => {
    stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: [] }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "no-words" });
    expect(musicCalls).toHaveLength(0);
  });

  it("keeps the request inside the platform's function limit", async () => {
    const { maxDuration } = await loadRoute();
    // Vercel's Hobby plan fails the deployment for anything above 60.
    expect(maxDuration).toBeLessThanOrEqual(60);
  });
});
