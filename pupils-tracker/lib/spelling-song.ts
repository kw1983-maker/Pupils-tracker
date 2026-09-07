/**
 * Shared helpers for the Tutor tab's "Make a song" flow
 * (`app/api/spelling-song` + SpellingSongModal).
 *
 * Kept free of I/O so the request shape, length clamping, and ElevenLabs error
 * parsing can be unit-tested without hitting Gemini or Music.
 */

export const ALLOWED_LENGTHS = [30_000, 60_000, 90_000] as const;
export type SongLengthMs = (typeof ALLOWED_LENGTHS)[number];

export const DEFAULT_STYLE = "cheerful children's nursery pop";
export const DEFAULT_MUSIC_MODEL = "music_v2";

/** Compose waits for Gemini lyrics then a 30–90s track, far above the ~10–15s
 *  platform default. 60s is the ceiling every Vercel plan accepts (Hobby
 *  rejects the whole *deployment* for anything higher), so budget inside it:
 *  lyrics get a slice, compose gets the rest, and we abort just early enough to
 *  answer with a real message instead of a platform timeout. */
export const SONG_MAX_DURATION_SECONDS = 60;
export const LYRICS_TIMEOUT_MS = 12_000;
export const SONG_FETCH_TIMEOUT_MS = 44_000;
/** Only runs on the failure path, where the budget is already spent. */
export const KEY_PROBE_TIMEOUT_MS = 5_000;

const ALLOWED_LENGTH_SET = new Set<number>(ALLOWED_LENGTHS);

/** Resolve `work`, or `fallback` if it throws or outruns `ms`. Keeps a slow
 *  Gemini call from spending the whole function budget before compose starts. */
export async function withTimeout<T>(
  work: () => Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function clampLength(ms: unknown): SongLengthMs {
  const n = typeof ms === "number" ? ms : Number(ms);
  return ALLOWED_LENGTH_SET.has(n) ? (n as SongLengthMs) : 30_000;
}

export function lineCountHint(lengthMs: number): string {
  if (lengthMs >= 90_000) return "24–30 short lines";
  if (lengthMs >= 60_000) return "16–20 short lines";
  return "8–12 short lines";
}

export function lyricsPrompt(words: string[], topic: string, lengthMs: number): string {
  return [
    `You are a songwriter for primary school pupils aged 6–8.`,
    `Write short, cheerful, easy-to-sing song lyrics that help children`,
    `memorise these spelling words${topic ? ` (topic: ${topic})` : ""}:`,
    words.join(", "),
    ``,
    `Rules:`,
    `- Spell each word out letter by letter in a catchy, repetitive way`,
    `  (e.g. "C-A-T, cat!"), then use the word in a simple sentence.`,
    `- Write ${lineCountHint(lengthMs)} so the lyrics comfortably fill the song`,
    `  (repeating a chorus line is fine). Simple, happy, rhyming where natural.`,
    `- Return ONLY the lyrics as plain text — no title, notes, or markdown.`,
  ].join("\n");
}

export function extendLyricsPrompt(ownLyrics: string, lengthMs: number): string {
  return [
    `You are a songwriter for primary school pupils aged 6–8. A pupil wrote`,
    `the start of a song. Keep their exact lines unchanged and in the same`,
    `order, then add a few more simple, cheerful, rhyming lines (repeating one`,
    `of their lines as a chorus is fine) so the whole song comfortably fills`,
    `about ${lineCountHint(lengthMs)} when sung.`,
    ``,
    `The pupil's lines:`,
    ownLyrics,
    ``,
    `Return ONLY the full final lyrics as plain text — the pupil's lines`,
    `first, unchanged, followed by any added lines. No title, notes, or`,
    `markdown.`,
  ].join("\n");
}

export function songTitle(topic: string, ownLyrics: string, words: string[]): string {
  if (topic) return `${topic} Song`;
  if (ownLyrics) return "Our song";
  return `Spelling Song: ${words.slice(0, 3).join(", ")}`;
}

/** music_v2's default MP3 is 48 kHz; pinning v1's mp3_44100_128 can 422. */
export function musicComposeUrl(): string {
  return "https://api.elevenlabs.io/v1/music?output_format=auto";
}

export function usesV2Plan(modelId: string): boolean {
  return modelId.trim() !== "music_v1";
}

/** music_v2 wants several English style tags on the first chunk. */
export function positiveStylesFor(style: string): string[] {
  const fromTeacher = style
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const extras = [
    "sung vocals",
    "clear pronunciation",
    "children's song",
    "simple melody",
    "kid-friendly",
    "cheerful",
    "great production quality",
  ];
  return [...new Set([...fromTeacher, ...extras])].slice(0, 50);
}

export function chunkTextForLyrics(lyrics: string): string {
  const trimmed = lyrics.trim();
  if (/^\s*\[[^\]]+\]/m.test(trimmed)) return trimmed;
  return `[Verse]\n${trimmed}`;
}

