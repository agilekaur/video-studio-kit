import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing } from "remotion";
import { fill, ease, exitFade } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "green-screen",
  "name": "Green Screen",
  "big": true,
  "needs": [],
  "prefers": [
    "cutout"
  ],
  "purposes": [
    "point",
    "tools"
  ],
  "sfx": null,
  "desc": "A screen recording or document fills the background; the speaker sits small in the corner.",
  "params": [
    {
      "key": "media",
      "label": "Background media",
      "type": "media",
      "default": ""
    }
  ],
  "status": "ready"
};

// cutout target: scale S, placed so the face lands bottom right, body running off the bottom edge
const S = 0.52;
const CX = 1080 - 1080 * S + 90, CY = 1920 - 1920 * S + 130;

function moveT(frame) {
  return interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
}

export function styles({ frame, frames, hasCutout }) {
  const t = moveT(frame);
  const s = 1 + (S - 1) * t;
  const o = exitFade(frame, frames);
  return {
    hideBase: true,
    cutout: hasCutout ? {
      transformOrigin: "0 0", transform: `translate(${CX * t}px, ${CY * t}px) scale(${s})`, opacity: o,
      filter: `drop-shadow(0 ${20 * t}px ${24 * t}px rgba(0,0,0,.55))`,
    } : undefined,
  };
}

function MediaBg({ m, frame, C }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  const el = (extra) => m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={{ ...st, ...extra }} /></Loop>
    : <Img src={m.url} style={{ ...st, ...extra }} />;
  const landscape = m.w && m.h && m.w > m.h;
  if (!landscape) return <div style={fill}>{el()}</div>;
  // landscape: fit to width on a dark panel near the top, blurred copy fills the frame
  const w = 1000, h = Math.round(w * m.h / m.w);
  const p = ease(frame, 2, 12);
  return (
    <div style={fill}>
      <div style={{ ...fill, filter: "blur(40px) brightness(.35) saturate(1.1)", transform: "scale(1.15)" }}>{el()}</div>
      <div style={{ position: "absolute", left: 40, top: 230 + 40 * (1 - p), width: w, height: h, borderRadius: 28, overflow: "hidden",
        opacity: p, boxShadow: "0 30px 70px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.08)" }}>{el()}</div>
    </div>
  );
}

function BrandBg({ C, frame }) {
  const drift = frame * 0.6;
  return (
    <div style={{ ...fill, background: `radial-gradient(120% 70% at 20% 10%, ${C.accent}66 0%, rgba(0,0,0,0) 55%), radial-gradient(90% 60% at 90% 80%, ${C.primary}40 0%, rgba(0,0,0,0) 60%), linear-gradient(160deg, ${C.surface} 0%, #050506 100%)` }}>
      <div style={{ ...fill, opacity: 0.22, backgroundImage: "radial-gradient(rgba(255,255,255,.55) 1.5px, transparent 1.6px)",
        backgroundSize: "44px 44px", backgroundPosition: `${drift}px ${drift * 0.5}px` }} />
    </div>
  );
}

export function Behind({ params, frame, frames, brand, media }) {
  const C = brand.colors;
  const m = params.media ? media(params.media) : null;
  return (
    <div style={{ ...fill, opacity: exitFade(frame, frames) }}>
      {m ? <MediaBg m={m} frame={frame} C={C} /> : <BrandBg C={C} frame={frame} />}
    </div>
  );
}

// No cutout: a rounded picture-in-picture window bottom right, clear of the platform UI.
export function Front({ frame, frames, fps, brand, hasCutout, focus }) {
  if (hasCutout) return null;
  const C = brand.colors;
  const t = moveT(frame);
  const W = 320, H = 410, X = 1080 - 140 - W, Y = 1200;
  const lerp = (a, b) => a + (b - a) * t;
  const box = { left: lerp(0, X), top: lerp(0, Y), width: lerp(1080, W), height: lerp(1920, H) };
  const z = 1 + 0.3 * t;
  return (
    <div style={{ ...fill, opacity: exitFade(frame, frames) }}>
      <div style={{ position: "absolute", ...box, borderRadius: 36 * t, overflow: "hidden",
        boxShadow: `0 24px 60px rgba(0,0,0,.55), 0 0 0 ${5 * t}px ${C.accent}` }}>
        <Speaker zoom={z} origin="50% 18%" style={{ width: box.width, height: box.height }} />
      </div>
    </div>
  );
}
