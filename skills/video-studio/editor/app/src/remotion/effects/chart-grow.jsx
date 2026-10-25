import React from "react";
import { ease, pop, exitFade, fontStack } from "../kit.jsx";

export const meta = {
  "id": "chart-grow",
  "name": "Chart Grow",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "whoosh",
  "desc": "Rising line chart draws from bottom left to top right under the face, with a soft gradient fill and a glowing end dot.",
  "params": [
    {
      "key": "label",
      "label": "Label",
      "type": "text",
      "default": ""
    },
    {
      "key": "shape",
      "label": "Shape",
      "type": "select",
      "options": [
        "rise",
        "hockey",
        "steady"
      ],
      "default": "rise"
    }
  ],
  "status": "ready"
};

// Chart box in the 1080x1920 design space: under the face, clear of the right 140px and bottom 420px.
const X0 = 80, X1 = 900, Y0 = 820, Y1 = 1470;
// 8 points each, 0..1 (x right, y up), with small dips.
const SHAPES = {
  rise: [[0, 0.02], [0.14, 0.16], [0.28, 0.12], [0.42, 0.34], [0.56, 0.3], [0.7, 0.56], [0.84, 0.66], [1, 0.97]],
  hockey: [[0, 0.06], [0.14, 0.09], [0.28, 0.05], [0.42, 0.1], [0.56, 0.08], [0.7, 0.22], [0.84, 0.5], [1, 0.97]],
  steady: [[0, 0.05], [0.14, 0.18], [0.28, 0.26], [0.42, 0.37], [0.56, 0.48], [0.7, 0.6], [0.84, 0.76], [1, 0.92]],
};

// Catmull-Rom through the points, sampled densely so the stroke can be truncated by arc length.
function sample(pts, per = 24) {
  const P = pts.map(([x, y]) => [X0 + x * (X1 - X0), Y1 - y * (Y1 - Y0)]);
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}

function truncate(pts, p) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = len[len.length - 1] * p;
  const res = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (len[i] <= target) { res.push(pts[i]); continue; }
    const r = (target - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
    res.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r]);
    break;
  }
  return res;
}

export function Front({ params, frame, frames, fps, brand, text }) {
  const C = brand.colors;
  const pts = sample(SHAPES[params.shape] || SHAPES.rise);
  const drawStart = 4, drawN = 36;
  const p = ease(frame, drawStart, drawN);
  const line = truncate(pts, Math.max(0.001, p));
  const tip = line[line.length - 1];
  const d = line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${tip[0].toFixed(1)} ${Y1} L${X0} ${Y1} Z`;
  const o = exitFade(frame, frames) * ease(frame, 0, 6);
  const done = frame >= drawStart + drawN - 4;
  const dot = done ? pop(frame, fps, drawStart + drawN - 4, 8) : 0.6;
  const pulse = done ? 1 + 0.25 * Math.sin((frame - drawStart - drawN) / 6) : 1;
  const clauses = String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
  const raw = String(params.label || "").trim() || (clauses[0] ? clauses[0].split(/\s+/).slice(0, 4).join(" ") : "");
  const label = raw.length > 26 ? raw.slice(0, 25).trimEnd() + "…" : raw;
  const lp = pop(frame, fps, 10, 12);
  const lineCol = "#FFFFFF";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o }}>
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="cg-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={lineCol} stopOpacity="0.35" />
            <stop offset="1" stopColor={lineCol} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cg-glow">
            <stop offset="0" stopColor={C.accent} stopOpacity="0.9" />
            <stop offset="1" stopColor={C.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="cg-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={X0} x2={X1} y1={Y1 - g * (Y1 - Y0)} y2={Y1 - g * (Y1 - Y0)} stroke="#fff" strokeOpacity={0.14 * ease(frame, 0, 10)}
            strokeWidth="2" strokeDasharray="6 12" />
        ))}
        <line x1={X0} x2={X0 + (X1 - X0) * ease(frame, 0, 12)} y1={Y1} y2={Y1} stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        <path d={area} fill="url(#cg-fill)" />
        <path d={d} fill="none" stroke={lineCol} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" filter="url(#cg-shadow)" />
        <circle cx={tip[0]} cy={tip[1]} r={46 * dot * pulse} fill="url(#cg-glow)" />
        <circle cx={tip[0]} cy={tip[1]} r={14 * dot} fill={C.accent} stroke="#fff" strokeWidth="5" />
      </svg>
      {label ? (
        <div style={{ position: "absolute", left: X0, top: Y0 - 10, transform: `translateY(${(1 - lp) * 30}px)`, opacity: Math.min(1, lp * 1.4),
          display: "inline-flex", alignItems: "center", gap: 14, padding: "14px 24px", borderRadius: 999,
          background: "rgba(17,17,17,.78)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 12px 30px rgba(0,0,0,.35)" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
          </svg>
          <span style={{ fontFamily: fontStack(brand.fonts.heading), fontSize: 36, color: "#fff", whiteSpace: "nowrap" }}>{label}</span>
        </div>
      ) : null}
    </div>
  );
}
