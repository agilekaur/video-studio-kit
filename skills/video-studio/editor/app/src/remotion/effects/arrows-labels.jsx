import React from "react";
import { ease, pop, exitFade, fontStack, faceBox } from "../kit.jsx";

export const meta = {
  "id": "arrows-labels",
  "name": "Arrows and Labels",
  "big": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point",
    "punch"
  ],
  "sfx": "pop",
  "desc": "Hand-drawn boiling arrow curls up from a typed label below the face and points at the speaker.",
  "params": [
    {
      "key": "label",
      "label": "Label",
      "type": "text",
      "default": ""
    },
    {
      "key": "side",
      "label": "Side",
      "type": "select",
      "options": [
        "right",
        "left"
      ],
      "default": "right"
    }
  ],
  "captionY": 1360,
  "status": "ready"
};

// deterministic noise in [-1, 1] from integers
const rnd = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

export function Front({ params, frame, frames, fps, brand, focus, text }) {
  const C = brand.colors;
  const left = params.side === "left";
  const sx = (x) => (left ? 1080 - x : x); // mirror for the left side
  const fx = focus.x * 1080, fy = focus.y * 1920;
  const words = String(text || "").split(/[.,;!?]+/)[0].trim().split(/\s+/).filter(Boolean);
  const raw = String(params.label || "").trim() || words.slice(0, 3).join(" ") || "Look";
  const label = raw.length > 18 ? raw.slice(0, 17).trimEnd() + "…" : raw;
  // label box lives on the chest, under the chin and never on the face; captions drop to captionY
  const fb = faceBox(focus);
  const ly = Math.max(fb.bottom + 50, 760);
  const lw = 560, lx = 930 - lw; // label box hugs the right safe edge (mirrored for left)
  // arrow: from above the label, curling up to stop just outside the face box beside the jaw
  const tx = fb.right + 20, ty = fy + 10;
  const ax = 800, ay = ly - 22;
  const seed = Math.floor(frame / 3); // boil every 3 frames
  const j = (k, amt = 5) => rnd(seed, k) * amt;
  const c1x = ax + 110 + j(1), c1y = ay - 120 + j(2), c2x = tx + 150 + j(3), c2y = ty + 20 + j(4);
  const P = (x, y) => `${sx(x).toFixed(1)} ${y.toFixed(1)}`;
  const d = `M${P(ax + j(5, 3), ay + j(6, 3))} C${P(c1x, c1y)} ${P(c2x, c2y)} ${P(tx, ty)}`;
  // arrowhead direction = tangent at the end (c2 -> tip)
  const ang = Math.atan2(ty - c2y, tx - c2x);
  const hl = 40;
  const h1 = [tx - hl * Math.cos(ang - 0.5) + j(7, 2), ty - hl * Math.sin(ang - 0.5) + j(8, 2)];
  const h2 = [tx - hl * Math.cos(ang + 0.5) + j(9, 2), ty - hl * Math.sin(ang + 0.5) + j(10, 2)];
  const draw = ease(frame, 0, 12);
  const head = ease(frame, 11, 4);
  const typeStart = 10;
  const chars = Math.max(0, Math.min(label.length, Math.floor((frame - typeStart) / 1.5)));
  const lp = pop(frame, fps, 8, 11);
  const o = exitFade(frame, frames);
  const cursor = chars < label.length || Math.floor(frame / 8) % 2 === 0;
  const stroke = { fill: "none", stroke: "#fff", strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" };
  const shadow = { ...stroke, stroke: "rgba(0,0,0,.35)", strokeWidth: 12 };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o }}>
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={d} {...shadow} pathLength="1" strokeDasharray="1 1" strokeDashoffset={1 - draw} transform="translate(0 4)" />
        <path d={d} {...stroke} pathLength="1" strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        {head > 0 ? (
          <g opacity={head}>
            <path d={`M${P(h1[0], h1[1])} L${P(tx, ty)} L${P(h2[0], h2[1])}`} {...shadow} transform="translate(0 4)" />
            <path d={`M${P(h1[0], h1[1])} L${P(tx, ty)} L${P(h2[0], h2[1])}`} {...stroke} />
          </g>
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: left ? 1080 - lx - lw : lx, top: ly, width: lw, display: "flex", justifyContent: left ? "flex-start" : "flex-end",
        transform: `rotate(${(left ? 3 : -3) + rnd(seed, 20) * 0.6}deg) scale(${0.85 + 0.15 * lp})`, opacity: Math.min(1, lp * 1.5),
        transformOrigin: left ? "left top" : "right top" }}>
        <span style={{ fontFamily: fontStack(brand.fonts.heading), fontSize: 60, lineHeight: 1.1, color: "#111", background: C.accent,
          padding: "12px 26px 14px", borderRadius: 18, boxShadow: "0 12px 30px rgba(0,0,0,.35)", whiteSpace: "nowrap" }}>
          {label.slice(0, chars)}
          <span style={{ opacity: cursor ? 1 : 0, display: "inline-block", width: 5, height: 52, background: "#111", marginLeft: 4, verticalAlign: "-4px" }} />
        </span>
      </div>
    </div>
  );
}
