import { describe, expect, it } from "vitest";
import {
  buildComposeBody,
  buildPromptBody,
  clampLength,
  chunkTextForLyrics,
  isAudioPayload,
  lineCountHint,
  musicComposeUrl,
  parseMusicError,
  positiveStylesFor,
  songTitle,
} from "@/lib/spelling-song";

describe("clampLength", () => {
  it("keeps the three offered lengths", () => {
    expect(clampLength(30_000)).toBe(30_000);
    expect(clampLength(60_000)).toBe(60_000);
    expect(clampLength(90_000)).toBe(90_000);
  });

  it("falls back to 30s for anything else", () => {
    expect(clampLength(15_000)).toBe(30_000);
    expect(clampLength("nope")).toBe(30_000);
    expect(clampLength(undefined)).toBe(30_000);
  });
});

describe("lineCountHint", () => {
  it("scales with the chosen length", () => {
    expect(lineCountHint(30_000)).toContain("8–12");
    expect(lineCountHint(60_000)).toContain("16–20");
    expect(lineCountHint(90_000)).toContain("24–30");
  });
});

describe("songTitle", () => {
  it("prefers a topic, then own lyrics, then the first spelling words", () => {
    expect(songTitle("Animals", "", ["cat"])).toBe("Animals Song");
    expect(songTitle("", "We love to spell", ["cat"])).toBe("Our song");
    expect(songTitle("", "", ["cat", "dog", "hat", "run"])).toBe(
      "Spelling Song: cat, dog, hat"
    );
  });
});

describe("musicComposeUrl", () => {
  it("lets ElevenLabs pick a format that matches music_v2", () => {
    expect(musicComposeUrl()).toBe(
      "https://api.elevenlabs.io/v1/music?output_format=auto"
    );
  });
});

describe("buildComposeBody", () => {
  it("sends a v2 composition plan so the lyrics are sung", () => {
    const body = buildComposeBody({
      modelId: "music_v2",
      style: "cheerful children's nursery pop",
      topic: "Animals",
      lyrics: "C-A-T, cat!\nThe cat sat on the mat.",
      words: ["cat"],
      lengthMs: 30_000,
    });
    expect(body.prompt).toBeUndefined();
    expect(body.composition_plan?.chunks).toHaveLength(1);
    expect(body.composition_plan?.chunks[0]?.duration_ms).toBe(30_000);
    expect(body.composition_plan?.chunks[0]?.text).toContain("C-A-T, cat!");
    expect(body.composition_plan?.chunks[0]?.positive_styles).toContain(
      "sung vocals"
    );
  });

  it("uses a prompt for the legacy music_v1 model", () => {
    const body = buildComposeBody({
      modelId: "music_v1",
      style: "cheerful children's nursery pop",
      topic: "",
      lyrics: "C-A-T, cat!",
      words: ["cat"],
      lengthMs: 30_000,
    });
    expect(body.composition_plan).toBeUndefined();
    expect(body.prompt).toContain("C-A-T, cat!");
    expect(body.force_instrumental).toBe(false);
    expect(body.music_length_ms).toBe(30_000);
  });

  it("falls back to a description prompt when there are no lyrics yet", () => {
    const body = buildComposeBody({
      modelId: "music_v2",
      style: "fun kids hip-hop, playful beat",
      topic: "",
      lyrics: null,
      words: ["cat", "dog"],
      lengthMs: 60_000,
    });
    expect(body.composition_plan).toBeUndefined();
    expect(body.prompt).toContain("cat, dog");
    expect(body.music_length_ms).toBe(60_000);
  });
});

describe("buildPromptBody", () => {
  it("asks for sung vocals, not an instrumental", () => {
    const body = buildPromptBody({
      modelId: "music_v2",
      style: "cheerful children's nursery pop",
      topic: "Pets",
      lyrics: "Woof woof, D-O-G, dog!",
      words: ["dog"],
      lengthMs: 30_000,
    });
    expect(body.prompt).toMatch(/sung/i);
    expect(body.prompt).toContain("Woof woof");
    expect(body.force_instrumental).toBe(false);
  });
});

describe("chunkTextForLyrics", () => {
  it("adds a verse tag when the lyrics have none", () => {
    expect(chunkTextForLyrics("hello cat")).toBe("[Verse]\nhello cat");
  });

  it("keeps lyrics that already have section tags", () => {
    expect(chunkTextForLyrics("[Chorus]\nC-A-T")).toBe("[Chorus]\nC-A-T");
  });
});

describe("positiveStylesFor", () => {
  it("keeps the teacher's style and adds sung-vocal tags", () => {
    const styles = positiveStylesFor("fun kids hip-hop, playful beat");
    expect(styles).toContain("fun kids hip-hop");
    expect(styles).toContain("playful beat");
    expect(styles).toContain("sung vocals");
  });
});

describe("isAudioPayload", () => {
  it("accepts an ID3 MP3", () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(isAudioPayload("audio/mpeg", bytes)).toBe(true);
  });

  it("rejects JSON even when the content-type claims audio", () => {
    const json = new TextEncoder().encode('{"detail":"nope"}');
    expect(isAudioPayload("audio/mpeg", json)).toBe(false);
  });

  it("rejects tiny or empty bodies", () => {
    expect(isAudioPayload("audio/mpeg", new Uint8Array([0xff]))).toBe(false);
  });
});

describe("parseMusicError", () => {
  it("maps 401 to a key error", () => {
    expect(parseMusicError("nope", 401).error).toBe("bad-key");
  });

  it("maps 402/429 to quota", () => {
    expect(parseMusicError("", 402).error).toBe("quota");
    expect(parseMusicError("", 429).error).toBe("quota");
  });

  it("surfaces a bad_prompt suggestion", () => {
    const parsed = parseMusicError(
      JSON.stringify({
        detail: {
          status: "bad_prompt",
          prompt_suggestion: "A cheerful children's song about cats",
        },
      }),
      422
    );
    expect(parsed.error).toBe("bad-prompt");
    expect(parsed.message).toContain("cheerful children's song about cats");
  });

  it("reads validation messages from a 422 array", () => {
    const parsed = parseMusicError(
      JSON.stringify({
        detail: [{ loc: ["body", "output_format"], msg: "Invalid output format" }],
      }),
      422
    );
    expect(parsed.message).toContain("Invalid output format");
  });
});
