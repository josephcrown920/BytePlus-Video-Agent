// Video generation API routes
import { SeedanceClient } from "../../core/seedance-client.js";
import { CINEMATIC_PRESETS, SUPPORTED_RATIOS, SUPPORTED_RESOLUTIONS } from "../../core/config.js";

const client = new SeedanceClient();
const activeTasks = new Map(); // task_id -> status cache

export async function videoRoutes(ctx) {
  const { pathname, method, body, query, res } = ctx;

  // GET /api/video/presets
  if (pathname === "/presets" && method === "GET") {
    sendOk(res, {
      presets: CINEMATIC_PRESETS,
      versions: ["1.5-pro", "2.0", "2.0-fast"],
      ratios: SUPPORTED_RATIOS,
      resolutions: SUPPORTED_RESOLUTIONS,
    });
    return true;
  }

  // POST /api/video/generate
  if (pathname === "/generate" && method === "POST") {
    if (!body.prompt) return sendError(res, 400, "prompt is required");

    // Apply preset
    const opts = { ...body };
    if (body.preset && CINEMATIC_PRESETS[body.preset]) {
      const preset = CINEMATIC_PRESETS[body.preset];
      if (!opts.version) opts.version = preset.version;
      if (!opts.ratio) opts.ratio = preset.ratio;
      if (!opts.duration) opts.duration = preset.duration;
      if (!opts.resolution) opts.resolution = preset.resolution;
    }

    // Dry-run if not confirmed
    if (!body.confirmed) {
      const dry = client.dryRun({
        prompt: body.prompt,
        version: opts.version,
        ratio: opts.ratio,
        duration: opts.duration,
        resolution: opts.resolution,
      });
      sendOk(res, { ...dry, note: "Dry run only. Set confirmed: true to generate (charges may apply)." });
      return true;
    }

    try {
      if (body.noWait) {
        // Submit only, return task ID
        const result = await client.submit({
          prompt: body.prompt,
          version: opts.version,
          ratio: opts.ratio,
          duration: opts.duration,
          resolution: opts.resolution,
          firstFrame: opts.firstFrame,
          lastFrame: opts.lastFrame,
          referenceImages: opts.referenceImages,
          generateAudio: opts.generateAudio,
          seed: opts.seed,
        });
        if (result.task_id) activeTasks.set(result.task_id, { status: "submitted", createdAt: Date.now() });
        sendOk(res, result);
      } else {
        // Submit and wait
        const result = await client.generate({
          prompt: body.prompt,
          version: opts.version,
          ratio: opts.ratio,
          duration: opts.duration,
          resolution: opts.resolution,
          firstFrame: opts.firstFrame,
          lastFrame: opts.lastFrame,
          referenceImages: opts.referenceImages,
          generateAudio: opts.generateAudio,
          seed: opts.seed,
          pollInterval: opts.pollInterval,
          maxWait: opts.maxWait,
        });
        if (result.task_id) activeTasks.set(result.task_id, { status: result.status, updatedAt: Date.now() });
        sendOk(res, result);
      }
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // GET /api/video/tasks/:id
  if (pathname.startsWith("/tasks/") && method === "GET") {
    const taskId = pathname.replace("/tasks/", "");
    if (!taskId) return sendError(res, 400, "task id is required");

    try {
      const result = await client.poll(taskId, { maxWait: query.maxWait ? Number(query.maxWait) : 2 });
      activeTasks.set(taskId, { status: result.status, updatedAt: Date.now() });
      sendOk(res, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // GET /api/video/tasks
  if (pathname === "/tasks" && method === "GET") {
    const tasks = [];
    for (const [id, info] of activeTasks.entries()) {
      tasks.push({ task_id: id, ...info });
    }
    sendOk(res, { ok: true, tasks });
    return true;
  }

  // POST /api/video/multishot
  if (pathname === "/multishot" && method === "POST") {
    if (!body.shots || !Array.isArray(body.shots) || body.shots.length === 0) {
      return sendError(res, 400, "shots array is required");
    }
    if (!body.confirmed) {
      return sendOk(res, {
        ok: true,
        dry_run: true,
        shotCount: body.shots.length,
        note: "Dry run only. Set confirmed: true to generate (charges may apply per shot).",
      });
    }

    // Submit all shots in parallel (non-waiting)
    const results = [];
    for (let i = 0; i < body.shots.length; i++) {
      const shot = body.shots[i];
      try {
        const result = await client.submit({
          prompt: shot.prompt,
          version: body.version || shot.version,
          ratio: body.ratio || shot.ratio || "16:9",
          duration: body.duration || shot.duration || 5,
          resolution: body.resolution || shot.resolution || "1080p",
          firstFrame: shot.firstFrame,
          referenceImages: shot.referenceImages,
          generateAudio: body.generateAudio,
          seed: shot.seed,
        });
        results.push({
          shotIndex: i,
          shotId: shot.id || `shot-${i}`,
          ...result,
        });
        if (result.task_id) activeTasks.set(result.task_id, { status: "submitted", shotIndex: i, createdAt: Date.now() });
      } catch (e) {
        results.push({ shotIndex: i, shotId: shot.id || `shot-${i}`, ok: false, error: e.message });
      }
    }

    sendOk(res, {
      ok: true,
      totalShots: body.shots.length,
      submitted: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
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
