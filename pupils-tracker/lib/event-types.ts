// Preset options for the Calendar event dropdown. Pick one of these or choose
// "Custom…" to type a free-text title. Add a preset by appending to this list
// (a static manifest, like lib/homework-types.ts / lib/behaviors.ts).
export const EVENT_TYPES = ["Spelling", "Dictation", "Assessment"] as const;

// Sentinel value for the dropdown's manual-entry ("Custom…") option.
export const CUSTOM_EVENT = "__custom__";
