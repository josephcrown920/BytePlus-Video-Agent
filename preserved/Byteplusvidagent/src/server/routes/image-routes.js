// Image generation API routes
import { SeedreamClient } from "../../core/seedream-client.js";

const client = new SeedreamClient();

export async function imageRoutes(ctx) {
  const { pathname, method, body, query, res } = ctx;

  // GET /api/image/presets
  if (pathname === "/presets" && method === "GET") {
    sendOk(res, {
      versions: ["4.0", "4.5", "5.0"],
      sizes: ["2K"],
      formats: ["url", "b64_json"],
      outputFormats: { "5.0": ["png", "jpeg"] },
      maxSeriesImages: 15,
    });
    return true;
  }

  // POST /api/image/generate
  if (pathname === "/generate" && method === "POST") {
    if (!body.prompt) return sendError(res, 400, "prompt is required");

    // Dry-run if not confirmed
    if (!body.confirmed) {
      const dry = client.dryRun({
        prompt: body.prompt,
        version: body.version,
        size: body.size,
      });
      sendOk(res, { ...dry, note: "Dry run only. Set confirmed: true to generate (charges may apply)." });
      return true;
    }

    try {
      const result = await client.generateImage(body.prompt, {
        version: body.version,
        size: body.size,
        seed: body.seed,
        images: body.images,
        outputFormat: body.outputFormat,
      });
      sendOk(res, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
    return true;
  }

  // POST /api/image/series
  if (pathname === "/series" && method === "POST") {
    if (!body.prompt) return sendError(res, 400, "prompt is required");
    const count = body.count || 3;

    if (!body.confirmed) {
      const dry = client.dryRun({
        prompt: body.prompt,
        version: body.version,
        sequential: "auto",
      });
      sendOk(res, { ...dry, count, note: "Dry run only. Set confirmed: true to generate (charges may apply)." });
      return true;
    }

    try {
      const result = await client.generateSeries(body.prompt, count, {
        version: body.version,
        size: body.size,
        seed: body.seed,
      });
      sendOk(res, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
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
