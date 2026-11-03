import {
  adminDb,
  AdminNotConfiguredError,
  pairingSecret,
  uidFromRequest,
} from "@/lib/firebase-admin";
import { pairDocId, signDecision, verifyRequest } from "@/lib/pairing-server";
import { isPairCode, requestState, type PhoneRequest } from "@/lib/pairing";

// Step 3 of phone linking: on the computer, the teacher (signed in, and the
// owner of the code) taps Allow or Not me for the phone that scanned.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const uid = await uidFromRequest(req);
    if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { code, allow } = (await req.json().catch(() => ({}))) as {
      code?: unknown;
      allow?: unknown;
    };
    if (!isPairCode(code) || typeof allow !== "boolean") {
      return Response.json({ error: "bad-request" }, { status: 400 });
    }
    const docId = pairDocId(code);
    const ref = adminDb().collection("pairing_claims").doc(docId);
    const secret = pairingSecret();
    const decision = allow ? ("allow" as const) : ("deny" as const);

    const outcome = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const request = snap.exists ? (snap.data() as PhoneRequest) : null;
      if (!request) return "missing" as const;
      if (request.uid !== uid) return "forbidden" as const;
      const state = requestState(request, Date.now(), verifyRequest(request, docId, secret));
      if (state !== "pending") return state;
      tx.update(ref, {
        decision,
        decisionSig: signDecision(request, decision, docId, secret),
      });
      return allow ? ("allowed" as const) : ("denied" as const);
    });

    if (outcome === "forbidden") return Response.json({ error: "forbidden" }, { status: 403 });
    if (outcome === "allowed" || outcome === "denied") return Response.json({ state: outcome });
    return Response.json({ error: outcome, state: "expired" }, { status: 410 });
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json({ error: "not-configured" }, { status: 503 });
    }
    console.error("pair/decide failed:", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
