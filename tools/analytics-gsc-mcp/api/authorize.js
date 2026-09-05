// Authorization endpoint. Since this is a single-user personal server, the
// "login" is just the shared MCP_AUTH_TOKEN typed into a password field —
// same trust model as the old static bearer token, just moved into a proper
// OAuth code exchange so claude.ai's connector UI can drive it.
import { sign, verify, timingSafeEqualStr } from "./_lib/crypto.js";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderForm({ client_id, redirect_uri, state, code_challenge, code_challenge_method, resource, error }) {
  const hidden = (name, value) =>
    `<input type="hidden" name="${name}" value="${escapeHtml(value ?? "")}">`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Authorize analytics-gsc-mcp</title>
<style>
body{font-family:-apple-system,sans-serif;max-width:420px;margin:80px auto;padding:0 20px;color:#1a1d23}
h1{font-size:1.2rem}
input[type=password]{width:100%;padding:10px;font-size:1rem;box-sizing:border-box;margin:8px 0}
button{width:100%;padding:10px;font-size:1rem;background:#2456e8;color:#fff;border:none;border-radius:6px;cursor:pointer}
.error{color:#c0392b;font-size:0.9rem}
</style></head>
<body>
<h1>analytics-gsc-mcp 접속 승인</h1>
<p>이 앱이 GA4 / Search Console 데이터에 접근하도록 허용하려면 서버 비밀번호(MCP_AUTH_TOKEN)를 입력하세요.</p>
${error ? `<p class="error">비밀번호가 틀렸습니다.</p>` : ""}
<form method="POST">
${hidden("client_id", client_id)}
${hidden("redirect_uri", redirect_uri)}
${hidden("state", state)}
${hidden("code_challenge", code_challenge)}
${hidden("code_challenge_method", code_challenge_method)}
${hidden("resource", resource)}
<input type="password" name="password" placeholder="MCP_AUTH_TOKEN" autofocus required>
<button type="submit">허용</button>
</form>
</body></html>`;
}

export default async function handler(req, res) {
  const secret = process.env.MCP_AUTH_TOKEN;
  if (!secret) {
    res.status(500).send("server_not_configured");
    return;
  }

  const params = req.method === "POST" ? req.body || {} : req.query || {};
  const {
    client_id, redirect_uri, state, code_challenge, code_challenge_method, resource,
  } = params;

  if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== "S256") {
    res.status(400).send("invalid_request: missing client_id/redirect_uri/code_challenge(S256)");
    return;
  }

  const client = verify(client_id, secret);
  if (!client || !Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(redirect_uri)) {
    res.status(400).send("invalid_client: unknown client_id or redirect_uri mismatch");
    return;
  }
  let redirectUrl;
  try {
    redirectUrl = new URL(redirect_uri);
  } catch {
    res.status(400).send("invalid_request: malformed redirect_uri");
    return;
  }
  const isLocalhost = redirectUrl.hostname === "localhost" || redirectUrl.hostname === "127.0.0.1";
  if (redirectUrl.protocol !== "https:" && !isLocalhost) {
    res.status(400).send("invalid_request: redirect_uri must be https or localhost");
    return;
  }

  if (req.method === "GET") {
    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderForm({ client_id, redirect_uri, state, code_challenge, code_challenge_method, resource }));
    return;
  }

  if (req.method === "POST") {
    const { password } = params;
    if (!password || !timingSafeEqualStr(password, secret)) {
      res.status(401).setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderForm({ client_id, redirect_uri, state, code_challenge, code_challenge_method, resource, error: true }));
      return;
    }

    const origin = `https://${req.headers.host}`;
    const code = sign(
      {
        type: "code",
        client_id,
        redirect_uri,
        code_challenge,
        aud: resource || `${origin}/api/mcp`,
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      secret
    );

    const dest = new URL(redirect_uri);
    dest.searchParams.set("code", code);
    if (state) dest.searchParams.set("state", state);
    res.writeHead(302, { Location: dest.toString() });
    res.end();
    return;
  }

  res.status(405).send("method_not_allowed");
}
