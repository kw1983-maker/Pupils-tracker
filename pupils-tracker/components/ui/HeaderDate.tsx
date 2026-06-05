"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export function HeaderDate() {
  // Mount-gated so the server-rendered HTML and client match (no hydration warning).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000); // refresh each minute
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="hidden items-center gap-2 text-sm text-paper-500 md:flex">
      <CalendarDays className="h-4 w-4 text-paper-400" aria-hidden />
      <span className="font-medium text-paper-700">{date}</span>
      <span className="text-paper-400">{time}</span>
    </div>
  );
}
