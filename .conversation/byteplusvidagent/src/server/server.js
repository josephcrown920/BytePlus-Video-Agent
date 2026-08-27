// REST API server for BytePlus Video Agent
// Uses native Node.js HTTP (no dependencies)

import http from "http";
import { URL } from "url";
import { imageRoutes } from "./routes/image-routes.js";
import { videoRoutes } from "./routes/video-routes.js";
import { pipelineRoutes } from "./routes/pipeline-routes.js";
import { bibleRoutes } from "./routes/bible-routes.js";
import { draftRoutes } from "./routes/draft-routes.js";
import { serveStatic } from "./static.js";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, statusCode, message, details = {}) {
  sendJson(res, statusCode, {
    ok: false,
    error: message,
    ...details,
  });
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export function createServer(options = {}) {
  const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    // API routes
    if (pathname.startsWith("/api/")) {
      let body = {};
      if (["POST", "PUT"].includes(req.method)) {
        try {
          body = await parseBody(req);
        } catch (e) {
          return sendError(res, 400, e.message);
        }
      }

      const ctx = {
        req,
        res,
        query,
        body,
        params: {},
        pathname: pathname.replace(/^\/api/, ""),
        method: req.method,
      };

      // Route matching
      try {
        let handled = false;

        // Image routes: /api/image/*
        if (pathname.startsWith("/api/image")) {
          ctx.pathname = pathname.replace(/^\/api\/image/, "") || "/";
          handled = await imageRoutes(ctx);
        }

        // Video routes: /api/video/*
        else if (pathname.startsWith("/api/video")) {
          ctx.pathname = pathname.replace(/^\/api\/video/, "") || "/";
          handled = await videoRoutes(ctx);
        }

        // Pipeline routes: /api/pipeline/*
        else if (pathname.startsWith("/api/pipeline")) {
          ctx.pathname = pathname.replace(/^\/api\/pipeline/, "") || "/";
          handled = await pipelineRoutes(ctx);
        }

        // Bible routes: /api/bible/*
        else if (pathname.startsWith("/api/bible")) {
          ctx.pathname = pathname.replace(/^\/api\/bible/, "") || "/";
          handled = await bibleRoutes(ctx);
        }

        // Draft routes: /api/drafts/*
        else if (pathname.startsWith("/api/drafts")) {
          ctx.pathname = pathname.replace(/^\/api\/drafts/, "") || "/";
          handled = await draftRoutes(ctx);
        }

        // Status endpoint
        else if (pathname === "/api/status" || pathname === "/api/health") {
          sendJson(res, 200, {
            ok: true,
            status: "running",
            service: "BytePlus Video Agent API",
            version: "1.0.0",
            timestamp: new Date().toISOString(),
            apiKeyConfigured: !!process.env.ARK_API_KEY,
          });
          handled = true;
        }

        if (!handled) {
          sendError(res, 404, `API route not found: ${pathname}`);
        }
      } catch (error) {
        console.error("API Error:", error);
        sendError(res, 500, "Internal server error", { message: error.message });
      }
      return;
    }

    // Static file serving (frontend)
    serveStatic(req, res, pathname);
  });

  return server;
}

export function startServer(port = 3000, options = {}) {
  const server = createServer(options);
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║   BytePlus Video Agent API Server                       ║
  ║                                                          ║
  ║   🎬 API:    http://localhost:${port}/api                  ║
  ║   🌐 UI:     http://localhost:${port}/                     ║
  ║   📊 Status: http://localhost:${port}/api/status            ║
  ╚══════════════════════════════════════════════════════════╝
      `);
      resolve(server);
    });
  });
}
