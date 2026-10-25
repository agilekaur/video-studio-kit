import React from "react";
import { fill, ease, exitFade, listParam, wordTime, faceBox } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "speed-ramp-pip",
  "name": "Speed Ramp PiP",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "tools"
  ],
  "sfx": "whoosh",
  "captionY": 1385,
  "desc": "The take eases into a slow-motion look and whips back with a live speed readout, then a screen inset pops in under the face, types and presses a button. Visual ramp only: use the beat's Speed ramp control for a real retime.",
  "params": [
    {
      "key": "url",
      "label": "Typed text (lands on this word if spoken)",
      "type": "text",
      "default": ""
    },
    {
      "key": "placeholder",
      "label": "Field placeholder",
      "type": "text",
      "default": ""
    },
    {
      "key": "button",
      "label": "Button (presses on this word if spoken)",
      "type": "text",
      "default": "Send"
    },
    {
      "key": "button_done",
      "label": "Button after press",
      "type": "text",
      "default": "Sent"
    },
    {
      "key": "labels",
      "label": "Chip labels: line 1 speed readout, line 2 inset (optional)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = (h) => { const s = String(h || "#000").replace("#", ""); const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0"); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
function palette(C) {
  const G = C.surface || "#111111", I = C.surface_text || "#ffffff";
  return { G, I, A: C.accent, onA: lum(C.accent) > 0.55 ? "#111111" : "#ffffff",
    stone: mix(G, I, 0.07), pressed: mix(G, I, 0.14), rule: mix(G, I, 0.2), muted: mix(G, I, 0.5), deep: mix(C.accent, "#000000", 0.25) };
}
const outBack = (x, s = 1.3) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

// kit timeline over a 3.7 s demo: ramp 0.5-1.75 s (speed 1 -> 0.4 -> 1.6 -> 1), inset on "your" (~42 %), press on "that's" (~68 %)
function times({ frames, words, params }) {
  const ra = Math.max(8, Math.round(frames * 0.135));
  const rw = clamp(Math.round(frames * 0.34), 15, 45);
  const url = String(params.url || "").trim();
  const said = url ? wordTime(words, url, -1) : -1;
  let pip = said > 0 ? said - 6 : Math.round(frames * 0.42);
  pip = clamp(pip, ra + rw + 2, Math.max(ra + rw + 2, frames - 40));
  const typed = pip + 4 + clamp(Math.round((url.length || 14) * 1.6), 14, Math.max(14, Math.round(frames * 0.16)));
  const wb = wordTime(words, params.button, -1);
  const press = clamp(wb > typed ? wb : Math.max(typed + 10, Math.round(frames * 0.68)), typed + 6, Math.max(typed + 6, frames - 12));
  return { ra, rw, pip, typed, press };
}

function ramp(frame, T) {
  if (frame <= T.ra || frame >= T.ra + T.rw) return { u: -1, spd: 1 };
  const u = (frame - T.ra) / T.rw;
  return { u, spd: 1 - 0.6 * Math.sin(2 * Math.PI * u) };
}

export function styles(ctx) {
  const T = times(ctx);
  const { u, spd } = ramp(ctx.frame, T);
  if (u < 0) return {};
  const z = 1 + 0.1 * Math.sin(Math.PI * u);
  const slow = Math.max(0, 1 - spd), fast = Math.max(0, spd - 1);
  return {
    zoom: z,
    filter: `saturate(${(1 - 0.35 * slow / 0.6).toFixed(3)}) contrast(${(1 + 0.08 * slow / 0.6).toFixed(3)}) blur(${(2.2 * fast / 0.6).toFixed(2)}px) brightness(${(1 + 0.06 * fast / 0.6).toFixed(3)})`,
  };
}

function Chip({ x, y, a, P, font, children }) {
  if (a <= 0) return null;
  const e = 1 - Math.pow(2, -10 * a);
  return (
    <div style={{ position: "absolute", left: x - 24 * (1 - e), top: y, opacity: a, background: P.G, color: P.I, fontFamily: font, fontSize: 34, lineHeight: 1,
      padding: "13px 20px 12px", display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{children}</div>
  );
}

export function Front(ctx) {
  const { params, frame, frames, brand, focus, text } = ctx;
  const P = palette(brand.colors);
  const body = `"${brand.fonts.body.family}", Arial, sans-serif`;
  const T = times(ctx);
  const { u, spd } = ramp(frame, T);
  const labels = listParam(params.labels);
  const dom = String(text || "").match(/\b[a-z0-9-]+\.(com|co|io|ai|app|net|org|dev)\b/i);
  const url = String(params.url || "").trim() || (dom ? dom[0] : String(text || "").split(/\s+/).slice(0, 3).join(" ").replace(/[.,!?;:]+$/, ""));
  const ph = String(params.placeholder || "").trim() || "Type here";
  const btn = String(params.button || "").trim() || "Send";
  const btnDone = String(params.button_done || "").trim() || "Sent";
  const o = exitFade(frame, frames);

  // zoom-blur echoes on the fast half of the ramp
  const fast = u >= 0 ? Math.max(0, spd - 1) / 0.6 : 0;
  const z = u >= 0 ? 1 + 0.1 * Math.sin(Math.PI * u) : 1;
  const origin = `${focus.x * 100}% ${focus.y * 100}%`;

  // inset box: left, under the face, clear of the bottom 420 px
  const fb = faceBox(focus);
  const PX = 65, PW = 440, PY = Math.max(900, Math.round(fb.bottom + 24)), PH = Math.min(340, 1500 - PY);
  const pin = frame >= T.pip ? clamp((frame - T.pip) / 13, 0, 1) : 0;
  const e = pin > 0 ? outBack(pin) : 0;
  const sc = 0.82 + 0.18 * e;
  const n = Math.round(url.length * clamp((frame - T.pip - 4) / Math.max(1, T.typed - T.pip - 4), 0, 1));
  const caret = n > 0 && (n < url.length || (frame < T.press && Math.floor(frame / 10) % 2 === 0));
  const rowsIn = ease(frame, T.typed, 12);
  const pp = clamp((frame - T.press) / 7, 0, 1);
  const sq = pp > 0 && pp < 1 ? 1 - 0.06 * Math.sin(Math.PI * pp) : 1;
  const done = frame >= T.press + 4;
  const fs = Math.max(22, Math.min(30, 340 / Math.max(1, (n ? url : ph).length * 0.52)));

  const readA = clamp(frame / 8, 0, 1) * (frame < T.pip ? 1 : 1 - clamp((frame - T.pip) / 5, 0, 1));
  const shownSpd = u >= 0 ? spd : 1;
  const pipLabel = labels[1];
  return (
    <div style={{ ...fill, opacity: o }}>
      {fast > 0.01 ? (
        <>
          <div style={{ ...fill, opacity: 0.3 * fast }}><Speaker zoom={z * 1.06} origin={origin} filter="blur(4px)" /></div>
          <div style={{ ...fill, opacity: 0.18 * fast }}><Speaker zoom={z * 1.13} origin={origin} filter="blur(8px)" /></div>
        </>
      ) : null}
      {/* live speed readout */}
      <Chip x={65} y={200} a={readA} P={P} font={body}>
        <svg width="34" height="34" viewBox="0 0 24 24" style={{ flex: "none" }}>
          <path d="M3.5 16a8.5 8.5 0 0 1 17 0" fill="none" stroke={P.I} strokeWidth="2.4" />
          <line x1="12" y1="16" x2={12 + 7 * Math.cos(Math.PI * (1 - clamp((shownSpd - 0.4) / 1.2, 0, 1)))} y2={16 - 7 * Math.sin(Math.PI * (1 - clamp((shownSpd - 0.4) / 1.2, 0, 1)))}
            stroke={shownSpd < 0.95 || shownSpd > 1.05 ? P.A : P.I} strokeWidth="2.6" strokeLinecap="square" />
        </svg>
        <span>{(labels[0] || "Speed") + " · "}<span style={{ display: "inline-block", minWidth: 62 }}>{shownSpd.toFixed(1)}×</span></span>
      </Chip>
      {pipLabel ? <Chip x={65} y={200} a={clamp((frame - T.pip) / 8, 0, 1)} P={P} font={body}>{pipLabel}</Chip> : null}
      {/* screen inset */}
      {pin > 0 ? (
        <div style={{ position: "absolute", left: PX, top: PY + 40 * (1 - e), width: PW, height: PH, transform: `scale(${sc})`, transformOrigin: "50% 50%",
          opacity: clamp(pin * 3, 0, 1), border: `4px solid ${P.I}`, background: P.G, boxSizing: "border-box", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
          <div style={{ height: 50, background: P.stone, display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
            {[0, 1, 2].map((k) => <div key={k} style={{ width: 13, height: 13, background: P.pressed }} />)}
          </div>
          <div style={{ position: "absolute", left: 22, right: 22, top: 70, height: 60, background: P.stone, border: `2px solid ${P.rule}`, boxSizing: "border-box",
            display: "flex", alignItems: "center", padding: "0 18px", overflow: "hidden" }}>
            <span style={{ fontFamily: body, fontSize: fs, color: n ? P.I : P.muted, whiteSpace: "pre", lineHeight: 1 }}>{n ? url.slice(0, n) : ph}</span>
            <span style={{ width: 3, height: fs * 1.3, marginLeft: 4, background: P.I, opacity: caret ? 1 : 0, flex: "none" }} />
          </div>
          {[300, 340, 240].map((w, k) => (
            <div key={k} style={{ position: "absolute", left: 22, top: 152 + k * 34 + 10 * (1 - rowsIn), width: w * (PW - 44) / 400, height: k ? 14 : 18,
              background: k ? P.pressed : P.muted, opacity: rowsIn }} />
          ))}
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 20, height: 64, transform: `scale(${sq})`, background: done ? P.deep : P.A,
            color: done ? "#fff" : P.onA, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: body, fontSize: 32, lineHeight: 1, whiteSpace: "nowrap" }}>
            {done ? <svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" /></svg> : null}
            {done ? btnDone : btn}
          </div>
        </div>
      ) : null}
    </div>
  );
}
