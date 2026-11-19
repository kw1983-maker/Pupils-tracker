/**
 * Pure model for zooming, rotating and marking up the photo shown on the
 * board. Mark coordinates live in image space (0..1 on each axis), so a mark
 * stays on the pupil's work whatever the zoom, rotation or screen size.
 * Synced between the phone and the board via user_state/{uid}_photoview.
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface PhotoView {
  zoom: number;
  rotate: Rotation;
  /** Offset of the image centre, as a fraction of the fitted on-screen size. */
  panX: number;
  panY: number;
}

/** Design-token colour names; rendered as var(--color-<name>). Never hex. */
export const MARK_COLORS = ["danger", "info", "success", "warning"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];

export type StrokeKind = "pen" | "highlight";
export type ShapeKind = "circle" | "arrow";
export type StampKind = "tick" | "cross" | "star";

export type Mark =
  | { id: string; kind: StrokeKind; color: MarkColor; size: number; points: number[] }
  | {
      id: string;
      kind: ShapeKind;
      color: MarkColor;
      size: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | { id: string; kind: StampKind; x: number; y: number; size: number };

export interface PhotoAnnotations {
  /** `at` of the photo these belong to; other photos start blank. */
  photoAt: number;
  view: PhotoView;
  marks: Mark[];
  /** Device that wrote this version (its own echoes are ignored). */
  by: string;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
export const MAX_MARKS = 300;
export const MAX_TOTAL_POINTS = 24_000; // numbers, i.e. 12k x/y pairs (~200 KB)
export const MAX_STROKE_POINTS = 1_200;

export const DEFAULT_VIEW: PhotoView = { zoom: 1, rotate: 0, panX: 0, panY: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

export function clampView(view: PhotoView): PhotoView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, MIN_ZOOM, MAX_ZOOM);
  // At zoom z the image is z times its fitted size, so it may move z/2 each way
  // and still keep part of it on screen.
  const limit = zoom / 2;
  return {
    zoom,
    rotate: view.rotate,
    panX: clamp(Number.isFinite(view.panX) ? view.panX : 0, -limit, limit),
    panY: clamp(Number.isFinite(view.panY) ? view.panY : 0, -limit, limit),
  };
}

/** Turn by ±90°. Pan resets so the turned image comes back to the centre. */
export function rotateBy(view: PhotoView, deg: 90 | -90): PhotoView {
  const rotate = ((((view.rotate + deg) % 360) + 360) % 360) as Rotation;
  return { ...view, rotate, panX: 0, panY: 0 };
}

/**
 * Layout of the photo on a stage. `fitW/fitH` is the on-screen size of the
 * (rotated) image at zoom 1; `boxW/boxH` the unrotated box it is drawn in.
 */
export interface StageLayout {
  stageW: number;
  stageH: number;
  fitW: number;
  fitH: number;
  boxW: number;
  boxH: number;
}

export function layoutFor(
  stageW: number,
  stageH: number,
  imageAspect: number,
  rotate: Rotation
): StageLayout {
  const sideways = rotate === 90 || rotate === 270;
  const ra = sideways ? 1 / imageAspect : imageAspect;
  const fitW = Math.max(1, Math.min(stageW, stageH * ra));
  const fitH = fitW / ra;
  return {
    stageW,
    stageH,
    fitW,
    fitH,
    boxW: sideways ? fitH : fitW,
    boxH: sideways ? fitW : fitH,
  };
}

/** Zoom by `factor`, keeping the stage point (fx, fy) (stage pixels) still. */
export function zoomAt(
  view: PhotoView,
  factor: number,
  fx: number,
  fy: number,
  layout: StageLayout
): PhotoView {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / view.zoom;
  // Positions relative to the stage centre.
  const ox = fx - layout.stageW / 2;
  const oy = fy - layout.stageH / 2;
  const cx = view.panX * layout.fitW;
  const cy = view.panY * layout.fitH;
  const ncx = ox - (ox - cx) * k;
  const ncy = oy - (oy - cy) * k;
  return clampView({ ...view, zoom, panX: ncx / layout.fitW, panY: ncy / layout.fitH });
}

/** Zoom about the middle of the screen (the toolbar's + / − buttons). */
export function zoomCentered(view: PhotoView, factor: number): PhotoView {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / view.zoom;
  return clampView({ ...view, zoom, panX: view.panX * k, panY: view.panY * k });
}

/** Move by (dx, dy) stage pixels. */
export function panBy(view: PhotoView, dx: number, dy: number, layout: StageLayout): PhotoView {
  return clampView({
    ...view,
    panX: view.panX + dx / layout.fitW,
    panY: view.panY + dy / layout.fitH,
  });
}

function rot(x: number, y: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const c = Math.round(Math.cos(r));
  const s = Math.round(Math.sin(r));
  return [x * c - y * s, x * s + y * c];
}

/** Image point (0..1) → stage pixels. Matches the CSS transform in PhotoCanvas. */
export function imageToScreen(
  u: number,
  v: number,
  view: PhotoView,
  layout: StageLayout
): [number, number] {
  const [rx, ry] = rot((u - 0.5) * layout.boxW, (v - 0.5) * layout.boxH, view.rotate);
  return [
    layout.stageW / 2 + view.panX * layout.fitW + rx * view.zoom,
    layout.stageH / 2 + view.panY * layout.fitH + ry * view.zoom,
  ];
}

/** Stage pixels → image point (0..1, not clamped). */
export function screenToImage(
  x: number,
  y: number,
  view: PhotoView,
  layout: StageLayout
): [number, number] {
  const lx = (x - layout.stageW / 2 - view.panX * layout.fitW) / view.zoom;
  const ly = (y - layout.stageH / 2 - view.panY * layout.fitH) / view.zoom;
  const [ux, uy] = rot(lx, ly, -view.rotate);
  return [ux / layout.boxW + 0.5, uy / layout.boxH + 0.5];
}

export const clamp01 = (v: number) => clamp(v, 0, 1);

/**
 * Thin a freehand stroke (flat x,y list in image space): drop points closer
 * than `minDist` to the last kept one, always keep the end, round to 4 dp.
 */
export function simplifyStroke(points: number[], minDist = 0.002): number[] {
  if (points.length < 2) return [];
  let dist = minDist;
  for (;;) {
    const out = [round4(points[0]), round4(points[1])];
    let lx = points[0];
    let ly = points[1];
    for (let i = 2; i + 1 < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      if (Math.hypot(x - lx, y - ly) >= dist) {
        out.push(round4(x), round4(y));
        lx = x;
        ly = y;
      }
    }
    const ex = round4(points[points.length - 2]);
    const ey = round4(points[points.length - 1]);
    if (out.length > 2 && (out[out.length - 2] !== ex || out[out.length - 1] !== ey)) {
      out.push(ex, ey);
    } else if (out.length === 2) {
      // A single tap: keep it as a dot (two equal points).
      out.push(ex, ey);
    }
    if (out.length <= MAX_STROKE_POINTS) return out;
    dist *= 1.6;
  }
}

export function totalPoints(marks: Mark[]): number {
  let n = 0;
  for (const m of marks) n += "points" in m ? m.points.length : 4;
  return n;
}

/** Add a mark if there is room. Returns the same array when full. */
export function addMark(marks: Mark[], mark: Mark): Mark[] {
  if (marks.length >= MAX_MARKS) return marks;
  if (totalPoints(marks) + totalPoints([mark]) > MAX_TOTAL_POINTS) return marks;
  return [...marks, mark];
}

export function canAddMark(marks: Mark[]): boolean {
  return marks.length < MAX_MARKS && totalPoints(marks) < MAX_TOTAL_POINTS - 40;
}

// --- Validation of what comes back from Firestore ------------------------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const in01 = (v: unknown) => isNum(v) && v >= 0 && v <= 1;
const isSize = (v: unknown) => isNum(v) && v > 0 && v <= 0.5;
const isColor = (v: unknown): v is MarkColor =>
  typeof v === "string" && (MARK_COLORS as readonly string[]).includes(v);

function parseView(raw: unknown): PhotoView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isNum(r.zoom) || !isNum(r.panX) || !isNum(r.panY)) return null;
  if (r.rotate !== 0 && r.rotate !== 90 && r.rotate !== 180 && r.rotate !== 270) return null;
  return clampView({ zoom: r.zoom, rotate: r.rotate, panX: r.panX, panY: r.panY });
}

