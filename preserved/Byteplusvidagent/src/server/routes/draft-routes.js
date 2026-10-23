// Drafts API routes
import { DraftManager } from "../../drafts/draft-manager.js";

const drafts = new DraftManager("drafts");

export async function draftRoutes(ctx) {
  const { pathname, method, body, query, res } = ctx;

  // GET /api/drafts
  if ((pathname === "/" || pathname === "") && method === "GET") {
    const list = drafts.list({ type: query.type, status: query.status });
    sendOk(res, { ok: true, count: list.length, drafts: list });
    return true;
  }

  // POST /api/drafts
  if ((pathname === "/" || pathname === "") && method === "POST") {
    if (!body.type) return sendError(res, 400, "type is required (image, video, pipeline, scene)");
    const draft = drafts.create(body.type, body.data || {});
    sendOk(res, { ok: true, draft });
    return true;
  }

  // GET /api/drafts/:id
  if (pathname.startsWith("/") && pathname !== "/" && pathname !== "" && method === "GET") {
    const id = decodeURIComponent(pathname.slice(1));
    if (id.includes("/")) return false; // Nested route, not handled here
    const draft = drafts.get(id);
    if (!draft) return sendError(res, 404, "Draft not found");
    sendOk(res, { ok: true, draft });
    return true;
  }

  // PUT /api/drafts/:id
  if (pathname.startsWith("/") && pathname !== "/" && pathname !== "" && method === "PUT") {
    const id = decodeURIComponent(pathname.slice(1));
    if (id.includes("/")) return false;
    const updated = drafts.update(id, body.data || {});
    if (!updated) return sendError(res, 404, "Draft not found");
    sendOk(res, { ok: true, draft: updated });
    return true;
  }

  // DELETE /api/drafts/:id
  if (pathname.startsWith("/") && pathname !== "/" && pathname !== "" && method === "DELETE") {
    const id = decodeURIComponent(pathname.slice(1));
    if (id.includes("/")) return false;
    const deleted = drafts.delete(id);
    sendOk(res, { ok: deleted });
    return true;
  }

  // POST /api/drafts/:id/duplicate
  if (pathname.endsWith("/duplicate") && method === "POST") {
    const id = decodeURIComponent(pathname.replace("/duplicate", "").slice(1));
    const copy = drafts.duplicate(id);
    if (!copy) return sendError(res, 404, "Draft not found");
    sendOk(res, { ok: true, draft: copy });
    return true;
  }

  // POST /api/drafts/:id/submit  (mark as submitted for generation)
  if (pathname.endsWith("/submit") && method === "POST") {
    const id = decodeURIComponent(pathname.replace("/submit", "").slice(1));
    const updated = drafts.setStatus(id, "submitted", body || {});
    if (!updated) return sendError(res, 404, "Draft not found");
    sendOk(res, { ok: true, draft: updated });
    return true;
  }

  return false;
}

function sendOk(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, code, message) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: message }, null, 2));
}
