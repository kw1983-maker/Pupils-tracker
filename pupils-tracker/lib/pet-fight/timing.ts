/** Piecewise keyframe / impulse helpers for the pet-fight cinematic clock. */

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export const easeLinear = (t: number) => t;
export const easeInQuad = (t: number) => t * t;
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeInCubic = (t: number) => t * t * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutExpo = (t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export type EaseFn = (t: number) => number;

export type Keyframe = {
  t: number;
  cut?: boolean;
  ease?: EaseFn;
  [field: string]: number | boolean | EaseFn | undefined;
};

/** Interpolate numeric fields across sorted keys; `cut` = hard cut (hold previous). */
export function track(
  T: number,
  keys: Keyframe[],
  fields: string[]
): Record<string, number> {
  const first = keys[0]!;
  if (T <= first.t) {
    const out: Record<string, number> = {};
    for (const f of fields) out[f] = Number(first[f] ?? 0);
    return out;
  }
  const last = keys[keys.length - 1]!;
  if (T >= last.t) {
    const out: Record<string, number> = {};
    for (const f of fields) out[f] = Number(last[f] ?? 0);
    return out;
  }
  let i = 0;
  while (i < keys.length - 1 && !(T >= keys[i]!.t && T < keys[i + 1]!.t)) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  if (b.cut) {
    const out: Record<string, number> = {};
    for (const f of fields) out[f] = Number(a[f] ?? 0);
    return out;
  }
  const p = clamp((T - a.t) / (b.t - a.t), 0, 1);
  const e = (b.ease ?? easeInOutCubic)(p);
  const out: Record<string, number> = {};
  for (const f of fields) {
    const av = Number(a[f] ?? 0);
    const bv = Number(b[f] ?? 0);
    out[f] = av + (bv - av) * e;
  }
  return out;
}

/** Decaying screen-shake impulse. */
export function shakeAt(
  T: number,
  t0: number,
  amp: number,
  dur: number
): [number, number] {
  if (T < t0 || T > t0 + dur) return [0, 0];
  const p = (T - t0) / dur;
  const decay = (1 - p) * (1 - p);
  return [
    Math.sin(p * dur * 46) * amp * decay,
    Math.cos(p * dur * 39) * amp * decay,
  ];
}

/** Triangular pulse 0→1→0 over [t0, t0+dur]. */
export function pulse(T: number, t0: number, dur: number): number {
  if (T < t0 || T > t0 + dur) return 0;
  const p = (T - t0) / dur;
  return 1 - Math.abs(p - 0.5) * 2;
}

/** Interpolate a scalar between two times with an easing. */
export function lerpAt(
  T: number,
  t0: number,
  t1: number,
  a: number,
  b: number,
  ease: EaseFn = easeInCubic
): number {
  const p = clamp((T - t0) / (t1 - t0), 0, 1);
  return a + (b - a) * ease(p);
}
