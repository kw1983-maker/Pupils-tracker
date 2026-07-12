"use client";

import { useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  ChevronDown,
  Crown,
  Eye,
  X,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTracker } from "@/lib/store";
import { Pupil, BehaviorRecord } from "@/lib/types";
import { badgeById } from "@/lib/badges";
import { BEHAVIOR_POINTS, behaviorDelta } from "@/lib/behaviors";
import { isSfxMuted, setSfxMuted } from "@/lib/sound";
import { BehaviorPointsModal } from "@/components/ui/BehaviorPointsModal";
import { MultiAwardModal } from "@/components/ui/MultiAwardModal";
import { EditBehaviorModal } from "@/components/ui/EditBehaviorModal";
import { useCelebrate } from "@/components/ui/Celebration";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { Donut } from "@/components/ui/Donut";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { HighlighterTag } from "@/components/ui/HighlighterTag";
import { fieldClassName } from "@/components/ui/Field";

// Score 80 is the neutral baseline; above is green/up, below is red/down.
const scoreTone = (s: number) =>
  s > 80 ? "text-success" : s < 80 ? "text-danger" : "text-paper-600";
const ScoreTrend = ({ s, className }: { s: number; className?: string }) =>
  s > 80 ? (
    <TrendingUp className={className} />
  ) : s < 80 ? (
    <TrendingDown className={className} />
  ) : null;

type CardFx = { kind: "pos" | "neg"; text: string };

