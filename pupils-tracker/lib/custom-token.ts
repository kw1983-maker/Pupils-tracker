import { createSign } from "node:crypto";

/**
 * Firebase custom sign-in tokens, made with Node's own crypto.
 *
 * firebase-admin/auth can't be used on Vercel: its jwks-rsa dependency
 * require()s the ESM-only `jose`, which Vercel's runtime refuses
 * (ERR_REQUIRE_ESM). A custom token is just an RS256 JWT signed with the
 * service account's private key, in the documented shape:
 * https://firebase.google.com/docs/auth/admin/create-custom-tokens#create_custom_tokens_using_a_third-party_jwt_library
 */

const AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signCustomToken(
  account: ServiceAccountKey,
  uid: string,
  claims: Record<string, unknown> = {},
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  if (!uid || uid.length > 128) throw new Error("bad-uid");
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: account.client_email,
    sub: account.client_email,
    aud: AUDIENCE,
    iat: nowSeconds,
    exp: nowSeconds + 3600, // Firebase's maximum: one hour
    uid,
    claims,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key);
  return `${unsigned}.${base64url(signature)}`;
}
