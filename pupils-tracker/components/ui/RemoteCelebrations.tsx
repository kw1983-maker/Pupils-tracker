"use client";

import { useEffect, useRef } from "react";
import { useTracker } from "@/lib/store";
import { useCelebrate } from "@/components/ui/Celebration";

/**
 * Plays the reward celebration for points awarded on another signed-in device
 * — e.g. the teacher taps a point on their phone and the board on the
 * projector cheers. Renders nothing; mount inside CelebrationProvider.
 */
export function RemoteCelebrations() {
  const { remoteAwards } = useTracker();
  const celebrate = useCelebrate();
  const lastSeq = useRef(remoteAwards?.seq ?? 0);

  useEffect(() => {
    if (!remoteAwards || remoteAwards.seq === lastSeq.current) return;
    lastSeq.current = remoteAwards.seq;
    const { records } = remoteAwards;
    const positive = records.filter((r) => r.type === "positive").length;
    const negative = records.length - positive;
    // One burst per batch, matching MultiAwardModal: a group award is "big".
    if (positive > 1) celebrate({ intensity: "big" });
    else if (positive === 1) celebrate();
    else if (negative > 0) celebrate({ kind: "neg" });
  }, [remoteAwards, celebrate]);

  return null;
}
