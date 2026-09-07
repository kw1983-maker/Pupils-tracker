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
// How the "can this key read the account?" probe answers on the failure path.
let subscriptionProbe: () => Response = () =>
  Response.json({ character_count: 0, character_limit: 30_000 });

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
    if (url.includes("/v1/user/subscription")) {
      return subscriptionProbe();
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
  subscriptionProbe = () =>
    Response.json({ character_count: 0, character_limit: 30_000 });
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

  it("blames the Music permission when the key can still read the account", async () => {
    // Valid key, paid plan, credits available — but not allowed to compose.
    stubFetch(() => new Response("unauthorized", { status: 401 }));
    subscriptionProbe = () =>
      Response.json({ character_count: 3_198, character_limit: 30_127 });
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("music_generation");
    expect(body.message).not.toContain("regenerated");
  });

  it("blames the key itself when it can't read the account either", async () => {
    stubFetch(() => new Response("unauthorized", { status: 401 }));
    subscriptionProbe = () => new Response("unauthorized", { status: 401 });
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("regenerated");
    expect(body.message).not.toContain("music_generation");
  });

  it("doesn't probe the account when the failure isn't about the key", async () => {
    stubFetch(() => new Response("server exploded", { status: 500 }));
    let probed = false;
    subscriptionProbe = () => {
      probed = true;
      return Response.json({});
    };
    const { POST } = await loadRoute();

    await POST(songRequest({ words: ["cat"] }));

    expect(probed).toBe(false);
  });

  it("passes the upstream text along so a wrong key is told apart from a plan without Music", async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ detail: { status: "missing_permissions" } }),
          { status: 401 }
        )
    );
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    const body = (await res.json()) as { error: string; detail?: string };
    expect(body.error).toBe("bad-key");
    expect(body.detail).toContain("missing_permissions");
  });

  it("explains an out-of-credits account", async () => {
    stubFetch(() => new Response("quota_exceeded: 0 credits", { status: 402 }));
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    const body = (await res.json()) as { error: string; detail?: string };
    expect(body.error).toBe("quota");
    expect(body.detail).toContain("quota_exceeded");
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

  it("trims the key so a pasted newline isn't sent as part of it", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "sk-real-key\n");
    const fetchMock = stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    await POST(songRequest({ words: ["cat"] }));

    const musicCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("api.elevenlabs.io/v1/music")
    );
    const headers = (musicCall?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["xi-api-key"]).toBe("sk-real-key");
  });

  it("treats a whitespace-only key as missing", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "   ");
    stubFetch(() => audioResponse());
    const { POST } = await loadRoute();

    const res = await POST(songRequest({ words: ["cat"] }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: "missing-key" });
    expect(musicCalls).toHaveLength(0);
  });

  it("keeps the request inside the platform's function limit", async () => {
    const { maxDuration } = await loadRoute();
    // Vercel's Hobby plan fails the deployment for anything above 60.
    expect(maxDuration).toBeGreaterThan(15);
    expect(maxDuration).toBeLessThanOrEqual(60);
  });

  it("declares maxDuration as a literal Next.js can read at build time", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("app/api/spelling-song/route.ts", "utf8")
    );
    // Next.js analyses segment config statically; an imported constant fails
    // the production build with "Invalid segment configuration export".
    expect(source).toMatch(/^export const maxDuration = \d+;$/m);
  });

  it("keeps the internal timeout budget inside maxDuration", async () => {
    const { maxDuration } = await loadRoute();
    const { LYRICS_TIMEOUT_MS, SONG_FETCH_TIMEOUT_MS, SONG_MAX_DURATION_SECONDS } =
      await import("@/lib/spelling-song");

    expect(SONG_MAX_DURATION_SECONDS).toBe(maxDuration);
    // Lyrics then compose must both fit, with room to send the response.
    expect(LYRICS_TIMEOUT_MS + SONG_FETCH_TIMEOUT_MS).toBeLessThan(
      maxDuration * 1000
    );
  });
});
