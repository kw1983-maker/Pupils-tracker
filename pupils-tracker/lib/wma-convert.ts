// Convert WMA (and ASF) audio to MP3 in the browser via ffmpeg.wasm.
// Browsers cannot play WMA natively; this runs entirely client-side so the
// teacher's file never leaves the device. Core assets are served from
// /ffmpeg/ (copied from @ffmpeg/core on postinstall) to avoid CDN blocks.

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
      // Same-origin blob URLs keep the worker happy without COOP/COEP.
      const base = `${window.location.origin}/ffmpeg`;
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${base}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
      return ffmpeg;
    })().catch((err) => {
      // Allow a later retry if the first load failed (offline, missing assets).
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

/**
 * Transcode a WMA/ASF File (or Blob) to an MP3 object URL.
 * Caller must revoke the returned URL when done.
 */
export async function convertWmaToMp3(
  input: Blob,
  sourceName: string
): Promise<{ url: string; name: string }> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await getFfmpeg();

  const inName = "input.wma";
  const outName = "output.mp3";
  await ffmpeg.writeFile(inName, await fetchFile(input));
  // libmp3lame is bundled in @ffmpeg/core; q:a 4 ≈ 140 kbps VBR — fine for
  // classroom dictation without making the convert step slow.
  const code = await ffmpeg.exec([
    "-i",
    inName,
    "-vn",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "4",
    outName,
  ]);
  if (code !== 0) {
    try {
      await ffmpeg.deleteFile(inName);
    } catch {
      /* ignore */
    }
    throw new Error(`ffmpeg exited with code ${code}`);
  }

  const data = await ffmpeg.readFile(outName);
  try {
    await ffmpeg.deleteFile(inName);
    await ffmpeg.deleteFile(outName);
  } catch {
    /* ignore cleanup failures */
  }

  const bytes =
    data instanceof Uint8Array
      ? data
      : new TextEncoder().encode(String(data));
  // Copy into a plain ArrayBuffer — some TS DOM libs reject SharedArrayBuffer
  // in the BlobPart union even though browsers accept it.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const url = URL.createObjectURL(
    new Blob([copy.buffer], { type: "audio/mpeg" })
  );
  const base = sourceName.replace(/\.[^.]+$/, "") || "audio";
  return { url, name: `${base}.mp3` };
}
