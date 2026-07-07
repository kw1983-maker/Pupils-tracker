"use client";

import { useEffect, useRef } from "react";
import { useTracker } from "@/lib/store";
import {
  matchClassId,
  todayTabName,
  blocksForTab,
  pickCurrentBlock,
} from "@/lib/lesson-plan";

/** Always-mounted, renders nothing. Once per page load, switches the active
 *  class to the one the plan schedules right now. Downloads are never automatic
 *  — the teacher gets the filled file with "Fill & download now" in Resources. */
export function LessonPlanSync() {
  const {
    hydrated,
    cloudReconciled,
    lessonPlan,
    classes,
    classAliases,
    currentClassId,
    setCurrentClass,
  } = useTracker();

  const switched = useRef(false);
  useEffect(() => {
    // Wait for the cloud reconcile too: it also writes currentClassId once
    // its fetch resolves, and if that happens after this effect it would
    // silently revert the switch made here (the class flips to today's
    // lesson, then flips right back to whatever was last saved in the cloud).
    if (!hydrated || !cloudReconciled || switched.current || !lessonPlan) return;
    const tab = todayTabName();
    if (!tab) return;
    const block = pickCurrentBlock(blocksForTab(lessonPlan, tab));
    if (!block) return;
    const id = matchClassId(block.classRaw, classes, classAliases);
    if (id && id !== currentClassId) setCurrentClass(id);
    switched.current = true;
  }, [
    hydrated,
    cloudReconciled,
    lessonPlan,
    classes,
    classAliases,
    currentClassId,
    setCurrentClass,
  ]);

  return null;
}
