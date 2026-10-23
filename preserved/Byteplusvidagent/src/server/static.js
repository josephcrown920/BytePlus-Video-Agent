// Static file serving for the frontend
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../../public");

export function serveStatic(req, res, pathname) {
  try {
    // Default to index.html
    let filePath = pathname === "/" ? "/index.html" : pathname;

    // Prevent directory traversal
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(PUBLIC_DIR, filePath);

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      // SPA fallback - serve index.html for non-existent paths
      const indexPath = path.join(PUBLIC_DIR, "index.html");
      if (fs.existsSync(indexPath) && !filePath.includes(".")) {
        const content = fs.readFileSync(indexPath);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(content);
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not Found");
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const content = fs.readFileSync(fullPath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server Error: " + error.message);
  }
}
