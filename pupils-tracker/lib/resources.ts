// Reference resources shown in the Resources tab: PDFs bundled under public/books/ and
// videos hosted on YouTube. Add a PDF by dropping the file in public/books/ and appending
// a "pdf" entry; add a video by appending a "video" entry with its YouTube id (matches
// how ROSTERS / rules are kept as static manifests). PDFs are served at `/books/${file}`.

export type ResourceGroup = "Year 1" | "Year 2" | "General";

export interface PdfResource {
  kind: "pdf";
  file: string; // filename under public/books/
  title: string;
  group: ResourceGroup;
}

export interface VideoResource {
  kind: "video";
  youtubeId: string;
  title: string;
  group: ResourceGroup;
}

// An external link (e.g. a Google Drive folder of teaching slides). Opens in a
// new tab. Add one by appending a "link" entry with the full https URL.
export interface LinkResource {
  kind: "link";
  url: string;
  title: string;
  group: ResourceGroup;
}

export type Resource = PdfResource | VideoResource | LinkResource;

// Render order of the groups in the Resources tab.
export const RESOURCE_GROUPS: ResourceGroup[] = ["Year 1", "Year 2", "General"];

export const RESOURCES: Resource[] = [
  // Year 1 — PDFs
  { kind: "pdf", file: "y1-workbook.pdf", title: "Y1 Workbook", group: "Year 1" },
  { kind: "pdf", file: "y1-spelling-list.pdf", title: "Y1 Spelling List", group: "Year 1" },
  { kind: "pdf", file: "y1-pbd-module.pdf", title: "Y1 PBD Module", group: "Year 1" },
  {
    kind: "pdf",
    file: "y1-rancangan-tahunan-2026.pdf",
    title: "Year 1 Ringkasan Rancangan Tahunan 2026",
    group: "Year 1",
  },
  // Year 1 — Videos
  { kind: "video", youtubeId: "xkNTIL2KSto", title: "Y1 rules", group: "Year 1" },
  {
    kind: "video",
    youtubeId: "hIja-6SD8Wk",
    title: "Y1 class rules song",
    group: "Year 1",
  },

  // Year 2 — PDFs
  { kind: "pdf", file: "y2-workbook.pdf", title: "Year 2 Workbook", group: "Year 2" },
  {
    kind: "pdf",
    file: "y2-spelling-list-2026.pdf",
    title: "Year 2 Spelling List 2026",
    group: "Year 2",
  },
  { kind: "pdf", file: "y2-pbd-module.pdf", title: "Year 2 PBD Module", group: "Year 2" },
  {
    kind: "pdf",
    file: "y2-rancangan-tahunan-2026.pdf",
    title: "Year 2 Ringkasan Rancangan Tahunan 2026",
    group: "Year 2",
  },
  // Year 2 — Videos
  { kind: "video", youtubeId: "Yc6XZ_qw-bg", title: "Y2 rules", group: "Year 2" },
  {
    kind: "video",
    youtubeId: "4mvWo0NDrpY",
    title: "Y2 rules song",
    group: "Year 2",
  },

  // General — Links
  {
    kind: "link",
    url: "https://drive.google.com/drive/folders/1ogGZi_J49WpB1F8FONCFZzgiXeUHsV-C?usp=sharing",
    title: "Teaching Slides (Google Drive)",
    group: "General",
  },
  // General — PDFs
  {
    kind: "pdf",
    file: "super-minds-1-students-book.pdf",
    title: "Super Minds 1 — Student's Book",
    group: "General",
  },
];
