import React from "react";
import { fill, ease, exitFade, fontStack, faceBands } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "glass-type",
  "name": "Glass Type",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "hook"
  ],
  "sfx": "thud",
  "desc": "A huge word in front of the speaker acts as frosted glass: blurs and refracts the video beneath.",
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

// The word sits in the larger clear band above or below the face (never over it); captions drop to captionY.

function keyWord(t) {
  const stop = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very".split(" "));
  const c = String(t || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !stop.has(w.toLowerCase()));
  return c.sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0] || "";
}

export function Front({ params, frame, frames, brand, beat, focus }) {
  const word = String(params.word || keyWord(arguments[0].text) || "").toUpperCase();
  if (!word) return null;
  const id = `glass-${(beat && beat.id) || "x"}`.replace(/[^a-zA-Z0-9_-]/g, "");
  // fit inside x 60..940 (clear of the right-side UI); textLength forces the exact width
  const { above, below } = faceBands(focus, undefined, 1220);
  const band = above[1] - above[0] >= below[1] - below[0] ? above : below;
  const size = Math.round(Math.min(380, 880 / Math.max(word.length * 0.6, 1), (band[1] - band[0]) / 1.4));
  const len = Math.min(880, Math.round(word.length * size * 0.68));
  const CY = (band[0] + band[1]) / 2;
  const font = fontStack(brand.fonts.heading);
  const p = ease(frame, 0, 8);
  const k = 1.18 - 0.18 * p;
  const drift = 20 * Math.min(1, frame / Math.max(frames, 1)) - 10;
  const o = p * exitFade(frame, frames);
  const x = 500 + drift, y = CY + size * 0.35;
  const tf = `translate(500px, ${CY}px) scale(${k}) translate(-500px, ${-CY}px)`;
  const textProps = { x, y, textAnchor: "middle", fontFamily: font, fontSize: size, fontWeight: brand.fonts.heading.weight || 800, textLength: len, lengthAdjust: "spacingAndGlyphs" };
  // refraction: the copy under the glass is magnified and shifted, like looking through a thick pane
  const ref = `${focus.x * 100 + 3}% ${(CY / 1920) * 100}%`;
  return (
    <div style={{ ...fill, opacity: o }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            <text {...textProps}>{word}</text>
          </clipPath>
          <linearGradient id={`${id}-edge`} x1="0" y1={CY - size * 0.6} x2="0" y2={CY + size * 0.5} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={`${id}-sheen`} x1="0" y1={CY - size * 0.6} x2="0" y2={CY + size * 0.5} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
          </linearGradient>
          <filter id={`${id}-sh`} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
      </svg>
      {/* soft shadow so the pane lifts off the footage */}
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0, transform: tf }}>
        <text {...textProps} y={y + 22} fill="#000" fillOpacity="0.35" filter={`url(#${id}-sh)`}>{word}</text>
      </svg>
      {/* frosted, refracted copy of the footage clipped to the letters */}
      <div style={{ ...fill, transform: tf, clipPath: `url(#${id})`, WebkitClipPath: `url(#${id})` }}>
        <div style={{ ...fill, transform: `translate(500px, ${CY}px) scale(${1 / k}) translate(-500px, ${-CY}px)` }}>
          <Speaker zoom={1.14} origin={ref} filter="blur(14px) brightness(1.28) saturate(1.25)" />
        </div>
      </div>
      {/* tint, sheen and edge highlight */}
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0, transform: tf }}>
        <text {...textProps} fill={`url(#${id}-sheen)`}>{word}</text>
        <text {...textProps} fill="none" stroke={`url(#${id}-edge)`} strokeWidth="3">{word}</text>
        <text {...textProps} x={x - 2} y={y - 3} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5">{word}</text>
      </svg>
    </div>
  );
}
