export async function directorRoutes(ctx) {
  const { pathname, method, body, res, req } = ctx;
  if (pathname !== "/" || method !== "POST") return false;

  const token = process.env.AURORA_MCP_TOKEN?.trim();
  const auth = req.headers.authorization || "";
  if (!token) return sendError(res, 503, "AURORA_MCP_TOKEN is not configured");
  if (auth !== `Bearer ${token}`) return sendError(res, 401, "Unauthorized");
  if (typeof body?.instruction !== "string" || !body.instruction.trim()) {
    return sendError(res, 400, "instruction is required");
  }

  const url = process.env.AURORA_MCP_URL?.trim();
  if (!url) return sendError(res, 503, "AURORA_MCP_URL is not configured");

  try {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const init = await fetch(url, {
      method: "POST", headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "byteplus-video-agent", version: "1.0.0" } } }),
    });
    if (!init.ok) throw new Error(`Aurora MCP initialize failed: ${init.status}`);
    const result = await fetch(url, {
      method: "POST", headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "aurora_modelark_director", arguments: { instruction: body.instruction.trim(), context: body.context } } }),
    });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(payload?.error?.message || `Aurora MCP director failed: ${result.status}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return true;
  } catch (error) {
    return sendError(res, 502, error instanceof Error ? error.message : String(error));
  }
}

function sendError(res, code, message) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: message }));
}
