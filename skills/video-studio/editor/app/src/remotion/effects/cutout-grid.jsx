import React from "react";
import { spring } from "remotion";
import { fill, ease, pop, exitFade, fontStack } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "cutout-grid",
  "name": "Cut-out Grid",
  "big": true,
  "needs": [],
  "prefers": [
    "cutout"
  ],
  "purposes": [
    "point",
    "punch",
    "hook"
  ],
  "sfx": "pop",
  "captionY": 1380,
  "desc": "Pop-art grid: the cut-out speaker repeated in brand-coloured tiles that reshuffle colour and framing on the spoken beat.",
  "params": [
    {
      "key": "layout",
      "label": "Layout",
      "type": "select",
      "options": [
        "hero",
        "2x2",
        "3x3"
      ],
      "default": "hero"
    },
    {
      "key": "label",
      "label": "Label chip",
      "type": "text",
      "default": ""
    }
  ],
  "status": "ready"
};

// ---- colour helpers
function rgb(hex) {
  const h = String(hex || "#000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (hex) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const hexA = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };

function palette(C) {
  const accent = C.accent || "#FFD400";
  const paper = lum(C.surface) > 0.6 ? C.surface : lum(C.text) > 0.75 ? mix(C.text, "#F4EFE6", 0.5) : "#F4EFE6";
  const ink = lum(C.outline) < 0.2 ? C.outline : "#0E0D0C";
  const deep = C.danger && C.danger.toLowerCase() !== accent.toLowerCase() ? C.danger : mix(accent, "#000", 0.4);
  return { tiles: [accent, paper, mix(accent, "#fff", 0.55), deep, mix(accent, paper, 0.5)], ink, paper, accent };
}

// ---- layouts. The grid lives in y 200..1240 so the caption band (captionY 1380) stays a clean strip.
const X0 = 48, Y0 = 200, W = 984, H = 1040, GAP = 14;

// slot: {x, y, w, h, r, rot, s (speaker scale), ax, ay (face point inside the tile), hero}
function slots(layout) {
  if (layout === "2x2" || layout === "3x3") {
    const n = layout === "2x2" ? 2 : 3;
    const cw = (W - GAP * (n - 1)) / n, ch = (H - GAP * (n - 1)) / n;
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      out.push({ x: X0 + c * (cw + GAP), y: Y0 + r * (ch + GAP), w: cw, h: ch, r: n === 2 ? 34 : 24, rot: 0,
        s: n === 2 ? 0.5 : 0.36, ax: cw / 2, ay: ch * (n === 2 ? 0.5 : 0.52) });
    }
    return out;
  }
  // hero: big centre tile, four small corner tiles overlapping its (faceless) corners
  const cw = 290, ch = 330;
  return [
    { x: 210, y: 360, w: 660, h: 800, r: 40, rot: 0, s: 0.66, ax: 330, ay: 240, hero: true },
    { x: X0, y: Y0, w: cw, h: ch, r: 26, rot: -3, s: 0.42, ax: cw / 2, ay: 150 },
    { x: X0 + W - cw, y: Y0, w: cw, h: ch, r: 26, rot: 2.5, s: 0.42, ax: cw / 2, ay: 150 },
    { x: X0, y: Y0 + H - ch, w: cw, h: ch, r: 26, rot: 2, s: 0.42, ax: cw / 2, ay: 150 },
    { x: X0 + W - cw, y: Y0 + H - ch, w: cw, h: ch, r: 26, rot: -2.5, s: 0.42, ax: cw / 2, ay: 150 },
  ];
}

// Framings/filters a tile cycles through on each hit. m scales the speaker (<= 1.08 keeps the face clear of the chip).
const LOOKS = [
  { m: 1, filter: "saturate(1.12) contrast(1.06)", tint: false },
  { m: 1.08, filter: "grayscale(1) contrast(1.25) brightness(1.06)", tint: true },
  { m: 0.92, filter: "contrast(1.4) saturate(1.55)", tint: false },
  { m: 1.04, filter: "grayscale(1) contrast(1.9) brightness(1.18)", tint: true },
  { m: 0.96, filter: "sepia(.45) saturate(1.5) hue-rotate(-12deg) contrast(1.1)", tint: false },
];
const HERO_LOOKS = [0, 2, 0, 4];

const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// Reshuffle points: spoken word starts at least 15 frames (0.5 s) apart, after the entrance and before the exit.
function hits(words, frames) {
  const out = [];
  let last = 12;
  for (const w of words || []) {
    if (w.from >= last + 15 && w.from < frames - 8) { out.push(w.from); last = w.from; }
  }
  if (!out.length) for (let f = 30; f < frames - 8; f += 21) out.push(f);
  return out;
}

export function styles({ frame, frames }) {
  // The grid owns the frame; the full-frame cutout layer is hidden (the cut-outs live in the tiles).
  return { hideBase: frame < frames - 5, cutout: { opacity: 0 } };
}

function Tile({ ctx, slot, k, kFrame, bg, bg0, look, prevLook, enterAt, chip }) {
  const { frame, fps, hasCutout, focus } = ctx;
  const sp = k > 0 ? Math.min(1, spring({ frame: frame - kFrame, fps, config: { damping: 15, stiffness: 320, mass: 0.6 } })) : 1;
  const inn = pop(frame, fps, enterAt, 11);
  const L = LOOKS[look], L0 = LOOKS[prevLook];
  const scale = (slot.hero ? 0.8 + 0.2 * inn : 0.6 + 0.4 * inn) * (k > 0 ? 0.94 + 0.06 * sp : 1);
  const s = slot.s * (L0.m + (L.m - L0.m) * sp);
  const fx = focus.x * 1080, fy = focus.y * 1920;
  let sc = s, tx = slot.ax - fx * s, ty = slot.ay - fy * s;
  if (!hasCutout) {
    // real footage: keep the tile covered (no black gaps) by clamping the pan
    sc = Math.max(s, slot.w / 1080, slot.h / 1920);
    tx = Math.min(0, Math.max(slot.w - 1080 * sc, slot.ax - fx * sc));
    ty = Math.min(0, Math.max(slot.h - 1920 * sc, slot.ay - fy * sc));
  }
  const shade = mix(bg, "#000", 0.4);
  const d = slot.hero ? 14 : 9;
  const filter = hasCutout ? `${L.filter} drop-shadow(${d}px ${d}px 0 ${hexA(shade, 0.6)})` : L.filter;
  // the new colour wipes in as a circle from the tile's top-left corner
  const wipe = 150 * sp;
  return (
    <div style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.w, height: slot.h, borderRadius: slot.r,
      transform: `rotate(${slot.rot}deg) scale(${scale})`, opacity: slot.hero ? 1 : 0.35 + 0.65 * ease(frame, enterAt, 4), boxShadow: "0 22px 50px rgba(0,0,0,.45)" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: slot.r, overflow: "hidden", background: bg0 }}>
        <div style={{ position: "absolute", inset: 0, background: bg, clipPath: `circle(${wipe}% at 0% 0%)` }} />
        {/* pop-art halftone, heavier toward the bottom-right */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.16,
          backgroundImage: "radial-gradient(rgba(0,0,0,.9) 22%, rgba(0,0,0,0) 26%)", backgroundSize: slot.hero ? "22px 22px" : "16px 16px",
          maskImage: "linear-gradient(160deg, rgba(0,0,0,0) 30%, #000 100%)", WebkitMaskImage: "linear-gradient(160deg, rgba(0,0,0,0) 30%, #000 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${sc})` }}>
          <Speaker cutout={hasCutout} filter={filter} origin="50% 50%" />
        </div>
        {!hasCutout && L.tint ? <div style={{ position: "absolute", inset: 0, background: bg, mixBlendMode: "multiply", opacity: 0.85 }} /> : null}
        {!hasCutout ? <div style={{ position: "absolute", inset: 0, borderRadius: slot.r, boxShadow: `inset 0 0 0 ${slot.hero ? 12 : 9}px ${bg}` }} /> : null}
        <div style={{ position: "absolute", inset: 0, borderRadius: slot.r, boxShadow: "inset 0 0 0 2px rgba(255,255,255,.14)" }} />
      </div>
      {slot.hero && hasCutout ? (
        // the head breaks out over the top edge of the hero tile (only the part above the tile is drawn here)
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(-400px -80px ${slot.h}px -80px)`, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
            transform: `translate(${tx}px, ${ty}px) scale(${sc})` }}>
            <Speaker cutout filter={filter} origin="50% 50%" />
          </div>
        </div>
      ) : null}
      {chip}
    </div>
  );
}

export function Behind(ctx) {
  const { params, frame, frames, fps, words, brand } = ctx;
  const P = palette(brand.colors);
  const layout = ["2x2", "3x3", "hero"].includes(params.layout) ? params.layout : "hero";
  const S = slots(layout);
  const HT = hits(words, frames);
  let k = 0;
  while (k < HT.length && HT[k] <= frame) k++;
  const kFrame = k > 0 ? HT[k - 1] : 0;
  // colour offset walks by 1..4 (never a multiple of 5), so every tile changes colour on every hit
  const off = (n) => { let o = 0; for (let j = 1; j <= n; j++) o += 1 + Math.floor(rnd(j, 3) * 4); return o; };
  const NC = P.tiles.length;
  const colour = (n, i) => P.tiles[(i + off(n)) % NC];
  const lookAt = (n, i) => (S[i].hero ? HERO_LOOKS[n % HERO_LOOKS.length] : (i * 2 + n * 3 + 1) % LOOKS.length);
  const o = exitFade(frame, frames);
  const stagger = 9 / Math.max(1, S.length - 1);

  // label chip sits in the bottom-left tile, under its face box (never over a face, clear of the right 140 px)
  const label = String(params.label || "").trim();
  const chipIdx = layout === "hero" ? 3 : layout === "2x2" ? 2 : 6;
  const big = layout === "2x2";
  const chip = label ? (
    <div style={{ position: "absolute", left: 16, bottom: 14, maxWidth: S[chipIdx].w - 32, padding: big ? "10px 18px" : "8px 13px",
      borderRadius: 999, background: P.ink, color: P.paper, fontFamily: fontStack(brand.fonts.heading),
      fontSize: big ? 30 : 23, lineHeight: 1, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
      overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 9,
      transform: `scale(${pop(frame, fps, 12, 12)})`, transformOrigin: "0 100%", boxShadow: "0 8px 20px rgba(0,0,0,.35)" }}>
      <span style={{ width: 11, height: 11, borderRadius: 6, background: P.accent, flex: "none" }} />
      {label}
    </div>
  ) : null;

  return (
    <div style={{ ...fill, opacity: o }}>
      <div style={{ ...fill, background: `radial-gradient(ellipse 80% 55% at 50% 38%, ${mix(P.ink, P.accent, 0.12)}, ${P.ink} 75%)` }} />
      <div style={{ ...fill, opacity: 0.06, backgroundImage: `linear-gradient(${P.paper} 1px, transparent 1px), linear-gradient(90deg, ${P.paper} 1px, transparent 1px)`,
        backgroundSize: "60px 60px", backgroundPosition: "48px 20px" }} />
      {S.map((slot, i) => (
        <Tile key={i} ctx={ctx} slot={slot} k={k} kFrame={kFrame}
          bg={colour(k, i)} bg0={colour(Math.max(0, k - 1), i)}
          look={lookAt(k, i)} prevLook={lookAt(Math.max(0, k - 1), i)} enterAt={Math.round(i * stagger)}
          chip={i === chipIdx ? chip : null} />
      ))}
    </div>
  );
}
