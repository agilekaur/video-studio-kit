import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing } from "remotion";
import { fill, ease, pop, exitFade, fontStack, listParam } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "proof-pushin",
  "name": "Proof Push-in",
  "big": true,
  "captions": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "thud",
  "desc": "A clean result page fills the top half above the speaker and slowly pushes in (1.00 to 1.08) towards one line, while a cursor glides to it, a tint sweep marks the phrase as it is spoken and an ink badge springs on.",
  "params": [
    { "key": "url", "label": "Page URL", "type": "text", "default": "" },
    { "key": "title", "label": "Page title", "type": "text", "default": "" },
    { "key": "line", "label": "Line to highlight (a spoken phrase)", "type": "text", "default": "" },
    { "key": "badge", "label": "Badge (empty = tick)", "type": "text", "default": "" },
    { "key": "rows", "label": "Other rows (up to four, empty = skeleton)", "type": "list", "default": [] },
    { "key": "media", "label": "Page screenshot (optional)", "type": "media", "default": "" }
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

// ---------- split geometry: the face sits just under the seam ----------
const SEAM = 960;
const splitShift = (focus) => Math.max(0, Math.min(SEAM, SEAM + 60 - (focus.y * 1920 - 300)));

function MediaFill({ m }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={st} /></Loop>
    : <Img src={m.url} style={st} />;
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9%$']/g, "");
// beat-local span of a spoken phrase: {from, to} of its first and last word, or null
function findPhrase(words, phrase) {
  const toks = String(phrase || "").split(/\s+/).map(norm).filter(Boolean);
  if (!toks.length) return null;
  for (let i = 0; i + toks.length <= words.length; i++) {
    if (toks.every((t, k) => norm(words[i + k].text) === t)) return { from: words[i].from, to: words[i + toks.length - 1].to };
  }
  const i = words.findIndex((w) => norm(w.text) === toks[0]);
  return i >= 0 ? { from: words[i].from, to: words[Math.min(words.length - 1, i + toks.length - 1)].to } : null;
}
// a key phrase from the beat: a number and its noun, else the tail of the second clause
function keyPhrase(text) {
  const ws = String(text || "").split(/\s+/).filter(Boolean);
  const k = ws.findIndex((w) => /\d/.test(w));
  if (k >= 0) return ws.slice(k, k + 2).join(" ").replace(/[.,;!?]+$/, "");
  const cl = clausesOf(text);
  const c = (cl[1] || cl[0] || "").split(/\s+/);
  return c.slice(-3).join(" ");
}

function Cursor({ x, y, pressed, P }) {
  const s = pressed ? 0.9 : 1;
  const pts = [[0, 0], [0, 46], [11, 35], [19, 54], [28, 50], [20, 32], [35, 32]].map(([a, b]) => `${a * 1.25 * s},${b * 1.25 * s}`).join(" ");
  return (
    <svg width="70" height="80" viewBox="-4 -4 70 80" style={{ position: "absolute", left: x - 4, top: y - 4, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.25))" }}>
      <polygon points={pts} fill={P.ground} stroke={P.ink} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

function SeamCaption({ text, y, P, font }) {
  if (!text) return null;
  const t = text.toUpperCase();
  const size = fit(t, 780, 38, 0.66);
  return (
    <div style={{ position: "absolute", left: 140, width: 800, top: y - 32, height: 64, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: P.ink, color: P.ground, fontFamily: font, fontSize: size, letterSpacing: "0.06em", lineHeight: 1, padding: "14px 18px 12px", whiteSpace: "nowrap" }}>{t}</div>
    </div>
  );
}


const GOAL_X = 150, GOAL_Y = 330;

export function styles() {
  return { hideBase: true };
}

export function Front(ctx) {
  const { params, frame, frames, fps, brand, words, text, focus, media } = ctx;
  const P = palette(brand.colors);
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const m = params.media ? media(params.media) : null;
  const cl = clausesOf(text);
  const url = String(params.url || "").trim();
  const line = String(params.line || "").trim() || keyPhrase(text);
  const title = String(params.title || "").trim() || (cl[0] ? firstWords(cl[0], 4) : "");
  const badge = String(params.badge || "").trim();
  const rows = listParam(params.rows).slice(0, 4);
  while (rows.length < 4) rows.push("");

  // timing: the sweep runs across the phrase as it is spoken
  const ph = findPhrase(words, line);
  let sw0 = ph ? ph.from - 1 : Math.round(0.45 * frames);
  let sw1 = ph ? ph.to - 5 : sw0 + 21;
  sw0 = Math.max(18, Math.min(sw0, frames - 40));
  sw1 = Math.max(sw0 + 8, Math.min(sw1, frames - 30));
  const tBadge = sw1 + 2;
  const tc0 = Math.max(6, sw0 - 30), tc1 = Math.max(tc0 + 8, sw0 - 3);

  const p = ease(frame, 0, 10) * (1 - ease(frame, frames - 7, 7));   // drops in, slides back out
  const D = splitShift(focus);
  const o = 1;
  const e = (i) => { const a = ease(frame, 4 + i * 1.1, 12); return { opacity: a, transform: `translateY(${26 * (1 - a)}px)` }; };
  const io = (t0, n) => interpolate(frame, [t0, t0 + n], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  const lsize = Math.min(52, Math.max(28, 520 / Math.max(1, line.length * 0.5)));
  const gw = Math.min(520, line.length * lsize * 0.5);
  const sp = io(sw0, sw1 - sw0);
  const bs = Math.max(0, pop(frame, fps, tBadge, 9));
  // cursor glides in from the lower right, rides the sweep, then drifts off
  const cp = io(tc0, tc1 - tc0);
  let cx = 860 + (GOAL_X - 4 - 860) * cp, cy = 900 + (GOAL_Y + 48 - 900) * cp;
  if (sp > 0) cx = GOAL_X - 4 + (gw + 14) * sp;
  const dp = io(tBadge + 3, 15);
  cx += 60 * dp; cy += 70 * dp;
  // slow push 1.00 -> 1.08 drifting towards the line
  const zp = io(0, frames);
  const z = 1 + 0.08 * zp;
  const ox = 540 + (GOAL_X + gw / 2 - 540) * zp * 0.6, oy = 480 + (GOAL_Y + 30 - 480) * zp * 0.6;
  const lens = [[520, 300], [460, 380], [560, 240], [400, 330]];

  const page = m ? (
    <div style={{ position: "absolute", left: 86, top: 70, width: 908, height: 930, background: P.ground, overflow: "hidden", ...e(0) }}>
      {m.kind === "video" ? <MediaFill m={m} /> : <Img src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />}
    </div>
  ) : (
    <div style={{ position: "absolute", left: 86, top: 70, width: 908, height: 930, background: P.ground, borderTop: `2px solid ${P.rule}`, boxShadow: P.light ? "0 18px 40px rgba(0,0,0,.08)" : "none" }}>
      <div style={{ position: "absolute", left: 44, top: 32, width: 820, fontFamily: body, fontSize: 28, color: P.muted, ...nowrap, ...e(0) }}>
        {url || <div style={{ width: 260, height: 18, marginTop: 8, background: P.pressed }} />}
      </div>
      <div style={{ position: "absolute", left: 44, top: 90, width: 820, height: 2, background: P.rule, ...e(0) }} />
      <div style={{ position: "absolute", left: 40, top: 116, width: 830, fontFamily: head, fontSize: fit(title, 830, 84, 0.52), lineHeight: 1.1, letterSpacing: "-0.03em", color: P.ink, ...nowrap, ...e(1) }}>{title}</div>
      <div style={{ position: "absolute", left: GOAL_X - 86, top: GOAL_Y - 70, height: 64, display: "flex", alignItems: "center", ...e(2) }}>
        <span style={{ fontFamily: body, fontSize: lsize, color: P.ink, whiteSpace: "nowrap", padding: "4px 10px", margin: "0 -10px",
          background: `linear-gradient(${P.tint}, ${P.tint}) no-repeat`, backgroundSize: `${sp * 100}% 100%` }}>{line}</span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 34, height: 54, minWidth: 54, padding: badge ? "0 16px" : 0,
          background: P.ink, color: P.ground, fontFamily: head, fontSize: Math.min(34, 200 / Math.max(1, badge.length * 0.55)), whiteSpace: "nowrap",
          transform: `scale(${bs})`, transformOrigin: "0% 50%", opacity: frame >= tBadge ? 1 : 0 }}>
          {badge || <svg width="30" height="30" viewBox="0 0 30 30"><path d="M5 16 L12 23 L25 8" fill="none" stroke={P.ground} strokeWidth="4.5" strokeLinecap="square" /></svg>}
        </span>
        <span style={{ display: "inline-block", marginLeft: 18, width: 200, height: 30, background: P.pressed }} />
      </div>
      <div style={{ position: "absolute", left: 44, top: 348, width: 820, height: 2, background: P.rule, ...e(2) }} />
      {rows.map((r, i) => {
        const y = 386 + i * 118;
        return (
          <div key={i} style={{ position: "absolute", left: 44, top: y, width: 820, height: 100, ...e(3 + i) }}>
            {i === 0 ? <div style={{ position: "absolute", left: 0, top: 8, width: 8, height: 22, background: P.accent }} /> : null}
            {r ? <div style={{ position: "absolute", left: 22, top: 0, width: 160, fontFamily: body, fontSize: 30, lineHeight: "36px", color: i === 0 ? P.ink : P.muted, ...nowrap }}>{r}</div>
              : <div style={{ position: "absolute", left: 22, top: 8, width: 110, height: 20, background: P.pressed }} />}
            <div style={{ position: "absolute", left: 200, top: 6, width: lens[i][0], height: 22, background: P.pressed }} />
            <div style={{ position: "absolute", left: 200, top: 48, width: lens[i][1], height: 16, background: P.stone }} />
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ ...fill, opacity: o }}>
      <div style={{ ...fill, background: P.ink }} />
      <Speaker style={{ top: D * p }} />
      <div style={{ position: "absolute", left: 0, top: -SEAM * (1 - p), width: 1080, height: SEAM, overflow: "hidden", background: P.back }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, transform: `scale(${z})`, transformOrigin: `${ox}px ${oy}px` }}>
          {page}
          {frame > tc0 - 2 ? <Cursor x={cx} y={cy} pressed={sp > 0 && sp < 1} P={P} /> : null}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, top: SEAM * p - 2, width: 1080, height: 4, background: P.ink }} />
      {p > 0.95 ? <SeamCaption text={chunkAt(chunks(words), frame)} y={SEAM} P={P} font={body} /> : null}
    </div>
  );
}
