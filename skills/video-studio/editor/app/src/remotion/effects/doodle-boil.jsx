import React from "react";
import { interpolate } from "remotion";
import { fill, ease, exitFade } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "doodle-boil",
  "name": "Doodle Boil",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "point"
  ],
  "sfx": "pop",
  "desc": "Rough white outline traces the body and wiggles, with floating hand-drawn hearts.",
  "params": [],
  "status": "ready"
};

const step = (frame) => Math.floor(frame / 3);
const rnd = (n, k) => {
  const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Outline = (alpha dilated 12) minus (alpha dilated 3), wobbled by low-frequency noise that re-seeds every 3 frames.
function OutlineFilter({ id, seed }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="17" result="outer" />
          <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="inner" />
          <feComposite in="outer" in2="inner" operator="out" result="ring" />
          <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="ring" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="w" />
          <feFlood floodColor="#ffffff" result="white" />
          <feComposite in="white" in2="w" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

// Hand-drawn heart, control points nudged per boil step.
function heartPath(n, k) {
  const j = (i) => (rnd(n * 7 + k, i) - 0.5) * 5;
  return `M50 ${88 + j(1)} C ${18 + j(2)} ${66 + j(3)}, ${2 + j(4)} ${40 + j(5)}, ${20 + j(6)} ${20 + j(7)}
    C ${34 + j(8)} ${6 + j(9)}, ${48 + j(10)} ${16 + j(11)}, ${50 + j(12)} ${30 + j(13)}
    C ${53 + j(14)} ${14 + j(15)}, ${68 + j(16)} ${4 + j(17)}, ${82 + j(18)} ${19 + j(19)}
    C ${99 + j(20)} ${40 + j(21)}, ${82 + j(22)} ${66 + j(23)}, ${51 + j(24)} ${90 + j(25)}`;
}

// Hearts float up beside the head (never over the face), each on its own 48-frame loop.
const HEARTS = [
  { x: 120, y: 560, s: 1.0, t: 4 },
  { x: 840, y: 470, s: 0.8, t: 14 },
  { x: 200, y: 330, s: 0.65, t: 26 },
  { x: 780, y: 760, s: 0.9, t: 36 },
  { x: 90, y: 860, s: 0.7, t: 46 },
];

function Hearts({ frame, frames, brand }) {
  const n = step(frame);
  const fill2 = brand.colors.danger || "#FF4D6D";
  return HEARTS.map((h, k) => {
    if (frame < h.t) return null;
    const life = 48;
    const f = (frame - h.t) % life;
    const cycle = Math.floor((frame - h.t) / life);
    const rise = interpolate(f, [0, life], [0, -90]);
    const o = interpolate(f, [0, 6, life - 12, life], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const sc = h.s * interpolate(f, [0, 6], [0.4, 1], { extrapolateRight: "clamp" });
    const rot = (rnd(n, k) - 0.5) * 14 + (cycle % 2 ? 8 : -8);
    const wob = Math.sin((frame + k * 11) / 7) * 10;
    return (
      <svg key={k} width="170" height="170" viewBox="-10 -10 120 120" style={{ position: "absolute", left: h.x + wob, top: h.y + rise,
        opacity: o * exitFade(frame, frames), transform: `rotate(${rot}deg) scale(${sc})`, overflow: "visible",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,.25))" }}>
        <path d={heartPath(n, k)} fill={fill2} stroke="#fff" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
        <path d={`M${30 + (rnd(n, k + 3) - 0.5) * 3} 30 q 6 -8 14 -6`} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  });
}

export function Front(ctx) {
  const { frame, frames, hasCutout } = ctx;
  const n = step(frame);
  const id = `db-line-${n}`;
  const o = ease(frame, 0, 6) * exitFade(frame, frames);
  return (
    <div style={fill}>
      {hasCutout ? (
        <>
          <OutlineFilter id={id} seed={(n % 89) + 1} />
          <div style={{ ...fill, opacity: o, filter: `url(#${id})` }}>
            <Speaker cutout />
          </div>
        </>
      ) : (
        // No cutout: a boiling doodle frame around the edge instead of a body trace.
        <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
          <rect x={56 + (rnd(n, 1) - 0.5) * 6} y={150 + (rnd(n, 2) - 0.5) * 6} width={964} height={1360} rx="40"
            fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round"
            transform={`rotate(${(rnd(n, 3) - 0.5) * 0.8} 540 830)`} />
        </svg>
      )}
      <Hearts {...ctx} />
    </div>
  );
}
