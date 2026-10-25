import React from "react";
import { fill, pop, exitFade } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "paper-cut",
  "name": "Paper Cut",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "punch",
    "point"
  ],
  "sfx": null,
  "desc": "Speaker cut out on black with a torn white paper border and stop-motion boil.",
  "params": [],
  "status": "ready"
};

// Stop-motion: everything that boils changes every 3 frames, seeded from the step number.
const step = (frame) => Math.floor(frame / 3);
const rnd = (n, k) => {
  const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function jitter(ctx) {
  const n = step(ctx.frame);
  const p = pop(ctx.frame, ctx.fps, 0, 10);
  const s = 0.9 + 0.1 * p;
  const dx = (rnd(n, 1) - 0.5) * 8, dy = (rnd(n, 2) - 0.5) * 8, r = (rnd(n, 3) - 0.5) * 1.2;
  return `translate(${dx}px, ${dy}px) rotate(${r}deg) scale(${s})`;
}

export function styles(ctx) {
  if (!ctx.hasCutout) return {};
  const live = ctx.frame < ctx.frames - 5;
  return live ? { hideBase: true, cutout: { transform: jitter(ctx) } } : {};
}

function TornFilter({ id, seed, radius, low = 26, high = 9 }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed={seed} result="n1" />
          <feDisplacementMap in="d" in2="n1" scale={low} xChannelSelector="R" yChannelSelector="G" result="j1" />
          <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="2" seed={seed + 7} result="n2" />
          <feDisplacementMap in="j1" in2="n2" scale={high} xChannelSelector="G" yChannelSelector="B" result="j2" />
          <feFlood floodColor="#f7f5ef" result="w" />
          <feComposite in="w" in2="j2" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

export function Behind(ctx) {
  const { frame, frames, hasCutout, focus } = ctx;
  if (!hasCutout) return null;
  const n = step(frame);
  const id = `pc-torn-${n}`;
  const o = exitFade(frame, frames);
  return (
    <div style={{ ...fill, opacity: o }}>
      <div style={{ ...fill, background: "radial-gradient(ellipse at 50% 35%, #161616, #000 70%)" }} />
      <TornFilter id={id} seed={(n % 97) + 1} radius={22} low={30} high={11} />
      <div style={{ ...fill, transform: jitter(ctx), transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
        filter: `url(#${id}) drop-shadow(0 18px 30px rgba(0,0,0,.6))` }}>
        <Speaker cutout />
      </div>
    </div>
  );
}

export function Front(ctx) {
  const { frame, frames, hasCutout } = ctx;
  const n = step(frame);
  const o = exitFade(frame, frames);
  const grain = (
    <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0, opacity: 0.06 * o, mixBlendMode: "overlay" }}>
      <filter id={`pc-grain-${n}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={n % 50} /></filter>
      <rect width="1080" height="1920" filter={`url(#pc-grain-${n})`} />
    </svg>
  );
  if (hasCutout) return <div style={fill}>{grain}</div>;
  // No cutout: a torn white paper frame around the footage instead.
  const id = `pc-frame-${n}`;
  const k = pop(frame, ctx.fps, 0, 10);
  return (
    <div style={{ ...fill, opacity: o }}>
      <TornFilter id={id} seed={(n % 97) + 1} radius={0} low={30} high={10} />
      <div style={{ ...fill, filter: `url(#${id})`, transform: jitter(ctx) }}>
        <div style={{ position: "absolute", left: 70 - 30 * (1 - k), top: 150, right: 70, bottom: 360, borderRadius: 18,
          border: "26px solid #fff", boxShadow: "0 0 0 1400px #fff" }} />
      </div>
      <div style={{ ...fill, transform: jitter(ctx) }}>
        <div style={{ position: "absolute", left: 40, top: 120, right: 40, bottom: 330, boxShadow: "0 0 0 1400px #000", borderRadius: 30 }} />
      </div>
      {grain}
    </div>
  );
}
