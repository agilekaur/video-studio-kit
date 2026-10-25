// Contact sheet for one effect on the test project.
// node scripts/fxstill.mjs <effect-id> '<params json>' <frames csv> <out.png> [--server http://127.0.0.1:5179] [--project hola-test]
// The whole clip becomes one beat carrying the effect, so frame 0 is the effect's first frame.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, ensureBrowser } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , effect, paramsJson = "{}", framesCsv = "0,10,30,60", out = "/tmp/fx.png", ...rest] = process.argv;
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const server = opt("--server", "http://127.0.0.1:5179");
const pid = opt("--project", "hola-test");

const { project } = await (await fetch(`${server}/api/projects/${pid}`)).json();
const clip = project.clips[0];
const n = clip.words.length;
project.beats = [{ id: "fx", clip: clip.id, w0: 0, w1: n - 1, cut: false, purpose: "point", effect, params: JSON.parse(paramsJson),
  zoom: 1, speed: 1, ramp: null, freeze: 0, volume: 1, transition: "cut", note: "" }];
project.settings.caption_style = opt("--captions", "bold");
const bid = opt("--brand", "");
const brand = bid ? (await (await fetch(`${server}/api/brands`)).json()).find((b) => b.id === bid) || null : null;
const inputProps = { project, brand, base: server };

await ensureBrowser();
const dir = path.join(os.tmpdir(), `vs-fx-bundle-${process.pid}`); // one per run so parallel runs do not clash
const serveUrl = await bundle({ entryPoint: path.join(here, "..", "src", "remotion", "index.jsx"), outDir: dir });
const composition = await selectComposition({ serveUrl, id: "Reel", inputProps });
const frames = framesCsv.split(",").map(Number);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-"));
const files = [];
for (const [k, f] of frames.entries()) {
  const p = path.join(tmp, `f${k}.png`);
  await renderStill({ serveUrl, composition, inputProps, output: p, frame: Math.min(f, composition.durationInFrames - 1), scale: 0.4 });
  files.push(p);
}
if (files.length === 1) fs.copyFileSync(files[0], out);
else execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `hstack=inputs=${files.length}`, out]);
console.log("wrote", out, "frames", frames.join(","), "of", composition.durationInFrames);
fs.rmSync(dir, { recursive: true, force: true });
