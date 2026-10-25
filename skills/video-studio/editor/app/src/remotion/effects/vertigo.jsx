import React from "react";
import { interpolate, Easing } from "remotion";
import { fill, ease, exitFade, fontStack, faceBands } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "vertigo",
  "name": "Vertigo",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "hook"
  ],
  "sfx": "whoosh",
  "desc": "Dolly zoom: background widens and warps while the speaker stays the same size; big text behind.",
  "params": [
    {
      "key": "word",
      "label": "Word behind",
      "type": "text",
      "default": ""
    }
  ],
  "captionY": 1360,
  "status": "ready"
};

function keyWord(t) {
  const stop = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very".split(" "));
  const c = String(t || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !stop.has(w.toLowerCase()));
  return c.sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0] || "";
}

// p: 0..1 dolly progress over the first 1.5 s, eased in-out, held after.
const prog = (frame) => interpolate(frame, [0, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

export function styles({ hasCutout, frame, frames }) {
  const p = prog(frame);
  // Without a cutout we can only push the whole frame; keep it subtle.
  if (!hasCutout) return { zoom: 1 + 0.12 * p };
  // The effect redraws the background itself; the cutout stays at 1.0.
  return { hideBase: frame < frames - 5 };
}

function Word({ params, text, brand, frame, frames, p, front, focus }) {
  const word = (params.word || keyWord(text) || "WAIT").toUpperCase();
  let size = Math.min(400, 1180 / Math.max(word.length * 0.6, 1));
  let cy = 520;
  if (front) {
    // in front of the footage: centred in the larger clear band above/below the face (drawn at ~0.64x)
    const { above, below } = faceBands(focus, undefined, 1220);
    const band = above[1] - above[0] >= below[1] - below[0] ? above : below;
    size = Math.min(size, (band[1] - band[0]) / 0.68);
    cy = (band[0] + band[1]) / 2;
  }
  const k = 0.8 + 0.2 * ease(frame, 2, 10) + 0.06 * p;
  const o = ease(frame, 2, 6) * exitFade(frame, frames);
  return (
    <div style={{ position: "absolute", left: -60, width: 1200, top: cy - size * 0.5, textAlign: "center", opacity: front ? 0.95 * o : o,
      transform: `scale(${front ? k * 0.6 : k})`, fontFamily: fontStack(brand.fonts.heading), fontSize: size, lineHeight: 1,
      letterSpacing: -size * 0.04, color: "#fff", whiteSpace: "nowrap", textShadow: "0 14px 40px rgba(0,0,0,.45)" }}>{word}</div>
  );
}

export function Behind(ctx) {
  const { frame, frames, hasCutout, focus } = ctx;
  if (!hasCutout) return null;
  const p = prog(frame);
  // Background field of view widens: scale down from 1.0 to 0.7, stretch slightly, tilt back and soften.
  const z = 1 - 0.3 * p;
  const warp = `perspective(1100px) rotateX(${6 * p}deg) scale(${1 + 0.1 * p}, ${1 - 0.04 * p})`;
  const o = exitFade(frame, frames);
  return (
    <div style={{ ...fill, opacity: o, background: "#000" }}>
      {/* stretched, blurred fill so the widening frame never shows black edges */}
      <Speaker zoom={1 + 0.5 * p} filter={`blur(${28 * p}px) brightness(${1 - 0.35 * p}) saturate(1.2)`} />
      <div style={{ ...fill, transform: `${warp} scale(${z})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
        WebkitMaskImage: `radial-gradient(ellipse closest-side at 50% 50%, #000 ${100 - 45 * p}%, transparent 100%)` }}>
        <Speaker filter={`brightness(${1 - 0.25 * p}) blur(${1.5 * p}px)`} />
      </div>
      {/* lens vignette sells the stretch */}
      <div style={{ ...fill, background: `radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 35%, rgba(0,0,0,${0.55 * p}) 100%)` }} />
      <Word {...ctx} p={p} front={false} />
    </div>
  );
}

export function Front(ctx) {
  return ctx.hasCutout ? null : <Word {...ctx} p={prog(ctx.frame)} front />;
}
