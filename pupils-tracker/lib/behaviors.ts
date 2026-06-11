// Classroom behavior options.
// Source: docs/References/Classroom Behavior List.docx — keep in sync with it.
import { BehaviorType } from "./types";

// Every behavior entry is worth a fixed ±2 (mirrors the performance score).
export const BEHAVIOR_POINTS = 2;

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
