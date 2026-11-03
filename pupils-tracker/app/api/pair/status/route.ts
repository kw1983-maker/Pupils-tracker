import {
  adminDb,
  AdminNotConfiguredError,
  pairingSecret,
  uidFromRequest,
} from "@/lib/firebase-admin";
import { isPairCode, checkClaim, linkDialogState, requestState } from "@/lib/pairing";
import type { Pairing, PhoneRequest } from "@/lib/pairing";
import { pairDocId, verifyPairing, verifyRequest } from "@/lib/pairing-server";

// Polled by the computer's "Link phone" dialog: has a phone scanned the code,
// and which phone? Only the teacher who made the code can ask about it.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const uid = await uidFromRequest(req);
    if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { code } = (await req.json().catch(() => ({}))) as { code?: unknown };
    if (!isPairCode(code)) return Response.json({ error: "bad-code" }, { status: 400 });

    const docId = pairDocId(code);
    const secret = pairingSecret();
    const [pairingSnap, requestSnap] = await Promise.all([
      adminDb().collection("pairings").doc(docId).get(),
      adminDb().collection("pairing_claims").doc(docId).get(),
    ]);
    const pairing = pairingSnap.exists ? (pairingSnap.data() as Pairing) : null;
    const request = requestSnap.exists ? (requestSnap.data() as PhoneRequest) : null;
    const owner = request?.uid ?? pairing?.uid;
    if (owner && owner !== uid) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const reqState = request
      ? requestState(request, now, verifyRequest(request, docId, secret))
      : null;
    const pairCheck = checkClaim(pairing, now, !!pairing && verifyPairing(pairing, docId, secret));
    return Response.json({
      state: linkDialogState(reqState, pairCheck),
      deviceName: reqState === "pending" ? request?.deviceName ?? null : null,
    });
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json({ error: "not-configured" }, { status: 503 });
    }
    console.error("pair/status failed:", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
