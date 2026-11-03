import { describe, expect, it } from "vitest";
import {
  APPROVE_TTL_MS,
  COLLECT_TTL_MS,
  PAIR_TTL_MS,
  checkClaim,
  cleanDeviceName,
  codeFromQr,
  isPairCode,
  linkDialogState,
  matchCode,
  newPairCode,
  newPairing,
  qrPayload,
  requestState,
  type PhoneRequest,
} from "@/lib/pairing";
import {
  pairDocId,
  signDecision,
  signPairing,
  signRequest,
  ticketHash,
  ticketMatches,
  verifyPairing,
  verifyRequest,
} from "@/lib/pairing-server";

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

describe("Allow this phone?", () => {
  const secret = Buffer.from("test-secret");
  const docId = pairDocId(newPairCode(bytes));
  const ticket = "T".repeat(43);
  const t0 = 50_000;
  const core = { uid: "teacher", deviceName: "Pixel 8", requestedAt: t0, ticketHash: ticketHash(ticket) };
  const request: PhoneRequest = { ...core, sig: signRequest(core, docId, secret) };
  const decided = (d: "allow" | "deny"): PhoneRequest => ({
    ...request,
    decision: d,
    decisionSig: signDecision(core, d, docId, secret),
  });
  const state = (r: PhoneRequest, now: number) =>
    requestState(r, now, verifyRequest(r, docId, secret));

  it("waits for the teacher, then times out", () => {
    expect(state(request, t0 + 1000)).toBe("pending");
    expect(state(request, t0 + APPROVE_TTL_MS + 1)).toBe("expired");
  });

  it("lets the phone in only after Allow", () => {
    expect(state(decided("allow"), t0 + 1000)).toBe("allowed");
    expect(state(decided("deny"), t0 + 1000)).toBe("denied");
    expect(state(decided("allow"), t0 + COLLECT_TTL_MS + 1)).toBe("expired");
  });

  it("refuses a decision or request not signed by the server", () => {
    // Someone flipping the stored decision themselves.
    expect(state({ ...request, decision: "allow" }, t0 + 1000)).toBe("invalid");
    expect(state({ ...decided("deny"), decision: "allow" }, t0 + 1000)).toBe("invalid");
    // Someone pointing a request at another account or their own ticket.
    expect(state({ ...request, uid: "victim" }, t0 + 1000)).toBe("invalid");
    expect(state({ ...request, ticketHash: ticketHash("mine") }, t0 + 1000)).toBe("invalid");
    expect(state({ ...request, requestedAt: t0 + 10_000 }, t0 + 1000)).toBe("invalid");
  });

  it("only hands the sign-in to the phone holding the ticket", () => {
    expect(ticketMatches(request, ticket)).toBe(true);
    expect(ticketMatches(request, "U".repeat(43))).toBe(false);
  });

  it("maps to what the computer's dialog shows", () => {
    expect(linkDialogState(null, "ok")).toBe("waiting");
    expect(linkDialogState(null, "expired")).toBe("expired");
    expect(linkDialogState("pending", "missing")).toBe("requested");
    expect(linkDialogState("allowed", "missing")).toBe("linked");
    expect(linkDialogState("denied", "missing")).toBe("denied");
    expect(linkDialogState("invalid", "missing")).toBe("expired");
  });
});

describe("matchCode", () => {
  it("is four digits, the same on phone and computer for one ticket", () => {
    const h = ticketHash("T".repeat(43));
    expect(matchCode(h)).toMatch(/^[0-9]{4}$/);
    expect(matchCode(h)).toBe(matchCode(ticketHash("T".repeat(43))));
    expect(matchCode("0000000f")).toBe("0015");
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
