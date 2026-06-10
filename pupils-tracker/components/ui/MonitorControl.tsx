"use client";

import { useState } from "react";
import { Eye, Check, X } from "lucide-react";
import { useTracker } from "@/lib/store";
import { Avatar } from "./Avatar";
import { fieldClassName } from "./Field";

export function MonitorControl() {
  const { pupils, watchList, addToWatch, removeFromWatch } = useTracker();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const count = watchList.length;
  const q = filter.trim().toLowerCase();
  const shown = q
    ? pupils.filter((p) => p.name.toLowerCase().includes(q))
    : pupils;

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div
          className="card w-64 rounded-card p-4 shadow-float"
          role="group"
          aria-label="Class monitor"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Eye className="h-3.5 w-3.5" /> Class monitor
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close monitor panel"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pupils.length === 0 ? (
            <p className="text-sm text-paper-500">
              Add pupils first in the Homework tab.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-paper-500">
                Tap a name to flag who needs watching.
                {count > 0 && (
                  <span className="font-semibold text-danger"> {count} on watch.</span>
                )}
              </p>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search names…"
                aria-label="Search names"
                className={`mb-2 w-full ${fieldClassName}`}
              />
              <ul className="thin-scroll max-h-64 space-y-1 overflow-auto">
                {shown.map((p) => {
                  const watched = watchList.includes(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() =>
                          watched ? removeFromWatch(p.id) : addToWatch(p.id)
                        }
                        aria-pressed={watched}
                        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:shadow-ring ${
                          watched
                            ? "border-danger-bg bg-danger-bg/50 text-danger"
                            : "border-paper-100 text-paper-700 hover:border-brand-400"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar size="xs" name={p.name} />
                          <span className="truncate">{p.name}</span>
                        </span>
                        {watched && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
                {shown.length === 0 && (
                  <li className="px-1 py-2 text-sm text-paper-400">
                    No names match “{filter}”.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide class monitor" : "Show class monitor"}
        className={`relative flex h-12 items-center gap-2 rounded-full px-4 font-display font-bold shadow-float outline-none transition-colors focus-visible:shadow-ring ${
          count > 0
            ? "bg-danger text-surface motion-reduce:animate-none animate-pulse"
            : "bg-surface text-paper-600 border border-paper-200 hover:border-brand-400"
        }`}
      >
        <Eye className="h-5 w-5" />
        {count > 0 && <span className="text-base tabular-nums">{count}</span>}
      </button>
    </div>
  );
}
