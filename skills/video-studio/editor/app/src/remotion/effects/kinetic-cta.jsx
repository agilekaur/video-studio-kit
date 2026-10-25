import React from "react";
import { fontStack, faceBands } from "../kit.jsx";

export const meta = {
  "id": "kinetic-cta",
  "name": "Kinetic CTA",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "cta"
  ],
  "sfx": "thud",
  "captions": false,
  "desc": "Huge outlined words hard-cut in on each spoken word of the closing line, one small punch-in on the strongest word.",
  "params": [
    {
      "key": "words",
      "label": "Word groups, split with / (blank: from the speech)",
      "type": "text",
      "default": ""
    },
    {
      "key": "punch",
      "label": "Group that punches the frame in (blank: strongest)",
      "type": "text",
      "default": ""
    }
  ],
  "status": "ready"
};

// Kit look: brand display font, upper case, caption fill with an ink outline, centred under the face (kit y 1150),
// ~80% of the safe width, max 380 px. Each group lands 1 frame before its first spoken word with a 2-frame
// 1.06 -> 1.00 pop, no fades, and holds until the next group. The frame punches in 4% on one group.

const STOP = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our their its at as by from just".split(" "));
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const MAX_W = 700, MAX_PX = 380;

let _cv;
function textW(s, family, size) {
  try {
    _cv = _cv || document.createElement("canvas");
    const g = _cv.getContext("2d");
    g.font = `800 ${size}px ${family}`;
    return g.measureText(s).width;
  } catch (e) {
    return s.length * size * 0.62;
  }
}

// 1-3 word groups from the spoken words: break on punctuation, after 3 words, or once a strong word closes a pair
function autoGroups(words) {
  const out = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const t = norm(w.text);
    const strong = t && !STOP.has(t);
    if (/[.,!?;:]$/.test(w.text.trim()) || cur.length >= 3 || (strong && (cur.length >= 2 || t.length >= 6))) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.map((g) => ({ text: g.map((w) => w.text.trim().replace(/[.,!?;:]+$/, "")).join(" ").toUpperCase(), from: g[0].from }));
}

export function groupsOf({ params, words, frames, text }) {
  const raw = String(params.words || "").split(/[/\n]/).map((s) => s.trim()).filter(Boolean);
  let gs;
  if (raw.length) {
    // time each typed group on its first word as spoken, in order; else spread across the beat
    let cursor = 0;
    gs = raw.map((s, i) => {
      const tok = s.split(/\s+/).map(norm).find(Boolean);
      let t = null;
      for (let k = cursor; k < words.length; k++) {
        if (norm(words[k].text) === tok) { t = words[k].from; cursor = k + 1; break; }
      }
      return { text: s.toUpperCase(), from: t ?? Math.round((i / raw.length) * frames * 0.85) };
    });
    for (let i = 1; i < gs.length; i++) gs[i].from = Math.max(gs[i].from, gs[i - 1].from + 2);
  } else if (words.length) {
    gs = autoGroups(words);
  } else {
    gs = String(text || "").trim() ? [{ text: String(text).toUpperCase(), from: 0 }] : [];
  }
  return gs.map((g) => ({ ...g, from: Math.max(0, g.from - 1) }));   // land a frame early so it reads on the sound
}

function punchIndex(params, gs) {
  const want = norm(params.punch);
  if (want) {
    const i = gs.findIndex((g) => norm(g.text) === want);
    if (i >= 0) return i;
    return gs.findIndex((g) => norm(g.text).includes(want));
  }
  // strongest group: the one holding the longest non-stop word
  let best = -1, bl = 0;
  gs.forEach((g, i) => {
    for (const w of g.text.split(/\s+/)) {
      const t = norm(w);
      if (!STOP.has(t) && t.length > bl) { bl = t.length; best = i; }
    }
  });
  return best;
}

function current(gs, frame) {
  let k = -1;
  gs.forEach((g, i) => { if (frame >= g.from) k = i; });
  return k;
}

export function styles(ctx) {
  const gs = groupsOf(ctx);
  const k = current(gs, ctx.frame);
  if (k < 0 || k !== punchIndex(ctx.params, gs)) return {};
  const p = Math.min(1, (ctx.frame - gs[k].from) / 4);
  return { zoom: 1 + 0.04 * (1 - Math.pow(1 - p, 3)) };
}

export function Front(ctx) {
  const { frame, brand, focus } = ctx;
  const gs = groupsOf(ctx);
  const k = current(gs, frame);
  if (k < 0) return null;
  const g = gs[k];
  const C = brand.colors;
  const font = fontStack(brand.fonts.heading);
  // the free band under the face (captions are off on this beat), or above it if that is bigger
  const { above, below } = faceBands(focus);
  const band = below[1] - below[0] >= above[1] - above[0] ? below : above;
  const bandH = band[1] - band[0];
  // one line, or two balanced lines when one would get too small
  const ws = g.text.split(/\s+/);
  let lines = [g.text];
  const w1 = textW(g.text, font, 200);
  if (ws.length > 1 && (MAX_W * 200) / w1 < 190) {
    let bi = 1, bm = Infinity;
    for (let i = 1; i < ws.length; i++) {
      const m = Math.max(textW(ws.slice(0, i).join(" "), font, 200), textW(ws.slice(i).join(" "), font, 200));
      if (m < bm) { bm = m; bi = i; }
    }
    lines = [ws.slice(0, bi).join(" "), ws.slice(bi).join(" ")];
  }
  const widest = Math.max(...lines.map((l) => textW(l, font, 200)));
  const lh = 0.98;
  const size = Math.floor(Math.min(MAX_PX, (MAX_W * 200) / Math.max(1, widest), (bandH - 20) / (lines.length * lh) / 1.06));
  const blockH = size * lh * lines.length;
  // kit centre y 1150, kept inside the band
  const cy = Math.max(band[0] + blockH * 0.53, Math.min(band[1] - blockH * 0.53, 1150));
  const f = frame - g.from;
  const sc = f < 1 ? 1.06 : f < 2 ? 1.03 : 1;
  const sw = Math.max(12, Math.round(size / 16));   // drawn under the fill: shows as ~6 px+ outline
  return (
    <div style={{ position: "absolute", left: 60, width: 880, top: cy - blockH / 2, height: blockH, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", transform: `scale(${sc})`, transformOrigin: `440px ${blockH / 2}px` }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: font, fontWeight: 800, fontSize: size, lineHeight: lh, whiteSpace: "nowrap", letterSpacing: -size * 0.02,
          color: C.caption_text, WebkitTextStroke: `${sw}px ${C.caption_outline}`, paintOrder: "stroke fill" }}>{l}</div>
      ))}
    </div>
  );
}