export function parseMark(raw: unknown): Mark | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id || r.id.length > 40) return null;
  if (!isSize(r.size)) return null;
  const { id, size } = r as { id: string; size: number };
  if (r.kind === "pen" || r.kind === "highlight") {
    const pts = r.points;
    if (!isColor(r.color) || !Array.isArray(pts)) return null;
    if (pts.length < 2 || pts.length % 2 !== 0 || pts.length > MAX_STROKE_POINTS) return null;
    if (!pts.every(in01)) return null;
    return { id, kind: r.kind, color: r.color, size, points: pts as number[] };
  }
  if (r.kind === "circle" || r.kind === "arrow") {
    if (!isColor(r.color)) return null;
    if (![r.x1, r.y1, r.x2, r.y2].every(in01)) return null;
    return {
      id,
      kind: r.kind,
      color: r.color,
      size,
      x1: r.x1 as number,
      y1: r.y1 as number,
      x2: r.x2 as number,
      y2: r.y2 as number,
    };
  }
  if (r.kind === "tick" || r.kind === "cross" || r.kind === "star") {
    if (!in01(r.x) || !in01(r.y)) return null;
    return { id, kind: r.kind, x: r.x as number, y: r.y as number, size };
  }
  return null;
}

/** Strictly validate a stored annotations doc; null if anything is off. */
export function parsePhotoAnnotations(raw: unknown): PhotoAnnotations | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isNum(r.photoAt) || typeof r.by !== "string") return null;
  const view = parseView(r.view);
  if (!view || !Array.isArray(r.marks) || r.marks.length > MAX_MARKS) return null;
  const marks: Mark[] = [];
  for (const m of r.marks) {
    const parsed = parseMark(m);
    if (!parsed) return null;
    marks.push(parsed);
  }
  if (totalPoints(marks) > MAX_TOTAL_POINTS) return null;
  return { photoAt: r.photoAt, view, marks, by: r.by };
}

export function newMarkId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
