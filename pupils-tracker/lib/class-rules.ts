// Mr Chan's class rules.
// Source: docs/References/Mr Chan's class rules.docx — keep in sync with it.
// Year 1 classes (e.g. 1B, 1E) use the 8-rule set; everyone else (the Year 2
// classes 2B/2D/2F and any custom class) uses the 17-rule set.

export const YEAR1_RULES: string[] = [
  "Speak English.",
  "Pay attention when the teacher is teaching.",
  "Please raise your hand before speaking.",
  "No running, fighting, or walking around in the classroom.",
  "Always submit homework on time.",
  "Do not share answers with classmates.",
  "Please refrain from cheating.",
  "Use polite language and good manners at all times.",
];

export const YEAR2_RULES: string[] = [
  "Pay attention when the teacher is teaching.",
  "Always try your best and have a positive attitude.",
  "No shouting in the classroom.",
  "Keep your desk and classroom clean.",
  "Please raise your hand before speaking.",
  "Do not play dangerous things like bees.",
  "Respect your classmates and their belongings.",
  "No running, fighting, or walking around in the classroom.",
  "Please refrain from cheating.",
  "Use polite language and good manners at all times.",
  "Speak English.",
  "Follow instructions carefully.",
  "No eating in the classroom.",
  "Do not share answers with classmates.",
  "Always submit homework on time.",
  "Report only the serious problems.",
  "No playing games in the classroom.",
];

export function rulesForClass(name: string): string[] {
  return name.trim().startsWith("1") ? YEAR1_RULES : YEAR2_RULES;
}
