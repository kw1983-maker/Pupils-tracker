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

    const snap = await adminDb().collection("pairings").doc(pairDocId(code)).get();
    const pairing = snap.exists ? (snap.data() as Pairing) : null;
    if (pairing && pairing.uid !== uid) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    return Response.json({
      state: pairingState(pairing, Date.now()),
      deviceName: pairing?.deviceName ?? null,
    });
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json({ error: "not-configured" }, { status: 503 });
    }
    console.error("pair/status failed:", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
