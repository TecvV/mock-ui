const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, "build");
const INDEX_FILE = path.join(BUILD_DIR, "index.html");
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const openBrowser = (url) => {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
};

const safeResolve = (urlPath, baseDir) => {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const target = path.normalize(path.join(baseDir, clean));
  if (!target.startsWith(baseDir)) return null;
  return target;
};

const sendFile = (res, filePath, fallbackIndex) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (fallbackIndex && filePath !== fallbackIndex) {
        sendFile(res, fallbackIndex);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(data);
  });
};

const createStaticServer = ({ buildDir = BUILD_DIR } = {}) => {
  const indexFile = path.join(buildDir, "index.html");
  if (!fs.existsSync(indexFile)) {
    throw new Error("Build folder not found. Run `npm run build` first.");
  }

  return http.createServer((req, res) => {
    const resolved = safeResolve(req.url || "/", buildDir);
    if (!resolved) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    fs.stat(resolved, (err, stats) => {
      if (!err && stats.isFile()) {
        sendFile(res, resolved, indexFile);
        return;
      }
      if (!err && stats.isDirectory()) {
        const directoryIndex = path.join(resolved, "index.html");
        if (fs.existsSync(directoryIndex)) {
          sendFile(res, directoryIndex, indexFile);
          return;
        }
      }
      sendFile(res, indexFile, indexFile);
    });
  });
};

if (require.main === module) {
  const server = createStaticServer();
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`CAT Mock UI is running at ${url}`);
    if (process.env.OPEN_BROWSER !== "false") {
      openBrowser(url);
    }
  });
}

module.exports = {
  createStaticServer,
  PORT,
};
