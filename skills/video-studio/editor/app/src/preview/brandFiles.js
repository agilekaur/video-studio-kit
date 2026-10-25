// Turn dropped brand files into a brand object, entirely in the browser (nothing is uploaded).
// Mirrors editor/vs/brand.py: hex codes vote for colour roles by the words on their line.

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const ROLES = [
  ["caption_box", ["word box", "spoken-word", "caption box", "highlight box", "active box"]],
  ["caption_outline", ["caption outline", "caption stroke", "text stroke", "outline"]],
  ["caption_text", ["caption letters", "caption text", "caption fill", "subtitle"]],
  ["caption_active", ["active word", "caption highlight", "caption accent"]],
  ["danger", ["danger", "error"]],
  ["accent", ["accent", "highlight", "cta", "call to action", "pop colour", "pop color"]],
  ["primary", ["primary", "brand colour", "brand color", "main colour", "main color"]],
  ["surface", ["background", "ground", "surface", "paper", "base colour", "canvas"]],
  ["surface_text", ["ink", "body text", "text colour", "text color", "foreground"]],
];
const WEAK = /\b(tint|faint|pale|light tint|deep|pressed|red-black|hover|disabled|border|hairline)\b/i;

const norm = (h) => {
  h = h.replace("#", "").toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return "#" + h;
};
function hsv(h) {
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return { s: mx ? (mx - mn) / mx : 0, v: mx };
}

export function extractColors(text) {
  const found = new Map();
  const cands = {};
  text.split(/\r?\n/).forEach((line, n) => {
    const hs = (line.match(HEX) || []).map(norm);
    if (!hs.length) return;
    hs.forEach((h) => found.set(h, (found.get(h) || 0) + 1));
    const low = line.toLowerCase();
    for (const [role, keys] of ROLES) {
      if (keys.some((k) => low.includes(k))) {
        const h = hs[0];
        let score = 2 - (WEAK.test(line) ? 1.6 : 0) + (line.includes("**") || low.includes("the accent") ? 1 : 0);
        if (["accent", "primary", "caption_box", "caption_active"].includes(role)) score += hsv(h).s;
        (cands[role] = cands[role] || []).push([score, -n, h]);
      }
    }
  });
  const roles = {};
  for (const [r, list] of Object.entries(cands)) {
    list.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    roles[r] = list[0][2];
  }
  const ranked = [...found.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  if (!roles.accent) {
    const vivid = ranked.find((h) => hsv(h).s > 0.45 && hsv(h).v > 0.35);
    if (vivid) roles.accent = vivid;
  }
  if (!roles.primary && roles.accent) roles.primary = roles.accent;
  if (roles.caption_text && !roles.text) roles.text = roles.caption_text;
  if (roles.caption_outline && !roles.outline) roles.outline = roles.caption_outline;
  return { roles, palette: ranked.slice(0, 12) };
}

let pdfjs = null;
function loadPdfJs() {
  if (pdfjs) return pdfjs;
  // The page cannot start a cross-origin worker, so the worker script is loaded on the page too;
  // pdf.js then runs it on the main thread (globalThis.pdfjsWorker).
  const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the PDF reader"));
    document.head.appendChild(s);
  });
  pdfjs = load(base + "pdf.min.js").then(() => load(base + "pdf.worker.min.js")).then(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js";
    return window.pdfjsLib;
  });
  pdfjs.catch(() => { pdfjs = null; });
  return pdfjs;
}

async function pdfText(file) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // keep line breaks roughly where the PDF has them, so colour names stay next to their hex codes
    let last = null, line = [];
    for (const it of tc.items) {
      const y = Math.round(it.transform[5]);
      if (last !== null && Math.abs(y - last) > 3) { out.push(line.join(" ")); line = []; }
      line.push(it.str);
      last = y;
    }
    out.push(line.join(" "));
  }
  return out.join("\n");
}

const weightOf = (name) => {
  const m = name.match(/(\d{3})/);
  if (m) return +m[1];
  if (/black|heavy|extra ?bold/i.test(name)) return 800;
  if (/bold/i.test(name)) return 700;
  if (/medium/i.test(name)) return 500;
  return 400;
};
const familyOf = (name) => name.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/[-_ ]?(\d{3}|regular|medium|bold|black|heavy|extrabold|semibold|light|italic)+$/gi, "").replace(/[-_]+/g, " ").trim() || "Brand font";

// Returns {brand, report[]}. `prev` is merged so a second drop adds to the first.
export async function brandFromFiles(files, prev) {
  const brand = prev ? JSON.parse(JSON.stringify(prev)) : { id: "yours", name: "Your brand", colors: {}, fonts: {}, logos: [] };
  brand.logos = brand.logos || [];
  const report = [];
  const texts = [];
  const fonts = [];
  for (const f of files) {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    try {
      if (["ttf", "otf", "woff", "woff2"].includes(ext)) {
        fonts.push({ label: familyOf(f.name), weight: weightOf(f.name), url: URL.createObjectURL(f) });
      } else if (["png", "jpg", "jpeg", "svg", "webp"].includes(ext)) {
        brand.logos.push({ name: f.name, url: URL.createObjectURL(f) });
      } else if (ext === "pdf") {
        texts.push(await pdfText(f));
      } else if (["md", "txt", "css", "html", "htm", "json", "yaml", "yml", "csv"].includes(ext) || f.type.startsWith("text/")) {
        texts.push(await f.text());
      } else {
        report.push(`Skipped ${f.name}: not a guide, font or logo file`);
      }
    } catch (e) {
      report.push(`Could not read ${f.name}: ${e.message}`);
    }
  }
  if (texts.length) {
    const { roles, palette } = extractColors(texts.join("\n"));
    Object.assign(brand.colors, roles);
    brand.palette = palette;
    const n = Object.keys(roles).length;
    report.push(n ? `Found ${n} colour role${n > 1 ? "s" : ""} in your guide` : "No colour codes found in the guide. Pick colours below.");
    if (roles.caption_box) brand.caption_style = "brand";
  }
  if (fonts.length) {
    fonts.sort((a, b) => b.weight - a.weight);
    const pick = (f, i) => ({ family: `VSTry ${i} ${f.label}`, url: f.url, weight: f.weight, label: f.label });
    const heading = pick(fonts[0], 0);
    const body = fonts[1] ? pick(fonts[1], 1) : heading;
    brand.fonts = { heading, caption: heading, body };
    report.push(`Fonts: ${fonts.map((f) => `${f.label} ${f.weight}`).join(", ")}`);
  }
  if (brand.logos.length) {
    const light = brand.logos.find((l) => /cream|white|light|reverse|inverse/i.test(l.name));
    brand.logo = (light || brand.logos[0]).url;
    brand.logo_position = brand.logo_position && brand.logo_position !== "none" ? brand.logo_position : "tl";
    report.push(`Logo: ${(light || brand.logos[0]).name}`);
  }
  return { brand, report };
}
