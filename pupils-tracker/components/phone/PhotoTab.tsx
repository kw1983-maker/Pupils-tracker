"use client";

import { useRef, useState } from "react";
import { Camera, EyeOff, ImageIcon, Monitor, RotateCcw } from "lucide-react";
import { useTracker } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useRemoteSend } from "@/lib/remote";
import { saveBoardPhoto } from "@/lib/firebase";
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
 * Phone "Photo" tab: snap a pupil's work (or pick one from the gallery) and
 * put it up full-screen on the projector.
 */
export function PhotoTab() {
  const { teacherId } = useTracker();
  const { user } = useAuth();
  const send = useRemoteSend();
  const accountId = teacherId || user?.uid || null;
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onBoard, setOnBoard] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const onPicked = async (file: File | undefined) => {
    if (!file) return;
    setStatus(null);
    setOnBoard(false);
    try {
      setPreview(await shrinkImage(file));
    } catch {
      setPreview(null);
      setStatus({ ok: false, text: "Couldn't open that photo — try another." });
    }
  };

  const showOnBoard = async () => {
    if (!preview || !accountId) return;
    setBusy(true);
    setStatus(null);
    try {
      await saveBoardPhoto(accountId, preview);
      await send({ type: "photo", action: "show" });
      setOnBoard(true);
      setStatus({ ok: true, text: "Showing on the board" });
    } catch (err) {
      console.error("Send photo failed:", err);
      setStatus({ ok: false, text: "Couldn't send the photo — check your connection." });
    } finally {
      setBusy(false);
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
          Take a photo of a pupil&apos;s work and it opens full-screen on the projector.
        </p>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onPicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onPicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => cameraInput.current?.click()}>
          <Camera className="h-4 w-4" /> Take photo
        </Button>
        <Button variant="secondary" onClick={() => galleryInput.current?.click()}>
          <ImageIcon className="h-4 w-4" /> From gallery
        </Button>
      </div>

      {preview && (
        <div className="space-y-3 rounded-card bg-surface p-3 shadow-float">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img
            src={preview}
            alt="Photo to show on the board"
            className="max-h-[50vh] w-full rounded-md object-contain"
          />
          <Button className="w-full" onClick={showOnBoard} disabled={busy}>
            <Monitor className="h-4 w-4" /> {busy ? "Sending…" : "Show on board"}
          </Button>
        </div>
      )}

      {onBoard ? (
        <Button variant="secondary" className="w-full" onClick={hide}>
          <EyeOff className="h-4 w-4" /> Close it on the board
        </Button>
      ) : (
        <Button variant="ghost" className="w-full" onClick={reshow}>
          <RotateCcw className="h-4 w-4" /> Show the last photo again
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
