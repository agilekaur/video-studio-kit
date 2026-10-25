import React from "react";
import { useCurrentFrame } from "remotion";
import { fill, ease, pop, exitFade, fontStack, listParam, faceBands } from "../kit.jsx";

export const meta = {
  "id": "checklist",
  "name": "Checklist",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "list"
  ],
  "sfx": "tick",
  "captions": false,
  "desc": "Panel slides in above or below the face (never over it); items tick on as they are spoken. Captions rest on this beat.",
  "params": [
    {
      "key": "title",
      "label": "Title",
      "type": "text",
      "default": ""
    },
    {
      "key": "items",
      "label": "Items (one per line)",
      "type": "list",
      "default": []
    },
    {
      "key": "theme",
      "label": "Panel",
      "type": "select",
      "options": [
        "dark",
        "light"
      ],
      "default": "dark"
    }
  ],
  "status": "ready"
};

import { wordTime } from "../kit.jsx";

export function Front({ params, frame, frames, fps, brand, words, text, focus }) {
  const items = listParam(params.items).slice(0, 6);
  const shown = items.length ? items : ["Point one", "Point two", "Point three"];
  const title = (params.title || text.split(/\s+/).slice(0, 4).join(" ")).toUpperCase().replace(/[,.]$/, "");
  const light = params.theme === "light";
  const C = brand.colors;
  const times = shown.map((it, k) => wordTime(words, it, Math.round(14 + (k + 0.5) * Math.max(frames - 20, 10) / shown.length)));
  const done = times.filter((t) => frame >= t).length;
  const slide = ease(frame, 0, 10);
  const x = -860 + 920 * slide;
  const h = 180 + 96 * shown.length;
  // the larger clear band above or below the face; the panel scales down to fit it
  const { above, below } = faceBands(focus);
  const band = above[1] - above[0] >= below[1] - below[0] ? above : below;
  const k = Math.min(1, (band[1] - band[0]) / h);
  const top = band[0] + ((band[1] - band[0]) - h * k) / 2;
  return (
    <div style={{ position: "absolute", left: x, top, width: 800, height: h, borderRadius: 36, opacity: exitFade(frame, frames),
      transform: `scale(${k})`, transformOrigin: "0 0",
      background: light ? "rgba(255,255,255,.96)" : "rgba(17,17,17,.92)", color: light ? "#111" : "#fff", padding: "44px 50px", boxSizing: "border-box",
      boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
      <div style={{ fontFamily: fontStack(brand.fonts.heading), fontSize: 50, lineHeight: 1 }}>{title || "CHECKLIST"}</div>
      <div style={{ fontFamily: fontStack(brand.fonts.body), fontSize: 34, marginTop: 14, color: done ? C.accent : "#999" }}>{done} of {shown.length}</div>
      {shown.map((it, k) => {
        const on = frame >= times[k];
        const s = on ? 0.6 + 0.4 * pop(frame, fps, times[k], 9) : 1;
        const tick = ease(frame, times[k], 6);
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 26, marginTop: k ? 30 : 34 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: `scale(${s})`, flex: "none" }}>
              {on ? <circle cx="26" cy="26" r="24" fill={C.accent} /> : <circle cx="26" cy="26" r="22" fill="none" stroke="#777" strokeWidth="4" />}
              {on ? <path d="M15 27 L23 35 L38 18" fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="40" strokeDashoffset={40 * (1 - tick)} /> : null}
            </svg>
            <span style={{ fontFamily: fontStack(brand.fonts.body), fontSize: 44, opacity: on ? 1 : 0.42 }}>{it}</span>
          </div>
        );
      })}
    </div>
  );
}
