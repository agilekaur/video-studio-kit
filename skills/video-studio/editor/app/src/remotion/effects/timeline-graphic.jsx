import React from "react";
import { interpolate } from "remotion";
import { ease, pop, exitFade, fontStack, listParam } from "../kit.jsx";

export const meta = {
  "captionY": 960,
  "id": "timeline-graphic",
  "name": "Timeline Graphic",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point"
  ],
  "sfx": "whoosh",
  "desc": "An editor timeline in the lower third with V2, V1 and A1 tracks, clips sliding in and a playhead sweeping across.",
  "params": [
    {
      "key": "labels",
      "label": "Clip labels (one per line)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

const LEFT = 70, W = 860, TOP = 1206, H = 286;
const HEAD = 44, ROW = 70, GUT = 76; // header, track height, track-name gutter
const TX0 = LEFT + GUT + 14, TX1 = LEFT + W - 18; // track area in design space
const rnd = (i) => { const s = Math.sin(i * 91.7 + 13.3) * 43758.5453; return s - Math.floor(s); };
const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const tc = (f) => { const s = Math.floor(f / 30); return `00:00:${String(s).padStart(2, "0")}:${String(f % 30).padStart(2, "0")}`; };

export function Front({ params, frame, frames, fps, brand, text }) {
  const C = brand.colors;
  const body = fontStack(brand.fonts.body), head = fontStack(brand.fonts.heading);
  const given = listParam(params.labels);
  const clauses = String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
  const words = clauses.map((c) => c.split(/\s+/).slice(0, 2).join(" "));
  const labs = (given.length ? given : words).slice(0, 5);
  const lab = (k, fb) => short(labs[k] || fb, 14);
  const tw = TX1 - TX0;
  // clips as fractions of the track area: [row, x0, x1, label, colour]
  const blue = "#3D7BFF", purple = "#8B5CF6", green = "#22C55E";
  const clips = [
    [1, 0.0, 0.36, lab(0, "Clip 1"), blue],
    [1, 0.37, 0.7, lab(1, "Clip 2"), blue],
    [1, 0.71, 1.0, lab(2, "Clip 3"), blue],
    [0, 0.2, 0.52, lab(3, "Title"), purple],
    [0, 0.62, 0.9, lab(4, "B-roll"), purple],
    [2, 0.0, 1.0, "", green],
  ];
  const s = pop(frame, fps, 0, 14);
  const o = exitFade(frame, frames);
  const ph = interpolate(frame, [6, frames - 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phx = TX0 + ph * tw;
  const rowY = (r) => TOP + HEAD + 10 + r * (ROW + 8);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o * Math.min(1, s * 1.6) }}>
      <div style={{ position: "absolute", left: LEFT, top: TOP, width: W, height: H, borderRadius: 24, overflow: "hidden",
        background: "linear-gradient(180deg,#1B1B1F,#111113)", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 28px 70px rgba(0,0,0,.5)",
        transform: `translateY(${(1 - s) * 200}px)` }}>
        <div style={{ height: HEAD, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px",
          borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}>
          <span style={{ fontFamily: body, fontSize: 22, color: "rgba(255,255,255,.55)", letterSpacing: 1 }}>TIMELINE</span>
          <span style={{ fontFamily: body, fontSize: 24, color: C.accent, fontVariantNumeric: "tabular-nums" }}>{tc(frame)}</span>
        </div>
        {["V2", "V1", "A1"].map((t, r) => (
          <div key={t} style={{ position: "absolute", left: 0, top: rowY(r) - TOP, width: W, height: ROW }}>
            <div style={{ position: "absolute", left: 12, top: 0, width: GUT - 8, height: ROW, borderRadius: 10, background: "rgba(255,255,255,.06)",
              display: "grid", placeItems: "center", fontFamily: head, fontSize: 26, color: "rgba(255,255,255,.7)" }}>{t}</div>
            <div style={{ position: "absolute", left: GUT + 14, right: 18, top: 0, height: ROW, borderRadius: 10, background: "rgba(255,255,255,.03)" }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: LEFT, top: TOP, width: W, height: H, borderRadius: 24, overflow: "hidden", transform: `translateY(${(1 - s) * 200}px)` }}>
      {clips.map(([r, a, b, label, col], k) => {
        const st = 6 + 4 * k;
        const p = ease(frame, st, 10);
        if (p <= 0) return null;
        const x = TX0 + a * tw + 3, w = (b - a) * tw - 6;
        const y = rowY(r) - TOP;
        const nb = Math.floor(w / 9);
        return (
          <div key={k} style={{ position: "absolute", left: x - LEFT - (1 - p) * 300, top: y, width: w, height: ROW, opacity: p, borderRadius: 10,
            background: `linear-gradient(180deg, ${col}, ${col}CC)`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.3), 0 6px 14px rgba(0,0,0,.35)",
            overflow: "hidden", display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box" }}>
            {r === 2 ? (
              <svg width={w - 28} height={ROW - 16}>
                {Array.from({ length: nb }).map((_, i) => {
                  const h = (0.2 + 0.8 * rnd(i) * (0.5 + 0.5 * Math.sin(i / 5))) * (ROW - 20);
                  return <rect key={i} x={i * 9} y={(ROW - 16 - h) / 2} width="5" height={h} rx="2" fill="rgba(255,255,255,.75)" />;
                })}
              </svg>
            ) : (
              <span style={{ fontFamily: body, fontSize: 24, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: phx - LEFT - 2, top: HEAD + 4, width: 4, height: H - HEAD - 6, background: "#fff", borderRadius: 2,
        boxShadow: "0 0 12px rgba(255,255,255,.8)", opacity: ease(frame, 8, 6) }}>
        <div style={{ position: "absolute", left: -10, top: 0, width: 24, height: 18, background: "#fff", clipPath: "polygon(0 0,100% 0,100% 55%,50% 100%,0 55%)" }} />
      </div>
      </div>
    </div>
  );
}
