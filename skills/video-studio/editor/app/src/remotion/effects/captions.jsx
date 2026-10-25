import React from "react";
import { spring, interpolate, Easing } from "remotion";
import { fontStack, clearOfFace } from "../kit.jsx";

export const meta = {
  "id": "captions",
  "name": "Caption Styles",
  "big": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point"
  ],
  "sfx": null,
  "captions": false,
  "desc": "The spoken line captioned three ways in turn, each labelled: bold centre, brand word box, then a lowercase keyword. A style demo.",
  "params": [
    {
      "key": "keyword",
      "label": "Keyword in accent, style 3 (blank: the longest word)",
      "type": "text",
      "default": ""
    }
  ],
  "status": "ready"
};

// Kit: the beat's own words, in 1-2 word groups (break on punctuation), each group live from its first word until
// the next. Style 1 bold centre (active word pops 1.15 in the active colour, others white at 80%), style 2 the brand
// word box on the active word, style 3 lowercase with the keyword in the accent. Switches sit in the pauses nearest
// a third and two thirds of the beat. A small cream chip names the style (kit chip at top left).

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9']/g, "");
const LABELS = ["Style 1 · Bold centre", "Style 2 · Word box", "Style 3 · Lowercase keyword"];

let _cv;
function textW(s, family, size) {
  try {
    _cv = _cv || document.createElement("canvas");
    const g = _cv.getContext("2d");
    g.font = `800 ${size}px ${family}`;
    return g.measureText(s).width;
  } catch (e) {
    return s.length * size * 0.62;
  }
}

// boundary index i (switch before word i) closest to `target`, favouring sentence ends and longer pauses
function boundary(words, target, frames, lo) {
  let best = null, bs = Infinity;
  for (let i = Math.max(1, lo + 1); i < words.length; i++) {
    const t = (words[i - 1].to + words[i].from) / 2;
    const punct = /[.!?]$/.test(words[i - 1].text.trim()) ? 0.1 : /[,;:]$/.test(words[i - 1].text.trim()) ? 0.05 : 0;
    const gap = Math.min(15, words[i].from - words[i - 1].to) / frames;
    const sc = Math.abs(t - target) / frames - punct - gap;
    if (sc < bs) { bs = sc; best = i; }
  }
  return best;
}

function plan({ words, frames }) {
  if (words.length < 3) return { cuts: [Math.round(frames / 3), Math.round((2 * frames) / 3)], idx: [0, words.length, words.length] };
  const i1 = boundary(words, frames / 3, frames, 0) ?? 1;
  const i2 = boundary(words, (2 * frames) / 3, frames, i1) ?? Math.min(words.length - 1, i1 + 1);
  const at = (i) => Math.round((words[i - 1].to + words[i].from) / 2);
  return { cuts: [at(i1), at(i2)], idx: [0, i1, i2] };
}

function groups(ws, n) {
  const gs = [];
  let cur = [];
  for (const w of ws) {
    cur.push(w);
    if (/[.,!?;:]$/.test(w.text.trim()) || cur.length >= n) { gs.push(cur); cur = []; }
  }
  if (cur.length) gs.push(cur);
  return gs;
}

function activeGroup(gs, frame, tail) {
  for (let i = 0; i < gs.length; i++) {
    const nxt = i + 1 < gs.length ? gs[i + 1][0].from - 1 : gs[i][gs[i].length - 1].to + tail;
    if (gs[i][0].from - 1 <= frame && frame < nxt) return gs[i];
  }
  return null;
}

