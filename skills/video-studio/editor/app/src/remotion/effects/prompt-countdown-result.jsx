import React from "react";
import { fill, ease, pop, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "prompt-countdown-result",
  "name": "Prompt, Countdown, Result",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "tools",
    "proof"
  ],
  "sfx": "ding",
  "captions": false,
  "desc": "Top half: a prompt types and sends, a big countdown runs to zero, then a tick springs in with a result line; speaker below the seam with a small seam caption.",
  "params": [
    {
      "key": "prompt_label",
      "label": "Typed prompt",
      "type": "text",
      "default": ""
    },
    {
      "key": "count_label",
      "label": "Countdown label",
      "type": "text",
      "default": "Generating"
    },
    {
      "key": "count_from",
      "label": "Count from (seconds, use the number you say)",
      "type": "range",
      "min": 3,
      "max": 60,
      "step": 1,
      "default": 10
    },
    {
      "key": "title",
      "label": "Result title (lands on this word if spoken)",
      "type": "text",
      "default": ""
    },
    {
      "key": "sub",
      "label": "Result sub line",
      "type": "text",
      "default": ""
    }
  ],
  "status": "ready"
};

// ---------- split layout (panel on top, speaker below the seam) ----------
const SEAM = 960;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = (h) => { const s = String(h || "#000").replace("#", ""); const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0"); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
function palette(C) {
  const G = C.surface || "#111111", I = C.surface_text || "#ffffff";
  return { G, I, A: C.accent, onA: lum(C.accent) > 0.55 ? "#111111" : "#ffffff", body: lum(G) < 0.2 ? "#000000" : (C.outline || "#0f0d0c"),
    stone: mix(G, I, 0.07), pressed: mix(G, I, 0.14), rule: mix(G, I, 0.2), muted: mix(G, I, 0.5), deep: mix(C.accent, "#000000", 0.25) };
}
// 0..1: the split opens over 9 frames and closes back to the plain frame over the last 8
const splitP = (frame, frames) => ease(frame, 0, 9) * (1 - ease(frame, frames - 8, 7));
// footage shift that puts the face ~320 px under the seam
const shiftFor = (focus) => clamp(SEAM + 320 - focus.y * 1920, 0, SEAM);

export function styles() {
  return { hideBase: true };
}

export function Behind({ frame, frames, focus }) {
  const p = splitP(frame, frames);
  return (
    <div style={fill}>
      <Speaker style={{ left: 0, top: shiftFor(focus) * p, width: 1080, height: 1920 }} />
    </div>
  );
}

// small caption chunk on the seam (the global captions would land on the face in this layout)
function chunks(words) {
  const out = [];
  let cur = [];
  words.forEach((w) => {
    cur.push(w);
    if (cur.length >= 3 || /[.,!?;:]$/.test(w.text)) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
}
function SeamCaption({ words, frame, font, P, bottom }) {
  const cs = chunks(words);
  let c = null;
  cs.forEach((ch, k) => { if (frame >= ch[0].from - 2 && (k === cs.length - 1 || frame < cs[k + 1][0].from - 2)) c = ch; });
  if (!c || frame > c[c.length - 1].to + 20) return null;
  const txt = c.map((w) => w.text).join(" ");
  const size = Math.min(40, 860 / Math.max(1, txt.length * 0.62));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: bottom - 70, height: 70, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: P.I, color: P.G, fontFamily: font, fontSize: size, letterSpacing: 1.5, textTransform: "uppercase",
        padding: "12px 22px 10px", whiteSpace: "nowrap", lineHeight: 1 }}>
        {c.map((w, k) => <span key={k} style={{ opacity: frame >= w.from - 1 ? 1 : 0.4 }}>{(k ? " " : "") + w.text}</span>)}
      </div>
    </div>
  );
}

