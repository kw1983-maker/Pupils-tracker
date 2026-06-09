"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";

type BoardType = "Spelling" | "Dictation";

export function SpellingBoard() {
  // Teacher-set values — reset to defaults each session (not persisted).
  const [type, setType] = useState<BoardType>("Spelling");
  const [num, setNum] = useState("1");

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

      {/* The board — a clean white canvas the pupils read. */}
      <div
        ref={boardRef}
        className="card flex min-h-[60vh] items-center justify-center p-8 [&:fullscreen]:min-h-screen [&:fullscreen]:rounded-none"
      >
        <div className="flex flex-col items-center gap-12 text-center sm:flex-row sm:items-end sm:justify-around sm:gap-6">
          {items.map((text, i) => (
            <span
              key={i}
              className="inline-block border-b-4 border-mark-blue-ink/50 pb-2 font-hand text-5xl font-bold leading-none text-mark-blue-ink sm:text-6xl lg:text-7xl"
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
