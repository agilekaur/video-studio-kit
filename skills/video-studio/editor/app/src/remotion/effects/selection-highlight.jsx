import React from "react";
import { interpolate, Easing } from "remotion";
import { fill, ease, fontStack, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "selection-highlight",
  "name": "Selection Highlight",
  "big": true,
  "captions": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point",
    "proof"
  ],
  "sfx": "tick",
  "desc": "On a drawn website above the speaker, an accent text selection sweeps line 2 as it is spoken, then a handle box with a size badge grabs the nav, is dragged wider and snaps onto the button on its word.",
  "params": [
    { "key": "url", "label": "Site address (top left and field)", "type": "text", "default": "" },
    { "key": "nav", "label": "Nav items (comma or one per line)", "type": "text", "default": "" },
    { "key": "line1", "label": "Headline line 1", "type": "text", "default": "" },
    { "key": "line2", "label": "Headline line 2 (gets selected as it is spoken)", "type": "text", "default": "" },
    { "key": "button", "label": "Button (box snaps on when spoken)", "type": "text", "default": "" }
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


// the headline to select: a spoken 3-6 word clause, split over two lines
function headline(text) {
  const cl = clausesOf(text);
  const c = cl.find((x) => { const n = x.split(/\s+/).length; return n >= 3 && n <= 6; }) || firstWords(cl[0] || "", 5);
  const ws = c.split(/\s+/).filter(Boolean);
  const h = Math.ceil(ws.length / 2);
  return [ws.slice(0, h).join(" "), ws.slice(h).join(" ")];
}

const HX = 120, L1Y = 420, L2Y = 540;

export function styles() {
  return { hideBase: true };
}

export function Front(ctx) {
  const { params, frame, frames, brand, words, text, focus } = ctx;
  const P = palette(brand.colors);
  const night = P.light ? P.ink : P.ground, nink = P.light ? P.ground : P.ink;
  const night2 = mix(night, nink, 0.08), nmuted = mix(night, nink, 0.4);
  const tint = mix(P.accent, night, 0.25), onTint = lum(tint) > 0.55 ? "#111111" : "#ffffff";
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const url = String(params.url || "").trim();
  const nav = String(params.nav || "").split(/\n|,|\||·/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const [h1, h2] = headline(text);
  const l1 = String(params.line1 || "").trim() || (params.line2 ? "" : h1);
  const l2 = String(params.line2 || "").trim() || h2;
  const btn = String(params.button || "").trim();
  const io = (t0, n) => interpolate(frame, [t0, t0 + Math.max(1, n)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const out = (t0, n) => ease(frame, t0, n);

  // timing from the spoken words
  const ph = findPhrase(words, l2.replace(/[.,!?:;]+$/, ""));
  const SEL0 = Math.max(12, Math.min(ph ? ph.from - 2 : Math.round(0.22 * frames), frames - 60));
  const SEL1 = Math.max(SEL0 + 6, Math.min(ph ? ph.to - 2 : SEL0 + 14, frames - 50));
  const jw = btn ? wordTime(words, btn, -1) : -1;
  const J = Math.max(SEL1 + 15, Math.min(jw > SEL1 ? jw - 1 : Math.round(0.77 * frames), frames - 16));
  const k = Math.min(1, (J - SEL1) / 35);
  const BOX = SEL1 + 3 * k, DRAG0 = SEL1 + 12 * k, DRAG1 = SEL1 + 27 * k;

  // sizes and layout
  const hs = Math.min(104, 790 / Math.max(1, Math.max(l1.length, l2.length) * 0.5));
  const navSize = 32;
  const navW = nav.length ? Math.min(790, nav.reduce((a, s) => a + s.length * navSize * 0.52, 0) + 52 * (nav.length - 1)) : 520;
  const navBox = [HX - 20, 222, HX + navW + 20, 300];
  const btnBox = [662, 720, 910, 830];

  const p = ease(frame, 0, 10) * (1 - ease(frame, frames - 7, 7));
  const D = splitShift(focus);
  const e = (i) => { const a = ease(frame, 4 + i * 1.1, 12); return { opacity: a, transform: `translateY(${30 * (1 - a)}px)` }; };

  // selection sweep
  const sp = io(SEL0, SEL1 - SEL0);
  const sfade = 1 - out(J + 2, 5);
  // handle box: nav, dragged wider, then snaps onto the button
  const ba = out(BOX, 10);
  const drag = io(DRAG0, DRAG1 - DRAG0);
  const jp = out(J, 10);
  const pad = 14;
  const from = [navBox[0], navBox[1], navBox[2] + 46 * drag, navBox[3]];
  const to = [btnBox[0] - pad, btnBox[1] - pad, btnBox[2] + pad, btnBox[3] + pad];
  const [x0, y0, x1, y1] = from.map((v, i) => v + (to[i] - v) * jp);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const ex0 = cx + (x0 - cx) * ba, ex1 = cx + (x1 - cx) * ba, ey0 = cy + (y0 - cy) * ba, ey1 = cy + (y1 - cy) * ba;
  const badgeA = out(BOX + 6, 9) * (1 - out(J, 4));
  const press = io(J + 7, 5) - io(J + 12, 5);
  const sq = 1 - 0.06 * Math.max(0, press);

  // cursor path
  const l2w = Math.min(820, l2.length * hs * 0.5);
  const hx = from[2], hy = (navBox[1] + navBox[3]) / 2;
  let curX, curY;
  if (frame < SEL1 + 2) {
    const q = io(9, 12);
    curX = 820 + (HX + 20 - 820) * q; curY = 930 + (L2Y + 100 - 930) * q;
    curX += (HX + l2w - curX) * io(SEL0, SEL1 - SEL0);
  } else if (frame < J) {
    const q = io(SEL1 + 2, Math.max(4, DRAG0 - SEL1 - 3));
    curX = HX + l2w + (hx + 4 - HX - l2w) * q; curY = L2Y + 100 + (hy + 4 - L2Y - 100) * q;
    if (frame >= DRAG0) { curX = hx + 4; curY = hy + 4; }
  } else {
    const q = io(J, 9);
    curX = hx + 4 + ((btnBox[0] + btnBox[2]) / 2 + 30 - hx - 4) * q; curY = hy + 4 + ((btnBox[1] + btnBox[3]) / 2 + 10 - hy - 4) * q;
  }
  const pressed = (frame >= SEL0 && frame <= SEL1) || (frame >= DRAG0 - 1 && frame <= DRAG1) || (frame >= J + 7 && frame <= J + 11);
  const handles = [[ex0, ey0], [cx, ey0], [ex1, ey0], [ex1, cy], [ex1, ey1], [cx, ey1], [ex0, ey1], [ex0, cy]];
  const CP = { ground: nink, ink: night };

  return (
    <div style={fill}>
      <div style={{ ...fill, background: "#000" }} />
      <Speaker style={{ top: D * p }} />
      <div style={{ position: "absolute", left: 0, top: -SEAM * (1 - p), width: 1080, height: SEAM, overflow: "hidden", background: night }}>
        <div style={{ position: "absolute", left: HX, top: 160, width: 790, fontFamily: body, fontSize: 32, color: nink, ...nowrap, ...e(0) }}>
          {url || <div style={{ width: 240, height: 18, marginTop: 10, background: night2 }} />}
        </div>
        <div style={{ position: "absolute", left: HX, top: 240, width: navW, height: 44, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.82, ...e(1) }}>
          {nav.length ? nav.map((s, i) => <span key={i} style={{ fontFamily: body, fontSize: navSize, color: nink, whiteSpace: "nowrap" }}>{s}</span>)
            : [110, 96, 84, 104].map((w, i) => <span key={i} style={{ width: w, height: 16, background: nmuted }} />)}
        </div>
        <div style={{ position: "absolute", left: HX, top: 352, width: 790, height: 2, background: nmuted, ...e(1) }} />
        <div style={{ position: "absolute", left: HX, top: L1Y + (104 - hs), fontFamily: head, fontSize: hs, lineHeight: "118px", letterSpacing: "-0.03em", color: nink, whiteSpace: "nowrap", ...e(2) }}>{l1}</div>
        <div style={{ position: "absolute", left: HX, top: L2Y, ...e(3) }}>
          <div style={{ position: "relative", display: "inline-block", fontFamily: head, fontSize: hs, lineHeight: "118px", letterSpacing: "-0.03em", color: nink, whiteSpace: "nowrap" }}>
            {l2}
            {sp > 0 && sfade > 0 ? (
              <div style={{ position: "absolute", left: -8, top: 8, bottom: 0, width: `calc(${sp * 100}% + ${8 * sp}px)`, overflow: "hidden", background: tint, opacity: 0.94 * sfade }}>
                <div style={{ position: "absolute", left: 8, top: -8, color: onTint }}>{l2}</div>
                {sp < 1 ? <div style={{ position: "absolute", right: 0, top: -6, bottom: -6, width: 4, background: P.accent }} /> : null}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ position: "absolute", left: 120, top: 720, width: 520, height: 110, background: night2, borderTop: `2px solid ${nmuted}`, ...e(4) }}>
          <div style={{ position: "absolute", left: 32, top: 34, width: 460, fontFamily: body, fontSize: 36, color: nmuted, ...nowrap }}>{url || "https://"}</div>
        </div>
        <div style={{ position: "absolute", left: btnBox[0], top: btnBox[1], width: btnBox[2] - btnBox[0], height: btnBox[3] - btnBox[1], ...e(4) }}>
          <div style={{ width: "100%", height: "100%", background: nink, color: night, display: "grid", placeItems: "center", transform: `scale(${sq})` }}>
            {btn ? <span style={{ fontFamily: head, fontSize: Math.min(46, 220 / Math.max(1, btn.length * 0.55)), whiteSpace: "nowrap" }}>{btn}</span>
              : <svg width="64" height="40" viewBox="0 0 64 40"><path d="M4 20 H54 M38 5 L56 20 L38 35" fill="none" stroke={night} strokeWidth="6" strokeLinecap="square" /></svg>}
          </div>
        </div>
        {frame >= BOX ? (
          <>
            <div style={{ position: "absolute", left: ex0 - 1.5, top: ey0 - 1.5, width: ex1 - ex0 + 3, height: ey1 - ey0 + 3, border: `3px solid ${P.accent}`, boxSizing: "border-box" }} />
            {handles.map(([x, y], i) => {
              const s = 9 * Math.max(0, Math.min(1.3, interpolate(frame, [BOX + 4 + 0.75 * i, BOX + 11 + 0.75 * i], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) })));
              return s > 0.5 ? <div key={i} style={{ position: "absolute", left: x - s - 2, top: y - s - 2, width: 2 * s + 4, height: 2 * s + 4, background: nink, border: `3px solid ${P.accent}`, boxSizing: "border-box" }} /> : null;
            })}
            {badgeA > 0.01 ? (
              <div style={{ position: "absolute", left: cx - 70, width: 140, top: y1 + 18 + 12 * (1 - badgeA), display: "flex", justifyContent: "center", opacity: badgeA }}>
                <div style={{ background: P.accent, color: P.onAccent, fontFamily: body, fontSize: 28, lineHeight: "44px", padding: "0 14px", fontVariantNumeric: "tabular-nums" }}>{Math.round(x1 - x0)}</div>
              </div>
            ) : null}
          </>
        ) : null}
        {frame > 9 ? <Cursor x={curX} y={curY} pressed={pressed} P={CP} /> : null}
      </div>
      <div style={{ position: "absolute", left: 0, top: SEAM * p - 2, width: 1080, height: 4, background: "#000" }} />
      {p > 0.95 ? <SeamCaption text={chunkAt(chunks(words), frame)} y={SEAM} P={P} font={body} /> : null}
    </div>
  );
}
