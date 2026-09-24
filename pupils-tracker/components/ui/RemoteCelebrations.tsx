"use client";

import { useEffect, useRef } from "react";
import { useTracker } from "@/lib/store";
import { shortenName } from "@/lib/pupil-name";
import { behaviorDelta } from "@/lib/behaviors";
import {
  namesLabel,
  pointsLabel,
  useCelebrate,
} from "@/components/ui/Celebration";

/**
 * Plays the reward celebration for points awarded on another signed-in device
 * — e.g. the teacher taps a point on their phone and the board on the
 * projector cheers, showing who it was for. Renders nothing; mount inside
 * CelebrationProvider.
 */
export function RemoteCelebrations() {
  const { remoteAwards, pupils } = useTracker();
  const celebrate = useCelebrate();
  const lastSeq = useRef(remoteAwards?.seq ?? 0);

  // Re-runs when the roster changes too; the seq check keeps each batch to
  // one celebration.
  useEffect(() => {
    if (!remoteAwards || remoteAwards.seq === lastSeq.current) return;
    lastSeq.current = remoteAwards.seq;
    const { records } = remoteAwards;
    const positive = records.filter((r) => r.type === "positive");
    // One burst per batch, matching MultiAwardModal: a group award is "big".
    // Mixed batches (rare) celebrate the positive side.
    const shown = positive.length ? positive : records;
    if (!shown.length) return;
    const kind = positive.length ? "pos" : "neg";
    const byId = new Map(pupils.map((p) => [p.id, p.name]));
    const names = [...new Set(shown.map((r) => r.pupilId))]
      .map((id) => byId.get(id))
      .filter((n): n is string => !!n)
      .map(shortenName);
    // Points per pupil (a batch gives everyone the same amount).
    const points = Math.abs(behaviorDelta(shown[0]));
    celebrate({
      kind,
      intensity: kind === "pos" && shown.length > 1 ? "big" : "normal",
      name: names.length ? namesLabel(names) : undefined,
      detail: pointsLabel(kind, points),
    });
  }, [remoteAwards, pupils, celebrate]);

  return null;
}
