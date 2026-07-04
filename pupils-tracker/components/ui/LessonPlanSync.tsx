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
    lessonPlan,
    classes,
    classAliases,
    currentClassId,
    setCurrentClass,
  } = useTracker();

  const switched = useRef(false);
  useEffect(() => {
    if (!hydrated || switched.current || !lessonPlan) return;
    const tab = todayTabName();
    if (!tab) return;
    const block = pickCurrentBlock(blocksForTab(lessonPlan, tab));
    if (!block) return;
    const id = matchClassId(block.classRaw, classes, classAliases);
    if (id && id !== currentClassId) setCurrentClass(id);
    switched.current = true;
  }, [hydrated, lessonPlan, classes, classAliases, currentClassId, setCurrentClass]);

  return null;
}
