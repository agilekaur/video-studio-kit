import React from "react";
import { useCurrentFrame } from "remotion";
import { fill, ease, pop, exitFade, fontStack, listParam } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "digital-zoom",
  "name": "Digital Zoom",
  "big": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "hook",
    "punch"
  ],
  "sfx": null,
  "desc": "Jump-cut punch in on the face. Plain, stepped (alternating crops) or viewfinder (blurred frame, small sharp window, REC dot).",
  "params": [
    {
      "key": "scale",
      "label": "Zoom",
      "type": "select",
      "options": [
        "1.10",
        "1.25",
        "1.40"
      ],
      "default": "1.25"
    },
    {
      "key": "mode",
      "label": "Mode",
      "type": "select",
      "options": [
        "plain",
        "stepped",
        "viewfinder"
      ],
      "default": "plain"
    }
  ],
  "status": "ready"
};

// Plain: one crop for the whole beat. Stepped: alternates 1.0 / mid / full every ~0.5 s.
// Viewfinder: blurred full frame + small sharp rounded window with a REC dot, snap-zooming in three steps.
export function styles({ params, frame }) {
  const z = +params.scale || 1.25;
  const mode = params.mode || "plain";
  if (mode === "stepped") {
    const seq = [1, (1 + z) / 2, z, (1 + z) / 2];
    return { zoom: seq[Math.floor(frame / 15) % seq.length] };
  }
  if (mode === "viewfinder") return { filter: "blur(28px) brightness(.85)", zoom: 1.08 };
  return { zoom: z };
}

export function Front({ params, frame, frames, focus }) {
  if ((params.mode || "plain") !== "viewfinder") return null;
  const step = Math.min(2, Math.floor(frame / 4));
  const w = [760, 640, 520][step], h = Math.round(w * 1000 / 760);
  const x = 540 - w / 2, y = Math.max(160, focus.y * 1920 - h * 0.42);
  const blink = Math.floor(frame / 18) % 2 === 0;
  const z = 1080 / w * 0.62;
  return (
    <div style={{ ...fill, opacity: exitFade(frame, frames, 3) }}>
      <Speaker zoom={z} style={{ left: x, top: y, width: w, height: h, borderRadius: 34 }}
        origin={`${focus.x * 100}% ${((focus.y * 1920 - y) / h) * 100}%`} />
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 34, border: "4px solid #fff", boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: x + 30, top: y + 26, display: "flex", alignItems: "center", gap: 12, color: "#fff",
        fontFamily: "Arial", fontWeight: 700, fontSize: 30, letterSpacing: 2 }}>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: "#ff2b2b", opacity: blink ? 1 : 0.25 }} /> REC
      </div>
    </div>
  );
}
