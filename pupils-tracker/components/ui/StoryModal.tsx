"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Sparkles, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { auth } from "@/lib/firebase";

const AGES = [
  { label: "Ages 4–6", value: "4–6" },
  { label: "Ages 6–8", value: "6–8" },
  { label: "Ages 8–10", value: "8–10" },
];

const LENGTHS = [
  { label: "Short (~1 min)", value: "short" },
  { label: "Medium (~2 min)", value: "medium" },
  { label: "Long (~3 min)", value: "long" },
];

type Voice = { voiceId: string; name: string };

/**
 * "Story time" for the board: the teacher types a topic and Gemini writes a
 * kid-friendly story (or the teacher pastes their own), then ElevenLabs Eleven v3
 * narrates it emotionally with sound effects. The finished MP3 is handed back via
 * `onStoryReady` (as an object URL) to play in the board's floating audio player,
 * with the story shown in the follow-along panel. Modeled on SpellingSongModal.
 */
export function StoryModal({
  isOpen,
  onClose,
  onStoryReady,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the finished story's (object-URL) audio URL, title, and text. */
  onStoryReady: (url: string, title: string, text: string) => void;
}) {
  const [ownText, setOwnText] = useState(false);
  const [topic, setTopic] = useState("");
  const [age, setAge] = useState(AGES[1].value);
  const [length, setLength] = useState(LENGTHS[1].value);
  const [story, setStory] = useState("");
  const [title, setTitle] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVoices = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      const res = await fetch("/api/story/voices", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return; // fall back to the server's default voice
      const data = (await res.json()) as { voices?: Voice[] };
      const list = data.voices ?? [];
      setVoices(list);
      if (list.length) {
        // Prefer a warm storyteller voice when present.
        const story = list.find((v) => /storyteller|narrat|george/i.test(v.name));
        setVoiceId((story ?? list[0]).voiceId);
      }
    } catch {
      /* leave the dropdown empty; the server uses its default voice */
    }
  };

  // Ignore a late response if the modal closes or unmounts mid-request.
  const cancelRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current = false;
    void loadVoices();
    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const reset = () => {
    setWriting(false);
    setBusy(false);
    setProgress(null);
  };

  const write = async () => {
    if (writing || busy || !topic.trim()) return;
    setError(null);
    setWriting(true);
    setProgress("Writing the story…");
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Please sign in again to write a story.");
        reset();
        return;
      }
      const res = await fetch("/api/story/write", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ topic: topic.trim(), age, length }),
      });
      if (cancelRef.current) return;
      const data = (await res.json().catch(() => null)) as {
        title?: string;
        story?: string;
        message?: string;
      } | null;
      if (!res.ok || !data?.story) {
        setError(data?.message ?? "Couldn't write a story. Please try again.");
        reset();
        return;
      }
      setStory(data.story);
      setTitle(data.title ?? "");
      reset();
    } catch {
      if (!cancelRef.current) {
        setError("Something went wrong writing the story. Please try again.");
        reset();
      }
    }
  };

  const read = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = story.trim();
    if (busy || writing || !text) return;
    setError(null);
    setBusy(true);
    setProgress("Reading it aloud… this takes a few seconds.");
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Please sign in again to read a story.");
        reset();
        return;
      }
      const res = await fetch("/api/story/read", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ story: text, voiceId, title: title.trim() }),
      });
      if (cancelRef.current) return;
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(data?.message ?? "Couldn't read the story. Please try again.");
        reset();
        return;
      }
      const blob = await res.blob();
      if (cancelRef.current) return;
      const url = URL.createObjectURL(blob);
      const header = res.headers.get("x-story-title") ?? "";
      let finalTitle = title.trim() || "A story";
      try {
        finalTitle = decodeURIComponent(header) || finalTitle;
      } catch {
        /* keep the fallback title */
      }
      onStoryReady(url, finalTitle, text);
      reset();
      onClose();
    } catch {
      if (!cancelRef.current) {
        setError("Something went wrong reading the story. Please try again.");
        reset();
      }
    }
  };

  const working = writing || busy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={working ? undefined : onClose}
    >
      <div
        className="card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden shadow-lift motion-reduce:animate-none animate-[pop_.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Story time"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-paper-900">
            <BookOpen className="h-5 w-5 text-brand-600" /> Story time
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            aria-label="Close"
            className="rounded-md p-2 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={read} className="space-y-4 overflow-y-auto px-5 py-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-paper-700">
            <input
              type="checkbox"
              checked={ownText}
              onChange={(e) => setOwnText(e.target.checked)}
              disabled={working}
              className="h-4 w-4 rounded border-paper-300 text-brand-600 focus-visible:shadow-ring"
            />
            Paste my own story
          </label>

          {!ownText && (
            <>
              <Field label="What's the story about?" htmlFor="story-topic">
                <input
                  id="story-topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="a brave little turtle who learns to share"
                  disabled={working}
                  autoFocus
                  className={fieldClassName}
                />
              </Field>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Age" htmlFor="story-age">
                  <select
                    id="story-age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={working}
                    className={`${fieldClassName} w-auto`}
                  >
                    {AGES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Length" htmlFor="story-length">
                  <select
                    id="story-length"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    disabled={working}
                    className={`${fieldClassName} w-auto`}
                  >
                    {LENGTHS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={write}
                  disabled={working || !topic.trim()}
                >
                  <Sparkles className="h-4 w-4" />
                  {writing ? "Writing…" : "Write story"}
                </Button>
              </div>
            </>
          )}

          <Field
            label={ownText ? "Your story" : "Story (edit freely)"}
            htmlFor="story-text"
          >
            <textarea
              id="story-text"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={
                ownText
                  ? "Paste or type the story to read aloud…"
                  : "Your story will appear here — or type your own."
              }
              rows={8}
              disabled={working}
              autoFocus={ownText}
              className={`${fieldClassName} resize-y`}
            />
          </Field>

          <Field label="Narrator voice" htmlFor="story-voice">
            <select
              id="story-voice"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              disabled={working || voices.length === 0}
              className={fieldClassName}
            >
              {voices.length === 0 ? (
                <option value="">Default narrator</option>
              ) : (
                voices.map((v) => (
                  <option key={v.voiceId} value={v.voiceId}>
                    {v.name}
                  </option>
                ))
              )}
            </select>
          </Field>

          {progress && (
            <p className="flex items-center gap-2 rounded-lg bg-paper-100 px-3 py-2 text-sm text-paper-600 motion-reduce:animate-none animate-pulse">
              <Volume2 className="h-4 w-4 shrink-0 text-brand-600" />
              {progress}
            </p>
          )}
          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={working}>
              {working ? "Close when done" : "Cancel"}
            </Button>
            <Button type="submit" disabled={working || !story.trim()}>
              <Volume2 className="h-4 w-4" />
              {busy ? "Reading…" : "Read aloud"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
