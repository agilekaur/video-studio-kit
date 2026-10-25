import React from "react";
import { useCurrentFrame } from "remotion";
import { fill, ease, pop, exitFade, fontStack, listParam } from "../kit.jsx";

export const meta = {
  "id": "freeze-label",
  "name": "Freeze and Label",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "list",
    "proof"
  ],
  "sfx": "shutter",
  "desc": "Picture freezes, desaturates and pushes in; numbered callouts draw out; white flash back. Voice keeps playing.",
  "params": [
    {
      "key": "labels",
      "label": "Callouts (one per line)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

export function styles({ frame, frames }) {
  return { freeze: true, freezeFilter: "saturate(.2) brightness(.86)", zoom: 1 + 0.06 * Math.min(frame / Math.max(frames, 1), 1) };
}

export function Front({ params, frame, frames, brand, focus, text }) {
  const labels = listParam(params.labels).slice(0, 5);
  const shown = labels.length ? labels : text.split(/[,.]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const acc = brand.colors.accent;
  const fx = focus.x * 1080, fy = focus.y * 1920;
  const flash = Math.max(0, (frame - (frames - 3)) / 3);
  return (
    <div style={fill}>
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0 }}>
        {shown.map((lab, k) => {
          const st = 8 + k * 8;
          const p = ease(frame, st, 10);
          if (p <= 0) return null;
          const left = k % 2 === 0;
          const tx = fx + (left ? -90 : 90), ty = fy + 60 + 140 * k;
          const by = [430, 600, 770, 1290, 1440][k];
          const ex = left ? 440 : 640, ey = by + 45;
          return (
            <g key={k}>
              <circle cx={tx} cy={ty} r="9" fill={acc} />
              <line x1={tx} y1={ty} x2={tx + (ex - tx) * p} y2={ty + (ey - ty) * p} stroke={acc} strokeWidth="4" />
            </g>
          );
        })}
      </svg>
      {shown.map((lab, k) => {
        const st = 18 + k * 8;
        const s = pop(frame, 30, st, 10);
        if (frame < st) return null;
        const left = k % 2 === 0;
        const by = [430, 600, 770, 1290, 1440][k];
        return (
          <div key={k} style={{ position: "absolute", left: left ? 60 : 640, top: by, width: 380, height: 90, transform: `scale(${s})`,
            background: "rgba(17,17,17,.92)", border: `3px solid ${acc}`, borderRadius: 18, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", boxSizing: "border-box" }}>
            <span style={{ width: 46, height: 46, borderRadius: 23, background: acc, color: "#111", display: "grid", placeItems: "center",
              fontFamily: fontStack(brand.fonts.heading), fontSize: 28, flex: "none" }}>{k + 1}</span>
            <span style={{ color: "#fff", fontFamily: fontStack(brand.fonts.body), fontSize: 34, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lab}</span>
          </div>
        );
      })}
      {flash > 0 ? <div style={{ ...fill, background: "#fff", opacity: 0.92 * flash }} /> : null}
    </div>
  );
}
