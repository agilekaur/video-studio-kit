import React from "react";
import { fill, ease, exitFade, fontStack } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "headline-wall",
  "name": "Headline Wall",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "point"
  ],
  "sfx": null,
  "desc": "Repeating typographic pattern of a keyword scrolls slowly behind the cut-out speaker.",
  "params": [
    {
      "key": "word",
      "label": "Keyword",
      "type": "text",
      "default": ""
    },
    {
      "key": "theme",
      "label": "Wall",
      "type": "select",
      "options": [
        "accent",
        "night"
      ],
      "default": "accent"
    }
  ],
  "status": "ready"
};

function keyWord(t) {
  const stop = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very".split(" "));
  const c = String(t || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !stop.has(w.toLowerCase()));
  return c.sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0] || "";
}

// The wall replaces the room while the cutout sits on top; it hands back to the real footage in the last 5 frames.
export function styles({ hasCutout, frame, frames }) {
  if (!hasCutout) return {};
  return { hideBase: frame < frames - 5, zoom: 1 + 0.03 * Math.min(frame / Math.max(frames, 1), 1) };
}

const ROW = 176;

function hexA(hex, a) {
  const h = String(hex || "#FFD400").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function Behind(ctx) {
  const { params, text, frame, frames, brand, hasCutout } = ctx;
  const word = (params.word || keyWord(text) || "FOCUS").toUpperCase();
  const C = brand.colors;
  const night = params.theme === "night"; // black ground, keyword in the accent (editorial look)
  const bg = night ? "#0B0B0C" : C.accent;
  const ink = night ? hexA(C.accent, 0.22) : "rgba(0,0,0,.13)";
  const stroke = night ? hexA(C.accent, 0.5) : "rgba(0,0,0,.16)";
  const size = 168;
  const charW = size * 0.62;
  const unit = word.length * charW + size * 0.5;
  const reps = Math.ceil(1400 / unit) + 2;
  const scroll = (frame * 3) % (ROW * 2); // 90 px per second, upward
  const rows = Math.ceil(1920 / ROW) + 3;
  const enter = ease(frame, 0, 9);
  const o = exitFade(frame, frames);
  const wall = (
    <div style={{ ...fill, background: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -200, top: -scroll - ROW, width: 1480,
        transform: `scale(${1.12 - 0.12 * enter})`, transformOrigin: "50% 40%" }}>
        {Array.from({ length: rows }).map((_, r) => {
          const outline = r % 2 === 1;
          return (
            <div key={r} style={{ height: ROW, whiteSpace: "nowrap", marginLeft: (r % 2) * -unit / 2 - ((((frame * (r % 2 ? 0.6 : -0.6)) % unit) + unit) % unit),
              fontFamily: fontStack(brand.fonts.heading), fontSize: size, lineHeight: `${ROW}px`, letterSpacing: -size * 0.02,
              color: outline ? "transparent" : ink,
              WebkitTextStroke: outline ? `3px ${stroke}` : undefined,
              opacity: 0.35 + 0.65 * ease(frame, (r % 6) * 1.2, 6) }}>
              {Array.from({ length: reps }).map((_, k) => <span key={k} style={{ marginRight: size * 0.5 }}>{word}</span>)}
            </div>
          );
        })}
      </div>
      {/* soft light from behind the head so the silhouette separates */}
      <div style={{ ...fill, background: night
        ? `radial-gradient(ellipse 55% 38% at 50% 32%, ${hexA(C.accent, 0.22)}, rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.55))`
        : "radial-gradient(ellipse 60% 40% at 50% 32%, rgba(255,255,255,.28), rgba(255,255,255,0) 70%), linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.28))" }} />
    </div>
  );
  if (hasCutout) return <div style={{ ...fill, opacity: o }}>{wall}</div>;
  // No cutout: the wall frames a rounded window of the footage instead of covering the face.
  const k = ease(frame, 0, 8);
  return (
    <div style={{ ...fill, opacity: o }}>
      {wall}
      <Speaker style={{ left: 90, top: 200, width: 900, height: 1300, borderRadius: 44, transform: `scale(${0.94 + 0.06 * k})`,
        boxShadow: "0 30px 80px rgba(0,0,0,.4)" }} origin="50% 30%" zoom={1.05} />
    </div>
  );
}
