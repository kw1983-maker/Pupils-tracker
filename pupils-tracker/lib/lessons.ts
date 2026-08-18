// Self-contained interactive HTML lessons, opened on the Spelling/Dictation
// board via iframe (matches how REMEDIAL_ACTIVITIES are kept as a static
// manifest in lib/remedial.ts). Add a lesson by dropping the file in
// public/lessons/ and appending an entry here.

export interface Lesson {
  id: string; // stable slug, e.g. "at-the-beach"
  title: string;
  path: string; // path under public/, e.g. "/lessons/at-the-beach.html"
}

export const LESSONS: Lesson[] = [
  {
    id: "at-the-beach",
    title: "At the Beach — Full Lesson",
    path: "/lessons/at-the-beach.html",
  },
];