export function Students() {
  const {
    pupils,
    assignments,
    submissions,
    attendance,
    behavior,
    badges,
    watchList,
    addBehavior,
    addBehaviorToMany,
    getPupilScore,
    getPerformanceScore,
    updatePupilNotes,
    removeBehavior,
    updateBehavior,
    removeBadge,
    undoLast,
    lastUndoLabel,
  } = useTracker();
  const celebrate = useCelebrate();
  const reduceMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Pupil whose ClassDojo-style points dialog is open (tap on an avatar card).
  const [pointsFor, setPointsFor] = useState<Pupil | null>(null);
  const [muted, setMuted] = useState(isSfxMuted);
  // Multi-select award flow: a Select toggle turns avatar taps into checkboxes.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [awardOpen, setAwardOpen] = useState(false);
  // Per-card floater (+2 / −2 / ★) + celebrate/oops animation class.
  const [fx, setFx] = useState<Record<string, CardFx>>({});
  // Class ranking & Recent activity start collapsed so the avatar wall fills the screen.
  const [rankingOpen, setRankingOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  // A logged entry being edited (points / type / note).
  const [editing, setEditing] = useState<BehaviorRecord | null>(null);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
  };

  const setCardFx = (ids: string[], kind: "pos" | "neg", text: string) => {
    setFx((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { kind, text };
      return next;
    });
    window.setTimeout(() => {
      setFx((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
    }, 950);
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const pupilName = (id: string) =>
    pupils.find((p) => p.id === id)?.name ?? "Unknown";

  // Badge counts per badgeId for one pupil (a badge can be earned repeatedly).
  const pupilBadgeCounts = (pupilId: string) => {
    const counts = new Map<string, number>();
    badges
      .filter((b) => b.pupilId === pupilId)
      .forEach((b) => counts.set(b.badgeId, (counts.get(b.badgeId) ?? 0) + 1));
    return counts;
  };

  const attendanceStats = (pupilId: string) => {
    const days = Object.keys(attendance).filter(
      (d) => attendance[d][pupilId] !== undefined
    );
    const present = days.filter((d) => attendance[d][pupilId] === "present").length;
    const late = days.filter((d) => attendance[d][pupilId] === "late").length;
    const absent = days.filter((d) => attendance[d][pupilId] === "absent").length;
    const total = days.length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, total, pct };
  };

  if (!selectedId) {
    // Net behavior points per pupil, highest first (name as tie-break), with
    // competition ranking: pupils on equal points share a place (1, 2, 2, 4).
    const totals = pupils
      .map((p) => {
        const net = behavior
          .filter((b) => b.pupilId === p.id)
          .reduce((sum, b) => sum + behaviorDelta(b), 0);
        return { pupil: p, net };
      })
      .sort((a, b) => b.net - a.net || a.pupil.name.localeCompare(b.pupil.name));
    // Competition ranking: equal nets share a place (1, 2, 2, 4).
    const ranked = totals.map((t, i, arr) => {
      const place =
        i === 0 || arr[i - 1].net !== t.net
          ? i + 1
          : arr.findIndex((x) => x.net === t.net) + 1;
      return { ...t, place };
    });
    const pointsTone = (net: number) =>
      net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-paper-400";
    const PLACE_LABELS = ["1st", "2nd", "3rd"];

    // Per-pupil badge collection: pupils with at least one badge, most first.
    const cabinet = pupils
      .map((p) => ({
        pupil: p,
        total: badges.filter((b) => b.pupilId === p.id).length,
        counts: pupilBadgeCounts(p.id),
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);

    // Avatar spotlight: top 3 score tiers above the 80 baseline glow gold; the
    // bottom 3 tiers below baseline pulse red. Every pupil tied at the same score
    // gets the same highlight (unlike a naive top-3-pupils slice). Cutting at 80
    // means a class with no behaviour logged stays neutral, and no pupil can be
    // both top and bottom.
    const perfRanking = pupils.map((p) => ({
      id: p.id,
      name: p.name,
      score: getPerformanceScore(p.id).score,
    }));
    function scoreTiers(scores: number[], take: number, desc: boolean): Set<number> {
      const sorted = [...new Set(scores)].sort((a, b) => (desc ? b - a : a - b));
      return new Set(sorted.slice(0, take));
    }
    const highlightFor = new Map<string, "top" | "low">();
    const topTiers = scoreTiers(
      perfRanking.filter((r) => r.score > 80).map((r) => r.score),
      3,
      true
    );
    perfRanking
      .filter((r) => topTiers.has(r.score))
      .forEach((r) => highlightFor.set(r.id, "top"));
    const lowTiers = scoreTiers(
      perfRanking.filter((r) => r.score < 80).map((r) => r.score),
      3,
      false
    );
    perfRanking
      .filter((r) => lowTiers.has(r.score))
      .forEach((r) => highlightFor.set(r.id, "low"));

    // Crowns for the top three performance scores (competition ranking so
    // tied marks share a place — e.g. 1, 2, 2 never shows a lonely 3rd).
    const crownFor = new Map<string, 1 | 2 | 3>();
    {
      const ordered = [...perfRanking].sort(
        (a, b) => b.score - a.score || a.name.localeCompare(b.name)
      );
      ordered.forEach((row, i, arr) => {
        const place =
          i === 0 || arr[i - 1].score !== row.score
            ? i + 1
            : arr.findIndex((x) => x.score === row.score) + 1;
        if (place <= 3) crownFor.set(row.id, place as 1 | 2 | 3);
      });
    }

    return (
      <div className="space-y-4">
      <SectionCard
        title={`Students — ${pupils.length}`}
        action={
          <div className="flex items-center gap-1">
            {lastUndoLabel && (
              <button
                onClick={undoLast}
                title={`Undo ${lastUndoLabel}`}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
            )}
            {pupils.length > 0 &&
              (selectMode ? (
                <button
                  onClick={exitSelect}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select
                </button>
              ))}
          </div>
        }
      >
        {selectMode && pupils.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-brand-50 p-2">
            <span className="text-sm font-semibold text-brand-700">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => setSelectedIds(pupils.map((p) => p.id))}
              className="rounded-md px-2 py-1 text-xs font-semibold text-brand-600 outline-none transition-colors hover:bg-brand-100 focus-visible:shadow-ring"
            >
              Select all
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-md px-2 py-1 text-xs font-semibold text-paper-500 outline-none transition-colors hover:bg-paper-100 focus-visible:shadow-ring"
            >
              Clear
            </button>
            <div className="ml-auto">
              <Button
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={() => setAwardOpen(true)}
              >
                Award points
              </Button>
            </div>
          </div>
        )}
        {pupils.length === 0 ? (
          <EmptyState title="No pupils yet">
            Add a namelist in the Homework tab.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
            {pupils.map((p, index) => {
              const perf = getPerformanceScore(p.id).score;
              const badgeCount = badges.filter((b) => b.pupilId === p.id).length;
              const watched = watchList.includes(p.id);
              const selected = selectedIds.includes(p.id);
              const cardFx = fx[p.id];
              const crownPlace = crownFor.get(p.id);
              const deduct = () => {
                addBehavior(
                  p.id,
                  "negative",
                  BEHAVIOR_POINTS,
                  "On watch — misbehaved again"
                );
                setCardFx([p.id], "neg", `\u2212${BEHAVIOR_POINTS}`);
                celebrate({ kind: "neg" });
              };
              return (
                <li
                  key={p.id}
                  className={reduceMotion ? undefined : "pupil-enter"}
                  style={
                    reduceMotion
                      ? undefined
                      : ({
                          "--enter-delay": `${index * 35}ms`,
                        } as CSSProperties)
                  }
                >
                  <button
                    type="button"
                    onClick={
                      selectMode
                        ? () => toggleSelect(p.id)
                        : watched
                          ? deduct
                          : () => setPointsFor(p)
                    }
                    aria-pressed={selectMode ? selected : undefined}
                    aria-label={
                      selectMode
                        ? `${selected ? "Deselect" : "Select"} ${p.name}`
                        : watched
                          ? `${p.name} is on watch — deduct ${BEHAVIOR_POINTS} marks`
                          : `Behavior points for ${p.name}`
                    }
                    className={`pupil-card relative flex h-full w-full flex-col items-center gap-1.5 rounded-[14px] border bg-surface p-3 outline-none focus-visible:shadow-ring ${
                      selectMode && selected
                        ? "is-selected"
                        : watched
                          ? "is-watched"
                          : "border-paper-100"
                    } ${
                      cardFx
                        ? cardFx.kind === "pos"
                          ? "is-celebrating"
                          : "is-oops"
                        : ""
                    }`}
                  >
                    {cardFx && (
                      <span
                        className={`point-floater ${
                          cardFx.kind === "pos" ? "is-pos" : "is-neg"
                        }`}
                        aria-hidden="true"
                      >
                        {cardFx.text}
                      </span>
                    )}
                    <span
                      className={`pupil-float relative ${
                        reduceMotion ? "![animation:none]" : ""
                      }`}
                      style={
                        reduceMotion
                          ? undefined
                          : ({
                              "--float-dur": `${2.8 + (index % 5) * 0.28}s`,
                              "--float-delay": `${((index % 7) * 0.19).toFixed(2)}s`,
                            } as CSSProperties)
                      }
                    >
                      {crownPlace && (
                        <span
                          className={`pupil-crown-wrap${
                            reduceMotion ? " ![animation:none]" : ""
                          }`}
                          style={
                            reduceMotion
                              ? undefined
                              : ({
                                  "--crown-delay": `${crownPlace * 0.18}s`,
                                } as CSSProperties)
                          }
                          title={`${PLACE_LABELS[crownPlace - 1]} by performance`}
                          aria-label={`${PLACE_LABELS[crownPlace - 1]} by performance`}
                        >
                          <span
                            className={`pupil-crown pupil-crown--${crownPlace}${
                              reduceMotion ? " ![animation:none]" : ""
                            }`}
                          >
                            <Crown className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </span>
                      )}
                      <span className="pupil-avatar relative inline-flex">
                        <Avatar
                          size="lg"
                          name={p.name}
                          highlight={
                            watched ? "low" : highlightFor.get(p.id)
                          }
                        />
                      </span>
                      {selectMode && selected && (
                        <span
                          className="absolute -left-1 -top-1 z-[2] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-surface"
                          aria-hidden="true"
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <span
                        title={`Performance score ${perf}`}
                        className={`pupil-badge absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-extrabold tabular-nums text-surface ${
                          perf > 80
                            ? "bg-success"
                            : perf < 80
                              ? "bg-danger"
                              : "bg-paper-300"
                        }`}
                      >
                        {perf}
                      </span>
                    </span>
                    <span
                      className={`line-clamp-2 break-words text-center text-xs font-semibold leading-tight ${
                        watched ? "text-danger" : "text-paper-700"
                      }`}
                    >
                      {watched && (
                        <Eye
                          className="mr-0.5 inline h-3.5 w-3.5 align-[-2px]"
                          aria-hidden="true"
                        />
                      )}
                      {p.name}
                    </span>
                    {badgeCount > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-2xs text-paper-400"
                        title={`${badgeCount} ${badgeCount === 1 ? "badge" : "badges"}`}
                      >
                        <Trophy className="h-3 w-3" aria-hidden />
                        {badgeCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {pupils.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          {/* Left: ranking + activity stacked so an open table never shares a
              row with a collapsed header (which made the old auto-fit grid look
              cramped and lopsided). */}
          <div className="flex min-w-0 flex-col gap-4">
            <section className="card p-5">
              <button
                type="button"
                onClick={() => setRankingOpen((o) => !o)}
                className={`colhdr flex w-full items-center justify-between gap-2 border-0 bg-transparent p-0 outline-none focus-visible:shadow-ring ${
                  rankingOpen ? "mb-4" : "mb-0"
                }`}
                aria-expanded={rankingOpen}
              >
                <span className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Class ranking
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-px text-[11px] font-extrabold text-brand-700">
                    {pupils.length}
                  </span>
                </span>
                <ChevronDown
                  className={`h-[18px] w-[18px] text-paper-400 transition-transform duration-200 ${
                    rankingOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              {rankingOpen && (
                <div className="thin-scroll max-h-[min(28rem,55vh)] overflow-auto">
                  <table className="w-full table-fixed">
                    <thead className="sticky top-0 z-[1] bg-surface">
                      <tr className="text-left text-2xs font-bold uppercase tracking-wider text-paper-400">
                        <th scope="col" className="w-[22%] px-3 py-2.5">
                          Place
                        </th>
                        <th scope="col" className="w-[42%] px-3 py-2.5">
                          Pupil
                        </th>
                        <th scope="col" className="w-[18%] px-3 py-2.5 text-right">
                          Marks
                        </th>
                        <th scope="col" className="w-[18%] px-3 py-2.5 text-right">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map(({ pupil, net, place }) => {
                        const placeBadge =
                          net > 0 && place <= 3
                            ? PLACE_LABELS[place - 1]
                            : null;
                        return (
                          <tr
                            key={pupil.id}
                            className="border-t border-paper-100"
                          >
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold tabular-nums text-paper-600">
                              #{place}
                              {placeBadge && (
                                <HighlighterTag
                                  marker="amber"
                                  className="ml-1.5"
                                >
                                  {placeBadge}
                                </HighlighterTag>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <Avatar size="xs" name={pupil.name} />
                                <span className="truncate text-sm font-medium text-paper-700">
                                  {pupil.name}
                                </span>
                              </span>
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-display text-base font-bold tabular-nums ${scoreTone(
                                getPerformanceScore(pupil.id).score
                              )}`}
                            >
                              {getPerformanceScore(pupil.id).score}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-display text-base font-bold tabular-nums ${pointsTone(
                                net
                              )}`}
                            >
                              {net > 0 ? `+${net}` : net}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card p-5">
              <button
                type="button"
                onClick={() => setActivityOpen((o) => !o)}
                className={`colhdr flex w-full items-center justify-between gap-2 border-0 bg-transparent p-0 outline-none focus-visible:shadow-ring ${
                  activityOpen ? "mb-4" : "mb-0"
                }`}
                aria-expanded={activityOpen}
              >
                <span className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Recent activity
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-px text-[11px] font-extrabold text-brand-700">
                    {behavior.length}
                  </span>
                </span>
                <ChevronDown
                  className={`h-[18px] w-[18px] text-paper-400 transition-transform duration-200 ${
                    activityOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              {activityOpen &&
                (behavior.length === 0 ? (
                  <EmptyState title="No behavior logged yet">
                    Tap a pupil&apos;s avatar above to award points.
                  </EmptyState>
                ) : (
                  <ul className="thin-scroll max-h-[min(28rem,55vh)] space-y-2.5 overflow-auto pr-1">
                    {behavior.slice(0, 40).map((b) => (
                      <li
                        key={b.id}
                        className="group flex items-start gap-3 rounded-lg border border-paper-100 p-3.5"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            b.type === "positive"
                              ? "bg-success-bg text-success-ink"
                              : "bg-danger-bg text-danger-ink"
                          }`}
                        >
                          {b.type === "positive" ? (
                            <ThumbsUp className="h-4 w-4" />
                          ) : (
                            <ThumbsDown className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Avatar size="xs" name={pupilName(b.pupilId)} />
                            <span className="text-sm font-semibold text-paper-700">
                              {pupilName(b.pupilId)}
                            </span>
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                b.type === "positive"
                                  ? "text-success"
                                  : "text-danger"
                              }`}
                            >
                              {b.type === "positive"
                                ? `+${Math.abs(b.points ?? BEHAVIOR_POINTS)}`
                                : `-${Math.abs(b.points ?? BEHAVIOR_POINTS)}`}
                            </span>
                            <span className="text-xs text-paper-400">
                              {b.date}
                            </span>
                          </div>
                          {b.note && (
                            <p className="mt-0.5 truncate text-sm text-paper-500">
                              {b.note}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setEditing(b)}
                            aria-label="Edit entry"
                            className="text-paper-300 opacity-0 outline-none transition-opacity hover:text-brand-500 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeBehavior(b.id)}
                            aria-label="Delete entry"
                            className="text-paper-300 opacity-0 outline-none transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ))}
            </section>
          </div>

          {/* Right: trophies + awards — fixed-width sidebar so they fill the
              empty column instead of floating in a short card. */}
          <div className="flex min-w-0 flex-col gap-4">
            <SectionCard
              title="Trophy cabinet"
              action={
                <button
                  onClick={toggleSound}
                  aria-pressed={!muted}
                  title={
                    muted ? "Celebration sounds off" : "Celebration sounds on"
                  }
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
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
              {cabinet.length === 0 ? (
                <EmptyState
                  icon={<Trophy className="h-6 w-6" />}
                  title="No badges awarded yet"
                >
                  Tap a pupil&apos;s avatar and pick Badge to hand out the first
                  reward.
                </EmptyState>
              ) : (
                <ul className="thin-scroll max-h-[min(22rem,45vh)] space-y-3 overflow-auto pr-1">
                  {cabinet.map(({ pupil, total, counts }) => (
                    <li
                      key={pupil.id}
                      className="rounded-lg border border-paper-100 p-3.5"
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar size="xs" name={pupil.name} />
                          <span className="truncate text-sm font-semibold text-paper-700">
                            {pupil.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-2xs font-bold uppercase tracking-wider text-paper-400">
                          {total} {total === 1 ? "badge" : "badges"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...counts.entries()].map(([bId, count]) => {
                          const def = badgeById(bId);
                          if (!def) return null;
                          return (
                            <HighlighterTag key={bId} marker={def.marker}>
                              <span aria-hidden>{def.emoji}</span> {def.label}
                              {count > 1 && (
                                <span className="opacity-70">×{count}</span>
                              )}
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
                <ul className="thin-scroll max-h-[min(22rem,45vh)] space-y-2.5 overflow-auto pr-1">
                  {badges.slice(0, 12).map((b) => {
                    const def = badgeById(b.badgeId);
                    return (
                      <li
                        key={b.id}
                        className="group flex items-start gap-3 rounded-lg border border-paper-100 p-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Avatar size="xs" name={pupilName(b.pupilId)} />
                            <span className="text-sm font-semibold text-paper-700">
                              {pupilName(b.pupilId)}
                            </span>
                            {def && (
                              <HighlighterTag marker={def.marker}>
                                <span aria-hidden>{def.emoji}</span>{" "}
                                {def.label}
                              </HighlighterTag>
                            )}
                            <span className="text-xs text-paper-400">
                              {b.date}
                            </span>
                          </div>
                          {b.note && (
                            <p className="mt-0.5 truncate text-sm text-paper-500">
                              {b.note}
                            </p>
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
      )}

      {pointsFor && (
        <BehaviorPointsModal
          pupil={pointsFor}
          onClose={() => setPointsFor(null)}
          onReward={(pupilId, kind, text) => setCardFx([pupilId], kind, text)}
          onViewProfile={() => {
            setSelectedId(pointsFor.id);
            setPointsFor(null);
          }}
        />
      )}

      {awardOpen && (
        <MultiAwardModal
          count={selectedIds.length}
          onClose={() => setAwardOpen(false)}
          onConfirm={(type, points, label, note) => {
            const fullNote = [label, note].filter(Boolean).join(" — ");
            addBehaviorToMany(selectedIds, type, points, fullNote);
            setCardFx(
              selectedIds,
              type === "positive" ? "pos" : "neg",
              `${type === "positive" ? "+" : "\u2212"}${points}`
            );
            setAwardOpen(false);
            exitSelect();
          }}
        />
      )}

      {editing && (
        <EditBehaviorModal
          record={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateBehavior(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
      </div>
    );
  }

  const pupil = pupils.find((p) => p.id === selectedId);
  if (!pupil) {
    setSelectedId(null);
    return null;
  }

  const { score, total } = getPupilScore(pupil.id);
  const perfScore = getPerformanceScore(pupil.id).score;
  const hwPct = total > 0 ? Math.round((score / total) * 100) : 0;
  const att = attendanceStats(pupil.id);
  const records = behavior.filter((b) => b.pupilId === pupil.id);
  const netPoints = records.reduce(
    (s, b) => s + (b.type === "positive" ? 2 : -2),
    0
  );

  return (
    <div className="space-y-4">
      <button
        onClick={() => setSelectedId(null)}
        className="flex items-center gap-2 text-sm font-semibold text-paper-500 outline-none hover:text-brand-600 focus-visible:shadow-ring"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all students
      </button>

      <SectionCard>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={pupil.name} size="lg" decorative={false} />
            <div>
              <h2 className="font-display text-xl font-semibold text-paper-800">
                {pupil.name}
              </h2>
              <p
                className={`text-sm font-semibold ${
                  netPoints > 0
                    ? "text-success"
                    : netPoints < 0
                    ? "text-danger"
                    : "text-paper-400"
                }`}
              >
                {netPoints > 0 ? `+${netPoints}` : netPoints} behavior points
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-8">
            <div className="text-center">
              <p
                className={`flex items-center justify-center gap-1 font-display text-3xl font-bold tabular-nums ${scoreTone(
                  perfScore
                )}`}
              >
                {perfScore}
                <ScoreTrend s={perfScore} className="h-6 w-6" />
              </p>
              <p className="text-xs text-paper-400">Performance score</p>
            </div>
            <Donut percentage={hwPct} size={92} sub="homework" />
            <Donut
              percentage={att.pct}
              size={92}
              color="var(--color-info)"
              trackColor="var(--color-info-bg)"
              sub="attendance"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Badges">
        {(() => {
          const counts = pupilBadgeCounts(pupil.id);
          if (counts.size === 0)
            return (
              <p className="text-sm text-paper-500">
                No badges yet — award one by tapping the pupil&apos;s avatar in
                the class grid.
              </p>
            );
          return (
            <div className="flex flex-wrap gap-2">
              {[...counts.entries()].map(([bId, count]) => {
                const def = badgeById(bId);
                if (!def) return null;
                return (
                  <HighlighterTag key={bId} marker={def.marker}>
                    {def.label}
                    {count > 1 && <span className="opacity-70">×{count}</span>}
                  </HighlighterTag>
                );
              })}
            </div>
          );
        })()}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Homework history">
          {assignments.length === 0 ? (
            <p className="text-sm text-paper-500">No assignments yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {assignments.map((a) => {
                const done = !!submissions[a.id]?.[pupil.id];
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-md border border-paper-100 px-3 py-2 text-sm"
                  >
                    <span className="text-paper-600">
                      <span className="font-medium">{a.title}</span>{" "}
                      <span className="text-xs text-paper-400">{a.date}</span>
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        done
                          ? "bg-success-bg text-success-ink"
                          : "bg-danger-bg text-danger-ink"
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Attendance record">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-success-bg p-3">
                <p className="font-display text-2xl font-bold text-success-ink">
                  {att.present}
                </p>
                <p className="text-xs text-paper-400">Present</p>
              </div>
              <div className="rounded-lg bg-warning-bg p-3">
                <p className="font-display text-2xl font-bold text-warning-ink">
                  {att.late}
                </p>
                <p className="text-xs text-paper-400">Late</p>
              </div>
              <div className="rounded-lg bg-danger-bg p-3">
                <p className="font-display text-2xl font-bold text-danger-ink">
                  {att.absent}
                </p>
                <p className="text-xs text-paper-400">Absent</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Behavior log">
            {records.length === 0 ? (
              <p className="text-sm text-paper-500">Nothing logged yet.</p>
            ) : (
              <ul className="thin-scroll max-h-44 space-y-1.5 overflow-auto">
                {records.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2 text-sm text-paper-600"
                  >
                    {b.type === "positive" ? (
                      <ThumbsUp className="h-4 w-4 text-success" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-danger" />
                    )}
                    <span className="truncate">{b.note || b.type}</span>
                    <span className="ml-auto text-xs text-paper-400">
                      {b.date}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Teacher notes">
        <textarea
          value={pupil.notes ?? ""}
          onChange={(e) => updatePupilNotes(pupil.id, e.target.value)}
          placeholder="Private notes about this pupil…"
          rows={3}
          className={`w-full ${fieldClassName}`}
        />
      </SectionCard>
    </div>
  );
}
