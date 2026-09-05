// Token endpoint. Access tokens are long-lived (90 days) since this is a
// personal single-user server with no refresh_token flow implemented —
// a deliberate simplification, not a spec requirement.
import { sign, verify, sha256base64url } from "./_lib/crypto.js";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const secret = process.env.MCP_AUTH_TOKEN;
  if (!secret) {
    res.status(500).json({ error: "server_not_configured" });
    return;
  }

  const body = req.body || {};
  if (body.grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  const { code, code_verifier, redirect_uri, client_id } = body;
  const decoded = verify(code, secret);
  if (!decoded || decoded.type !== "code") {
    res.status(400).json({ error: "invalid_grant", error_description: "invalid or expired code" });
    return;
  }
  if (decoded.client_id !== client_id || decoded.redirect_uri !== redirect_uri) {
    res.status(400).json({ error: "invalid_grant", error_description: "client_id/redirect_uri mismatch" });
    return;
  }
  if (!code_verifier || sha256base64url(code_verifier) !== decoded.code_challenge) {
    res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    return;
  }

  const accessToken = sign(
    {
      type: "access",
      client_id,
      aud: decoded.aud,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    },
    secret
  );

  res.status(200).json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  });
}
