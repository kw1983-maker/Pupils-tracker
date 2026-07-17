// Convert WMA (and ASF) audio to a browser-playable format via ffmpeg.wasm.
// Browsers cannot play WMA natively; this runs entirely client-side so the
// teacher's file never leaves the device. Core + worker assets are served from
// /ffmpeg/ (copied on postinstall) to avoid CDN blocks and Turbopack worker bugs.

import type { FFmpeg } from "@ffmpeg/ffmpeg";

const WMA_EXT = /\.(wma|asf)$/i;
const WMA_MIME = /audio\/(x-ms-)?wma|audio\/x-ms-asf|video\/x-ms-asf/i;

export function needsWmaConversion(
  name: string,
  mimeType = ""
): boolean {
  return WMA_EXT.test(name) || WMA_MIME.test(mimeType);
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      const logs: string[] = [];
      ffmpeg.on("log", ({ message }) => {
        logs.push(message);
        // Keep a short rolling window for error reports.
        if (logs.length > 40) logs.shift();
      });
      // Stash logs on the instance so convert can read the last failure reason.
      (ffmpeg as FFmpeg & { __logs: string[] }).__logs = logs;

      const base = `${window.location.origin}/ffmpeg`;
      // classWorkerURL must be a real same-origin URL (not a blob) so the
      // module worker can resolve its ./const.js and ./errors.js imports.
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${base}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        classWorkerURL: `${base}/worker.js`,
      });
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

function lastLogs(ffmpeg: FFmpeg): string {
  const logs = (ffmpeg as FFmpeg & { __logs?: string[] }).__logs ?? [];
  return logs.slice(-8).join(" | ") || "(no ffmpeg log)";
}

async function tryExec(
  ffmpeg: FFmpeg,
  args: string[],
  outName: string
): Promise<Uint8Array | null> {
  const code = await ffmpeg.exec(args);
  try {
    const data = await ffmpeg.readFile(outName);
    const bytes =
      data instanceof Uint8Array
        ? data
        : new TextEncoder().encode(String(data));
    if (bytes.byteLength > 64) {
      // Prefer a readable file even if ffmpeg returned a non-zero exit
      // (some builds warn-and-exit while still writing output).
      return bytes;
    }
  } catch {
    /* no output */
  }
  if (code !== 0) {
    console.warn("[wma-convert] ffmpeg exit", code, args.join(" "), lastLogs(ffmpeg));
  }
  return null;
}

/**
 * Transcode a WMA/ASF File (or Blob) to a playable object URL (MP3, else WAV).
 * Caller must revoke the returned URL when done.
 */
export async function convertWmaToMp3(
  input: Blob,
  sourceName: string
): Promise<{ url: string; name: string }> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await getFfmpeg();

  const inName = "input.wma";
  await ffmpeg.writeFile(inName, await fetchFile(input));

  // Try MP3 first (small), then WAV (universally playable), then AAC.
  const attempts: { out: string; mime: string; ext: string; args: string[] }[] =
    [
      {
        out: "output.mp3",
        mime: "audio/mpeg",
        ext: "mp3",
        args: ["-i", inName, "-vn", "-c:a", "libmp3lame", "-q:a", "4", "output.mp3"],
      },
      {
        out: "output.wav",
        mime: "audio/wav",
        ext: "wav",
        args: ["-i", inName, "-vn", "-c:a", "pcm_s16le", "output.wav"],
      },
      {
        out: "output.m4a",
        mime: "audio/mp4",
        ext: "m4a",
        args: ["-i", inName, "-vn", "-c:a", "aac", "-b:a", "128k", "output.m4a"],
      },
      // Force ASF demuxer — some Windows dictation files need it.
      {
        out: "output2.mp3",
        mime: "audio/mpeg",
        ext: "mp3",
        args: [
          "-f",
          "asf",
          "-i",
          inName,
          "-vn",
          "-c:a",
          "libmp3lame",
          "-q:a",
          "4",
          "output2.mp3",
        ],
      },
    ];

  let bytes: Uint8Array | null = null;
  let mime = "audio/mpeg";
  let ext = "mp3";

  for (const attempt of attempts) {
    bytes = await tryExec(ffmpeg, attempt.args, attempt.out);
    if (bytes) {
      mime = attempt.mime;
      ext = attempt.ext;
      break;
    }
    try {
      await ffmpeg.deleteFile(attempt.out);
    } catch {
      /* ignore */
    }
  }

  try {
    await ffmpeg.deleteFile(inName);
  } catch {
    /* ignore */
  }

  if (!bytes) {
    throw new Error(`ffmpeg could not decode this WMA (${lastLogs(ffmpeg)})`);
  }

  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: mime }));
  const base = sourceName.replace(/\.[^.]+$/, "") || "audio";
  return { url, name: `${base}.${ext}` };
}
