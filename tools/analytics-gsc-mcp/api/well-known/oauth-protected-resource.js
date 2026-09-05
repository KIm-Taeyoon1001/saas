export default function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  res.status(200).json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
  });
}
