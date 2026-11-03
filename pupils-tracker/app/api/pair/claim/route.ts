import { randomBytes } from "node:crypto";
import { adminDb, AdminNotConfiguredError, pairingSecret } from "@/lib/firebase-admin";
import { pairDocId, signRequest, ticketHash, verifyPairing } from "@/lib/pairing-server";
import {
  checkClaim,
  cleanDeviceName,
  isPairCode,
  newTicket,
  type Pairing,
  type PhoneRequest,
} from "@/lib/pairing";

// Step 2 of phone linking: the phone sends the code it scanned. If the code
// is fresh it is spent (atomically — deleted, so it can't be used twice) and
// turned into a request that the teacher must allow on the computer. The
// phone gets a private ticket to collect its sign-in once allowed
// (/api/pair/collect). No sign-in token is handed out here.
export const runtime = "nodejs";

const MESSAGES = {
  missing: "That code isn't valid. Make a new one in the web app.",
  expired: "That code has expired. Make a new one in the web app.",
  used: "That code was already used. Make a new one in the web app.",
} as const;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      code?: unknown;
      deviceName?: unknown;
    };
    if (!isPairCode(body.code)) {
      return Response.json({ error: "missing", message: MESSAGES.missing }, { status: 400 });
    }
    const docId = pairDocId(body.code);
    const pairingRef = adminDb().collection("pairings").doc(docId);
    const requestRef = adminDb().collection("pairing_claims").doc(docId);
    const secret = pairingSecret();
    const deviceName = cleanDeviceName(body.deviceName);
    const ticket = newTicket((n) => new Uint8Array(randomBytes(n)));

    const check = await adminDb().runTransaction(async (tx) => {
      const [snap, existing] = await Promise.all([tx.get(pairingRef), tx.get(requestRef)]);
      if (existing.exists) return "used" as const;
      const pairing = snap.exists ? (snap.data() as Pairing) : null;
      const result = checkClaim(pairing, Date.now(), !!pairing && verifyPairing(pairing, docId, secret));
      if (result !== "ok" || !pairing) return result;
      const core = {
        uid: pairing.uid,
        deviceName,
        requestedAt: Date.now(),
        ticketHash: ticketHash(ticket),
      };
      const request: PhoneRequest = { ...core, sig: signRequest(core, docId, secret) };
      tx.delete(pairingRef);
      tx.set(requestRef, request);
      return "ok" as const;
    });

    if (check !== "ok") {
      return Response.json({ error: check, message: MESSAGES[check] }, { status: 410 });
    }
    return Response.json({ ticket }, { status: 202 });
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json(
        { error: "not-configured", message: "Phone linking isn't set up on the server yet." },
        { status: 503 }
      );
    }
    console.error("pair/claim failed:", err);
    return Response.json({ error: "failed", message: "Linking failed. Try again." }, { status: 500 });
  }
}
