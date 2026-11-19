import { describe, expect, it } from "vitest";
import {
  addMark,
  clampView,
  DEFAULT_VIEW,
  imageToScreen,
  layoutFor,
  MAX_MARKS,
  MAX_STROKE_POINTS,
  MAX_ZOOM,
  panBy,
  parsePhotoAnnotations,
  rotateBy,
  screenToImage,
  simplifyStroke,
  zoomAt,
  type Mark,
  type PhotoView,
  type Rotation,
} from "@/lib/photo-annotate";

const tick = (id: string): Mark => ({ id, kind: "tick", x: 0.5, y: 0.5, size: 0.1 });

describe("clampView", () => {
  it("keeps zoom within 1..MAX_ZOOM and pan within zoom/2", () => {
    expect(clampView({ zoom: 0.2, rotate: 0, panX: 3, panY: -3 })).toEqual({
      zoom: 1,
      rotate: 0,
      panX: 0.5,
      panY: -0.5,
    });
    expect(clampView({ ...DEFAULT_VIEW, zoom: 99 }).zoom).toBe(MAX_ZOOM);
  });
  it("replaces non-finite numbers", () => {
    expect(clampView({ zoom: NaN, rotate: 90, panX: Infinity, panY: NaN })).toEqual({
      zoom: 1,
      rotate: 90,
      panX: 0,
      panY: 0,
    });
  });
});

describe("rotateBy", () => {
  it("wraps both ways and recentres", () => {
    expect(rotateBy({ ...DEFAULT_VIEW, panX: 0.2 }, 90)).toEqual({ ...DEFAULT_VIEW, rotate: 90 });
    expect(rotateBy(DEFAULT_VIEW, -90).rotate).toBe(270);
    expect(rotateBy({ ...DEFAULT_VIEW, rotate: 270 }, 90).rotate).toBe(0);
  });
});

describe("layoutFor", () => {
  it("fits a landscape photo, and swaps it when turned sideways", () => {
    const flat = layoutFor(1000, 500, 2, 0);
    expect([flat.fitW, flat.fitH, flat.boxW, flat.boxH]).toEqual([1000, 500, 1000, 500]);
    const side = layoutFor(1000, 500, 2, 90);
    expect([side.fitW, side.fitH]).toEqual([250, 500]);
    expect([side.boxW, side.boxH]).toEqual([500, 250]);
  });
});

describe("screen ↔ image", () => {
  const rotations: Rotation[] = [0, 90, 180, 270];
  it.each(rotations)("round-trips at %i°", (rotate) => {
    const view: PhotoView = { zoom: 2.5, rotate, panX: 0.1, panY: -0.2 };
    const layout = layoutFor(800, 600, 4 / 3, rotate);
    for (const [u, v] of [
      [0, 0],
      [0.25, 0.8],
      [1, 1],
    ]) {
      const [x, y] = imageToScreen(u, v, view, layout);
      const [u2, v2] = screenToImage(x, y, view, layout);
      expect(u2).toBeCloseTo(u, 9);
      expect(v2).toBeCloseTo(v, 9);
    }
  });
  it("puts the image's top-left at the top-right after a 90° turn", () => {
    const view: PhotoView = { ...DEFAULT_VIEW, rotate: 90 };
    const layout = layoutFor(400, 400, 1, 90);
    const [x, y] = imageToScreen(0, 0, view, layout);
    expect(x).toBeCloseTo(400);
    expect(y).toBeCloseTo(0);
  });
});

describe("zoomAt / panBy", () => {
  it("keeps the focal point still", () => {
    const layout = layoutFor(800, 600, 4 / 3, 0);
    const before = screenToImage(600, 150, DEFAULT_VIEW, layout);
    const zoomed = zoomAt(DEFAULT_VIEW, 2, 600, 150, layout);
    const after = screenToImage(600, 150, zoomed, layout);
    expect(zoomed.zoom).toBe(2);
    expect(after[0]).toBeCloseTo(before[0], 9);
    expect(after[1]).toBeCloseTo(before[1], 9);
  });
  it("pans in fractions of the fitted size", () => {
    const layout = layoutFor(800, 600, 4 / 3, 0);
    const moved = panBy({ ...DEFAULT_VIEW, zoom: 2 }, 80, -60, layout);
    expect(moved.panX).toBeCloseTo(0.1);
    expect(moved.panY).toBeCloseTo(-0.1);
  });
});

describe("simplifyStroke", () => {
  it("drops points closer than minDist and keeps the end", () => {
    const pts = [0, 0, 0.0005, 0, 0.001, 0, 0.01, 0, 0.0101, 0];
    expect(simplifyStroke(pts, 0.002)).toEqual([0, 0, 0.01, 0, 0.0101, 0]);
  });
  it("turns a tap into a dot", () => {
    expect(simplifyStroke([0.3, 0.4])).toEqual([0.3, 0.4, 0.3, 0.4]);
  });
  it("never returns more than MAX_STROKE_POINTS numbers", () => {
    const long: number[] = [];
    for (let i = 0; i < 5000; i++) long.push((i % 100) / 100, Math.floor(i / 100) / 50);
    const out = simplifyStroke(long, 0.0001);
    expect(out.length).toBeLessThanOrEqual(MAX_STROKE_POINTS);
    expect(out.length % 2).toBe(0);
  });
});

describe("addMark", () => {
  it("refuses once full", () => {
    let marks: Mark[] = [];
    for (let i = 0; i < MAX_MARKS + 5; i++) marks = addMark(marks, tick(`t${i}`));
    expect(marks).toHaveLength(MAX_MARKS);
  });
});

describe("parsePhotoAnnotations", () => {
  const good = {
    photoAt: 123,
    by: "dev-1",
    view: { zoom: 2, rotate: 90, panX: 0.1, panY: 0 },
    marks: [
      { id: "a", kind: "pen", color: "danger", size: 0.01, points: [0.1, 0.1, 0.2, 0.2] },
      { id: "b", kind: "arrow", color: "info", size: 0.01, x1: 0, y1: 0, x2: 1, y2: 1 },
      { id: "c", kind: "star", x: 0.5, y: 0.5, size: 0.1 },
    ],
  };
  it("accepts a valid doc", () => {
    const parsed = parsePhotoAnnotations(good);
    expect(parsed?.marks).toHaveLength(3);
    expect(parsed?.view.rotate).toBe(90);
  });
  it.each([
    ["bad rotation", { ...good, view: { ...good.view, rotate: 45 } }],
    ["hex colour", { ...good, marks: [{ ...good.marks[0], color: "#ff0000" }] }],
    ["odd points", { ...good, marks: [{ ...good.marks[0], points: [0.1, 0.2, 0.3] }] }],
    ["out of range", { ...good, marks: [{ ...good.marks[2], x: 4 }] }],
    ["unknown kind", { ...good, marks: [{ id: "z", kind: "laser", x: 0, y: 0, size: 0.1 }] }],
    ["missing photoAt", { ...good, photoAt: undefined }],
    ["too many marks", { ...good, marks: Array.from({ length: MAX_MARKS + 1 }, (_, i) => tick(`t${i}`)) }],
  ])("rejects %s", (_label, doc) => {
    expect(parsePhotoAnnotations(doc)).toBeNull();
  });
});
