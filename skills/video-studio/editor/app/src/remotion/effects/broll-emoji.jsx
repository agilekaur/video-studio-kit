import React from "react";
import { interpolate, spring, Easing } from "remotion";
import { fill, ease, exitFade, fontStack, wordTime, faceBox } from "../kit.jsx";

export const meta = {
  "id": "broll-emoji",
  "name": "B-roll and Emoji",
  "big": true,
  "captionY": 1380,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point",
    "tools"
  ],
  "sfx": "pop",
  "desc": "A full-screen brand graphic hard-cuts in on the headline's first spoken word (headline, typed search field, accent button) while the voice carries on, cuts back to the speaker, then an emoji springs up beside the head.",
  "params": [
    { "key": "headline", "label": "Headline (spoken words; two lines with a line break)", "type": "text", "default": "" },
    { "key": "placeholder", "label": "Empty field hint", "type": "text", "default": "" },
    { "key": "url", "label": "Text typed into the field", "type": "text", "default": "" },
    { "key": "button", "label": "Button", "type": "text", "default": "Go" },
    { "key": "emoji", "label": "Emoji (empty = none)", "type": "text", "default": "🔥" }
  ],
  "status": "ready"
};

// ---------- palette: the kit's ground / ink / one-accent look, from the brand ----------
const hex = (c) => {
  let s = String(c || "").trim().replace("#", "");
  if (s.length === 3) s = s.split("").map((x) => x + x).join("");
  const n = parseInt(s.slice(0, 6), 16);
  return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (a) => "#" + a.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = hex(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
function palette(C) {
  const ground = C.surface || "#f6f0e0";
  let ink = C.surface_text || "#141210";
  if (Math.abs(lum(ground) - lum(ink)) < 0.35) ink = lum(ground) > 0.5 ? "#141210" : "#f6f3ec";
  const light = lum(ground) > 0.5;
  return {
    ground, ink, light, stone: mix(ground, ink, light ? 0.05 : 0.08), back: light ? mix(ground, ink, 0.07) : mix(ground, "#000000", 0.55), pressed: mix(ground, ink, light ? 0.12 : 0.2), rule: mix(ground, ink, 0.2),
    muted: mix(ground, ink, 0.5), field: light ? mix(ground, "#ffffff", 0.6) : mix(ground, ink, 0.05),
    accent: C.accent, tint: mix(C.accent, ground, 0.6), deep: mix(C.accent, "#000000", 0.25), onAccent: lum(C.accent) > 0.6 ? "#111111" : "#ffffff",
  };
}
const fit = (s, maxW, size, k = 0.55) => Math.max(18, Math.min(size, maxW / Math.max(1, String(s).length * k)));
const nowrap = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// ---------- text fallbacks from the beat ----------
const clausesOf = (text) => String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
const firstWords = (s, n) => s.split(/\s+/).slice(0, n).join(" ");
// first word that starts at or after frame f (cuts land on word boundaries)
const snap = (words, f) => {
  const w = words.find((x) => x.from >= f - 2);
  return w ? w.from : f;
};
// 1-3 word caption chunks (break on punctuation or a pause)
function chunks(words) {
  const out = [];
  let cur = [];
  words.forEach((w, k) => {
    cur.push(w);
    const next = words[k + 1];
    const brk = /[,.!?;:]$/.test(w.text.trim()) || !next || next.from - w.to > 8 || cur.length >= 3;
    if (brk) { out.push({ from: cur[0].from - 1, text: cur.map((x) => x.text.trim()).join(" ").replace(/[,;:]+$/, "") }); cur = []; }
  });
  return out;
}
const chunkAt = (ch, f) => { let c = null; ch.forEach((x) => { if (f >= x.from) c = x.text; }); return c; };

function headLines(params, text) {
  const raw = String(params.headline || "").trim();
  if (raw.includes("\n")) return raw.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const src = raw || firstWords(clausesOf(text)[0] || "", 6);
  const ws = src.split(/\s+/).filter(Boolean);
  if (ws.length <= 2) return [ws.join(" ")];
  const h = Math.ceil(ws.length / 2);
  return [ws.slice(0, h).join(" "), ws.slice(h).join(" ")];
}

function Graphic({ P, head, body, lt, span, lines, typed, hint, caret, button }) {
  const a = ease(lt, 0, 12);
  const y0 = 760 + 40 * (1 - ease(lt, 2, 13));
  const hs = Math.min(104, ...lines.map((l) => 817 / Math.max(1, l.length * 0.5)));
  const fs = Math.min(44, 770 / Math.max(1, Math.max(typed.length, hint.length) * 0.5));
  const z = 1 + 0.04 * Math.min(1, lt / Math.max(1, span));
  return (
    <div style={{ ...fill, background: P.ground, transform: `scale(${z})`, transformOrigin: "540px 960px" }}>
      {lines.map((l, j) => (
        <div key={j} style={{ position: "absolute", left: 90, top: 470 + 110 * j + 30 * (1 - a) + (lines.length === 1 ? 110 : 0) - (hs * 1.1 - 110), opacity: a,
          fontFamily: head, fontSize: hs, lineHeight: 1.1, letterSpacing: "-0.03em", color: P.ink, whiteSpace: "nowrap" }}>{l}</div>
      ))}
      <div style={{ position: "absolute", left: 90, top: y0, width: 900, height: 520, background: P.stone, border: `2px solid ${P.rule}`, boxSizing: "border-box", opacity: ease(lt, 2, 8) }}>
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 76, background: P.pressed }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: 30 + i * 32, top: 29, width: 18, height: 18, background: P.stone }} />)}
        </div>
        <div style={{ position: "absolute", left: 38, top: 128, width: 820, height: 90, background: P.field, border: `2px solid ${P.rule}`, boxSizing: "border-box",
          display: "flex", alignItems: "center", padding: "0 32px", gap: 18 }}>
          {!typed && !hint ? <svg width="36" height="36" viewBox="0 0 36 36" style={{ flex: "none" }}><circle cx="15" cy="15" r="11" fill="none" stroke={P.muted} strokeWidth="4" /><path d="M23 23 L33 33" stroke={P.muted} strokeWidth="4" strokeLinecap="square" /></svg> : null}
          <span style={{ fontFamily: body, fontSize: fs, color: typed ? P.ink : P.muted, whiteSpace: "pre" }}>{typed || hint}</span>
          {caret ? <span style={{ width: 4, height: 56, background: P.ink, marginLeft: typed ? -14 : -18, flex: "none", order: typed || hint ? 0 : 0 }} /> : null}
        </div>
        <div style={{ position: "absolute", left: 38, top: 258, width: 520, height: 20, background: P.pressed }} />
        <div style={{ position: "absolute", left: 38, top: 298, width: 360, height: 20, background: P.pressed }} />
        <div style={{ position: "absolute", left: 38, top: 378, width: 820, height: 100, background: P.accent, display: "grid", placeItems: "center" }}>
          {button ? <span style={{ fontFamily: body, fontSize: Math.min(42, 760 / Math.max(1, button.length * 0.55)), color: P.onAccent, whiteSpace: "nowrap" }}>{button}</span>
            : <svg width="64" height="40" viewBox="0 0 64 40"><path d="M4 20 H54 M38 5 L56 20 L38 35" fill="none" stroke={P.onAccent} strokeWidth="6" strokeLinecap="square" /></svg>}
        </div>
      </div>
    </div>
  );
}

