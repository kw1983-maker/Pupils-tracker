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

export interface RemedialActivity {
  id: string; // stable slug, e.g. "toy-words"
  title: string;
  path: string; // path under public/, e.g. "/remedial/toy-words.html"
  // Year group the activity is meant for (e.g. 1 for Year 1 classes like "1B").
  // The Remedial tab only lists an activity when it matches the current class's
  // year. Leave undefined to show the activity for every class.
  year?: number;
}

export const REMEDIAL_ACTIVITIES: RemedialActivity[] = [
  {
    id: "toy-words",
    title: "Toy Words",
    path: "/remedial/toy-words.html",
    year: 1,
  },
];
