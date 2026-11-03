import { describe, expect, it } from "vitest";
import {
  PAIR_TTL_MS,
  checkClaim,
  cleanDeviceName,
  codeFromQr,
  isPairCode,
  newPairCode,
  newPairing,
  pairingState,
  qrPayload,
} from "@/lib/pairing";

const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256);

describe("pair codes", () => {
  it("makes a url-safe code that round-trips through the QR text", () => {
    const code = newPairCode(bytes);
    expect(isPairCode(code)).toBe(true);
    expect(code).not.toMatch(/[+/=]/);
    expect(codeFromQr(qrPayload(code))).toBe(code);
  });

  it("ignores QR codes that aren't ours", () => {
    expect(codeFromQr("https://example.com")).toBeNull();
    expect(codeFromQr("classtrack-link:short")).toBeNull();
    expect(codeFromQr(null)).toBeNull();
  });
});

describe("checkClaim", () => {
  const t0 = 1_000_000;
  const p = newPairing("teacher", t0);

  it("accepts a fresh, unused code", () => {
    expect(checkClaim(p, t0 + 1000)).toBe("ok");
    expect(checkClaim(p, t0 + PAIR_TTL_MS)).toBe("ok");
  });

  it("refuses an expired code", () => {
    expect(checkClaim(p, t0 + PAIR_TTL_MS + 1)).toBe("expired");
  });

  it("refuses a code that was already used, even before it expires", () => {
    expect(checkClaim({ ...p, used: true }, t0 + 1000)).toBe("used");
  });

  it("refuses a code that doesn't exist", () => {
    expect(checkClaim(null, t0)).toBe("missing");
  });
});

describe("pairingState", () => {
  const t0 = 5_000;
  const p = newPairing("teacher", t0);
  it("goes waiting → linked, or waiting → expired", () => {
    expect(pairingState(p, t0 + 1)).toBe("waiting");
    expect(pairingState({ ...p, used: true }, t0 + PAIR_TTL_MS + 99)).toBe("linked");
    expect(pairingState(p, t0 + PAIR_TTL_MS + 1)).toBe("expired");
    expect(pairingState(null, t0)).toBe("expired");
  });
});

describe("cleanDeviceName", () => {
  it("keeps it short and printable", () => {
    expect(cleanDeviceName("Pixel 8 <script>")).toBe("Pixel 8 script");
    expect(cleanDeviceName("")).toBe("Phone");
    expect(cleanDeviceName(42)).toBe("Phone");
    expect(cleanDeviceName("x".repeat(80))).toHaveLength(40);
  });
});
