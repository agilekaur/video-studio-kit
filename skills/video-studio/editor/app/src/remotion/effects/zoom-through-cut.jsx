import React from "react";
import { interpolate, Easing } from "remotion";
import { fill } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "zoom-through-cut",
  "name": "Zoom Through Cut",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point"
  ],
  "sfx": "whoosh",
  "desc": "Fast ease-in zoom into the speaker that wipes into the next beat.",
  "params": [],
  "status": "ready"
};

const N = 11; // frames of the zoom-through at the end of the beat

// 0..1 progress of the end zoom
function zp(frame, frames) {
  const n = Math.min(N, Math.max(4, Math.floor(frames / 3)));
  return interpolate(frame, [frames - n, frames - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
}

const chestY = (focus) => Math.min(0.85, focus.y + 0.2);

export function styles({ frame, frames, focus }) {
  const p = zp(frame, frames);
  // gentle build across the beat, then the accelerating punch into the chest
  const build = 1 + 0.05 * Math.min(1, frame / Math.max(frames, 1));
  const z = build * (1 + 5 * p);
  return {
    base: { transform: `scale(${z})`, transformOrigin: `${focus.x * 100}% ${chestY(focus) * 100}%` },
    filter: p > 0.02 ? `blur(${(p * 10).toFixed(2)}px) brightness(${1 + 0.35 * p})` : undefined,
  };
}

export function Front({ frame, frames, focus }) {
  const p = zp(frame, frames);
  if (p <= 0.001) return null;
  const ox = focus.x * 1080, oy = chestY(focus) * 1920;
  const build = 1 + 0.05 * Math.min(1, frame / Math.max(frames, 1));
  const z = build * (1 + 5 * p);
  const origin = `${focus.x * 100}% ${chestY(focus) * 100}%`;
  // radial speed lines, seeded from the index only (deterministic)
  const lines = Array.from({ length: 36 }, (_, k) => {
    const a = (k / 36) * Math.PI * 2 + ((k * 37) % 7) * 0.03;
    const r0 = 260 + ((k * 53) % 5) * 70 - 200 * p;
    const len = 300 + 900 * p;
    return { x1: ox + Math.cos(a) * r0, y1: oy + Math.sin(a) * r0, x2: ox + Math.cos(a) * (r0 + len), y2: oy + Math.sin(a) * (r0 + len), w: 3 + ((k * 11) % 4) };
  });
  const flash = interpolate(p, [0.55, 1], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={fill}>
      {/* zoom-blur trails: two echo copies pushed further in */}
      <div style={{ ...fill, opacity: 0.35 * p }}>
        <Speaker zoom={z * 1.12} origin={origin} filter={`blur(${6 * p}px)`} />
      </div>
      <div style={{ ...fill, opacity: 0.22 * p }}>
        <Speaker zoom={z * 1.28} origin={origin} filter={`blur(${10 * p}px)`} />
      </div>
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, p * 1.6) }}>
        {lines.map((l, k) => <line key={k} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#fff" strokeOpacity={0.55} strokeWidth={l.w} strokeLinecap="round" />)}
      </svg>
      <div style={{ ...fill, background: `radial-gradient(circle at ${ox}px ${oy}px, rgba(255,255,255,0) 0%, rgba(0,0,0,${0.5 * p}) 75%)` }} />
      <div style={{ ...fill, background: "#fff", opacity: flash }} />
    </div>
  );
}
