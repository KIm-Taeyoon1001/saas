// Stateless signed-token helpers. Vercel functions don't share memory or a
// database between invocations, so authorization codes, access tokens, and
// even OAuth "registered" client_ids are all self-contained, HMAC-signed
// JSON blobs verified with MCP_AUTH_TOKEN as the signing key — nothing is
// persisted server-side.
import crypto from "node:crypto";

export function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify(token, secret) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig || "", "base64url");
  const b = Buffer.from(expectedSig, "base64url");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

export function sha256base64url(input) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
