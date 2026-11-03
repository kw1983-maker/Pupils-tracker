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
import { pairDocId, signPairing, verifyPairing } from "@/lib/pairing-server";

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

  it("accepts a fresh, unused, signed code", () => {
    expect(checkClaim(p, t0 + 1000, true)).toBe("ok");
    expect(checkClaim(p, t0 + PAIR_TTL_MS, true)).toBe("ok");
  });

  it("refuses an expired code", () => {
    expect(checkClaim(p, t0 + PAIR_TTL_MS + 1, true)).toBe("expired");
  });

  it("refuses a code that was already used, even before it expires", () => {
    expect(checkClaim({ ...p, used: true }, t0 + 1000, true)).toBe("used");
  });

  it("refuses a code that doesn't exist", () => {
    expect(checkClaim(null, t0, true)).toBe("missing");
  });

  it("refuses an unsigned or forged pairing", () => {
    expect(checkClaim(p, t0 + 1000, false)).toBe("missing");
  });

  it("refuses a pairing that claims a longer life than allowed", () => {
    expect(checkClaim({ ...p, expiresAt: t0 + PAIR_TTL_MS * 100 }, t0 + 1000, true)).toBe(
      "missing"
    );
    expect(checkClaim({ ...p, createdAt: t0 + 5000 }, t0 + 1000, true)).toBe("missing");
  });
});

describe("server signing", () => {
  const secret = Buffer.from("test-secret");
  const code = newPairCode(bytes);
  const docId = pairDocId(code);
  const base = newPairing("teacher", 1_000);
  const signed = { ...base, sig: signPairing(base, docId, secret) };

  it("stores codes under a hash, never the code itself", () => {
    expect(docId).toMatch(/^[0-9a-f]{64}$/);
    expect(docId).not.toContain(code);
  });

  it("verifies its own signature", () => {
    expect(verifyPairing(signed, docId, secret)).toBe(true);
  });

  it("rejects a changed uid, a missing signature, or another secret", () => {
    expect(verifyPairing({ ...signed, uid: "attacker-target" }, docId, secret)).toBe(false);
    expect(verifyPairing(base, docId, secret)).toBe(false);
    expect(verifyPairing(signed, docId, Buffer.from("other"))).toBe(false);
    expect(verifyPairing(signed, pairDocId("another-code"), secret)).toBe(false);
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
