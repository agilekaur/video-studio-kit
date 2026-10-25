import React from "react";
import { useCurrentFrame } from "remotion";
import { fill, ease, pop, exitFade, fontStack, listParam, faceBands } from "../kit.jsx";

export const meta = {
  "id": "cover-story",
  "name": "Cover Story",
  "big": true,
  "needs": [],
  "prefers": [
    "cutout"
  ],
  "purposes": [
    "hook"
  ],
  "sfx": "thud",
  "captionY": 1360,
  "desc": "Huge masthead word with a slow push in. Sits behind the head when a cutout is ready, otherwise in the clear band above or below the face (never over it).",
  "params": [
    {
      "key": "word",
      "label": "Word",
      "type": "text",
      "default": ""
    },
    {
      "key": "color",
      "label": "Colour",
      "type": "color",
      "default": ""
    }
  ],
  "status": "ready"
};

export function styles({ frame, frames }) {
  return { zoom: 1 + 0.06 * Math.min(frame / Math.max(frames, 1), 1) };
}

// Captions sit at meta.captionY on this beat, so the free band under the face ends above them.
const CAPTION_TOP = 1360 - 140;

function Word({ params, text, brand, frame, frames, front, focus }) {
  const word = (params.word || keyWord(text)).toUpperCase();
  if (!word) return null;
  let size = Math.min(420, 1000 / Math.max(word.length * 0.62, 1));
  let top = 430 - size * 0.55;
  if (front) {
    // in front of the footage: the larger clear band above or below the face, never on it
    const { above, below } = faceBands(focus, undefined, CAPTION_TOP);
    const band = above[1] - above[0] >= below[1] - below[0] ? above : below;
    size = Math.min(size, (band[1] - band[0]) / 1.2);   // room for the 1.15x entry pop
    top = (band[0] + band[1]) / 2 - size * 0.5;
  }
  const k = 1 + 0.15 * (1 - ease(frame, 0, 6));
  const o = ease(frame, 0, 4) * exitFade(frame, frames, 4);
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top, textAlign: "center", opacity: front ? 0.95 * o : o,
      transform: `scale(${k})`, fontFamily: fontStack(brand.fonts.heading), fontSize: size, lineHeight: 1, letterSpacing: -size * 0.03,
      color: params.color || brand.colors.accent, textShadow: "0 10px 30px rgba(0,0,0,.35)" }}>{word}</div>
  );
}

export function Behind(ctx) {
  return ctx.hasCutout ? <Word {...ctx} front={false} /> : null;
}

export function Front(ctx) {
  return ctx.hasCutout ? null : <Word {...ctx} front />;
}

function keyWord(t) {
  const stop = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very".split(" "));
  const c = String(t || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !stop.has(w.toLowerCase()));
  return c.sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0] || "";
}
