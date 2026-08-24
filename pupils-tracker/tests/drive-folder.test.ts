import { describe, expect, it } from "vitest";
import { parseDriveLink } from "@/lib/useBoardDocument";
import {
  canTeachOnBoard,
  decodeHtmlEntities,
  driveAssetEntries,
  driveItemUrl,
  isLessonPage,
  parseEmbeddedFolderView,
} from "@/lib/drive-folder";

const FIXTURE = `<!DOCTYPE html><html><head><title>Lessons slides</title></head><body>
<div class="flip-entries">
<div class="flip-entry" id="entry-1ZJATWEehYavCeP74nFFMCa7x3536MpO-" tabindex="0" role="link"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/1ZJATWEehYavCeP74nFFMCa7x3536MpO-" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">CDs</div></a></div></div>
<div class="flip-entry" id="entry-1W1gZuZP3rwjF2Zx4ewLZHKtKqTpePoJX" tabindex="0" role="link"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/1W1gZuZP3rwjF2Zx4ewLZHKtKqTpePoJX" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">Y1</div></a></div></div>
<div class="flip-entry" id="entry-1hk5JBohjziHnCsUzyUASzPuuP5aMh_pM" tabindex="0" role="link"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/1hk5JBohjziHnCsUzyUASzPuuP5aMh_pM" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">Y2</div></a></div></div>
</div></body></html>`;

const FILES_FIXTURE = `<!DOCTYPE html><html><head><title>Lesson 1</title></head><body>
<div class="flip-entries">
<div class="flip-entry" id="entry-1Crzbw8kmAZqT7f6KQirDeGv_UbTIo-z1"><div class="flip-entry-info"><a href="https://drive.google.com/file/d/1Crzbw8kmAZqT7f6KQirDeGv_UbTIo-z1/view?usp=drive_web" target="_blank"><img src="https://drive-thirdparty.googleusercontent.com/16/type/application/pdf" alt="PDF"/><div class="flip-entry-title">Doraemon_Friendship_Adventure_Map.pdf</div></a></div></div>
<div class="flip-entry" id="entry-1216kmqQ5fwe1PPNuTiPdJawiJoJBgh3f"><div class="flip-entry-info"><a href="https://drive.google.com/file/d/1216kmqQ5fwe1PPNuTiPdJawiJoJBgh3f/view?usp=drive_web" target="_blank"><img src="https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.presentationml.presentation" alt="Powerpoint (.pptx)"/><div class="flip-entry-title">Lesson 1.pptx</div></a></div></div>
<div class="flip-entry" id="entry-1PICjbNNUobUlD9FgxWaowtT91NT5reY9"><div class="flip-entry-info"><a href="https://drive.google.com/file/d/1PICjbNNUobUlD9FgxWaowtT91NT5reY9/view?usp=drive_web" target="_blank"><img src="https://drive-thirdparty.googleusercontent.com/16/type/audio/x-ms-wma" alt=""/><div class="flip-entry-title">01 track.wma</div></a></div></div>
<div class="flip-entry" id="entry-slidesId1234567890AB"><div class="flip-entry-info"><a href="https://docs.google.com/presentation/d/slidesId1234567890AB/edit" target="_blank"><div class="flip-entry-title">Unit 3 Slides</div></a></div></div>
<div class="flip-entry" id="entry-1Abh_A66oXmV8yYVYR53pIfg7R3G9soSZ"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/1Abh_A66oXmV8yYVYR53pIfg7R3G9soSZ" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">images</div></a></div></div>
<div class="flip-entry" id="entry-lesson10xxxxxxxxxxxxxxxxxx"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/lesson10xxxxxxxxxxxxxxxxxx" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">Lesson 10</div></a></div></div>
<div class="flip-entry" id="entry-lesson2xxxxxxxxxxxxxxxxxxx"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/lesson2xxxxxxxxxxxxxxxxxxx" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">Lesson 2</div></a></div></div>
<div class="flip-entry" id="entry-ampersandxxxxxxxxxxxxxxxx"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/ampersandxxxxxxxxxxxxxxxx" target="_blank"><div aria-label="Folder"></div><div class="flip-entry-title">Lesson 38 &amp; 39</div></a></div></div>
</div></body></html>`;

