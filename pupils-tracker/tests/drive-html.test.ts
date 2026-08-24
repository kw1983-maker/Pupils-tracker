import { describe, expect, it } from "vitest";
import {
  driveAssetShim,
  rewriteLiteralAssetPaths,
  withDriveAssets,
} from "@/lib/drive-html";

// Shaped like the lesson pages in the teaching-slides Drive folder: a config
// block with literal paths, plus tile URLs assembled at runtime.
const LESSON = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Let's Play!</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2" rel="stylesheet">
</head>
<body>
<img id="page" src="images/page.png" alt="worksheet">
<a href="#learn">Learn</a>
<script>
const LESSON = {
  pageImage: "images/page.png",
  audioFile: "lesson.mp3",
};
ITEMS.forEach(it => { it.img = 'images/' + it.id + '.png'; });
</script>
</body>
</html>`;

const ASSETS = {
  "lesson.mp3": "/api/drive?id=AUDIO",
  "images/page.png": "/api/drive?id=PAGE",
  "images/zak.png": "/api/drive?id=ZAK",
};

describe("rewriteLiteralAssetPaths", () => {
  it("repoints quoted paths in markup and in the page's config", () => {
    const out = rewriteLiteralAssetPaths(LESSON, ASSETS);
    expect(out).toContain('src="/api/drive?id=PAGE"');
    expect(out).toContain('pageImage: "/api/drive?id=PAGE"');
    expect(out).toContain('audioFile: "/api/drive?id=AUDIO"');
    expect(out).not.toContain("images/page.png");
  });

  it("leaves absolute URLs and in-page anchors alone", () => {
    const out = rewriteLiteralAssetPaths(LESSON, ASSETS);
    expect(out).toContain("https://fonts.googleapis.com/css2?family=Baloo+2");
    expect(out).toContain('href="#learn"');
  });

  it("handles ./-prefixed paths", () => {
    const out = rewriteLiteralAssetPaths('<img src="./lesson.mp3">', ASSETS);
    expect(out).toBe('<img src="/api/drive?id=AUDIO">');
  });

  it("does not rewrite a path that is merely a prefix of another", () => {
    const out = rewriteLiteralAssetPaths('<img src="images/page.png.bak">', ASSETS);
    expect(out).toBe('<img src="images/page.png.bak">');
  });
});

describe("driveAssetShim", () => {
  it("carries the map and cannot close its own script tag", () => {
    const shim = driveAssetShim({ "a/b.png": "/api/drive?id=</script>" });
    expect(shim).toContain("MutationObserver");
    expect(shim.indexOf("</script>")).toBe(shim.length - "</script>".length);
  });
});

describe("withDriveAssets", () => {
  it("injects the shim ahead of the page's own scripts", () => {
    const out = withDriveAssets(LESSON, ASSETS);
    expect(out.indexOf("MutationObserver")).toBeLessThan(
      out.indexOf("ITEMS.forEach")
    );
    expect(out.indexOf("<head>")).toBeLessThan(out.indexOf("MutationObserver"));
  });

  it("still injects when the page has no head tag", () => {
    const out = withDriveAssets("<img src='lesson.mp3'>", ASSETS);
    expect(out.startsWith("<script>")).toBe(true);
    expect(out).toContain("'/api/drive?id=AUDIO'");
  });

  it("returns the page untouched when there are no sibling assets", () => {
    expect(withDriveAssets(LESSON, {})).toBe(LESSON);
  });
});
