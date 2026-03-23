/**
 * Lightweight HTTP server for the demo UI.
 *
 * - Serves static files from web/
 * - POST /api/check  → proxies to ICME checkIt (parses SSE response)
 *
 * No dependencies beyond Node built-ins + dotenv.
 */

import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "../web");
const PORT = Number(process.env.PORT) || 3000;

const ICME_BASE = "https://api.icme.io/v1";
const ICME_KEY = process.env.ICME_API_KEY!;

// Read policy_id from compiled file
function getPolicyId(): string {
  const flagIdx = process.argv.indexOf("--policy");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) {
    return process.argv[flagIdx + 1];
  }
  const policyPath = path.resolve(__dirname, "../policies/compiled.json");
  if (fs.existsSync(policyPath)) {
    const data = JSON.parse(fs.readFileSync(policyPath, "utf-8"));
    return data.policy_id;
  }
  throw new Error("No policy_id found. Run `npm run compile-policy` first.");
}

const POLICY_ID = getPolicyId();
console.log(`Policy ID: ${POLICY_ID}`);

// ─── MIME types ──────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// ─── Static file server ─────────────────────────────

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  let urlPath = req.url || "/";
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(WEB_DIR, urlPath);
  // Prevent directory traversal
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

// ─── ICME checkIt proxy ─────────────────────────────

async function handleCheck(req: http.IncomingMessage, res: http.ServerResponse) {
  let body = "";
  for await (const chunk of req) body += chunk;

  const { action } = JSON.parse(body);
  if (!action) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing action" }));
    return;
  }

  try {
    const icmeRes = await fetch(`${ICME_BASE}/checkIt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ICME_KEY,
      },
      body: JSON.stringify({ policy_id: POLICY_ID, action }),
    });

    const text = await icmeRes.text();

    // Parse SSE or plain JSON
    let result: Record<string, unknown> = {};
    if (text.startsWith("data: ")) {
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice("data: ".length).trim());
          result = { ...result, ...parsed };
        } catch {
          // skip
        }
      }
    } else {
      result = JSON.parse(text);
    }

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(result));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
}

// ─── Server ─────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/check") {
    handleCheck(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  Verified Forage UI → http://localhost:${PORT}\n`);
});
