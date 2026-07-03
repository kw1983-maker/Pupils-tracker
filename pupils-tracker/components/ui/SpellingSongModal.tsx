"use client";

import { useEffect, useRef, useState } from "react";
import { Music2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { auth } from "@/lib/firebase";

// Style presets woven into the ElevenLabs Music prompt. Kept teacher-friendly.
const STYLES = [
  { label: "Cheerful nursery pop", value: "cheerful children's nursery pop" },
  { label: "Bouncy hip-hop", value: "fun kids hip-hop, playful beat" },
  { label: "Gentle lullaby", value: "gentle children's lullaby, soft" },
  { label: "Marching chant", value: "upbeat marching band chant for kids" },
  { label: "Rock and roll", value: "upbeat kids rock and roll, guitars" },
  { label: "Reggae", value: "sunny children's reggae, relaxed groove" },
  { label: "Country hoedown", value: "playful country hoedown for kids, banjo, fiddle" },
  { label: "Disco", value: "fun disco for children, funky bassline" },
  { label: "Sea shanty", value: "jolly children's sea shanty, sing-along" },
  { label: "Jazz swing", value: "happy kids jazz swing, upbeat brass" },
  { label: "Electronic dance", value: "cheerful kids EDM, catchy synth" },
  { label: "Classical waltz", value: "gentle children's classical waltz, orchestral" },
  { label: "Folk sing-along", value: "warm children's folk sing-along, acoustic guitar" },
  { label: "Musical theatre", value: "bright kids musical theatre show tune" },
];

// Song length options (ms). Cost/time scale with length, so 30s is the default.
const LENGTHS = [
  { label: "Short (30s)", value: 30_000 },
  { label: "Medium (60s)", value: 60_000 },
  { label: "Long (90s)", value: 90_000 },
];

// ElevenLabs Music costs ~900 credits per minute (~15 per second). Used to turn
// the remaining credit balance into an approximate "songs left" for the chosen
// length.
const CREDITS_PER_SECOND = 15;

/**
 * "Make a song" for the Spelling board: the teacher types the week's words,
 * Gemini writes kid-friendly lyrics and ElevenLabs Music sings them. ElevenLabs
 * Music is synchronous — one request returns the finished MP3, which we hand back
 * via `onSongReady` (as an object URL) to play in the board's floating audio
 * player. Modal shell follows DriveLinkModal / BookPickerModal.
 */
export function SpellingSongModal({
  isOpen,
  onClose,
  onSongReady,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the finished song's (object-URL) audio URL, title, and the
      lyrics to show on the board for sing-along (when known). */
  onSongReady: (url: string, title: string, lyrics?: string) => void;
}) {
  const [words, setWords] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState(STYLES[0].value);
  const [lengthMs, setLengthMs] = useState<number>(LENGTHS[0].value);
  // "Write our own lyrics" mode — pupils type the exact words to be sung.
  const [ownLyrics, setOwnLyrics] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remaining ElevenLabs credits (null = unknown / key can't read the balance).
  const [credits, setCredits] = useState<number | null>(null);

  const refreshCredits = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      const res = await fetch("/api/spelling-song/credits", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return; // key likely lacks user_read — leave the badge hidden
      const data = (await res.json()) as { credits?: number };
      if (typeof data.credits === "number") setCredits(data.credits);
    } catch {
      /* leave the count hidden if it can't be fetched */
    }
  };

  // Ignore a late response if the modal closes or unmounts mid-generation.
  const cancelRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current = false;
    void refreshCredits();
    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // Approximate songs left at the currently selected length.
  const songsLeft =
    credits === null
      ? null
      : Math.floor(credits / (CREDITS_PER_SECOND * (lengthMs / 1000)));

  const reset = () => {
    setBusy(false);
    setProgress(null);
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = words
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    const myLyrics = lyrics.trim();
    if (busy) return;
    // Need either typed lyrics (own-lyrics mode) or some words (auto mode).
    if (ownLyrics ? !myLyrics : list.length === 0) return;

    setError(null);
    setBusy(true);
    setProgress("Composing… this takes about 20–40 seconds.");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Please sign in again to make a song.");
        reset();
        return;
      }

      const res = await fetch("/api/spelling-song", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          words: list,
          topic: topic.trim(),
          style,
          lengthMs,
          lyrics: ownLyrics ? myLyrics : undefined,
        }),
      });

      if (cancelRef.current) return;

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(data?.message ?? "Couldn't make the song. Please try again.");
        reset();
        return;
      }

      const blob = await res.blob();
      if (cancelRef.current) return;
      const url = URL.createObjectURL(blob);
      const header = res.headers.get("x-song-title") ?? "";
      let title = "Spelling song";
      try {
        title = decodeURIComponent(header) || title;
      } catch {
        /* keep the fallback title if the header can't be decoded */
      }

      // Own-lyrics mode: the pupils' typed words are the sung lyrics. Auto mode:
      // the server returns Gemini's lyrics in a header for the sing-along panel.
      let displayLyrics = ownLyrics ? myLyrics : "";
      if (!ownLyrics) {
        const raw = res.headers.get("x-song-lyrics");
        if (raw) {
          try {
            displayLyrics = decodeURIComponent(raw);
          } catch {
            /* no lyrics panel if the header can't be decoded */
          }
        }
      }

      onSongReady(url, title, displayLyrics || undefined);
      void refreshCredits(); // credits were just spent
      reset();
      onClose();
    } catch {
      if (!cancelRef.current) {
        setError("Something went wrong making the song. Please try again.");
        reset();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="card flex w-full max-w-lg flex-col overflow-hidden shadow-lift motion-reduce:animate-none animate-[pop_.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Make a spelling song"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-paper-900">
              <Music2 className="h-5 w-5 text-brand-600" /> Make a spelling song
            </h2>
            {songsLeft !== null && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  songsLeft <= 0
                    ? "bg-danger-bg text-danger"
                    : songsLeft <= 3
                      ? "bg-warning-bg text-warning"
                      : "bg-paper-100 text-paper-500"
                }`}
                title="Approximate songs remaining at the selected length"
              >
                {songsLeft === 1 ? "~1 song left" : `~${songsLeft} songs left`}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-md p-2 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={generate} className="space-y-4 px-5 py-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-paper-700">
            <input
              type="checkbox"
              checked={ownLyrics}
              onChange={(e) => setOwnLyrics(e.target.checked)}
              disabled={busy}
              className="h-4 w-4 rounded border-paper-300 text-brand-600 focus-visible:shadow-ring"
            />
            Write our own lyrics
          </label>

          {ownLyrics ? (
            <>
              <p className="text-sm text-paper-500">
                Type the exact words the singer should sing. Pupils can write
                their own lyrics — they&apos;ll be sung word for word. It takes
                about half a minute to compose.
              </p>
              <Field label="Our lyrics" htmlFor="song-lyrics">
                <textarea
                  id="song-lyrics"
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={
                    "We love to spell, we love to sing,\nC-A-T spells cat, hooray!"
                  }
                  rows={7}
                  disabled={busy}
                  autoFocus
                  className={`${fieldClassName} resize-y`}
                />
              </Field>
            </>
          ) : (
            <>
              <p className="text-sm text-paper-500">
                Type this week&apos;s spelling words (one per line, or separated
                by commas). A catchy song that spells them out will play on the
                board — it takes about half a minute to compose.
              </p>
              <Field label="Spelling words" htmlFor="song-words">
                <textarea
                  id="song-words"
                  value={words}
                  onChange={(e) => setWords(e.target.value)}
                  placeholder={"cat\ndog\nhouse\nplay"}
                  rows={5}
                  disabled={busy}
                  autoFocus
                  className={`${fieldClassName} resize-y`}
                />
              </Field>
            </>
          )}
          <div className="flex flex-wrap gap-3">
            <Field label="Topic (optional)" htmlFor="song-topic">
              <input
                id="song-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Animals"
                disabled={busy}
                className={`${fieldClassName} w-44`}
              />
            </Field>
            <Field label="Style" htmlFor="song-style">
              <select
                id="song-style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={busy}
                className={`${fieldClassName} w-auto`}
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Length" htmlFor="song-length">
              <select
                id="song-length"
                value={lengthMs}
                onChange={(e) => setLengthMs(Number(e.target.value))}
                disabled={busy}
                className={`${fieldClassName} w-auto`}
              >
                {LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {progress && (
            <p className="flex items-center gap-2 rounded-lg bg-paper-100 px-3 py-2 text-sm text-paper-600 motion-reduce:animate-none animate-pulse">
              <Music2 className="h-4 w-4 shrink-0 text-brand-600" />
              {progress}
            </p>
          )}
          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {busy ? "Close when done" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={
                busy ||
                songsLeft === 0 ||
                (ownLyrics ? !lyrics.trim() : !words.trim())
              }
            >
              <Music2 className="h-4 w-4" />
              {busy ? "Composing…" : "Make a song"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
