// Render a project with Remotion. Usage:
//   node render.mjs props.json out.mp4 [--scale 0.5] [--still frame out.png]
//   node render.mjs --bundle-only
// Prints JSON lines: {"progress":0.42} ... {"done":true}
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, ensureBrowser } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , propsPath, out, ...rest] = process.argv;
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const scale = +opt("--scale", 1);
const still = rest.includes("--still") ? opt("--still") : null;
const log = (o) => process.stdout.write(JSON.stringify(o) + "\n");

// Content hash, so a bundle built before packaging stays valid after the app is copied elsewhere.
function srcHash(dir) {
  const h = crypto.createHash("md5");
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else h.update(path.relative(dir, p)).update(fs.readFileSync(p));
  });
  walk(dir);
  return h.digest("hex").slice(0, 12);
}

async function getBundle() {
  const hash = srcHash(path.join(here, "src", "remotion"));
  const dir = path.join(here, ".cache", "bundle-" + hash);
  if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  log({ stage: "bundling" });
  fs.rmSync(path.join(here, ".cache"), { recursive: true, force: true });
  return bundle({ entryPoint: path.join(here, "src", "remotion", "index.jsx"), outDir: dir, onProgress: () => {} });
}

if (propsPath === "--bundle-only") {   // packaging: build the bundle ahead of the first render
  await getBundle();
  log({ done: true });
  process.exit(0);
}

try {
  const inputProps = JSON.parse(fs.readFileSync(propsPath, "utf8"));
  await ensureBrowser();
  const serveUrl = await getBundle();
  const composition = await selectComposition({ serveUrl, id: "Reel", inputProps });
  if (still != null) {
    await renderStill({ serveUrl, composition, inputProps, output: out, frame: +still, scale, imageFormat: "png" });
  } else {
    await renderMedia({
      serveUrl, composition, inputProps, outputLocation: out, codec: "h264", crf: scale < 1 ? 26 : 18, scale,
      pixelFormat: "yuv420p", audioCodec: "aac", audioBitrate: "192k", x264Preset: scale < 1 ? "veryfast" : "medium",
      concurrency: Math.max(1, Math.min(8, Math.floor((await import("node:os")).cpus().length / 2))),
      timeoutInMilliseconds: 120000,
      onProgress: ({ progress }) => log({ progress }),
    });
  }
  log({ done: true });
} catch (e) {
  log({ error: String(e && e.stack || e) });
  process.exit(1);
}