describe("parseEmbeddedFolderView", () => {
  it("lists shared folders from the Teaching Slides root", () => {
    const listing = parseEmbeddedFolderView(FIXTURE);
    expect(listing.name).toBe("Lessons slides");
    expect(listing.items.map((i) => i.name)).toEqual(["CDs", "Y1", "Y2"]);
    expect(listing.items.every((i) => i.kind === "folder")).toBe(true);
    expect(listing.items[1]?.id).toBe("1W1gZuZP3rwjF2Zx4ewLZHKtKqTpePoJX");
  });

  it("classifies files, slides and folders, and sorts Lesson 2 before Lesson 10", () => {
    const listing = parseEmbeddedFolderView(FILES_FIXTURE);
    expect(listing.name).toBe("Lesson 1");
    const folders = listing.items.filter((i) => i.kind === "folder");
    expect(folders.map((i) => i.name)).toEqual([
      "images",
      "Lesson 2",
      "Lesson 10",
      "Lesson 38 & 39",
    ]);
    const pdf = listing.items.find((i) => i.name.endsWith(".pdf"));
    expect(pdf).toMatchObject({
      kind: "file",
      mimeHint: "application/pdf",
    });
    const pptx = listing.items.find((i) => i.name.endsWith(".pptx"));
    expect(pptx).toMatchObject({
      kind: "file",
      mimeHint:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const wma = listing.items.find((i) => i.name.endsWith(".wma"));
    expect(wma?.mimeHint).toBe("audio/x-ms-wma");
    const slides = listing.items.find((i) => i.name === "Unit 3 Slides");
    expect(slides?.kind).toBe("slides");
  });

  it("returns an empty list when Drive shows no entries", () => {
    const listing = parseEmbeddedFolderView(
      `<html><head><title>Empty</title></head><body><div class="flip-entries"></div></body></html>`
    );
    expect(listing).toEqual({ name: "Empty", items: [] });
  });
});

describe("driveItemUrl", () => {
  it("builds Drive / Slides URLs the board already knows how to open", () => {
    expect(
      driveItemUrl({ id: "abc", name: "Y1", kind: "folder" })
    ).toBe("https://drive.google.com/drive/folders/abc");
    expect(
      driveItemUrl({ id: "file1", name: "a.pdf", kind: "file" })
    ).toBe("https://drive.google.com/file/d/file1/view");
    expect(
      driveItemUrl({ id: "s1", name: "Slides", kind: "slides" })
    ).toBe("https://docs.google.com/presentation/d/s1/view");
  });
});

describe("canTeachOnBoard", () => {
  it("opens PDFs, slides, media and PPTX on the board, not Word docs", () => {
    expect(
      canTeachOnBoard({
        id: "1",
        name: "notes.pdf",
        kind: "file",
        mimeHint: "application/pdf",
      })
    ).toBe(true);
    expect(
      canTeachOnBoard({ id: "2", name: "Unit 3", kind: "slides" })
    ).toBe(true);
    expect(
      canTeachOnBoard({
        id: "3",
        name: "track.wma",
        kind: "file",
        mimeHint: "audio/x-ms-wma",
      })
    ).toBe(true);
    expect(
      canTeachOnBoard({
        id: "4",
        name: "deck.pptx",
        kind: "file",
        mimeHint:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      })
    ).toBe(true);
    expect(
      canTeachOnBoard({
        id: "5",
        name: "sheet.docx",
        kind: "file",
        mimeHint:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toBe(false);
    expect(
      canTeachOnBoard({ id: "6", name: "Y1", kind: "folder" })
    ).toBe(false);
  });
});

describe("decodeHtmlEntities", () => {
  it("unescapes titles Drive encodes in the listing", () => {
    expect(decodeHtmlEntities("Lesson 38 &amp; 39")).toBe("Lesson 38 & 39");
  });
});

describe("parseDriveLink folders", () => {
  it("treats /folders/ and embeddedfolderview links as folders, not files", () => {
    expect(
      parseDriveLink(
        "https://drive.google.com/drive/folders/1ogGZi_J49WpB1F8FONCFZzgiXeUHsV-C?usp=sharing"
      )
    ).toEqual({
      id: "1ogGZi_J49WpB1F8FONCFZzgiXeUHsV-C",
      kind: "folder",
    });
    expect(
      parseDriveLink(
        "https://drive.google.com/embeddedfolderview?id=1ogGZi_J49WpB1F8FONCFZzgiXeUHsV-C#list"
      )
    ).toEqual({
      id: "1ogGZi_J49WpB1F8FONCFZzgiXeUHsV-C",
      kind: "folder",
    });
  });

  it("still parses file and slides links", () => {
    expect(
      parseDriveLink("https://drive.google.com/file/d/1Crzbw8kmAZqT7f6KQirDeGv_UbTIo-z1/view")
    ).toEqual({ id: "1Crzbw8kmAZqT7f6KQirDeGv_UbTIo-z1", kind: "file" });
    expect(
      parseDriveLink("https://docs.google.com/presentation/d/slidesId1234567890AB/edit")
    ).toEqual({ id: "slidesId1234567890AB", kind: "slides" });
  });
});

describe("isLessonPage", () => {
  const file = (name: string, mimeHint?: string) => ({
    id: "1abcdefghij",
    name,
    kind: "file" as const,
    ...(mimeHint ? { mimeHint } : {}),
  });

  it("matches interactive lesson pages by extension or MIME", () => {
    expect(isLessonPage(file("index.html"))).toBe(true);
    expect(isLessonPage(file("lesson.htm"))).toBe(true);
    expect(isLessonPage(file("page", "text/html"))).toBe(true);
  });

  it("ignores everything else, folders included", () => {
    expect(isLessonPage(file("crop.py"))).toBe(false);
    expect(isLessonPage(file("slides.pdf"))).toBe(false);
    expect(
      isLessonPage({ id: "1abcdefghij", name: "images", kind: "folder" })
    ).toBe(false);
  });

  it("sends lesson pages to the board rather than out to Drive", () => {
    expect(canTeachOnBoard(file("index.html"))).toBe(true);
  });
});

describe("driveAssetEntries", () => {
  const listing = {
    name: "lesson 62",
    items: [
      { id: "1imagesfolder", name: "images", kind: "folder" as const },
      { id: "1audiofileid0", name: "lesson.mp3", kind: "file" as const },
      { id: "1indexfileid0", name: "index.html", kind: "file" as const },
    ],
  };

  it("keys files by name and drops nested folders", () => {
    expect(driveAssetEntries(listing)).toEqual([
      ["lesson.mp3", "1audiofileid0"],
      ["index.html", "1indexfileid0"],
    ]);
  });

  it("prefixes a subfolder's files with the path the page would use", () => {
    const images = {
      name: "images",
      items: [{ id: "1pagepngid00", name: "page.png", kind: "file" as const }],
    };
    expect(driveAssetEntries(images, "images")).toEqual([
      ["images/page.png", "1pagepngid00"],
    ]);
  });
});
