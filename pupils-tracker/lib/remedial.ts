// Self-contained HTML activities for remedial pupils, played inside the app via
// iframe (matches how GAMES are kept as a static manifest in lib/games.ts). Unlike
// GAMES, these are local files shipped in public/remedial/ rather than external URLs.
//
// Score-tracking contract (see components/pages/Remedial.tsx):
//   - The app opens an activity as `${path}?pupil=<encoded name>` so the activity
//     can greet the picked pupil.
//   - To be tracked, an activity reports its running score to the parent app with:
//       window.parent.postMessage(
//         { type: "remedial-score", activityId: "<this activity's id>", score },
//         window.location.origin
//       );
//     The app keeps the latest reported score and saves it (attributed to the
//     picked pupil) when the teacher/pupil taps "Finish & save".

// Activities are grouped into categories so their scores stay separate per
// pupil in the Remedial tab: topic-based practice ("topics") vs sight-word
// drills ("sight-words"). Each pupil's progress is shown one category at a time.
export type RemedialCategory = "topics" | "sight-words";

// Display order + labels for the category groupings (activity list + progress).
export const REMEDIAL_CATEGORY_ORDER: RemedialCategory[] = ["topics", "sight-words"];
export const REMEDIAL_CATEGORY_LABEL: Record<RemedialCategory, string> = {
  topics: "Topics",
  "sight-words": "Sight Words",
};

export interface RemedialActivity {
  id: string; // stable slug, e.g. "toy-words"
  title: string;
  path: string; // path under public/, e.g. "/remedial/toy-words.html"
  // Year group the activity is meant for (e.g. 1 for Year 1 classes like "1B").
  // The Remedial tab only lists an activity when it matches the current class's
  // year. Leave undefined to show the activity for every class.
  year?: number;
  // Which category the activity's scores belong to. Defaults to "topics" when
  // omitted (see remedialCategory), so existing entries need no change.
  category?: RemedialCategory;
}

/** The category an activity's scores belong to, looked up from the manifest by
 *  id; "topics" for anything not tagged (including past scores whose activity is
 *  no longer listed). */
export function remedialCategory(id: string): RemedialCategory {
  return REMEDIAL_ACTIVITIES.find((a) => a.id === id)?.category ?? "topics";
}

export const REMEDIAL_ACTIVITIES: RemedialActivity[] = [
  {
    id: "toy-words",
    title: "Toy Words",
    path: "/remedial/toy-words.html",
    year: 1,
  },
  {
    id: "classroom-objects",
    title: "Classroom Objects",
    path: "/remedial/classroom-objects.html",
    year: 1,
  },
  {
    id: "free-time",
    title: "Free Time",
    path: "/remedial/free-time.html",
    year: 2,
  },
  {
    id: "the-old-house",
    title: "The Old House",
    path: "/remedial/the-old-house.html",
    year: 2,
  },
  {
    id: "clothes",
    title: "Clothes",
    path: "/remedial/clothes.html",
    year: 2,
  },
  // Sight words — shown for every class/year (no `year`), scored as their own
  // category so they don't mix with the topic activities above.
  {
    id: "sight-words-dolch-1",
    title: "Dolch Sight Words — Set 1",
    path: "/remedial/sight-words-dolch-1.html",
    category: "sight-words",
  },
  {
    id: "sight-words-dolch-2",
    title: "Dolch Sight Words — Set 2",
    path: "/remedial/sight-words-dolch-2.html",
    category: "sight-words",
  },
];