export function Front(ctx) {
  const { params, frame, frames, fps, brand, words, text, focus } = ctx;
  const P = palette(brand.colors);
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const lines = headLines(params, text);
  const url = String(params.url || "").trim();
  const hint = String(params.placeholder || "").trim();
  const button = String(params.button || "").trim();
  const emoji = String(params.emoji || "").trim();

  // timing: graphic cuts in on the headline's first spoken word, holds 1-2 s, cuts back on a word
  const snap = (f) => { const w = words.find((x) => x.from >= f - 2); return w ? w.from : f; };
  const B_IN = Math.max(0, wordTime(words, lines[0], Math.round(0.04 * frames)) - 1);
  const B_OUT = Math.min(frames - 30, Math.max(B_IN + 30, Math.min(B_IN + 60, snap(B_IN + 45))));
  const T0 = B_IN + 8, T1 = B_IN + Math.max(14, Math.round(0.6 * (B_OUT - B_IN)));
  const E_IN = Math.min(frames - 28, Math.max(B_OUT + 12, snap(Math.round(0.72 * frames))));

  let graphic = null;
  if (frame >= B_IN && frame < B_OUT) {
    const lt = frame - B_IN;
    const n = url ? Math.round(url.length * interpolate(frame, [T0, T1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : 0;
    const caret = n < url.length ? frame >= T0 : Math.floor(lt / 10) % 2 === 0;
    graphic = <Graphic P={P} head={head} body={body} lt={lt} span={B_OUT - B_IN} lines={lines} typed={url.slice(0, n)} hint={hint} caret={caret} button={button} />;
  }

  // emoji pop beside the head (never on the face): left of the face box, or above it when there is no room
  let pe = null;
  const ef = frame - E_IN;
  if (emoji && ef >= 0 && ef < 27) {
    const fb = faceBox(focus);
    const R = 85;
    let ex = fb.left - 24 - R, ey = focus.y * 1920 - 150;
    if (ex < R + 30) { ex = fb.left + 520 + 24 + R; }
    if (ex + R > 940) { ex = (fb.left + fb.right) / 2; ey = fb.top - 24 - R; }
    const grow = spring({ frame: ef, fps, config: { damping: 9, stiffness: 200, mass: 0.6 } });
    const outp = interpolate(ef, [21, 27], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
    const s = Math.max(0.01, grow * (1 - outp));
    const rot = -12 * (1 - Math.min(1, ef / 11)) + 6;
    const lift = 30 * ease(frame, E_IN, 27);
    pe = (
      <div style={{ position: "absolute", left: ex - R * 1.2, top: ey - lift - R * 1.2, width: R * 2.4, height: R * 2.4, display: "grid", placeItems: "center",
        transform: `scale(${s}) rotate(${rot}deg)`, fontSize: R * 2, lineHeight: 1, filter: "drop-shadow(0 10px 18px rgba(0,0,0,.35))",
        fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' }}>{emoji}</div>
    );
  }
  return (
    <div style={{ ...fill, opacity: exitFade(frame, frames) }}>
      {graphic}
      {pe}
    </div>
  );
}
