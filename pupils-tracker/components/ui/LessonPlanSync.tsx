"use client";

import { useEffect, useRef, useState } from "react";
import { useTracker } from "@/lib/store";
import {
  matchClassId,
  todayTabName,
  blocksForTab,
  pickCurrentBlock,
} from "@/lib/lesson-plan";

/** Always-mounted, renders nothing. Switches the active class to the one the
 *  plan schedules right now, and keeps re-checking every minute so it also
 *  advances if the tab is left open across a period boundary. Downloads are
 *  never automatic — the teacher gets the filled file with "Fill & download
 *  now" in Resources. */
export function LessonPlanSync() {
  const {
    hydrated,
    cloudReconciled,
    teacherId,
    lessonPlan,
    classes,
    classAliases,
    currentClassId,
    setCurrentClass,
  } = useTracker();

  // Bumped every minute so the effect below re-checks the schedule instead of
  // only running once at load.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Key of the last schedule block we auto-switched for. Only act when a
  // *new* period starts — never re-assert the scheduled class on every tick,
  // or we'd fight a teacher who manually picked a different class mid-period.
  const lastKeyRef = useRef<string | null>(null);
  // Which account lastKeyRef belongs to. Two accounts' schedules could
  // coincidentally produce the same key (same weekday/time/label), so force a
  // fresh check whenever the signed-in account changes.
  const lastAccountRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastAccountRef.current !== teacherId) {
      lastAccountRef.current = teacherId;
      lastKeyRef.current = null;
    }
    // Wait for the cloud reconcile too: it also writes currentClassId once
    // its fetch resolves, and if that happens after this effect it would
    // silently revert the switch made here (the class flips to today's
    // lesson, then flips right back to whatever was last saved in the cloud).
    if (!hydrated || !cloudReconciled || !lessonPlan) return;
    const tab = todayTabName();
    if (!tab) return;
    const block = pickCurrentBlock(blocksForTab(lessonPlan, tab));
    if (!block) return;
    const key = `${tab}|${block.dateISO}|${block.startMin}|${block.endMin}|${block.classRaw}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const id = matchClassId(block.classRaw, classes, classAliases);
    if (id && id !== currentClassId) setCurrentClass(id);
  }, [
    hydrated,
    cloudReconciled,
    teacherId,
    lessonPlan,
    classes,
    classAliases,
    currentClassId,
    setCurrentClass,
    tick,
  ]);

  return null;
}
