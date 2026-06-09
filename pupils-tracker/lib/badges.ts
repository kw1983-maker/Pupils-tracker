import type { Marker } from "@/components/ui/HighlighterTag";

// A ready-made badge the teacher can hand out. Faces are emoji (kid-friendly,
// already used elsewhere in the app) on a token-coloured chip via the existing
// Marker palette — so colours stay on-design. This catalog is fixed; teachers
// award from it but cannot edit it.
export interface BadgeDef {
  id: string; // stable key stored on each BadgeAward
  label: string;
  emoji: string;
  marker: Marker; // chip colour (maps to bg-mark-*/text-mark-*-ink)
  blurb: string; // short description shown under the badge
}

export const BADGE_CATALOG: BadgeDef[] = [
  { id: "star-reader", label: "Star Reader", emoji: "📚", marker: "blue", blurb: "Read beautifully and often." },
  { id: "speaking-champion", label: "Speaking Champion", emoji: "🎤", marker: "purple", blurb: "Spoke up with confidence." },
  { id: "maths-whiz", label: "Maths Whiz", emoji: "➗", marker: "amber", blurb: "Brilliant problem solving." },
  { id: "super-writer", label: "Super Writer", emoji: "✏️", marker: "pink", blurb: "Wonderful, careful writing." },
  { id: "kind-heart", label: "Kind Heart", emoji: "💛", marker: "amber", blurb: "Kind and caring to others." },
  { id: "team-player", label: "Team Player", emoji: "🤝", marker: "green", blurb: "A great partner to work with." },
  { id: "perfect-attendance", label: "Perfect Attendance", emoji: "🗓️", marker: "blue", blurb: "Here, ready and on time." },
  { id: "homework-hero", label: "Homework Hero", emoji: "✅", marker: "green", blurb: "Always finishes the work." },
  { id: "most-improved", label: "Most Improved", emoji: "📈", marker: "orange", blurb: "Tried hard and grew so much." },
  { id: "creative-star", label: "Creative Star", emoji: "🎨", marker: "purple", blurb: "Wonderfully imaginative." },
  { id: "super-listener", label: "Super Listener", emoji: "👂", marker: "blue", blurb: "Listened carefully all lesson." },
  { id: "helping-hand", label: "Helping Hand", emoji: "🙌", marker: "orange", blurb: "Helped the class shine." },
];

export const badgeById = (id: string): BadgeDef | undefined =>
  BADGE_CATALOG.find((b) => b.id === id);
