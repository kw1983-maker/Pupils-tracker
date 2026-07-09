// Self-contained HTML activities for remedial pupils, played inside the app via
// iframe (matches how GAMES are kept as a static manifest in lib/games.ts). Unlike
// GAMES, these are local files shipped in public/remedial/ rather than external URLs.

export interface RemedialActivity {
  id: string; // stable slug, e.g. "toy-words"
  title: string;
  path: string; // path under public/, e.g. "/remedial/toy-words.html"
}

export const REMEDIAL_ACTIVITIES: RemedialActivity[] = [
  {
    id: "toy-words",
    title: "Toy Words",
    path: "/remedial/toy-words.html",
  },
];
