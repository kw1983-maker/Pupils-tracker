"use client";

import { useRef, useState } from "react";
import { Camera, EyeOff, ImageIcon, Monitor, RotateCcw, X } from "lucide-react";
import { useTracker } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useRemoteSend } from "@/lib/remote";
import { saveBoardPhoto, savePhotoSet } from "@/lib/firebase";
import { MAX_SET_PHOTOS } from "@/lib/photo-set";
import { usePhotoSet } from "@/lib/usePhotoSet";
import { resetPhotoAnnotations } from "@/lib/usePhotoAnnotations";
import { PhotoAnnotator } from "@/components/ui/photo/PhotoAnnotator";
import { PhotoPager } from "@/components/ui/photo/PhotoPager";
import { Button } from "@/components/ui/Button";

// Longest side after shrinking, and the JPEG quality. Keeps a phone photo
// around 150–400 KB so it fits one Firestore document (1 MiB) as a data URL.
const MAX_SIDE = 1280;
const QUALITY = 0.72;
const MAX_DATA_URL_CHARS = 950_000;

/** Draws the picked image onto a canvas at most MAX_SIDE px and returns a JPEG data URL. */
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let quality = QUALITY;
  let side = MAX_SIDE;
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_DATA_URL_CHARS) {
      bitmap.close();
      return url;
    }
    side = Math.round(side * 0.8);
    quality -= 0.1;
  }
  bitmap.close();
  throw new Error("too-big");
}

/**
 * Phone "Photo" tab: snap pupils' work (or pick up to MAX_SET_PHOTOS from the
 * gallery) and put it up full-screen on the projector, one photo at a time.
 * While it's up, flip between them and use the same zoom / turn / markup
 * tools as the board, live.
 */
export function PhotoTab() {
  const { teacherId } = useTracker();
  const { user } = useAuth();
  const send = useRemoteSend();
  const accountId = teacherId || user?.uid || null;
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const [onBoard, setOnBoard] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  // While the photos are up, follow the stored copies so the tools work on
  // exactly what the board shows (also after "Show the last photos again").
  const { set, current, go } = usePhotoSet(onBoard ? accountId : null);

  const room = MAX_SET_PHOTOS - picked.length;

  const onPicked = async (files: FileList | null) => {
    if (!files?.length) return;
    setStatus(null);
    setOnBoard(false);
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    const urls: string[] = [];
    let failed = 0;
    for (const file of chosen) {
      try {
        urls.push(await shrinkImage(file));
      } catch {
        failed++;
      }
    }
    setPicked((prev) => [...prev, ...urls].slice(0, MAX_SET_PHOTOS));
    if (files.length > chosen.length) {
      setStatus({
        ok: false,
        text: `Up to ${MAX_SET_PHOTOS} photos at a time — the rest were left out.`,
      });
    } else if (failed) {
      setStatus({ ok: false, text: "Couldn't open some of those photos — try another." });
    }
  };

  const showOnBoard = async () => {
    if (!picked.length || !accountId) return;
    setStatus(null);
    // Photos stamped before this are leftovers from an earlier send.
    const setAt = Date.now();
    try {
      for (let slot = 0; slot < picked.length; slot++) {
        setSending({ done: slot, total: picked.length });
        const at = await saveBoardPhoto(accountId, picked[slot], slot);
        // A new photo starts with no marks, zoom or turn on every device.
        await resetPhotoAnnotations(accountId, at, slot).catch((err) =>
          console.error("Reset photo markup failed:", err)
        );
      }
      await savePhotoSet(accountId, { setAt, count: picked.length, index: 0 });
      setPicked([]);
      await send({ type: "photo", action: "show" });
      setOnBoard(true);
      setStatus({ ok: true, text: "Showing on the board" });
    } catch (err) {
      console.error("Send photo failed:", err);
      setStatus({ ok: false, text: "Couldn't send the photos — check your connection." });
    } finally {
      setSending(null);
    }
  };

  const hide = async () => {
    await send({ type: "photo", action: "hide" });
    setOnBoard(false);
    setStatus({ ok: true, text: "Photo closed on the board" });
  };

  const reshow = async () => {
    await send({ type: "photo", action: "show" });
    setOnBoard(true);
    setStatus({ ok: true, text: "Showing on the board" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper-800">Show on the board</h2>
        <p className="text-xs text-paper-500">
          Take photos of pupils&apos; work (up to {MAX_SET_PHOTOS}) and they open full-screen on
          the projector, one at a time.
        </p>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onPicked(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void onPicked(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => cameraInput.current?.click()} disabled={room <= 0 || !!sending}>
          <Camera className="h-4 w-4" /> {picked.length ? "Add photo" : "Take photo"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => galleryInput.current?.click()}
          disabled={room <= 0 || !!sending}
        >
          <ImageIcon className="h-4 w-4" /> From gallery
        </Button>
      </div>

      {picked.length > 0 && (
        <div className="space-y-3 rounded-card bg-surface p-3 shadow-float">
          <ul className="grid grid-cols-3 gap-2" aria-label="Photos to show">
            {picked.map((url, i) => (
              <li key={`${i}-${url.length}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img
                  src={url}
                  alt={`Photo ${i + 1} to show on the board`}
                  className="aspect-square w-full rounded-md bg-paper-100 object-cover"
                />
                <span data-theme="light" className="absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-paper-900/70 px-1 text-xs font-bold text-paper-50">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  disabled={!!sending}
                  onClick={() => setPicked((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-1 outline-none focus-visible:shadow-ring"
                >
                  <span data-theme="light" className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-900/70 text-paper-50">
                    <X className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button className="w-full" onClick={showOnBoard} disabled={!!sending}>
            <Monitor className="h-4 w-4" />{" "}
            {sending
              ? `Sending ${sending.done + 1} of ${sending.total}…`
              : picked.length === 1
                ? "Show on board"
                : `Show ${picked.length} photos on board`}
          </Button>
        </div>
      )}

      {onBoard && accountId && (
        <div className="space-y-2">
          <PhotoPager set={set} onGo={go} className="w-full justify-between" />
          {current ? (
            <PhotoAnnotator
              uid={accountId}
              photo={current}
              slot={set.index}
              alt={`Photo ${set.index + 1} showing on the board`}
              className="space-y-2"
              stageClassName="h-[50vh] w-full rounded-card bg-paper-100"
              toolbarClassName="w-full"
            />
          ) : (
            <p className="text-sm font-semibold text-paper-500">Loading photo…</p>
          )}
        </div>
      )}

      {onBoard ? (
        <Button variant="secondary" className="w-full" onClick={hide}>
          <EyeOff className="h-4 w-4" /> Close it on the board
        </Button>
      ) : (
        <Button variant="ghost" className="w-full" onClick={reshow}>
          <RotateCcw className="h-4 w-4" /> Show the last photos again
        </Button>
      )}

      {status && (
        <p
          role="status"
          className={`text-sm font-semibold ${status.ok ? "text-success-ink" : "text-danger-ink"}`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
