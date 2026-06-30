// Classroom behavior options.
// Source: docs/References/Classroom Behavior List.docx — keep in sync with it.
import { BehaviorType, BehaviorRecord } from "./types";

// Default points for a one-tap award. The amount is editable per award, so this
// is only the starting value — the stored `points` on each record is the source
// of truth (see `behaviorDelta`).
export const BEHAVIOR_POINTS = 2;

/**
 * Signed point value of one behaviour record: the stored magnitude, with the
 * sign coming from its type. Older records (and any quick ±2 tap) store the
 * default magnitude, so this stays correct for them too.
 */
export function behaviorDelta(
  b: Pick<BehaviorRecord, "type" | "points">
): number {
  const mag = Math.abs(b.points ?? BEHAVIOR_POINTS);
  return b.type === "positive" ? mag : -mag;
}

export interface BehaviorOption {
  /** Short label stored on the record and shown in the activity log. */
  label: string;
  /** Example clarifier shown in the dropdown. */
  hint: string;
}

export const BEHAVIOR_OPTIONS: Record<BehaviorType, BehaviorOption[]> = {
  positive: [
    { label: "Active Participation", hint: "raising hand, volunteering" },
    { label: "On Task", hint: "focused on assigned work" },
    { label: "Helping Others", hint: "sharing, explaining a concept" },
    { label: "Respectful Listening", hint: "paying attention to speaker" },
    { label: "Showing Initiative", hint: "cleaning up, getting ready" },
  ],
  negative: [
    { label: "Off-Task Behavior", hint: "doodling, playing with objects" },
    { label: "Disrupting Class", hint: "calling out, loud noises" },
    { label: "Interrupted Learning", hint: "talking while teacher/peer speaks" },
    { label: "Unprepared", hint: "missing books, stationery" },
    { label: "Disrespectful Action", hint: "refusing instructions, unkind words" },
  ],
};
