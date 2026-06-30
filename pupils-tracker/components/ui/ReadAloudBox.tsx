"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Pause, Play, Square, ChevronDown } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/Field";
import { useReadAloud } from "@/lib/useReadAloud";

/**
 * A type/paste box on the Spelling board that reads its text aloud via the
 * browser's speech engine (no key/cost). Reads the highlighted selection if
 * there is one, otherwise the whole box. Collapsible to keep the board clean.
 */
export function ReadAloudBox({ active = true }: { active?: boolean }) {
  const { status, supported, speak, pause, resume, stop } = useReadAloud();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Stop narration when the board is hidden behind another tab.
  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);

  const play = () => {
    const el = ref.current;
    const hasSelection = el && el.selectionEnd > el.selectionStart;
    const toRead = hasSelection
      ? text.slice(el.selectionStart, el.selectionEnd)
      : text;
    if (toRead.trim()) speak(toRead);
  };

  return (
    <SectionCard
      title="Read aloud"
      action={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Hide read-aloud box" : "Show read-aloud box"}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
        >
          {open ? "Hide" : "Open"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      }
    >
      {!open ? (
        <p className="text-sm text-paper-400">
          Type or paste text and have it read aloud.
        </p>
      ) : !supported ? (
        <p className="text-sm text-paper-500">
          Text-to-speech isn&apos;t available in this browser.
        </p>
      ) : (
        <div className="space-y-2">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Type or paste text here, then press Play. Highlight part of it to read just that bit."
            className={`w-full ${fieldClassName}`}
          />
          <div className="flex flex-wrap items-center gap-2">
            {status === "idle" ? (
              <Button size="sm" onClick={play} disabled={!text.trim()}>
                <Volume2 className="h-4 w-4" /> Play
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={status === "paused" ? resume : pause}
                >
                  {status === "paused" ? (
                    <>
                      <Play className="h-4 w-4" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" /> Pause
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={stop}>
                  <Square className="h-4 w-4" /> Stop
                </Button>
              </>
            )}
            <span className="text-xs text-paper-400">
              Reads the highlighted part, or everything.
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
