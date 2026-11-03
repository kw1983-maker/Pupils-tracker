"use client";

import { useEffect, useRef } from "react";
import { useTracker } from "@/lib/store";
import { useRemoteCommand } from "@/lib/remote";
import { shortenName } from "@/lib/pupil-name";
import { behaviorDelta } from "@/lib/behaviors";
import type { Pupil } from "@/lib/types";
import {
  namesLabel,
  pointsLabel,
  useCelebrate,
} from "@/components/ui/Celebration";

// How many recently celebrated record ids to remember (a whole-class award
// is ~40, so this covers several in a row).
const MAX_CELEBRATED = 300;

/**
 * Plays the reward celebration for points awarded on another signed-in device
 * — e.g. the teacher taps a point on their phone and the board on the
 * projector cheers, showing who it was for. Renders nothing; mount inside
 * CelebrationProvider and RemoteProvider.
 *
 * Two paths deliver an award: the instant "award" remote command (small doc,
 * arrives first) and the class-doc sync (`remoteAwards`, arrives later with
 * the actual records). Whichever comes first cheers; the record ids it covered
 * are remembered so the other one stays quiet.
 */
export function RemoteCelebrations() {
  const { remoteAwards, pupils, currentClassId } = useTracker();
  const celebrate = useCelebrate();
  const lastSeq = useRef(remoteAwards?.seq ?? 0);
  const celebrated = useRef(new Set<string>());

  const remember = (ids: string[]) => {
    const set = celebrated.current;
    for (const id of ids) set.add(id);
    while (set.size > MAX_CELEBRATED) {
      const oldest = set.values().next().value;
      if (oldest === undefined) break;
      set.delete(oldest);
    }
  };

  const cheer = (
    roster: Pupil[],
    kind: "pos" | "neg",
    pupilIds: string[],
    points: number
  ) => {
    const byId = new Map(roster.map((p) => [p.id, p.name]));
    const names = [...new Set(pupilIds)]
      .map((id) => byId.get(id))
      .filter((n): n is string => !!n)
      .map(shortenName);
    // One burst per batch, matching MultiAwardModal: a group award is "big".
    celebrate({
      kind,
      intensity: kind === "pos" && pupilIds.length > 1 ? "big" : "normal",
      name: names.length ? namesLabel(names) : undefined,
      detail: pointsLabel(kind, points),
    });
  };

  // Fast path: the award command, sent the moment the point was given.
  useRemoteCommand((c) => {
    if (c.type !== "award" || c.classId !== currentClassId) return;
    if (!c.recordIds.length || c.recordIds.every((id) => celebrated.current.has(id))) {
      return;
    }
    remember(c.recordIds);
    cheer(pupils, c.kind, c.pupilIds, c.points);
  });

  // Fallback path: records that arrived with the class doc. Re-runs when the
  // roster changes too; the seq check keeps each batch to one celebration.
  useEffect(() => {
    if (!remoteAwards || remoteAwards.seq === lastSeq.current) return;
    lastSeq.current = remoteAwards.seq;
    const records = remoteAwards.records.filter(
      (r) => !celebrated.current.has(r.id)
    );
    remember(remoteAwards.records.map((r) => r.id));
    const positive = records.filter((r) => r.type === "positive");
    // Mixed batches (rare) celebrate the positive side.
    const shown = positive.length ? positive : records;
    if (!shown.length) return;
    const kind = positive.length ? "pos" : "neg";
    // Points per pupil (a batch gives everyone the same amount).
    cheer(
      pupils,
      kind,
      shown.map((r) => r.pupilId),
      Math.abs(behaviorDelta(shown[0]))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteAwards, pupils, celebrate]);

  return null;
}
