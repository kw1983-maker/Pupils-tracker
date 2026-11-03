import {
  adminAuth,
  adminDb,
  AdminNotConfiguredError,
  pairingSecret,
} from "@/lib/firebase-admin";
import { pairDocId, verifyPairing } from "@/lib/pairing-server";
import { checkClaim, cleanDeviceName, isPairCode, type Pairing } from "@/lib/pairing";

// The phone sends the code it scanned; if it is fresh and unused it is spent
// (atomically, so two phones can't both use it) and swapped for a Firebase
// custom token that signs the phone in to the same account.
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
    const ref = adminDb().collection("pairings").doc(docId);
    // A used code is deleted, leaving only this receipt (for the web app's
    // "Phone linked" message) — so there's no "used" flag anyone could reset.
    const receiptRef = adminDb().collection("pairing_claims").doc(docId);
    const secret = pairingSecret();
    const deviceName = cleanDeviceName(body.deviceName);

    const result = await adminDb().runTransaction(async (tx) => {
      const [snap, receipt] = await Promise.all([tx.get(ref), tx.get(receiptRef)]);
      if (receipt.exists) return { check: "used" as const, uid: null };
      const pairing = snap.exists ? (snap.data() as Pairing) : null;
      const signed = !!pairing && verifyPairing(pairing, docId, secret);
      const check = checkClaim(pairing, Date.now(), signed);
      if (check !== "ok" || !pairing) return { check, uid: null };
      tx.delete(ref);
      tx.set(receiptRef, { uid: pairing.uid, deviceName, usedAt: Date.now() });
      return { check, uid: pairing.uid };
    });

    if (result.check !== "ok" || !result.uid) {
      const check = result.check === "ok" ? "missing" : result.check;
      return Response.json({ error: check, message: MESSAGES[check] }, { status: 410 });
    }
    const token = await adminAuth().createCustomToken(result.uid, { linkedPhone: true });
    return Response.json({ token });
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
