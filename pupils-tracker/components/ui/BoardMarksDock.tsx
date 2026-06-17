"use client";

import { useMemo, useState } from "react";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { Pupil } from "@/lib/types";
import { BEHAVIOR_POINTS } from "@/lib/behaviors";
import { Avatar } from "@/components/ui/Avatar";
import { BehaviorPointsModal } from "@/components/ui/BehaviorPointsModal";
import { useCelebrate } from "@/components/ui/Celebration";
import { playWomp } from "@/lib/sound";

/*
  BoardMarksDock
  ──────────────
  A left-edge dock that lets the teacher award behaviour points WITHOUT leaving
  the Spelling/Dictation board — so the textbook PDF stays up while marking.

  • Quick − / + on each pupil row (logs ±BEHAVIOR_POINTS via the same store call
    as the Students grid, so points stay in sync everywhere).
  • Tapping a pupil's NAME opens the existing BehaviorPointsModal for the full
    options (positive / needs work / badge / note / view profile).
  • Collapses to a thin "Marks" tab so the page can go full width.

  Rendered as an absolute overlay INSIDE the board (like DocumentToolbar /
  AudioPlayerBar), so it works in Present (fullscreen) mode too and doesn't
  reflow the ink canvas. Drop it inside the board div in SpellingBoard.
*/
export function BoardMarksDock({
  onViewProfile,
}: {
  /** Optional: jump to a pupil's full profile (e.g. switch to Students tab). */
  onViewProfile?: (pupil: Pupil) => void;
} = {}) {
  const { pupils, behavior, currentClassName, addBehavior } = useTracker();
  const celebrate = useCelebrate();

  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [modalPupil, setModalPupil] = useState<Pupil | null>(null);

  // Net behaviour points per pupil (positive/negative entries only; badges
  // carry no points), mirroring BehaviorPointsModal's calculation.
  const netById = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of behavior) {
      const delta = b.type === "positive" ? BEHAVIOR_POINTS : -BEHAVIOR_POINTS;
      map.set(b.pupilId, (map.get(b.pupilId) ?? 0) + delta);
    }
    return map;
  }, [behavior]);

  // Count of marks given this session, for the header tally.
  const [awardedThisSession, setAwardedThisSession] = useState(0);

  const quick = (pupil: Pupil, type: "positive" | "negative") => {
    addBehavior(
      pupil.id,
      type,
      BEHAVIOR_POINTS,
      type === "positive" ? "Quick point" : "Quick deduction"
    );
    if (type === "positive") celebrate();
    else playWomp();
    setAwardedThisSession((n) => n + 1);
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? pupils.filter((p) => p.name.toLowerCase().includes(q))
    : pupils;

  return (
    <>
      {/* Collapse / expand handle, pinned to the dock's right edge. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Hide marks dock" : "Show marks dock"}
        className="absolute top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-r-card border border-l-0 border-paper-200 bg-surface px-1.5 py-3.5 shadow-float outline-none transition-[left] focus-visible:shadow-ring"
        style={{ left: open ? "min(258px, 78vw)" : "0px" }}
      >
        {open ? (
          <ChevronLeft className="h-4 w-4 text-paper-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-paper-500" />
        )}
        <span
          className="text-2xs font-bold uppercase tracking-wider text-paper-500"
          style={{ writingMode: "vertical-rl" }}
        >
          Marks
        </span>
      </button>

      {/* The dock panel itself. */}
      {open && (
        <div
          className="absolute inset-y-0 left-0 z-30 flex w-[min(258px,78vw)] flex-col border-r border-paper-200 bg-surface shadow-lift"
          role="group"
          aria-label="Quick behaviour marks"
        >
          <div className="border-b border-paper-100 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-paper-900">
                <Award className="h-4 w-4 text-brand-500" />
                Marks · {currentClassName || "Class"}
              </h2>
              <span className="text-xs font-bold tabular-nums text-paper-400">
                {awardedThisSession} today
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-paper-100 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-paper-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search names…"
                aria-label="Search names"
                className="w-full bg-transparent text-sm text-paper-700 outline-none placeholder:text-paper-400"
              />
            </div>
          </div>

          {pupils.length === 0 ? (
            <p className="p-4 text-sm text-paper-500">
              Add pupils first in the Homework tab.
            </p>
          ) : (
            <ul className="thin-scroll flex-1 space-y-1 overflow-y-auto p-2">
              {shown.map((pupil) => {
                const net = netById.get(pupil.id) ?? 0;
                return (
                  <li
                    key={pupil.id}
                    className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-paper-50"
                  >
                    <button
                      type="button"
                      onClick={() => setModalPupil(pupil)}
                      title={`Open full options for ${pupil.name}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left outline-none focus-visible:shadow-ring"
                    >
                      <Avatar size="xs" name={pupil.name} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-paper-800">
                          {pupil.name}
                        </span>
                        <span
                          className={`block font-display text-xs font-semibold tabular-nums ${
                            net > 0
                              ? "text-success"
                              : net < 0
                              ? "text-danger"
                              : "text-paper-400"
                          }`}
                        >
                          {net > 0 ? `+${net}` : net} pts
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => quick(pupil, "negative")}
                        aria-label={`Minus ${BEHAVIOR_POINTS} for ${pupil.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-bg text-danger outline-none transition-transform active:scale-90 focus-visible:shadow-ring"
                      >
                        <Minus className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => quick(pupil, "positive")}
                        aria-label={`Plus ${BEHAVIOR_POINTS} for ${pupil.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-bg text-success outline-none transition-transform active:scale-90 focus-visible:shadow-ring"
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </div>
                  </li>
                );
              })}
              {shown.length === 0 && (
                <li className="px-2 py-3 text-sm text-paper-400">
                  No names match “{query}”.
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Full options — reuses the existing modal (positive/needs work/badge/note). */}
      {modalPupil && (
        <BehaviorPointsModal
          pupil={modalPupil}
          onClose={() => setModalPupil(null)}
          onViewProfile={() => {
            const p = modalPupil;
            setModalPupil(null);
            if (p) onViewProfile?.(p);
          }}
        />
      )}
    </>
  );
}
