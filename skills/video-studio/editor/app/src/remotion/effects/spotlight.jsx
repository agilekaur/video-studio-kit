import React from "react";
import { useCurrentFrame } from "remotion";
import { fill, ease, pop, exitFade, fontStack, listParam } from "../kit.jsx";

export const meta = {
  "id": "spotlight",
  "name": "Spotlight",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "punch"
  ],
  "sfx": "thud",
  "desc": "Instant darken with a feathered circle on the face for a punch line.",
  "params": [
    {
      "key": "radius",
      "label": "Radius",
      "type": "range",
      "min": 120,
      "max": 520,
      "step": 10,
      "default": 260
    },
    {
      "key": "dim",
      "label": "Darkness",
      "type": "range",
      "min": 0.3,
      "max": 0.9,
      "step": 0.05,
      "default": 0.65
    }
  ],
  "status": "ready"
};

export function Front({ params, frame, frames, focus }) {
  const r = +params.radius || 260;
  const dim = +params.dim || 0.65;
  const o = exitFade(frame, frames, 4);
  const cx = focus.x * 1080, cy = focus.y * 1920;
  return (
    <div style={{ ...fill, opacity: o,
      background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(0,0,0,0) ${r}px, rgba(0,0,0,${dim}) ${r + 160}px)` }} />
  );
}
