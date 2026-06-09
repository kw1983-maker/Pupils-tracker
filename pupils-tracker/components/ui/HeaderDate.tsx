"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function HeaderDate() {
  // Mount-gated so the server-rendered HTML and client match (no hydration warning).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000); // refresh each minute
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  // Day-first with the month spelled out, e.g. "9 June 2026".
  const date = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const h24 = now.getHours();
  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <div
      className="hidden items-center gap-3 md:flex"
      aria-label={`${weekday} ${date}, ${h12}:${mm} ${ampm}`}
    >
      <Clock className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
      <div className="text-right leading-tight" aria-hidden>
        <p className="font-display text-lg font-semibold text-paper-800">
          {weekday}
        </p>
        <p className="text-base font-medium text-paper-600">{date}</p>
      </div>
      <div
        className="flex items-baseline gap-1 rounded-lg bg-paper-50 px-2.5 py-1"
        aria-hidden
      >
        <span className="font-display text-2xl font-bold leading-none tabular-nums text-paper-900">
          {h12}:{mm}
        </span>
        <span className="text-2xs font-bold uppercase text-brand-600">{ampm}</span>
      </div>
    </div>
  );
}
