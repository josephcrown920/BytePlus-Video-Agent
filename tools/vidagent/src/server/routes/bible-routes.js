// Production Bible API routes
import { ProductionBible } from "../../bible/production-bible.js";

const bible = new ProductionBible();
bible.load();

export async function bibleRoutes(ctx) {
  const { pathname, method, body, res, query } = ctx;

  // GET /api/bible
  if (pathname === "/" || pathname === "") {
    if (method === "GET") {
      const summary = bible.exportSummary();
      sendOk(res, { ok: true, ...summary });
      return true;
    }
  }

  // Characters
  // GET /api/bible/characters
  if (pathname === "/characters" && method === "GET") {
    sendOk(res, { ok: true, characters: bible.characters });
    return true;
  }

  // POST /api/bible/characters
  if (pathname === "/characters" && method === "POST") {
    if (!body.name) return sendError(res, 400, "name is required");
    bible.addCharacter(body.name, body.details || {});
    bible.save();
    sendOk(res, { ok: true, character: bible.getCharacter(body.name) });
    return true;
  }

  // GET /api/bible/characters/:name
  if (pathname.startsWith("/characters/") && method === "GET") {
    const name = decodeURIComponent(pathname.replace("/characters/", ""));
    const char = bible.getCharacter(name);
    if (!char) return sendError(res, 404, "Character not found");
    sendOk(res, { ok: true, character: char });
    return true;
  }

  // Style
  // GET /api/bible/style
  if (pathname === "/style" && method === "GET") {
    sendOk(res, { ok: true, style: bible.style });
    return true;
  }

  // POST /api/bible/style
  if (pathname === "/style" && method === "POST") {
    bible.setStyle(body);
    bible.save();
    sendOk(res, { ok: true, style: bible.style });
    return true;
  }

  // Scenes
  // GET /api/bible/scenes
  if (pathname === "/scenes" && method === "GET") {
    sendOk(res, { ok: true, scenes: bible.scenes });
    return true;
  }

  // POST /api/bible/scenes
  if (pathname === "/scenes" && method === "POST") {
    if (!body.sceneId) return sendError(res, 400, "sceneId is required");
    bible.addScene(body.sceneId, body.details || {});
    bible.save();
    sendOk(res, { ok: true, scene: bible.getScene(body.sceneId) });
    return true;
  }

  // Narrative
  // GET /api/bible/narrative
  if (pathname === "/narrative" && method === "GET") {
    sendOk(res, { ok: true, narrative: bible.narrative });
    return true;
  }

  // POST /api/bible/narrative
  if (pathname === "/narrative" && method === "POST") {
    bible.setNarrative(body);
    bible.save();
    sendOk(res, { ok: true, narrative: bible.narrative });
    return true;
  }

  // References
  // GET /api/bible/references
  if (pathname === "/references" && method === "GET") {
    const refs = bible.listReferences(query.type);
    sendOk(res, { ok: true, references: refs, count: refs.length });
    return true;
  }

  // Continuity check
  // POST /api/bible/check
  if (pathname === "/check" && method === "POST") {
    if (!body.text) return sendError(res, 400, "text is required");
    const result = bible.checkContinuity(body.assetType || "text", body.text);
    sendOk(res, { ok: true, ...result });
    return true;
  }

  // Build prompt
  // POST /api/bible/build-prompt
  if (pathname === "/build-prompt" && method === "POST") {
    if (!body.prompt) return sendError(res, 400, "prompt is required");
    const enhanced = bible.buildPrompt(body.prompt, {
      includeStyle: body.includeStyle !== false,
      character: body.character,
    });
    sendOk(res, { ok: true, prompt: enhanced, original: body.prompt });
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