export type ComposeBody = {
  model_id: string;
  prompt?: string;
  music_length_ms?: number;
  force_instrumental?: boolean;
  composition_plan?: {
    chunks: Array<{
      text: string;
      duration_ms: number;
      positive_styles: string[];
      negative_styles: string[];
      context_adherence: "high";
    }>;
  };
};

export function buildPromptBody(opts: {
  modelId: string;
  style: string;
  topic: string;
  lyrics: string | null;
  words: string[];
  lengthMs: number;
}): ComposeBody {
  const prompt = opts.lyrics
    ? [
        `A ${opts.style} song for children aged 6–8. Clear, cheerful sung vocals that`,
        `enunciate every letter and word so pupils can sing along. This MUST be a sung`,
        `song, not an instrumental.`,
        opts.topic ? `Topic: ${opts.topic}.` : "",
        ``,
        `Lyrics:`,
        opts.lyrics,
      ]
        .filter(Boolean)
        .join("\n")
    : `A fun, simple ${opts.style} for children aged 6–8 with clear sung vocals that spell out and repeat these words letter by letter: ${opts.words.join(
        ", "
      )}.${opts.topic ? ` Topic: ${opts.topic}.` : ""}`;

  return {
    prompt,
    music_length_ms: opts.lengthMs,
    model_id: opts.modelId,
    force_instrumental: false,
  };
}

/** Prefer a v2 composition plan so the lyrics are actually sung, not ignored. */
export function buildComposeBody(opts: {
  modelId: string;
  style: string;
  topic: string;
  lyrics: string | null;
  words: string[];
  lengthMs: number;
}): ComposeBody {
  if (opts.lyrics && usesV2Plan(opts.modelId)) {
    return {
      model_id: opts.modelId,
      composition_plan: {
        chunks: [
          {
            text: chunkTextForLyrics(opts.lyrics),
            duration_ms: opts.lengthMs,
            positive_styles: positiveStylesFor(opts.style),
            negative_styles: ["instrumental only", "aggressive", "explicit"],
            context_adherence: "high",
          },
        ],
      },
    };
  }
  return buildPromptBody(opts);
}

export function isAudioPayload(contentType: string | null, bytes: Uint8Array): boolean {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("json") || type.includes("text/")) return false;
  if (bytes.length < 16) return false;
  // ID3 tag or MPEG frame sync — ElevenLabs returns MP3.
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  if (bytes[0] === 0xff && bytes[1] !== undefined && (bytes[1] & 0xe0) === 0xe0) return true;
  if (type.includes("audio/") || type.includes("mpeg") || type.includes("octet-stream")) {
    return bytes[0] !== 0x7b && bytes[0] !== 0x5b; // not `{` / `[`
  }
  return false;
}