// ---------- prompt -> countdown -> result ----------
// kit timeline (seconds, 4 s demo): typing 0.12-0.80, send 0.98, countdown in 1.10, runs 1.22-2.48, result 2.66
const T_TYPE0 = 0.12, T_TYPE1 = 0.80, T_PRESS = 0.98, T_B2 = 1.10, T_C0 = 1.22, T_C1 = 2.48, T_B3 = 2.66;
const prog = (t, t0, d) => clamp((t - t0) / d, 0, 1);
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const outExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const inoutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outBack = (x, s = 2.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const CURSOR = "M0 0 L0 46 L11 35 L19 54 L28 50 L20 32 L35 32 Z";
const PARTS = Array.from({ length: 13 }, (_, i) => [i * 360 / 13 + (i * 47 % 17) - 8, 0.8 + (i * 31 % 7) / 14, i % 3 !== 2]);

const clauses = (text) => String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
const firstWords = (s, n) => String(s).split(/\s+/).slice(0, n).join(" ");

export function Front({ params, frame, frames, brand, words, text }) {
  const C = brand.colors, P = palette(C);
  const body = `"${brand.fonts.body.family}", Arial, sans-serif`, head = `"${brand.fonts.heading.family}", "Arial Black", Arial, sans-serif`;
  const cl = clauses(text);
  const dom = String(text || "").match(/\b[a-z0-9-]+\.(com|co|io|ai|app|net|org|dev)\b/i);
  const typed = String(params.prompt_label || "").trim() || (dom ? dom[0] : firstWords(cl[0] || "Start", 5));
  const countLabel = String(params.count_label || "").trim() || "Generating";
  const said = String(text || "").match(/\b(\d{1,2})\s*(seconds|secs|sec|s)\b/i);
  const n0 = clamp(Math.round(+params.count_from || (said ? +said[1] : 10)), 1, 99);
  const title = String(params.title || "").trim() || "Done";
  const sub = String(params.sub || "").trim() || (cl.length > 1 ? cl[cl.length - 1] : "");

  // the result lands on the title word if spoken, else at the kit's 66 % mark; prompt + countdown stretch to fit
  const lo = Math.min(36, Math.round(frames * 0.5));
  const tb3 = clamp(wordTime(words, params.title, Math.round(frames * 0.66)), lo, Math.max(lo, frames - 15));
  const f = tb3 / (T_B3 * 30);
  const lw = frame / f / 30;                     // warped seconds for beats 1 and 2
  const p = splitP(frame, frames);

  const countAt = (F) => {
    const q = prog(F / f / 30, T_C0, T_C1 - T_C0);
    return Math.ceil(n0 * Math.pow(1 - q, 2.1) - 1e-9);
  };
  const strAt = (F) => "00:" + String(countAt(F)).padStart(2, "0");

  let content = null;
  if (frame < tb3) {
    // ---- beat 1: prompt box types and sends
    const aIn = outExpo(prog(lw, 0, 0.3)), aOut = outCubic(prog(lw, T_B2, 0.16));
    const dy = 110 + 36 * (1 - aIn) - 60 * aOut, al = aIn * (1 - aOut);
    const n = Math.round(typed.length * prog(lw, T_TYPE0, T_TYPE1 - T_TYPE0));
    const caret = (lw >= T_TYPE0 && lw <= T_TYPE1 + 0.05) || Math.floor((lw - T_TYPE1) * 4) % 2 === 1 || lw < T_TYPE0;
    const pr = prog(lw, T_PRESS, 0.16), bs = 1 - 0.1 * Math.sin(Math.PI * pr);
    const cp = inoutCubic(prog(lw, 0.55, 0.4));
    const fs = Math.max(34, Math.min(50, 600 / Math.max(1, typed.length * 0.5)));
    const beat1 = al > 0.01 ? (
      <div style={{ position: "absolute", left: 0, top: dy, width: 1080, height: 700, opacity: al }}>
        <div style={{ position: "absolute", left: 120, top: 208, fontFamily: body, fontSize: 30, letterSpacing: 4, color: P.muted, textTransform: "uppercase" }}>Prompt</div>
        <div style={{ position: "absolute", left: 120, top: 270, width: 790, height: 160, background: P.G, border: `2px solid ${P.rule}`, boxSizing: "border-box" }} />
        <div style={{ position: "absolute", left: 156, top: 270, width: 600, height: 160, display: "flex", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
          <div style={{ flex: "none", display: "flex", alignItems: "center", maxWidth: 600, justifyContent: n > 0 && typed.length * fs * 0.5 > 600 ? "flex-end" : "flex-start", width: "100%" }}>
            <span style={{ fontFamily: body, fontSize: fs, color: P.I, letterSpacing: -0.5, whiteSpace: "pre", lineHeight: 1 }}>{typed.slice(0, n)}</span>
            <span style={{ width: 4, height: fs * 1.3, marginLeft: 5, background: P.I, opacity: caret ? 1 : 0, flex: "none" }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 836 - 52 * bs, top: 350 - 52 * bs, width: 104 * bs, height: 104 * bs, background: pr > 0 && pr < 1 ? P.A : P.I, display: "grid", placeItems: "center" }}>
          <svg width={60 * bs} height={50 * bs} viewBox="-26 -22 52 44"><path d="M-24 0 H22 M4 -19 L23 0 L4 19" fill="none" stroke={pr > 0 && pr < 1 ? P.onA : P.G} strokeWidth="7" strokeLinecap="square" /></svg>
        </div>
        {lw > 0.5 ? (
          <svg width="44" height="62" viewBox="-4 -4 44 62" style={{ position: "absolute", left: 700 + (842 - 700) * cp - 4, top: 750 + (358 - 750) * cp - 4, transform: `scale(${pr > 0 && pr < 1 ? 0.88 : 1})` }}>
            <path d={CURSOR} fill={P.G} stroke={P.I} strokeWidth="3" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>
    ) : null;

    // ---- beat 2: countdown
    let beat2 = null;
    if (lw >= T_B2) {
      const a = outExpo(prog(lw, T_B2, 0.3)), dy2 = 110 + 50 * (1 - a);
      const cur = strAt(frame);
      const red = countAt(frame) <= 3 && lw >= T_C0;
      const col = red ? P.A : P.I;
      const CELL = 150, COL = 70;
      const total = CELL * 4 + COL, x0 = 540 - total / 2;
      let x = x0;
      const chars = cur.split("").map((ch, i) => {
        const cw = ch === ":" ? COL : CELL;
        // flip (old slides up and fades, new rises in, 4 frames) only when the digit had been holding
        let j = 99, prev = null;
        for (let back = 0; back < 4; back++) {
          const A = strAt(frame - back)[i], B = strAt(frame - back - 1)[i];
          if (A !== B) {
            if ([1, 2, 3].every((q) => strAt(frame - back - 1 - q)[i] === B)) { j = back; prev = B; }
            break;
          }
        }
        const e = prev ? (j + 1) / 4 : 1, ee = outCubic(e);
        const el = (
          <div key={i} style={{ position: "absolute", left: x, top: 0, width: cw, height: 260, overflow: "visible" }}>
            <div style={{ position: "absolute", inset: 0, textAlign: "center", transform: `translateY(${20 * (1 - ee)}px)`, opacity: prev ? clamp(2 * e - 0.5, 0, 1) : 1 }}>{ch}</div>
            {prev && e < 1 ? <div style={{ position: "absolute", inset: 0, textAlign: "center", transform: `translateY(${-20 * ee}px)`, opacity: clamp(1 - 2 * e, 0, 1) }}>{prev}</div> : null}
          </div>
        );
        x += cw;
        return el;
      });
      const q = prog(lw, T_C0, T_C1 - T_C0);
      beat2 = (
        <div style={{ position: "absolute", left: 0, top: dy2, width: 1080, height: 700, opacity: a }}>
          <div style={{ position: "absolute", left: 120, right: 120, top: 158, textAlign: "center", fontFamily: body, fontSize: 30, letterSpacing: 4.2, color: P.muted,
            textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{countLabel}</div>
          <div style={{ position: "absolute", left: 0, top: 220, width: 1080, height: 260, fontFamily: head, fontSize: 230, lineHeight: "260px", color: col, letterSpacing: 0 }}>{chars}</div>
          <div style={{ position: "absolute", left: x0, top: 540, width: total, height: 2, background: P.rule }} />
          <div style={{ position: "absolute", left: x0, top: 538, width: total * q, height: 6, background: red ? P.A : P.I }} />
        </div>
      );
    }
    content = <>{beat1}{beat2}</>;
  } else {
    // ---- beat 3: tick springs in with the result
    const t = (frame - tb3) / 30;
    const cx = 540, cy = 330, S = 210;
    const sc = Math.max(0, outBack(prog(t, 0, 0.34)));
    const h = (S / 2) * sc;
    const tp = outCubic(prog(t, 0.12, 0.22));
    const pp = prog(t, 0.06, 0.6), e = outCubic(pp);
    const a1 = outExpo(prog(t, 0.16, 0.45)), a2 = outExpo(prog(t, 0.32, 0.45));
    const tfs = Math.max(48, Math.min(92, 840 / Math.max(1, title.length * 0.55)));
    content = (
      <>
        <svg width="1080" height="700" style={{ position: "absolute", left: 0, top: 0 }}>
          {pp > 0 && pp < 1 ? PARTS.map(([ang, spd, ink], k) => {
            const r0 = 130 + 150 * spd * e, r1 = r0 + 34 * (1 - pp) + 6;
            const ca = Math.cos(ang * Math.PI / 180), sa = Math.sin(ang * Math.PI / 180);
            return <line key={k} x1={cx + ca * r0} y1={cy + sa * r0} x2={cx + ca * r1} y2={cy + sa * r1} stroke={ink ? P.I : P.muted} strokeOpacity={1 - Math.pow(pp, 1.6)} strokeWidth="7" />;
          }) : null}
          <rect x={cx - h} y={cy - h} width={2 * h} height={2 * h} fill={P.I} />
          {tp > 0 ? <path d={`M${cx - 52 * sc} ${cy + 4 * sc} L${cx - 14 * sc} ${cy + 42 * sc} L${cx + 56 * sc} ${cy - 40 * sc}`} fill="none" stroke={P.G} strokeWidth={22 * sc}
            strokeLinecap="square" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - tp} /> : null}
        </svg>
        <div style={{ position: "absolute", left: 100, right: 100, top: 480 + 40 * (1 - a1), textAlign: "center", fontFamily: head, fontSize: tfs, lineHeight: 1.05, color: P.I,
          opacity: a1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: -1 }}>{title}</div>
        {sub ? <div style={{ position: "absolute", left: 120, right: 120, top: 610 + 30 * (1 - a2), textAlign: "center", fontFamily: body, fontSize: 38, lineHeight: "48px", color: P.muted,
          opacity: a2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sub}</div> : null}
      </>
    );
  }

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, overflow: "hidden", transform: `translateY(${-(1 - p) * SEAM}px)`, background: P.G }}>
      <div style={{ position: "absolute", left: 0, top: 70, width: 1080, height: 800 }}>{content}</div>
      <SeamCaption words={words} frame={frame} font={body} P={P} bottom={SEAM - 22} />
      <div style={{ position: "absolute", left: 0, right: 0, top: SEAM - 2, height: 2, background: P.I }} />
    </div>
  );
}
