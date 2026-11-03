import {
  adminDb,
  AdminNotConfiguredError,
  createCustomToken,
  pairingSecret,
} from "@/lib/firebase-admin";
import { pairDocId, ticketMatches, verifyRequest } from "@/lib/pairing-server";
import { isPairCode, isTicket, requestState, type PhoneRequest } from "@/lib/pairing";

// Step 4 of phone linking: the phone polls with its private ticket. Once the
// teacher has allowed it on the computer, the request is deleted (so it can't
// be collected twice) and swapped for a Firebase custom token that signs the
// phone in to the same account.
export const runtime = "nodejs";

const MESSAGES = {
  denied: "The computer said no to this phone. Make a new code to try again.",
  expired: "The request timed out. Make a new code in the web app.",
  missing: "That link request isn't valid. Make a new code in the web app.",
} as const;

export async function POST(req: Request) {
  try {
    const { code, ticket } = (await req.json().catch(() => ({}))) as {
      code?: unknown;
      ticket?: unknown;
    };
    if (!isPairCode(code) || !isTicket(ticket)) {
      return Response.json({ error: "missing", message: MESSAGES.missing }, { status: 400 });
    }
    const docId = pairDocId(code);
    const ref = adminDb().collection("pairing_claims").doc(docId);
    const secret = pairingSecret();

    const result = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const request = snap.exists ? (snap.data() as PhoneRequest) : null;
      // Without the ticket this phone was given, reveal nothing.
      if (!request || !ticketMatches(request, ticket)) return { state: "missing" as const };
      const state = requestState(request, Date.now(), verifyRequest(request, docId, secret));
      if (state === "pending") return { state };
      tx.delete(ref);
      if (state === "allowed") return { state, uid: request.uid };
      return { state: state === "invalid" ? ("missing" as const) : state };
    });

    if (result.state === "pending") return Response.json({ state: "pending" }, { status: 202 });
    if (result.state === "allowed" && "uid" in result && result.uid) {
      const token = createCustomToken(result.uid, { linkedPhone: true });
      return Response.json({ state: "allowed", token });
    }
    const state = result.state as keyof typeof MESSAGES;
    return Response.json(
      { state, message: MESSAGES[state] ?? MESSAGES.missing },
      { status: state === "denied" ? 403 : 410 }
    );
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) {
      return Response.json(
        { state: "error", message: "Phone linking isn't set up on the server yet." },
        { status: 503 }
      );
    }
    console.error("pair/collect failed:", err);
    return Response.json({ state: "error", message: "Linking failed. Try again." }, { status: 500 });
  }
}
