"use client";

import { useState } from "react";
import { ChevronDown, Monitor, Users } from "lucide-react";
import { useTracker } from "@/lib/store";
import { shortenName } from "@/lib/pupil-name";
import { BEHAVIOR_POINTS } from "@/lib/behaviors";
import { TAB_OPTIONS } from "@/lib/tab-labels";
import type { Pupil } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BehaviorPointsModal } from "@/components/ui/BehaviorPointsModal";
import { BoardRemotePanel } from "@/components/ui/BoardRemote";
import { pointsLabel, useCelebrate } from "@/components/ui/Celebration";

/**
 * Phone "Remote" tab: tap a pupil to give or take points (the same dialog as
 * the Students grid, so the projector's pets and celebrations react through
 * the existing sync), plus the board-remote controls underneath.
 */
export function RemoteTab() {
  const { pupils, getPupilBalance, addBehaviorToMany } = useTracker();
  const celebrate = useCelebrate();
  const [selected, setSelected] = useState<Pupil | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  const wholeClass = () => {
    if (!pupils.length) return;
    addBehaviorToMany(
      pupils.map((p) => p.id),
      "positive",
      BEHAVIOR_POINTS,
      "Whole class"
    );
    celebrate({
      intensity: "big",
      name: "Whole class",
      detail: pointsLabel("pos", BEHAVIOR_POINTS),
    });
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-paper-800">
            Give points
          </h2>
          <Button size="sm" variant="secondary" onClick={wholeClass} disabled={!pupils.length}>
            <Users className="h-4 w-4" /> Whole class +{BEHAVIOR_POINTS}
          </Button>
        </div>
        {pupils.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No pupils in this class">
            Add pupils in the web app&apos;s Students tab.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pupils.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  className="flex w-full flex-col items-center gap-1 rounded-card bg-surface p-2 text-center shadow-float outline-none transition active:scale-[.97] focus-visible:shadow-ring"
                >
                  <Avatar name={p.name} />
                  <span className="line-clamp-1 text-xs font-semibold text-paper-700">
                    {shortenName(p.name)}
                  </span>
                  <span className="text-2xs font-bold text-brand-600">
                    {getPupilBalance(p.id)} pts
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card bg-surface p-4 shadow-float">
        <button
          type="button"
          onClick={() => setShowBoard((v) => !v)}
          aria-expanded={showBoard}
          className="flex w-full items-center justify-between gap-2 rounded-md text-left outline-none focus-visible:shadow-ring"
        >
          <span className="flex items-center gap-2 font-display text-lg font-semibold text-paper-800">
            <Monitor className="h-5 w-5 text-brand-500" /> Board controls
          </span>
          <ChevronDown
            className={`h-5 w-5 text-paper-400 transition-transform ${showBoard ? "rotate-180" : ""}`}
          />
        </button>
        {showBoard && (
          <div className="mt-4">
            <BoardRemotePanel tabs={TAB_OPTIONS} />
          </div>
        )}
      </section>

      {selected && (
        <BehaviorPointsModal pupil={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
