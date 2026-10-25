import React from "react";
import { interpolate, Easing } from "remotion";
import { fill, pop, exitFade, fontStack } from "../kit.jsx";

export const meta = {
  "id": "intro-thumbnail-arch",
  "name": "Intro Thumbnail Arch",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "list"
  ],
  "sfx": "pop",
  "desc": "Numbered circles pop in an arch behind the speaker.",
  "params": [
    {
      "key": "count",
      "label": "How many",
      "type": "range",
      "min": 3,
      "max": 9,
      "step": 1,
      "default": 7
    }
  ],
  "status": "ready"
};

// With a cutout the speaker steps back (scale 0.78, anchored at the bottom) onto a clean backdrop so the arch has room
// above and around the head. The arch is an ellipse inside x 140..940, keeping the right 140 px clear.
const CX = 540, CY = 880, RX = 330, RY = 590, D = 140, SHRINK = 0.78;

const shrink = (frame, frames) => {
  const inn = interpolate(frame, [0, 8], [1, SHRINK], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(frame, [frames - 7, frames - 1], [SHRINK, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  return frame > frames - 7 ? out : inn;
};

export function styles({ hasCutout, frame, frames }) {
  if (!hasCutout) return {};
  return { hideBase: frame < frames - 1, cutout: { transform: `scale(${shrink(frame, frames)})`, transformOrigin: "50% 100%" } };
}

export function Behind(ctx) {
  const { params, frame, frames, fps, brand, hasCutout, focus } = ctx;
  const n = Math.max(3, Math.min(9, Math.round(+params.count || 7)));
  const fx = focus.x * 1080, fy = focus.y * 1920;
  const o = exitFade(frame, frames);
  const yellow = brand.colors.accent || "#FFD400";
  const k = hasCutout ? (1 - shrink(frame, frames)) / (1 - SHRINK) : 1;
  return (
    <div style={fill}>
      {hasCutout ? (
        <div style={{ ...fill, background: `radial-gradient(ellipse 70% 45% at 50% 42%, #3a3a44 0%, ${brand.colors.surface || "#111"} 70%)` }}>
          <div style={{ ...fill, background: "repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 2px, transparent 2px 90px)" }} />
        </div>
      ) : null}
      <div style={{ ...fill, opacity: o * k }}>
      {Array.from({ length: n }).map((_, i) => {
        const deg = 190 - (200 * i) / (n - 1); // left to right
        const a = (deg * Math.PI) / 180;
        const x = CX + RX * Math.cos(a), y = CY - RY * Math.sin(a);
        // No cutout: circles that would land on the face are skipped instead of covering it.
        if (!hasCutout && Math.abs(x - fx) < 260 && Math.abs(y - fy) < 330) return null;
        const s = pop(frame, fps, 2 + i * 4, 10);
        const bob = 6 * Math.sin((frame + i * 9) / 14);
        return (
          <div key={i} style={{ position: "absolute", left: x - D / 2, top: y - D / 2 + bob, width: D, height: D, borderRadius: D / 2,
            background: `radial-gradient(circle at 35% 30%, #fff6b0 0%, ${yellow} 45%, ${yellow} 100%)`,
            border: "6px solid #fff", boxSizing: "border-box", boxShadow: "0 16px 34px rgba(0,0,0,.35)",
            transform: `scale(${s}) rotate(${(1 - Math.min(s, 1)) * -40}deg)`, opacity: Math.min(1, s * 2),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: fontStack(brand.fonts.heading), fontSize: 82, lineHeight: 1, color: "#111", paddingTop: 4 }}>
            {i + 1}
          </div>
        );
      })}
      </div>
    </div>
  );
}
