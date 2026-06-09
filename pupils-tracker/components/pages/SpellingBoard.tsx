"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Square, Type as TypeIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { ClassTimer } from "@/components/ui/ClassTimer";
import { InkCanvas } from "@/components/ui/InkCanvas";

type BoardType = "Spelling" | "Dictation";

export function SpellingBoard() {
  // Teacher-set values — reset to defaults each session (not persisted).
  const [type, setType] = useState<BoardType>("Spelling");
  const [num, setNum] = useState("1");
  // Blank canvas: hide the day/type/date header for a clean writing surface.
  const [blank, setBlank] = useState(false);

  // Mount-gated date so SSR and client match; refresh each minute so the day
  // and date roll over at midnight if the board is left open.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fullscreen ("Present") support for clean projection.
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === boardRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const togglePresent = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void boardRef.current?.requestFullscreen?.();
    }
  };

  if (!now) return null;

  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const date = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const label = num.trim() ? `${type} (${num.trim()})` : type;

  const items = [weekday, label, date];

  return (
    <div className="space-y-4">
      <SectionCard title="Spelling / Dictation board">
        <div className="flex flex-wrap items-end gap-3">
          {!blank && (
            <>
              <Field label="Type" htmlFor="sb-type">
                <select
                  id="sb-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as BoardType)}
                  className={`${fieldClassName} w-auto`}
                >
                  <option value="Spelling">Spelling</option>
                  <option value="Dictation">Dictation</option>
                </select>
              </Field>
              <Field label="Number" htmlFor="sb-num">
                <input
                  id="sb-num"
                  type="number"
                  min={1}
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className={`${fieldClassName} w-28`}
                />
              </Field>
            </>
          )}
          <Button
            variant={blank ? undefined : "secondary"}
            onClick={() => setBlank((b) => !b)}
          >
            {blank ? (
              <>
                <TypeIcon className="h-4 w-4" /> Show header
              </>
            ) : (
              <>
                <Square className="h-4 w-4" /> Blank canvas
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={togglePresent} className="ml-auto">
            {isFull ? (
              <>
                <Minimize className="h-4 w-4" /> Exit
              </>
            ) : (
              <>
                <Maximize className="h-4 w-4" /> Present
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {/* The board — a clean white canvas the pupils read & the teacher writes on. */}
      <div
        ref={boardRef}
        className="card relative min-h-[60vh] overflow-hidden [&:fullscreen]:min-h-screen [&:fullscreen]:rounded-none"
      >
        {/* Header pinned to the top; pointer-events-none so strokes reach the
            canvas beneath, z-10 so the printed header stays crisp over the ink.
            Hidden in "Blank canvas" mode for a clean writing surface. */}
        {!blank && (
          <div className="pointer-events-none relative z-10 flex flex-wrap items-end justify-center gap-x-10 gap-y-2 px-6 pt-6 text-center">
            {items.map((text, i) => (
              <span
                key={i}
                className="inline-block border-b-4 border-mark-blue-ink/50 pb-1.5 font-hand text-4xl font-bold leading-none text-mark-blue-ink sm:text-5xl lg:text-6xl"
              >
                {text}
              </span>
            ))}
          </div>
        )}

        {/* Freehand writing surface (stylus/touch/mouse) + its toolbar. */}
        <InkCanvas />

        {/* In Present (fullscreen) mode the global timer is outside this subtree
            and hidden, so render one here so pupils can see the countdown. */}
        {isFull && (
          <div className="absolute bottom-6 right-6 z-20">
            <ClassTimer />
          </div>
        )}
      </div>
    </div>
  );
}
