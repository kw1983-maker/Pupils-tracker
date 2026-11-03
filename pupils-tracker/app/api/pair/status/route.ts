import { adminDb, AdminNotConfiguredError, uidFromRequest } from "@/lib/firebase-admin";
import { isPairCode, pairingState, type Pairing } from "@/lib/pairing";
import { pairDocId } from "@/lib/pairing-server";

// Polled by the web app's "Link phone" dialog to learn when the phone has
// used the code. Only the teacher who created the code can ask about it.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const uid = await uidFromRequest(req);
    if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { code } = (await req.json().catch(() => ({}))) as { code?: unknown };
    if (!isPairCode(code)) return Response.json({ error: "bad-code" }, { status: 400 });

    const docId = pairDocId(code);
    const [snap, receipt] = await Promise.all([
      adminDb().collection("pairings").doc(docId).get(),
      adminDb().collection("pairing_claims").doc(docId).get(),
    ]);
    const claimed = receipt.exists
      ? (receipt.data() as { uid?: string; deviceName?: string })
      : null;
    const pairing = snap.exists ? (snap.data() as Pairing) : null;
    const owner = claimed?.uid ?? pairing?.uid;
    if (owner && owner !== uid) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (claimed) {
      return Response.json({ state: "linked", deviceName: claimed.deviceName ?? null });
    }
    return Response.json({ state: pairingState(pairing, Date.now()), deviceName: null });
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json({ error: "not-configured" }, { status: 503 });
    }
    console.error("pair/status failed:", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
