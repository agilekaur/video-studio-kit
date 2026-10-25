import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing } from "remotion";
import { fill, ease, pop, exitFade } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "collage",
  "name": "Collage",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "pop",
  "desc": "Grid of clips playing at once with the speaker in one tile.",
  "params": [
    {
      "key": "media",
      "label": "Tile media",
      "type": "media",
      "default": ""
    },
    {
      "key": "grid",
      "label": "Grid",
      "type": "select",
      "options": [
        "2x2",
        "3x4"
      ],
      "default": "2x2"
    }
  ],
  "status": "ready"
};

const GAP = 12, R = 26;

export function styles() {
  return { hideBase: true };
}

// Tile rects: [speaker tile, ...others]. 2x2 = four 9:16-ish tiles; 3x4 = 3 cols x 4 rows with a 2x2 hero speaker tile.
function layout(grid) {
  const W = 1080, H = 1920;
  if (grid === "3x4") {
    const cw = (W - GAP * 4) / 3, ch = (H - GAP * 5) / 4;
    const cell = (c, r, w = 1, h = 1) => ({ x: GAP + c * (cw + GAP), y: GAP + r * (ch + GAP), w: cw * w + GAP * (w - 1), h: ch * h + GAP * (h - 1) });
    const rest = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if (!(r < 2 && c < 2)) rest.push(cell(c, r));
    return [cell(0, 0, 2, 2), ...rest];
  }
  const cw = (W - GAP * 3) / 2, ch = (H - GAP * 3) / 2;
  const cell = (c, r) => ({ x: GAP + c * (cw + GAP), y: GAP + r * (ch + GAP), w: cw, h: ch });
  return [cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)];
}

// variations for tiles that reuse the speaker footage when no media is set
const VARIANTS = [
  { zoom: 1.9, origin: "50% 30%", filter: "grayscale(1) contrast(1.1)" },
  { zoom: 1.35, origin: "50% 55%", filter: "saturate(1.3) hue-rotate(-14deg)" },
  { zoom: 2.6, origin: "46% 34%", filter: "contrast(1.15) brightness(.95)" },
  { zoom: 1.15, origin: "50% 40%", filter: "sepia(.45) saturate(1.2)" },
  { zoom: 2.2, origin: "50% 62%", filter: "grayscale(.6) brightness(1.05)" },
  { zoom: 1.6, origin: "40% 30%", filter: "saturate(.7) contrast(1.2)" },
];
const POS = ["50% 50%", "20% 50%", "80% 50%", "35% 40%", "65% 60%", "10% 50%", "90% 50%", "50% 30%"];

function MediaTile({ m, k }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: POS[k % POS.length] };
  if (m.kind !== "video") {
    const z = 1 + 0.25 * (k % 3);
    return <Img src={m.url} style={{ ...st, transform: `scale(${z})`, transformOrigin: POS[k % POS.length] }} />;
  }
  const total = Math.max(30, Math.round((m.duration || 6) * 30));
  const off = (k * 23) % Math.max(1, total - 30);
  return <Loop durationInFrames={total - off}><OffthreadVideo src={m.url} muted startFrom={off} style={st} /></Loop>;
}

export function Front({ params, frame, frames, fps, brand, media }) {
  const C = brand.colors;
  const m = params.media ? media(params.media) : null;
  const rects = layout(params.grid);
  const o = exitFade(frame, frames);
  // the speaker tile starts full frame and shrinks into its cell
  const t = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const s0 = rects[0];
  const lerp = (a, b) => a + (b - a) * t;
  const hero = { x: lerp(0, s0.x), y: lerp(0, s0.y), w: lerp(1080, s0.w), h: lerp(1920, s0.h) };
  const heroZoom = 1.2;
  return (
    <div style={{ ...fill, background: "#0b0b0c", opacity: o }}>
      {rects.slice(1).map((r, k) => {
        const st = 6 + k * 3;
        if (frame < st) return null;
        const s = 0.55 + 0.45 * pop(frame, fps, st, 11);
        const v = VARIANTS[k % VARIANTS.length];
        return (
          <div key={k} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: R, overflow: "hidden",
            transform: `scale(${s})`, opacity: ease(frame, st, 4), background: "#1a1a1c", boxShadow: "0 12px 30px rgba(0,0,0,.4)" }}>
            {m ? <MediaTile m={m} k={k} /> : (
              <div style={{ position: "absolute", left: 0, top: 0, width: r.w, height: r.h }}>
                <Speaker zoom={v.zoom} origin={v.origin} filter={v.filter} style={{ width: r.w, height: r.h }} />
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, borderRadius: R, boxShadow: "inset 0 0 0 2px rgba(255,255,255,.08)" }} />
          </div>
        );
      })}
      {/* speaker tile on top */}
      <div style={{ position: "absolute", left: hero.x, top: hero.y, width: hero.w, height: hero.h, borderRadius: R * t, overflow: "hidden",
        boxShadow: `0 18px 50px rgba(0,0,0,.5), 0 0 0 ${5 * t}px ${C.accent}` }}>
        <Speaker zoom={1 + (heroZoom - 1) * t} style={{ width: hero.w, height: hero.h }} />
      </div>
    </div>
  );
}
