import React from "react";
import { interpolate } from "remotion";
import { fill, ease, pop } from "../kit.jsx";

export const meta = {
  "id": "frame-break",
  "name": "Frame Break",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "hook",
    "punch"
  ],
  "sfx": "thud",
  "desc": "Speaker sits in a square window on dark grey; the head breaks out of the frame.",
  "params": [
    {
      "key": "bg",
      "label": "Background",
      "type": "color",
      "default": "#2a2a2e"
    }
  ],
  "status": "ready"
};

// Square 1:1 window, 940 px, centred horizontally. The head (top of frame) breaks out above it.
const WX = 70, WS = 940, RAD = 44;
const BREAK = 7; // frame the head pops out of the window

// 0 = full frame, 1 = square window. Shrinks in over 7 frames and opens back up over the last 5.
function closeAmt(frame, frames) {
  const inn = ease(frame, 0, 7);
  const out = interpolate(frame, [frames - 6, frames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(inn, out);
}

function win(ctx) {
  const fy = ctx.focus.y * 1920;
  // With a cutout the window sits below the eyes so the head breaks out; without one it frames the whole face.
  const wy = ctx.hasCutout ? Math.round(Math.min(560, Math.max(380, fy - 120))) : Math.round(Math.min(560, Math.max(150, fy - WS * 0.42)));
  const k = closeAmt(ctx.frame, ctx.frames);
  return {
    wy, k,
    l: WX * k, t: wy * k, r: WX * k, b: (1920 - wy - WS) * k, rad: RAD * k,
  };
}

export function styles(ctx) {
  const w = win(ctx);
  const base = { clipPath: `inset(${w.t}px ${w.r}px ${w.b}px ${w.l}px round ${w.rad}px)` };
  if (!ctx.hasCutout) return { base };
  const broken = ctx.frame >= BREAK && w.k > 0.98;
  // Cutout: inside the window, plus everything above the window top once the head breaks out.
  const x0 = w.l, x1 = 1080 - w.r, y0 = w.t, y1 = 1920 - w.b, r = Math.max(w.rad, 0.01);
  const path = broken
    ? `path('M0 0 H1080 V${y0} H${x1} V${y1 - r} A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y1 - r} V${y0} H0 Z')`
    : `inset(${w.t}px ${w.r}px ${w.b}px ${w.l}px round ${w.rad}px)`;
  const p = broken ? pop(ctx.frame, ctx.fps, BREAK, 9) : 0;
  const s = 1 + 0.05 * Math.sin(Math.min(p, 1) * Math.PI);
  const cut = { clipPath: path };
  if (s !== 1) {
    cut.transform = `scale(${s})`;
    cut.transformOrigin = `50% ${w.wy + WS}px`;
  }
  return { base, cutout: cut };
}

export function Behind(ctx) {
  const { params, frame, frames } = ctx;
  const w = win(ctx);
  const bg = params.bg || "#2a2a2e";
  const x0 = w.l, y0 = w.t, ww = 1080 - w.l - w.r, hh = 1920 - w.t - w.b;
  return (
    <div style={{ ...fill, overflow: "hidden" }}>
      {/* dark ground with a window-shaped hole: base video shows through */}
      <div style={{ position: "absolute", left: x0, top: y0, width: ww, height: hh, borderRadius: w.rad,
        boxShadow: `0 0 0 3000px ${bg}`, opacity: w.k > 0.001 ? 1 : 0 }} />
      {/* soft grain-free vignette on the ground */}
      <div style={{ ...fill, opacity: w.k, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.06), rgba(0,0,0,.35) 75%)",
        WebkitMaskImage: "none" }} />
      {/* window rim: under the cutout, so the head overlaps it when it breaks out */}
      <div style={{ position: "absolute", left: x0 - 3, top: y0 - 3, width: ww + 6, height: hh + 6, borderRadius: w.rad + 3,
        border: `3px solid rgba(255,255,255,${0.55 * w.k})`, boxSizing: "border-box",
        boxShadow: `0 30px 80px rgba(0,0,0,${0.5 * w.k})` }} />
    </div>
  );
}
