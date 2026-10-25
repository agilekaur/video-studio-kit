import React from "react";
import { interpolate } from "remotion";
import { ease, pop, exitFade, fontStack, wordTime, faceBands } from "../kit.jsx";

export const meta = {
  "id": "text-explosion",
  "name": "Text Explosion",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "punch"
  ],
  "sfx": "thud",
  "desc": "The punch word slams in under the face, holds, then shatters into glass shards and sparks.",
  "params": [
    {
      "key": "word",
      "label": "Word",
      "type": "text",
      "default": ""
    }
  ],
  "captionY": 1360,
  "status": "ready"
};

const STOP = new Set("the a an and or but so to of in on for with is are was were be it this that you we they my your our their just really very never isn't don't".split(" "));
// deterministic noise in [0, 1) from integers
const rnd = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + 7.7) * 43758.5453; return s - Math.floor(s); };

function pickWord(text) {
  const toks = String(text || "").split(/\s+/).slice(0, 10).map((w) => w.replace(/[^A-Za-z0-9'$%]/g, "")).filter(Boolean);
  const strong = toks.filter((w) => !STOP.has(w.toLowerCase()) && w.length <= 10);
  let best = strong[0] || toks[0] || "BOOM";
  for (const w of strong) if (w.length > best.length) best = w;
  return best;
}

const COLS = 6, ROWS = 3; // 36 triangular shards

export function Front({ params, frame, frames, fps, brand, words, text, focus }) {
  const C = brand.colors;
  const word = (String(params.word || "").trim() || pickWord(text)).toUpperCase();
  const tok = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = !String(params.word || "").trim() ? null : words.find((w) => w.text.toLowerCase().replace(/[^a-z0-9]/g, "") === tok);
  const t0 = Math.max(0, Math.min(hit ? hit.from - 2 : 0, frames - 40));
  // no word given: slam on the first frame of the beat
  const tE = Math.min(Math.max(t0 + 22, hit ? hit.to + 4 : 0), frames - 26);
  if (frame < t0) return null;
  // the larger clear band above/below the face (captions drop to captionY); the 1.7x slam has to fit too
  const { above, below } = faceBands(focus, undefined, 1220);
  const band = above[1] - above[0] >= below[1] - below[0] ? above : below;
  const size = Math.min(230, Math.floor(880 / Math.max(1, word.length * 0.62)), Math.floor((band[1] - band[0]) / 1.5 / 1.15));
  const bw = Math.min(900, Math.ceil(word.length * size * 0.66) + 40), bh = Math.ceil(size * 1.15);
  const cx = 540, cy = (band[0] + band[1]) / 2;
  const bx = cx - bw / 2, by = cy - bh / 2;
  const slam = pop(frame, fps, t0, 9);
  const scale = 1.7 - 0.7 * slam;
  const shake = frame - t0 < 8 ? (rnd(frame, 3) - 0.5) * 18 * (1 - (frame - t0) / 8) : 0;
  const o = exitFade(frame, frames);
  const textStyle = {
    position: "absolute", left: 0, top: 0, width: bw, height: bh, display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: fontStack(brand.fonts.heading), fontSize: size, lineHeight: 1, color: C.accent, whiteSpace: "nowrap",
    WebkitTextStroke: `${Math.round(size / 22)}px ${C.outline}`, paintOrder: "stroke fill", textShadow: "0 12px 36px rgba(0,0,0,.45)",
  };
  if (frame < tE) {
    return (
      <div style={{ position: "absolute", left: bx + shake, top: by, width: bw, height: bh, opacity: Math.min(1, (frame - t0 + 1) / 3) * o,
        transform: `scale(${scale})` }}>
        <div style={textStyle}>{word}</div>
      </div>
    );
  }
  const t = frame - tE;
  if (t > 24) return null;
  // jittered vertex grid over the word box -> two triangles per cell
  const V = (i, j) => {
    const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
    return [(i / COLS) * bw + (edge ? 0 : (rnd(i, j) - 0.5) * bw / COLS * 0.7), (j / ROWS) * bh + (edge ? 0 : (rnd(j + 9, i) - 0.5) * bh / ROWS * 0.7)];
  };
  const tris = [];
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1);
    if ((i + j) % 2) { tris.push([a, b, c]); tris.push([a, c, d]); } else { tris.push([a, b, d]); tris.push([b, c, d]); }
  }
  const g = 1.6; // gravity in px/frame^2
  const fade = interpolate(t, [0, 18], [1, 0], { extrapolateRight: "clamp" });
  const flash = interpolate(t, [0, 4], [0.55, 0], { extrapolateRight: "clamp" });
  const ring = ease(t, 0, 14);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o }}>
      <div style={{ position: "absolute", left: cx - 360 * ring, top: cy - 360 * ring, width: 720 * ring, height: 720 * ring, borderRadius: "50%",
        border: `${Math.max(1, 10 * (1 - ring))}px solid ${C.accent}`, opacity: 0.8 * (1 - ring) }} />
      <div style={{ position: "absolute", left: cx - 300, top: cy - 300, width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,.9), rgba(255,255,255,0) 60%)", opacity: flash }} />
      {tris.map((tri, k) => {
        const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const dx = mx - bw / 2, dy = my - bh / 2, dl = Math.hypot(dx, dy) || 1;
        const sp = 14 + 18 * rnd(k, 1);
        // outward and downward only, so nothing flies over the face
        const vx = (dx / dl) * sp * 1.2 + (rnd(k, 2) - 0.5) * 8, vy = Math.max(-3, (dy / dl) * sp * 0.5) + 2 + 4 * rnd(k, 3);
        const rot = (rnd(k, 4) - 0.5) * 40 * t;
        const poly = tri.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",");
        return (
          <div key={k} style={{ position: "absolute", left: bx, top: by, width: bw, height: bh, clipPath: `polygon(${poly})`, opacity: fade,
            transformOrigin: `${mx}px ${my}px`, transform: `translate(${vx * t}px, ${vy * t + 0.5 * g * t * t}px) rotate(${rot}deg) scale(${1 - 0.3 * t / 24})` }}>
            <div style={textStyle}>{word}</div>
          </div>
        );
      })}
      {Array.from({ length: 30 }).map((_, k) => {
        const a = rnd(k, 5) * Math.PI * 2, sp = 18 + 26 * rnd(k, 6);
        const life = 10 + 8 * rnd(k, 7);
        const p = Math.min(1, t / life);
        if (p >= 1) return null;
        const r = (5 + 8 * rnd(k, 8)) * (1 - p);
        const x = cx + Math.cos(a) * sp * t * (1 - 0.3 * p), y = cy + Math.max(-0.2, Math.sin(a)) * sp * t * 0.75 + 0.5 * g * t * t;
        const col = k % 3 === 0 ? "#FFFFFF" : C.accent;
        return <div key={`s${k}`} style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", background: col,
          boxShadow: `0 0 ${4 * r}px ${col}` }} />;
      })}
    </div>
  );
}