type ElevenLabsDetail =
  | string
  | {
      status?: string;
      code?: string;
      message?: string;
      prompt_suggestion?: string;
      loc?: unknown;
      msg?: string;
    }
  | Array<{ msg?: string; message?: string }>;

export function parseMusicError(raw: string, status: number): {
  error: string;
  message: string;
  detail?: string;
} {
  const sliced = raw.slice(0, 400);
  let parsed: { detail?: ElevenLabsDetail; message?: string } | null = null;
  try {
    parsed = JSON.parse(raw) as { detail?: ElevenLabsDetail; message?: string };
  } catch {
    parsed = null;
  }

  const detail = parsed?.detail;
  const obj =
    typeof detail === "object" && detail !== null && !Array.isArray(detail)
      ? detail
      : undefined;
  // ElevenLabs reuses HTTP 401 for several unrelated reasons — an exhausted
  // quota answers 401 just like a genuinely bad key — so decide from the reason
  // it names, and only fall back to the status code. `code` is the current
  // field; `status` is the legacy one still sent by some endpoints.
  const reason = (obj?.code ?? obj?.status ?? "").toLowerCase();

  if (reason === "quota_exceeded") {
    return {
      error: "quota",
      message:
        "The ElevenLabs account has no credits left, so it can't make a song. " +
        "Top up or wait for the monthly reset, then try again.",
      detail: sliced || undefined,
    };
  }
  if (reason === "invalid_api_key" || reason === "unauthorized") {
    return {
      error: "bad-key",
      message:
        "The music service didn't recognise the API key — it may have been " +
        "regenerated. Update ELEVENLABS_API_KEY.",
      detail: sliced || undefined,
    };
  }
  // A key is restricted by default and music_generation is separate from
  // text_to_speech, so the key that narrates stories can still be refused here.
  if (reason === "missing_permissions" || reason === "authorization_error") {
    return {
      error: "bad-key",
      message:
        "This API key isn't allowed to make music. In ElevenLabs, edit the key " +
        "and switch on its Music permission (music_generation).",
      detail: sliced || undefined,
    };
  }
  if (
    reason === "rate_limit_exceeded" ||
    reason === "concurrent_limit_exceeded" ||
    reason === "too_many_concurrent_requests" ||
    reason === "system_busy"
  ) {
    return {
      error: "busy",
      message:
        "The music service is busy right now — please wait a moment and try again.",
      detail: sliced || undefined,
    };
  }
  if (reason === "detected_unusual_activity") {
    return {
      error: "blocked",
      message:
        "ElevenLabs has paused this account for unusual activity. Check the " +
        "account's status on elevenlabs.io.",
      detail: sliced || undefined,
    };
  }
  if (reason === "bad_prompt") {
    return {
      error: "bad-prompt",
      message: obj?.prompt_suggestion
        ? `The music service couldn't use those words. Try: ${obj.prompt_suggestion}`
        : "The music service couldn't use those words. Try simpler spelling words.",
      detail: sliced,
    };
  }

  if (status === 401 || status === 403) {
    return {
      error: "bad-key",
      message:
        "The music service refused the API key. Check ELEVENLABS_API_KEY, and " +
        "that the key has the Music permission (music_generation) switched on.",
      detail: sliced || undefined,
    };
  }
  if (status === 402) {
    return {
      error: "quota",
      message:
        "The ElevenLabs account has no credits left, so it can't make a song. " +
        "Top up or wait for the monthly reset, then try again.",
      detail: sliced || undefined,
    };
  }
  if (status === 429) {
    return {
      error: "busy",
      message:
        "The music service is busy right now — please wait a moment and try again.",
      detail: sliced || undefined,
    };
  }

  const fromDetail =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg ?? d.message).filter(Boolean).join("; ")
        : detail?.message ?? detail?.msg;
  const message =
    fromDetail ||
    parsed?.message ||
    "The music service couldn't make the song. Please try again.";

  return {
    error: "generation-failed",
    message,
    detail: sliced || undefined,
  };
}
