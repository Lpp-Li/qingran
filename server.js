/* 轻燃 · 仅本机运行的静态服务与数据文件接口
 * 不需要联网，不依赖第三方包。默认端口 47821。
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = 47821;
const HOST = "127.0.0.1";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const MAX_BODY = 12 * 1024 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function sendJSON(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("读取数据文件失败：", err.message);
    return null;
  }
}

function writeState(value) {
  ensureDirs();
  const json = JSON.stringify(value, null, 2);
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, json, "utf8");
  fs.renameSync(tmp, STATE_FILE);
  try {
    const day = new Date();
    const stamp = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const backup = path.join(BACKUP_DIR, `state-${stamp}.json`);
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, json, "utf8");
  } catch (err) {
    console.warn("写入每日备份失败：", err.message);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("请求内容过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(urlPath, res) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const relative = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relative);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/api/health") {
    sendJSON(res, 200, { ok: true, app: "qingran", version: 1 });
    return;
  }

  if (url.pathname === "/api/state") {
    if (req.method === "GET") {
      const state = readState();
      if (!state) {
        sendJSON(res, 404, { ok: false, message: "no state yet" });
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(state));
      return;
    }
    if (req.method === "PUT") {
      try {
        const raw = await readBody(req);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.profile || !parsed.targets) {
          sendJSON(res, 400, { ok: false, message: "invalid state" });
          return;
        }
        writeState(parsed);
        sendJSON(res, 200, { ok: true, savedAt: new Date().toISOString() });
      } catch (err) {
        sendJSON(res, 400, { ok: false, message: err.message });
      }
      return;
    }
    sendJSON(res, 405, { ok: false, message: "method not allowed" });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJSON(res, 405, { ok: false, message: "method not allowed" });
    return;
  }
  serveStatic(url.pathname, res);
});

const AUTO_OPEN = !process.argv.includes("--no-open") && process.env.QINGRAN_NO_OPEN !== "1";

function openBrowser() {
  const url = `http://${HOST}:${PORT}/`;
  if (!AUTO_OPEN) {
    console.log("自动打开浏览器已关闭，请手动访问：", url);
    return;
  }
  try {
    exec(`start "" "${url}"`, { shell: "cmd.exe" });
  } catch (err) {
    console.log("请手动在浏览器打开：", url);
  }
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    http.get(`http://${HOST}:${PORT}/api/health`, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          const info = JSON.parse(raw);
          if (info && info.app === "qingran") {
            console.log(`轻燃已经在运行，正在打开已有窗口…`);
            openBrowser();
            setTimeout(() => process.exit(0), 700);
            return;
          }
        } catch (e) {}
        console.error(`端口 ${PORT} 被其他程序占用，轻燃没有启动。请关闭占用该端口的程序后重试。`);
        process.exitCode = 1;
      });
    }).on("error", () => {
      console.error(`端口 ${PORT} 已被占用，且无法确认是轻燃。请关闭占用该端口的程序后重试。`);
      process.exitCode = 1;
    });
  } else {
    console.error("启动失败：", err.message);
    process.exitCode = 1;
  }
});

ensureDirs();
server.listen(PORT, HOST, () => {
  console.log("────────────────────────────────────────────");
  console.log("  轻燃 · 本地减脂工作台");
  console.log(`  地址：http://${HOST}:${PORT}/`);
  console.log("  数据：本机 data\\state.json");
  console.log("  关闭这个窗口即可退出；数据不会丢失。");
  console.log("────────────────────────────────────────────");
  openBrowser();
});
