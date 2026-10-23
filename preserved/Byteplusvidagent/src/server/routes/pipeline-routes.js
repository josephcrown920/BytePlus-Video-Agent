// Pipeline API routes
import { CinematicPipeline } from "../../pipeline/cinematic-pipeline.js";

const pipeline = new CinematicPipeline({
  onProgress: (p) => console.log(`[pipeline] ${p.stage}: ${p.message}`),
});

export async function pipelineRoutes(ctx) {
  const { pathname, method, body, res } = ctx;

  // POST /api/pipeline/init
  if (pathname === "/init" && method === "POST") {
    try {
      const summary = await pipeline.init(body || {});
      sendOk(res, { ok: true, ...summary });
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // POST /api/pipeline/concept
  if (pathname === "/concept" && method === "POST") {
    if (!body.sceneId || !body.prompt) {
      return sendError(res, 400, "sceneId and prompt are required");
    }
    try {
      const result = await pipeline.generateConceptArt(body.sceneId, body.prompt, {
        character: body.character,
        seedreamVersion: body.version,
        seed: body.seed,
      });
      sendOk(res, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // POST /api/pipeline/character
  if (pathname === "/character" && method === "POST") {
    if (!body.name || !body.description) {
      return sendError(res, 400, "name and description are required");
    }
    try {
      const result = await pipeline.generateCharacterDesign(body.name, body.description, {
        seedreamVersion: body.version,
        seed: body.seed,
      });
      sendOk(res, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // POST /api/pipeline/storyboard
  if (pathname === "/storyboard" && method === "POST") {
    if (!body.sceneId || !body.shots || !Array.isArray(body.shots)) {
      return sendError(res, 400, "sceneId and shots array are required");
    }
    try {
      const result = await pipeline.generateStoryboard(body.sceneId, body.shots, {
        seedreamVersion: body.version,
        seed: body.seed,
      });
      sendOk(res, { ok: true, shots: result });
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // POST /api/pipeline/video
  if (pathname === "/video" && method === "POST") {
    if (!body.sceneId || !body.shotId || !body.prompt) {
      return sendError(res, 400, "sceneId, shotId, and prompt are required");
    }
    try {
      const result = await pipeline.generateVideo(body.sceneId, body.shotId, body.prompt, {
        version: body.version,
        ratio: body.ratio,
        duration: body.duration,
        resolution: body.resolution,
        firstFrame: body.firstFrame,
        lastFrame: body.lastFrame,
        referenceImages: body.referenceImages,
        generateAudio: body.generateAudio,
        character: body.character,
        preset: body.preset,
      });
      sendOk(res, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // POST /api/pipeline/scene
  if (pathname === "/scene" && method === "POST") {
    if (!body.sceneId) {
      return sendError(res, 400, "sceneId is required");
    }
    try {
      const result = await pipeline.runFullScenePipeline(body.sceneId, body);
      sendOk(res, { ok: true, ...result });
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // GET /api/pipeline/status
  if (pathname === "/status" && method === "GET") {
    const status = pipeline.getStatus();
    sendOk(res, { ok: true, ...status });
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
