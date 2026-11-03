import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signCustomToken } from "@/lib/custom-token";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account = {
  client_email: "firebase-adminsdk@example.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

const decode = (part: string) =>
  JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));

describe("signCustomToken", () => {
  const token = signCustomToken(account, "teacher-uid", { linkedPhone: true }, 1_000_000);
  const [h, p, s] = token.split(".");

  it("is an RS256 JWT in Firebase's custom-token shape", () => {
    expect(decode(h)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(p)).toEqual({
      iss: account.client_email,
      sub: account.client_email,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: 1_000_000,
      exp: 1_003_600,
      uid: "teacher-uid",
      claims: { linkedPhone: true },
    });
  });

  it("is signed with the service account's key", () => {
    const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, sig);
    expect(ok).toBe(true);
  });

  it("refuses an empty or oversized uid", () => {
    expect(() => signCustomToken(account, "")).toThrow();
    expect(() => signCustomToken(account, "x".repeat(129))).toThrow();
  });
});
