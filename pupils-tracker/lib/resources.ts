// Reference PDFs bundled with the app under public/books/. Add a new book by dropping
// the file in public/books/ and appending an entry here (matches how ROSTERS / rules are
// kept as static manifests). Files are served statically at `/books/${file}`.

export type ResourceGroup = "Year 1" | "Year 2" | "General";

export interface Resource {
  file: string; // filename under public/books/
  title: string;
  group: ResourceGroup;
}

// Render order of the groups in the Resources tab.
export const RESOURCE_GROUPS: ResourceGroup[] = ["Year 1", "Year 2", "General"];

export const RESOURCES: Resource[] = [
  // Year 1
  { file: "y1-workbook.pdf", title: "Y1 Workbook", group: "Year 1" },
  { file: "y1-spelling-list.pdf", title: "Y1 Spelling List", group: "Year 1" },
  { file: "y1-pbd-module.pdf", title: "Y1 PBD Module", group: "Year 1" },
  {
    file: "y1-rancangan-tahunan-2026.pdf",
    title: "Year 1 Ringkasan Rancangan Tahunan 2026",
    group: "Year 1",
  },
  // Year 2
  { file: "y2-workbook.pdf", title: "Year 2 Workbook", group: "Year 2" },
  {
    file: "y2-spelling-list-2026.pdf",
    title: "Year 2 Spelling List 2026",
    group: "Year 2",
  },
  { file: "y2-pbd-module.pdf", title: "Year 2 PBD Module", group: "Year 2" },
  {
    file: "y2-rancangan-tahunan-2026.pdf",
    title: "Year 2 Ringkasan Rancangan Tahunan 2026",
    group: "Year 2",
  },
  // General
  {
    file: "super-minds-1-students-book.pdf",
    title: "Super Minds 1 — Student's Book",
    group: "General",
  },
];
