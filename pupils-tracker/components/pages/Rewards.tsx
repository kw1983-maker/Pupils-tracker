"use client";

import { useState } from "react";
import { Trash2, Trophy, Volume2, VolumeX } from "lucide-react";
import { useTracker } from "@/lib/store";
import { BADGE_CATALOG, badgeById } from "@/lib/badges";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { HighlighterTag } from "@/components/ui/HighlighterTag";
import { Avatar } from "@/components/ui/Avatar";
import { fieldClassName } from "@/components/ui/Field";
import { useCelebrate } from "@/components/ui/Celebration";
import { isSfxMuted, setSfxMuted } from "@/lib/sound";

const inputCls = `w-full ${fieldClassName}`;

export function Rewards() {
  const { pupils, badges, awardBadge, removeBadge } = useTracker();
  const celebrate = useCelebrate();
  const [pupilId, setPupilId] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [note, setNote] = useState("");
  const [muted, setMuted] = useState(isSfxMuted);

  const pupilName = (id: string) =>
    pupils.find((p) => p.id === id)?.name ?? "Unknown";

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pupilId || !badgeId) return;
    awardBadge(pupilId, badgeId, note);
    celebrate({ intensity: "big" });
    // Keep the pupil selected for quick repeat awards; clear the rest.
    setBadgeId("");
    setNote("");
  };

  // Per-pupil collection: pupils with at least one badge, each badge counted.
  const cabinet = pupils
    .map((p) => {
      const mine = badges.filter((b) => b.pupilId === p.id);
      const counts = new Map<string, number>();
      mine.forEach((b) => counts.set(b.badgeId, (counts.get(b.badgeId) ?? 0) + 1));
      return { pupil: p, total: mine.length, counts };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Award form */}
      <SectionCard
        title="Award a badge"
        className="lg:col-span-1"
        action={
          <button
            onClick={toggleSound}
            aria-pressed={!muted}
            title={muted ? "Celebration sounds off" : "Celebration sounds on"}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-brand-500" />
            )}
            Sound
          </button>
        }
      >
        {pupils.length === 0 ? (
          <EmptyState title="No pupils yet">
            Add pupils first in the Homework tab.
          </EmptyState>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <select
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select pupil…</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div
              role="radiogroup"
              aria-label="Choose a badge"
              className="grid grid-cols-2 gap-2"
            >
              {BADGE_CATALOG.map((def) => {
                const selected = def.id === badgeId;
                return (
                  <button
                    key={def.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBadgeId(def.id)}
                    title={def.blurb}
                    className={`flex flex-col items-center gap-1 rounded-md border p-2 text-center outline-none transition-colors focus-visible:shadow-ring ${
                      selected
                        ? "border-brand-400 bg-brand-50"
                        : "border-paper-100 hover:border-brand-200"
                    }`}
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {def.emoji}
                    </span>
                    <span className="text-xs font-semibold leading-tight text-paper-600">
                      {def.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              rows={2}
              className={inputCls}
            />

            <Button type="submit" className="w-full" disabled={!pupilId || !badgeId}>
              Award badge
            </Button>
          </form>
        )}
      </SectionCard>

      {/* Badge wall */}
      <div className="space-y-4 lg:col-span-2">
        <SectionCard title="Trophy cabinet">
          {cabinet.length === 0 ? (
            <EmptyState icon={<Trophy className="h-6 w-6" />} title="No badges awarded yet">
              Pick a pupil and a badge to hand out the first reward.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {cabinet.map(({ pupil, total, counts }) => (
                <li
                  key={pupil.id}
                  className="rounded-md border border-paper-100 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar size="xs" name={pupil.name} />
                      <span className="truncate text-sm font-semibold text-paper-700">
                        {pupil.name}
                      </span>
                    </span>
                    <span className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                      {total} {total === 1 ? "badge" : "badges"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...counts.entries()].map(([bId, count]) => {
                      const def = badgeById(bId);
                      if (!def) return null;
                      return (
                        <HighlighterTag key={bId} marker={def.marker}>
                          <span aria-hidden="true">{def.emoji}</span>
                          {def.label}
                          {count > 1 && <span className="opacity-70">×{count}</span>}
                        </HighlighterTag>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent awards">
          {badges.length === 0 ? (
            <p className="text-sm text-paper-500">Nothing awarded yet.</p>
          ) : (
            <ul className="space-y-2">
              {badges.slice(0, 12).map((b) => {
                const def = badgeById(b.badgeId);
                return (
                  <li
                    key={b.id}
                    className="group flex items-start gap-3 rounded-md border border-paper-100 p-3"
                  >
                    <span
                      className="text-2xl leading-none"
                      aria-hidden="true"
                    >
                      {def?.emoji ?? "🏅"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Avatar size="xs" name={pupilName(b.pupilId)} />
                        <span className="text-sm font-semibold text-paper-700">
                          {pupilName(b.pupilId)}
                        </span>
                        {def && (
                          <HighlighterTag marker={def.marker}>
                            {def.label}
                          </HighlighterTag>
                        )}
                        <span className="text-xs text-paper-400">{b.date}</span>
                      </div>
                      {b.note && (
                        <p className="truncate text-sm text-paper-500">{b.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeBadge(b.id)}
                      aria-label="Remove badge"
                      className="shrink-0 text-paper-300 opacity-0 outline-none transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
