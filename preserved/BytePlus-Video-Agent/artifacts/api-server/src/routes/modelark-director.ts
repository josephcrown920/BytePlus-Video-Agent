import { Router } from "express";

const router = Router();

router.post("/modelark-director", async (req, res) => {
  const token = process.env.AURORA_MCP_TOKEN?.trim();
  const auth = req.header("authorization") || "";
  if (!token) return res.status(503).json({ error: "AURORA_MCP_TOKEN is not configured" });
  if (auth !== `Bearer ${token}`) return res.status(401).json({ error: "Unauthorized" });
  const instruction = req.body?.instruction;
  if (typeof instruction !== "string" || !instruction.trim()) return res.status(400).json({ error: "instruction is required" });
  const url = process.env.AURORA_MCP_URL?.trim();
  if (!url) return res.status(503).json({ error: "AURORA_MCP_URL is not configured" });
  try {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const init = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "aurora-agent-bridge", version: "1.0.0" } } }) });
    if (!init.ok) throw new Error(`Aurora MCP initialize failed: ${init.status}`);
    const result = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "aurora_modelark_director", arguments: { instruction: instruction.trim(), context: req.body?.context } } }) });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(payload?.error?.message || `Aurora MCP director failed: ${result.status}`);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
