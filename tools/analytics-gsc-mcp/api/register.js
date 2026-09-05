// Dynamic Client Registration (RFC 7591), stateless: the returned client_id
// is itself a signed token embedding the registered redirect_uris, so later
// requests can validate it without a database.
import { sign } from "./_lib/crypto.js";

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
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0) {
    res.status(400).json({ error: "invalid_client_metadata", error_description: "redirect_uris is required" });
    return;
  }

  const clientName = typeof body.client_name === "string" ? body.client_name : "mcp-client";
  const clientId = sign({ redirect_uris: redirectUris, client_name: clientName }, secret);

  res.status(201).json({
    client_id: clientId,
    redirect_uris: redirectUris,
    client_name: clientName,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
}