function Chip({ text, frame, t0, brand }) {
  const e = interpolate(frame, [t0, t0 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  return (
    <div style={{ position: "absolute", left: 65 - 24 * (1 - e), top: 210, padding: "13px 20px", background: brand.colors.surface, color: brand.colors.surface_text,
      fontFamily: fontStack(brand.fonts.body), fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: -0.34, opacity: e, whiteSpace: "nowrap" }}>{text}</div>
  );
}

export function Front(ctx) {
  const { frame, frames, fps, words, brand, params, focus } = ctx;
  const C = brand.colors;
  const font = fontStack(brand.fonts.caption || brand.fonts.heading);
  const { cuts, idx } = plan(ctx);
  const s = frame < cuts[0] ? 0 : frame < cuts[1] ? 1 : 2;
  const t0 = s === 0 ? 0 : cuts[s - 1];
  const ws = words.slice(idx[s], s < 2 ? idx[s + 1] : words.length);
  const out = interpolate(frame, [frames - 5, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const chip = <Chip text={LABELS[s]} frame={frame} t0={t0} brand={brand} />;
  const g = activeGroup(groups(ws, s === 1 ? 3 : 2), frame, s === 2 ? 12 : 8);
  if (!g) return <div style={{ opacity: out }}>{chip}</div>;

  const strip = (t) => t.trim().replace(/[.,!?;:]+$/, "");
  const texts = g.map((w) => (s === 2 ? strip(w.text).toLowerCase() : strip(w.text).toUpperCase()));
  let active = 0;
  g.forEach((w, k) => { if (w.from - 1 <= frame) active = k; });
  // size so the popped line stays inside 842 px
  let size = s === 0 ? 112 : s === 1 ? 100 : 88;
  const gapK = s === 2 ? 0.28 : 0.3;
  const widthAt = (z) => texts.reduce((a, t) => a + textW(t, font, z * 1.12), 0) + z * gapK * (texts.length - 1) + 40;
  while (size > 40 && widthAt(size) > 842) size *= 0.94;
  const y = clearOfFace(focus, 1100 - 125, 250) + 125;
  const rise = 24 * (1 - interpolate(frame, [g[0].from - 1, g[0].from + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }));
  const kw = norm(params.keyword) || norm(ws.map((w) => strip(w.text)).sort((a, b) => b.length - a.length)[0]);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: out }}>
      {chip}
      <div style={{ position: "absolute", left: 60, width: 880, top: y + rise, transform: "translateY(-50%)", display: "flex", justifyContent: "center",
        alignItems: "center", gap: `0 ${size * gapK}px`, fontFamily: font, fontWeight: 800, lineHeight: 1.05, whiteSpace: "nowrap" }}>
        {texts.map((t, k) => {
          const on = k === active;
          const sp = on ? spring({ frame: frame - g[k].from, fps, config: { damping: 10, stiffness: 200 } }) : 0;
          if (s === 0) {
            return (
              <span key={k} style={{ fontSize: size * (1 + 0.15 * sp), color: on ? C.caption_active : C.caption_text, opacity: on ? 1 : 0.8,
                WebkitTextStroke: `7px ${C.caption_outline}`, paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,.4)" }}>{t}</span>
            );
          }
          if (s === 1) {
            const spoken = g[k].from - 1 <= frame;
            if (on) {
              return (
                <span key={k} style={{ fontSize: size * (1 + 0.08 * sp), background: C.caption_box, color: C.caption_text, borderRadius: size * 0.16,
                  padding: `${size * 0.04}px ${size * 0.16}px ${size * 0.08}px`, boxShadow: "0 10px 28px rgba(0,0,0,.3)" }}>{t}</span>
              );
            }
            return (
              <span key={k} style={{ fontSize: size, color: C.caption_text, opacity: spoken ? 1 : 0.55, WebkitTextStroke: `7px ${C.caption_outline}`,
                paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,.35)" }}>{t}</span>
            );
          }
          const key = norm(t) === kw;
          const a = interpolate(frame, [g[0].from - 1, g[0].from + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={k} style={{ fontSize: size, color: key ? C.accent : C.caption_text, opacity: a, letterSpacing: -size * 0.01,
              WebkitTextStroke: `6px ${C.caption_outline}`, paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,.35)" }}>{t}</span>
          );
        })}
      </div>
    </div>
  );
}
