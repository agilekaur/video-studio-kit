import React from "react";
import { interpolate } from "remotion";
import { ease, pop, exitFade, fontStack, listParam, wordTime } from "../kit.jsx";

export const meta = {
  "captionY": 960,
  "id": "mock-app-window",
  "name": "Mock App Window",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "tools",
    "proof"
  ],
  "sfx": "pop",
  "desc": "A dark app window in the lower third: traffic lights, a progress bar filling to 100 percent, and tasks ticking off as the bar passes them.",
  "params": [
    {
      "key": "title",
      "label": "Window title",
      "type": "text",
      "default": ""
    },
    {
      "key": "items",
      "label": "Tasks (one per line)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

const LEFT = 70, W = 860, TOP = 1206, H = 286;
const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function Front({ params, frame, frames, fps, brand, words, text }) {
  const C = brand.colors;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const clauses = String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
  const given = listParam(params.items).slice(0, 4);
  const items = (given.length ? given : clauses.slice(1, 5)).map((s) => short(s, 24));
  const shown = items.length ? items : ["Step 1", "Step 2", "Step 3", "Step 4"];
  const n = shown.length;
  const title = short(String(params.title || "").trim() || (clauses[0] ? clauses[0].split(/\s+/).slice(0, 4).join(" ") : "Running"), 30);
  // bar runs linearly to 100% on the last spoken item (or over the beat when items are not spoken)
  const start = 8;
  const spoken = given.length ? wordTime(words, given[given.length - 1], -1) : -1;
  const end = Math.max(start + 30, spoken > 0 ? spoken : frames - 14);
  const prog = interpolate(frame, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pct = Math.round(prog * 100);
  const tickAt = shown.map((_, k) => start + ((k + 1) / n) * (end - start));
  const s = pop(frame, fps, 0, 14);
  const o = exitFade(frame, frames);
  const complete = prog >= 1;
  return (
    <div style={{ position: "absolute", left: LEFT, top: TOP, width: W, height: H, borderRadius: 24, overflow: "hidden", opacity: o * Math.min(1, s * 1.6),
      background: "linear-gradient(180deg,#1C1C20,#121214)", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 28px 70px rgba(0,0,0,.5)",
      transform: `translateY(${(1 - s) * 220}px) scale(${0.92 + 0.08 * s})` }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", padding: "0 22px", background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.07)", position: "relative" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c, marginRight: 10 }} />)}
        <span style={{ position: "absolute", left: 140, right: 140, textAlign: "center", fontFamily: body, fontSize: 26, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 30px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flex: 1, height: 16, borderRadius: 8, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 8, background: C.accent, boxShadow: `0 0 18px ${C.accent}` }} />
          </div>
          <span style={{ fontFamily: head, fontSize: 36, color: complete ? C.accent : "#fff", width: 96, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: n > 2 ? "1fr 1fr" : "1fr", columnGap: 26, rowGap: 6, marginTop: 14 }}>
          {shown.map((it, k) => {
            const on = frame >= tickAt[k];
            const sc = on ? 0.6 + 0.4 * pop(frame, fps, tickAt[k], 9) : 1;
            const tick = ease(frame, tickAt[k], 6);
            const active = !on && (k === 0 || frame >= tickAt[k - 1]);
            const spin = (frame * 12) % 360;
            return (
              <div key={k} style={{ height: 66, display: "flex", alignItems: "center", gap: 18, opacity: ease(frame, 6 + 3 * k, 8) }}>
                <svg width="42" height="42" viewBox="0 0 52 52" style={{ transform: `scale(${sc})`, flex: "none" }}>
                  {on ? <circle cx="26" cy="26" r="24" fill={C.accent} /> : <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="4" />}
                  {active ? <circle cx="26" cy="26" r="21" fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" strokeDasharray="30 200" transform={`rotate(${spin} 26 26)`} /> : null}
                  {on ? <path d="M15 27 L23 35 L38 18" fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="40" strokeDashoffset={40 * (1 - tick)} /> : null}
                </svg>
                <span style={{ fontFamily: body, fontSize: 30, color: "#fff", opacity: on ? 1 : 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
