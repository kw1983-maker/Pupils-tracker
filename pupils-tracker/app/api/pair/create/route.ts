import { randomBytes } from "node:crypto";
import { adminDb, AdminNotConfiguredError, uidFromRequest } from "@/lib/firebase-admin";
import { newPairCode, newPairing, qrPayload } from "@/lib/pairing";

// "Link phone" in the web app: the signed-in teacher asks for a one-time,
// two-minute code that their phone scans as a QR code.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const uid = await uidFromRequest(req);
    if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

    const code = newPairCode((n) => new Uint8Array(randomBytes(n)));
    const pairing = newPairing(uid, Date.now());
    await adminDb().collection("pairings").doc(code).set(pairing);
    return Response.json({ code, qr: qrPayload(code), expiresAt: pairing.expiresAt });
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json({ error: "not-configured" }, { status: 503 });
    }
    console.error("pair/create failed:", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
