// Video Studio for Mac: an Electron shell around the local editor.
// Starts the Flask backend (editor/server.py) on a free port, opens the editor in its own Chromium,
// stops the backend on quit, and routes Dock / window file drops into the open reel.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

const EDITOR = findEditor();
const VS_HOME = process.env.VS_HOME || path.join(os.homedir(), "Movies", "VideoStudio");
const LOG = path.join(os.homedir(), "Library", "Logs", "Video Studio.log");

let win = null;
let server = null;
let base = null;
let quitting = false;
const pendingFiles = [];   // opened before the page was ready

// ------------------------------------------------------------------ environment

function findEditor() {
  const candidates = [
    process.env.VS_EDITOR,
    path.resolve(__dirname, ".."),                              // npm start from editor/desktop
    path.resolve(process.execPath, "../../../../../../.."),     // editor/desktop/dist/mac-*/Video Studio.app/Contents/MacOS
    path.join(os.homedir(), ".claude", "skills", "video-studio", "editor"),
  ];
  return candidates.find((d) => d && fs.existsSync(path.join(d, "server.py"))) || candidates[candidates.length - 1];
}

// Apps opened from Finder get a bare PATH; the backend needs node, ffmpeg and ffprobe.
function loginPath() {
  const extra = ["/opt/homebrew/bin", "/usr/local/bin", path.join(os.homedir(), ".local", "bin")];
  let p = process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin";
  try {
    const out = execFileSync(process.env.SHELL || "/bin/zsh", ["-ilc", "printf '__P__%s__P__' \"$PATH\""],
      { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
    const m = out.match(/__P__(.*)__P__/);
    if (m && m[1]) p = m[1];
  } catch (e) { /* fall back to the common dirs below */ }
  const parts = p.split(":");
  for (const d of extra) if (!parts.includes(d)) parts.push(d);
  return parts.join(":");
}

function log(line) {
  try { fs.appendFileSync(LOG, line.endsWith("\n") ? line : line + "\n"); } catch (e) { /* ignore */ }
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    log(`$ ${cmd} ${args.join(" ")}`);
    const p = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.on("data", (d) => log(String(d)));
    p.stderr.on("data", (d) => log(String(d)));
    p.on("error", reject);
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} ${args[0] || ""} exited ${code}`))));
  });
}

function newestMtime(dir) {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newestMtime(f) : fs.statSync(f).mtimeMs);
  }
  return t;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

async function waitForServer(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!server || server.exitCode !== null) throw new Error("The backend stopped while starting. See ~/Library/Logs/Video Studio.log");
    try { const r = await fetch(url + "/api/meta"); if (r.ok) return; } catch (e) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("The backend did not answer in time. See ~/Library/Logs/Video Studio.log");
}

// Same steps as run.sh: venv on first run, npm install if needed, build the app when src changed.
async function prepare(env, status) {
  const py = path.join(EDITOR, ".venv", "bin", "python");
  if (!fs.existsSync(py)) {
    status("First run: setting up Python (a few minutes)…");
    await run("python3", ["-m", "venv", ".venv"], { cwd: EDITOR, env });
    await run(path.join(EDITOR, ".venv", "bin", "pip"),
      ["install", "-q", "flask", "faster-whisper", "pillow", "numpy", "fonttools", "brotli", "pypdf", "onnxruntime"], { cwd: EDITOR, env });
  }
  const appDir = path.join(EDITOR, "app");
  if (!fs.existsSync(path.join(appDir, "node_modules"))) {
    status("First run: installing the editor…");
    await run("npm", ["install", "--no-audit", "--no-fund"], { cwd: appDir, env });
  }
  const built = path.join(appDir, "dist", "index.html");
  const srcTime = Math.max(newestMtime(path.join(appDir, "src")), fs.statSync(path.join(appDir, "index.html")).mtimeMs);
  if (!fs.existsSync(built) || fs.statSync(built).mtimeMs < srcTime) {
    status("Building the editor…");
    await run("npx", ["vite", "build", "--logLevel", "error"], { cwd: appDir, env });
  }
  return py;
}

async function startBackend() {
  const env = { ...process.env, PATH: loginPath(), VS_HOME, PYTHONUNBUFFERED: "1" };
  const status = (s) => win && !win.isDestroyed() && win.webContents.executeJavaScript(`window.setStatus && setStatus(${JSON.stringify(s)})`).catch(() => {});
  const py = await prepare(env, status);
  status("Starting…");
  const port = await freePort();
  env.PORT = String(port);
  log(`--- ${new Date().toISOString()} starting backend on ${port} (editor ${EDITOR})`);
  server = spawn(py, ["server.py"], { cwd: EDITOR, env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (d) => log(String(d)));
  server.stderr.on("data", (d) => log(String(d)));
  server.on("exit", (code, sig) => {
    log(`backend exited ${code} ${sig || ""}`);
    if (!quitting && base) dialog.showErrorBox("Video Studio", "The backend stopped unexpectedly. See ~/Library/Logs/Video Studio.log");
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url, 60000);
  base = url;
  return url;
}

function stopBackend() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  const s = server;
  setTimeout(() => { if (s.exitCode === null) s.kill("SIGKILL"); }, 3000).unref();
}

// ------------------------------------------------------------------ window + menus

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1100, minHeight: 700,
    title: "Video Studio", backgroundColor: "#0e0f12", show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => { win = null; });
  // links to the outside world open in the default browser; the editor stays in the window
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => {
    if (base && !url.startsWith(base)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.on("did-finish-load", flushFiles);
  return win;
}

const send = (channel, ...args) => win && !win.isDestroyed() && win.webContents.send(channel, ...args);

// Undo/redo: text fields keep the native behaviour; everywhere else the page's own Cmd+Z history runs.
function historyItem(label, accelerator, which) {
  return {
    label, accelerator,
    click: async () => {
      if (!win) return;
      const inField = await win.webContents.executeJavaScript(
        "(() => { const e = document.activeElement; const t = (e && e.tagName || '').toLowerCase(); return ['input','textarea','select'].includes(t) || !!(e && e.isContentEditable); })()"
      ).catch(() => false);
      if (inField) which === "undo" ? win.webContents.undo() : win.webContents.redo();
      else send("vs:menu", which);
    },
  };
}

function buildMenu() {
  const template = [
    { role: "appMenu" },
    {
      label: "File",
      submenu: [
        { label: "New Reel…", accelerator: "CmdOrCtrl+N", click: () => send("vs:menu", "new-reel") },
        { label: "Add Files to Reel…", accelerator: "CmdOrCtrl+O", click: chooseFiles },
        { type: "separator" },
        { label: "Open Projects Folder", accelerator: "CmdOrCtrl+Shift+O", click: () => { fs.mkdirSync(VS_HOME, { recursive: true }); shell.openPath(VS_HOME); } },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        historyItem("Undo", "CmdOrCtrl+Z", "undo"),
        historyItem("Redo", "Shift+CmdOrCtrl+Z", "redo"),
        { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "forceReload" }, { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    { role: "help", submenu: [{ label: "Backend Log", click: () => shell.openPath(LOG) }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------------------------------------------------ files into the open reel

function openFiles(paths) {
  log(`open files: ${paths.join(", ")}`);
  pendingFiles.push(...paths.filter((p) => fs.existsSync(p) && fs.statSync(p).isFile()));
  flushFiles();
}

function flushFiles() {
  if (!pendingFiles.length || !win || win.isDestroyed() || !base) return;
  if (!win.webContents.getURL().startsWith(base)) return;
  const paths = pendingFiles.splice(0);
  send("vs:files", paths.map((p) => ({ path: p, name: path.basename(p) })));
  win.show(); win.focus();
}

async function chooseFiles() {
  if (!win) return;
  const r = await dialog.showOpenDialog(win, {
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Video, images, audio", extensions: ["mp4", "mov", "m4v", "mkv", "webm", "avi", "mts", "png", "jpg", "jpeg", "webp", "gif", "svg", "mp3", "wav", "m4a", "aac", "flac", "ogg"] }],
  });
  if (!r.canceled) openFiles(r.filePaths);
}

// The page asks main to stream files from disk to the backend (no copy through the renderer).
ipcMain.handle("vs:upload", async (_e, { pid, kind, paths }) => {
  if (!base) throw new Error("Backend not ready");
  if (!/^[\w.-]+$/.test(pid)) throw new Error("Bad project id");
  const fd = new FormData();
  for (const p of paths) fd.append("files", await fs.openAsBlob(p), path.basename(p));
  const r = await fetch(`${base}/api/projects/${pid}/${kind === "clips" ? "upload" : "media"}`, { method: "POST", body: fd });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("json") ? await r.json() : null;
  if (!r.ok) throw new Error((data && data.error) || `${r.status} ${r.statusText}`);
  return data;
});

// ------------------------------------------------------------------ lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    openFiles(argv.slice(1).filter((a) => !a.startsWith("-") && path.isAbsolute(a)));
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.on("open-file", (e, p) => { e.preventDefault(); openFiles([p]); });   // Dock drops + Open With

  app.whenReady().then(async () => {
    buildMenu();
    createWindow();
    await win.loadFile(path.join(__dirname, "splash.html"));
    try {
      const url = await startBackend();
      if (win) await win.loadURL(url);
    } catch (e) {
      log(String(e.stack || e));
      dialog.showErrorBox("Video Studio could not start", String(e.message || e));
      quitting = true;
      stopBackend();
      app.quit();
    }
  });

  app.on("activate", () => { if (!win && base) { createWindow(); win.loadURL(base); } });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => { quitting = true; stopBackend(); });
  process.on("exit", stopBackend);
}
