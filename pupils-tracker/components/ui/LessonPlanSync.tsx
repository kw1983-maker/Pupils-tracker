"use client";

import { useEffect, useRef } from "react";
import { useTracker, todayISO } from "@/lib/store";
import {
  matchClassId,
  todayTabName,
  blocksForTab,
  pickCurrentBlock,
} from "@/lib/lesson-plan";
import { fillAndDownloadPlan } from "@/lib/lesson-plan-download";

/** Always-mounted, renders nothing. Two behaviours driven by the loaded plan:
 *  1) once per load, switch the active class to the one scheduled right now;
 *  2) after attendance for a plan class is marked, auto-download the filled .xlsx. */
export function LessonPlanSync() {
  const {
    hydrated,
    lessonPlan,
    classes,
    classAliases,
    currentClassId,
    setCurrentClass,
    attendance,
    getAbsenteeInfo,
  } = useTracker();

  // ---- 1. auto class-switch (once per page load) ----
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

  // ---- 2. auto-download filled plan after marking today's class ----
  const primed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayISO();
  const todayMarks = attendance[today];
  // A stable signature of today's marks so the effect fires only on real changes.
  const sig = todayMarks ? JSON.stringify(todayMarks) : "";

  useEffect(() => {
    // Skip the first run (initial value) so we don't download on load.
    if (!primed.current) {
      primed.current = true;
      return;
    }
    if (!hydrated || !lessonPlan) return;
    const tab = todayTabName();
    if (!tab) return;
    // Only react when the current class is actually in today's plan.
    const inPlan = blocksForTab(lessonPlan, tab).some(
      (b) => matchClassId(b.classRaw, classes, classAliases) === currentClassId
    );
    if (!inPlan) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void fillAndDownloadPlan({
        plan: lessonPlan,
        classes,
        aliases: classAliases,
        getAbsenteeInfo,
      });
    }, 2500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, currentClassId]);

  return null;
}
