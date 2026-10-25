import React from "react";
import { fill, ease, pop, exitFade, fontStack, listParam, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "panel-explainer",
  "name": "Panel Explainer",
  "big": false,
  "captions": false,
  "needs": [],
  "prefers": [],
  "purposes": ["point", "list", "proof", "tools"],
  "sfx": "pop",
  "desc": "Layout for runs of beats: the speaker sits in a fixed rounded panel in the lower frame while an explainer graphic fills the top (numbered steps, a counting stat, a two-column compare or a set quote), revealed as it is spoken. Small seam caption on the panel edge. The panel never moves, so consecutive beats cut seamlessly.",
  "params": [
    { "key": "kind", "label": "Graphic", "type": "select", "options": ["auto", "steps", "stat", "compare", "quote"], "default": "auto" },
    { "key": "title", "label": "Title (blank = from the speech; for compare use \"A vs B\")", "type": "text", "default": "" },
    { "key": "items", "label": "Items, one per line (blank = the spoken clauses)", "type": "list", "default": [] },
    { "key": "value", "label": "Stat value or quote keyword (blank = from the speech)", "type": "text", "default": "" }
  ],
  "status": "ready"
};

// ---------- palette from the brand: works on light and dark grounds ----------
const rgb = (c) => {
  let s = String(c || "").trim().replace("#", "");
  if (s.length === 3) s = s.split("").map((x) => x + x).join("");
  const n = parseInt(s.slice(0, 6), 16);
  return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
function palette(C) {
  const ground = C.surface || "#111111";
  let ink = C.surface_text || "#ffffff";
  if (Math.abs(lum(ground) - lum(ink)) < 0.35) ink = lum(ground) > 0.5 ? "#141210" : "#f6f3ec";
  const light = lum(ground) > 0.5;
  const accent = C.accent || "#FFD400";
  return {
    ground, ink, light, accent,
    top: light ? mix(ground, "#ffffff", 0.35) : mix(ground, ink, 0.06),
    card: light ? mix(ground, "#ffffff", 0.72) : mix(ground, ink, 0.07),
    cardEdge: light ? rgba(ink, 0.08) : rgba(ink, 0.09),
    shadow: light ? "0 2px 4px rgba(20,16,10,.04), 0 18px 40px rgba(40,30,15,.10)" : "0 2px 4px rgba(0,0,0,.3), 0 22px 50px rgba(0,0,0,.45)",
    dot: rgba(ink, light ? 0.10 : 0.08),
    rule: mix(ground, ink, light ? 0.16 : 0.2),
    muted: mix(ground, ink, 0.55),
    faint: mix(ground, ink, 0.3),
    onAccent: lum(accent) > 0.6 ? "#111111" : "#ffffff",
    // accent used as text on the ground: keep enough contrast
    accentText: Math.abs(lum(accent) - lum(ground)) < 0.25 ? ink : accent,
  };
}

// ---------- layout constants (identical on every beat) ----------
const PANEL = { left: 60, top: 1000, width: 960, height: 860, borderRadius: 40 };
const X0 = 80, X1 = 940, W = X1 - X0;          // text column, clear of the right 140 px
const TOP0 = 170, TOP1 = 900;                  // explainer area
const VW = 960, VH = Math.round(960 * 1920 / 1080);   // footage scaled to the panel width

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fit = (s, maxW, size, k = 0.54, min = 26) => Math.max(min, Math.min(size, maxW / Math.max(1, String(s).length * k)));
const nowrap = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const clean = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9%$]/g, "");
const tidy = (s) => String(s || "").trim().replace(/^[,;:.\s-]+|[,;:\s-]+$/g, "");
const cap1 = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const firstWords = (s, n) => { const w = String(s).split(/\s+/).filter(Boolean); return w.slice(0, n).join(" ") + (w.length > n ? "…" : ""); };

// ---------- clauses from the speech, with the frame each starts at ----------
const asWords = (words, text) => (words.length ? words : String(text || "").split(/\s+/).filter(Boolean).map((t, i) => ({ text: t, from: i * 8, to: i * 8 + 6 })));
function clausesOf(words, text) {
  const ws = asWords(words, text);
  const out = [];
  let cur = [];
  const push = () => { const t = tidy(cur.map((w) => w.text.trim()).join(" ")); if (t.replace(/[^a-z0-9]/gi, "").length > 1) out.push({ text: t, from: cur[0].from }); cur = []; };
  ws.forEach((w) => {
    const t = w.text.trim();
    if (/^(and|&)$/i.test(t) && cur.length >= 2) { push(); return; }
    cur.push(w);
    if (/[,;.!?:]$/.test(t)) push();
  });
  if (cur.length) push();
  return out;
}
function firstSentence(words, text) {
  const out = [];
  for (const w of asWords(words, text)) { out.push(w); if (/[.!?]$/.test(w.text.trim()) && out.length >= 3) break; if (out.length >= 16) break; }
  return out;
}

// ---------- numbers ----------
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, a: 1, half: 0.5 };
const SCALE = { hundred: [100, ""], thousand: [1, "K"], million: [1, "M"], billion: [1, "B"], k: [1, "K"], m: [1, "M"], b: [1, "B"], bn: [1, "B"] };
// parse "3M", "$4.5k", "40%", "10x", "3 million", "three million" -> {pre, n, dec, suf}
function parseValue(s) {
  const t = String(s || "").trim();
  if (!t) return null;
  const m = t.match(/([$£€])?\s*(\d+(?:[.,]\d+)*)\s*(%|percent|x|k|m|bn|b|thousand|million|billion|hundred)?(?![a-z])/i);
  if (m) {
    const raw = m[2].replace(/,(?=\d{3}(\D|$))/g, "");
    const n = parseFloat(raw.replace(",", "."));
    const dec = (raw.split(".")[1] || "").length;
    let suf = (m[3] || "").toLowerCase();
    let mult = 1;
    if (suf === "percent") suf = "%";
    else if (suf === "x") suf = "×";
    else if (SCALE[suf]) { mult = SCALE[suf][0]; suf = SCALE[suf][1]; }
    return { pre: m[1] || "", n: n * mult, dec, suf };
  }
  const w = t.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a|half)\s+(hundred|thousand|million|billion)\b/);
  if (w) { const [mult, suf] = SCALE[w[2]]; const n = NUMW[w[1]] * mult; return { pre: "", n, dec: n % 1 ? 1 : 0, suf }; }
  return null;
}
const NUM_RE = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|a|half)\s+(hundred|thousand|million|billion)\b/i;
// the first number phrase in the words: its value, the frame it is spoken, and the few words after it as a label
function findNumber(words) {
  for (let i = 0; i < words.length; i++) {
    const a = words[i].text.trim(), b = (words[i + 1] || { text: "" }).text.trim();
    let span = 0;
    if (/\d/.test(a)) span = /^(%|percent|x|k|m|bn|b|thousand|million|billion)[.,!?]?$/i.test(b) ? 2 : 1;
    else if (/^(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|a|half)$/i.test(a) && /^(hundred|thousand|million|billion)/i.test(b)) span = 2;
    if (!span) continue;
    const v = parseValue(span === 2 ? a + " " + b : a);
    if (!v) continue;
    const lab = [];
    if (!/[,.!?;:]$/.test(words[i + span - 1].text.trim())) {
      for (let j = i + span; j < Math.min(words.length, i + span + 3); j++) {
        const t = words[j].text.trim();
        if (/^(and|but|so|that|which|to|in|on|for|with|it|is)$/i.test(t.replace(/[^a-z]/gi, ""))) break;
        lab.push(t.replace(/[,.!?;:]+$/, ""));
        if (/[,.!?;:]$/.test(t)) break;
      }
    }
    return { v, from: words[i].from, label: lab.join(" ") };
  }
  return null;
}
function fmt(v, x) {
  // while counting, small values show one decimal; the landed frame shows the true value
  const done = x >= 0.999;
  const dec = done ? v.dec : (v.n < 10 ? 1 : v.dec);
  const s = (v.n * x).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return v.pre + s + v.suf;
}

// ---------- seam caption: 1-3 word chunks, hard-swapping ----------
function chunks(words) {
  const out = [];
  let cur = [];
  words.forEach((w, k) => {
    cur.push(w);
    const next = words[k + 1];
    const brk = /[,.!?;:]$/.test(w.text.trim()) || !next || next.from - w.to > 8 || cur.length >= 3;
    if (brk) { out.push({ from: cur[0].from - 1, to: cur[cur.length - 1].to, text: cur.map((x) => x.text.trim()).join(" ").replace(/[,;:.!?]+$/, "") }); cur = []; }
  });
  return out;
}
function SeamCaption({ words, frame, P, font }) {
  let c = null;
  chunks(words).forEach((x) => { if (frame >= x.from) c = x; });
  if (!c || frame > c.to + 24) return null;
  const t = c.text.toUpperCase();
  const size = fit(t, 640, 34, 0.68, 20);
  return (
    <div style={{ position: "absolute", left: X0, width: W, top: PANEL.top - 76, height: 60, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: P.ink, color: P.ground, fontFamily: font, fontSize: size, letterSpacing: "0.08em", lineHeight: 1, padding: "14px 22px 12px",
        borderRadius: 999, whiteSpace: "nowrap", boxShadow: P.light ? "0 8px 20px rgba(0,0,0,.18)" : "0 8px 24px rgba(0,0,0,.5)" }}>{t}</div>
    </div>
  );
}

// ---------- shared bits ----------
const enter = (frame, t, n = 10, dy = 28) => { const a = ease(frame, t, n); return { opacity: a, transform: `translateY(${dy * (1 - a)}px)` }; };

function Eyebrow({ text, P, font, frame, t = 2 }) {
  if (!text) return null;
  return (
    <div style={{ position: "absolute", left: X0, top: TOP0, width: W, display: "flex", alignItems: "center", gap: 18, ...enter(frame, t, 8, 12) }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: P.accent, flex: "none" }} />
      <div style={{ fontFamily: font, fontSize: 28, letterSpacing: "0.16em", textTransform: "uppercase", color: P.muted, ...nowrap }}>{text}</div>
    </div>
  );
}

function Title({ text, P, font, frame, top, size = 72, lines = 2, t = 3 }) {
  if (!text) return null;
  const s = clamp(Math.round(fit(text, W * lines * 0.92, size, 0.5, 44)), 44, size);
  return (
    <div style={{ position: "absolute", left: X0, top, width: W, fontFamily: font, fontSize: s, lineHeight: 1.04, letterSpacing: "-0.025em", color: P.ink,
      display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden", ...enter(frame, t, 10, 20) }}>{text}</div>
  );
}

// ---------- kinds ----------
function Steps({ P, head, body, frame, fps, title, items }) {
  const n = items.length;
  const top0 = title ? 380 : 250;
  const gap = 22;
  const h = clamp(Math.floor((TOP1 - top0 - gap * (n - 1)) / Math.max(1, n)), 96, 150);
  const cy = (i) => top0 + i * (h + gap) + h / 2;
  const BX = X0 + 34;   // badge centre
  return (
    <>
      <Eyebrow text={n > 1 ? `${n} steps` : "Step"} P={P} font={body} frame={frame} />
      <Title text={title} P={P} font={head} frame={frame} top={TOP0 + 52} size={68} lines={2} />
      {/* connector line, drawn down to each badge as it lands */}
      {n > 1 ? items.map((it, i) => {
        if (i === 0) return null;
        const d = ease(frame, it.t - 8, 10);
        const y0 = cy(i - 1) + 34, y1 = cy(i) - 34;
        return (
          <React.Fragment key={"l" + i}>
            <div style={{ position: "absolute", left: BX - 1.5, top: y0, width: 3, height: y1 - y0, background: P.rule, borderRadius: 2, opacity: ease(frame, 4 + i * 2, 8) }} />
            <div style={{ position: "absolute", left: BX - 1.5, top: y0, width: 3, height: (y1 - y0) * d, background: P.accent, borderRadius: 2 }} />
          </React.Fragment>
        );
      }) : null}
      {items.map((it, i) => {
        const on = frame >= it.t;
        const a = ease(frame, it.t, 10);
        const s = on ? 0.7 + 0.3 * pop(frame, fps, it.t, 11) : 0.7;
        const fs = clamp(Math.round(fit(it.text, 640 * 2, 44, 0.5, 32)), 32, 44);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: X0 + 92, top: cy(i) - h / 2, width: W - 92, height: h, borderRadius: 28, background: P.card,
              boxShadow: `${P.shadow}, inset 0 0 0 1.5px ${P.cardEdge}`, opacity: a, transform: `translateX(${40 * (1 - a)}px)`,
              display: "flex", alignItems: "center", padding: "0 40px", boxSizing: "border-box" }}>
              <div style={{ fontFamily: body, fontSize: fs, lineHeight: 1.12, color: P.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.text}</div>
            </div>
            <div style={{ position: "absolute", left: BX - 34, top: cy(i) - 34, width: 68, height: 68, borderRadius: 34,
              background: on ? P.accent : P.ground, border: on ? "none" : `3px solid ${P.rule}`, boxSizing: "border-box",
              transform: `scale(${s})`, opacity: on ? 1 : ease(frame, 2 + i * 2, 8), display: "grid", placeItems: "center", boxShadow: on ? `0 10px 24px ${rgba(P.accent, 0.35)}` : "none",
              fontFamily: head, fontSize: 34, color: on ? P.onAccent : P.faint, lineHeight: 1 }}>{i + 1}</div>
          </React.Fragment>
        );
      })}
    </>
  );
}

const BARS = [0.22, 0.3, 0.26, 0.38, 0.34, 0.48, 0.44, 0.58, 0.55, 0.7, 0.8, 1];
function Stat({ P, head, body, frame, v, label, t }) {
  const x = ease(frame, t, 26);
  const final = fmt(v, 1);
  const size = clamp(Math.round(fit(final, W, 300, 0.6, 140)), 140, 300);
  const landed = frame >= t + 26;
  const bump = landed ? 1 + 0.04 * Math.sin(clamp((frame - t - 26) / 8, 0, 1) * Math.PI) : 1;
  const chartTop = 640, chartH = 250, bw = 52, bg = (W - BARS.length * bw) / (BARS.length - 1);
  return (
    <>
      <Eyebrow text="By the numbers" P={P} font={body} frame={frame} />
      <div style={{ position: "absolute", left: X0 - 6, top: 230, width: W + 6, height: size * 1.05, fontFamily: head, fontSize: size, lineHeight: 1, letterSpacing: "-0.045em",
        color: P.accentText, fontVariantNumeric: "tabular-nums", transform: `scale(${bump})`, transformOrigin: "0% 60%", ...nowrap, ...enter(frame, 2, 10, 24) }}>{fmt(v, x)}</div>
      {label ? (
        <div style={{ position: "absolute", left: X0, top: 230 + size * 1.02, width: W, fontFamily: head, fontSize: fit(label, W, 64, 0.5, 38), lineHeight: 1.05,
          letterSpacing: "-0.02em", color: P.ink, ...nowrap, ...enter(frame, 6, 10, 18) }}>{label}</div>
      ) : null}
      {/* rising bars: grow with the count, last one in accent */}
      {BARS.map((b, i) => {
        const g = ease(frame, t + i * 1.6, 14);
        const hh = Math.max(6, chartH * b * g);
        const last = i === BARS.length - 1;
        return <div key={i} style={{ position: "absolute", left: X0 + i * (bw + bg), top: chartTop + chartH - hh, width: bw, height: hh, borderRadius: "14px 14px 4px 4px",
          background: last ? P.accent : (P.light ? mix(P.ground, P.ink, 0.1) : mix(P.ground, P.ink, 0.14)), opacity: ease(frame, 4, 8) }} />;
      })}
      <div style={{ position: "absolute", left: X0, top: chartTop + chartH + 10, width: W, height: 3, borderRadius: 2, background: P.rule, opacity: ease(frame, 4, 8) }} />
    </>
  );
}

function Compare({ P, head, body, frame, fps, labels, title, items }) {
  const colW = (W - 40) / 2;
  const headTop = title ? 390 : 260;
  const rowTop = headTop + 130;
  const left = items.filter((_, i) => i % 2 === 0), right = items.filter((_, i) => i % 2 === 1);
  const rows = Math.max(left.length, right.length, 1);
  const rh = clamp(Math.floor((TOP1 - rowTop - 16 * (rows - 1)) / rows), 80, 130);
  const col = (list, k) => list.map((it, j) => {
    const a = ease(frame, it.t, 10);
    const on = frame >= it.t;
    const fs = clamp(Math.round(fit(it.text, (colW - 110) * 2, 38, 0.5, 28)), 28, 38);
    return (
      <div key={k + "" + j} style={{ position: "absolute", left: X0 + k * (colW + 40), top: rowTop + j * (rh + 16), width: colW, height: rh, borderRadius: 24,
        background: P.card, boxShadow: `${P.shadow}, inset 0 0 0 1.5px ${P.cardEdge}`, display: "flex", alignItems: "center", gap: 18, padding: "0 28px", boxSizing: "border-box",
        opacity: a, transform: `translateY(${-36 * (1 - a)}px) scale(${0.96 + 0.04 * a})` }}>
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ flex: "none" }}>
          {k === 0
            ? <><circle cx="20" cy="20" r="18" fill="none" stroke={P.faint} strokeWidth="3" /><path d="M14 14 L26 26 M26 14 L14 26" stroke={P.muted} strokeWidth="4" strokeLinecap="round" /></>
            : <><circle cx="20" cy="20" r="19" fill={P.accent} /><path d="M11 21 L17.5 27 L29 14" fill="none" stroke={P.onAccent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                pathLength="1" strokeDasharray="1" strokeDashoffset={on ? 1 - ease(frame, it.t + 3, 6) : 1} /></>}
        </svg>
        <div style={{ fontFamily: body, fontSize: fs, lineHeight: 1.12, color: k === 0 ? P.muted : P.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.text}</div>
      </div>
    );
  });
  const hA = ease(frame, 4, 10), hB = ease(frame, 7, 10);
  return (
    <>
      <Eyebrow text="Side by side" P={P} font={body} frame={frame} />
      <Title text={title} P={P} font={head} frame={frame} top={TOP0 + 52} size={64} lines={2} />
      <div style={{ position: "absolute", left: X0, top: headTop, width: colW, height: 100, borderRadius: 26, border: `3px solid ${P.rule}`, boxSizing: "border-box",
        display: "grid", placeItems: "center", opacity: hA, transform: `translateY(${16 * (1 - hA)}px)` }}>
        <div style={{ fontFamily: head, fontSize: fit(labels[0], colW - 120, 46, 0.55, 28), color: P.muted, letterSpacing: "-0.01em", ...nowrap, maxWidth: colW - 110 }}>{labels[0]}</div>
      </div>
      <div style={{ position: "absolute", left: X0 + colW + 40, top: headTop, width: colW, height: 100, borderRadius: 26, background: P.accent,
        boxShadow: `0 14px 30px ${rgba(P.accent, 0.3)}`, display: "grid", placeItems: "center", opacity: hB, transform: `translateY(${16 * (1 - hB)}px)` }}>
        <div style={{ fontFamily: head, fontSize: fit(labels[1], colW - 120, 46, 0.55, 28), color: P.onAccent, letterSpacing: "-0.01em", ...nowrap, maxWidth: colW - 110 }}>{labels[1]}</div>
      </div>
      <div style={{ position: "absolute", left: X0 + colW + 20 - 36, top: headTop + 14, width: 72, height: 72, borderRadius: 36, background: P.ink, color: P.ground,
        border: `5px solid ${P.ground}`, boxSizing: "border-box",
        display: "grid", placeItems: "center", fontFamily: head, fontSize: 24, letterSpacing: "0.02em", transform: `scale(${pop(frame, fps, 9, 12)})` }}>VS</div>
      {col(left, 0)}
      {col(right, 1)}
    </>
  );
}

function Quote({ P, head, frame, qwords, keyword }) {
  const len = qwords.map((w) => w.text).join(" ").length;
  const size = clamp(Math.round(Math.sqrt((W * 560) / Math.max(1, len * 0.56)) * 0.95), 58, 104);
  const kw = clean(keyword);
  const q = ease(frame, 0, 10);
  return (
    <>
      <div style={{ position: "absolute", left: X0 - 8, top: 150, fontFamily: head, fontSize: 260, lineHeight: 1, color: P.accent, opacity: 0.9 * q,
        transform: `translateY(${20 * (1 - q)}px)` }}>“</div>
      <div style={{ position: "absolute", left: X0, top: 340, width: W, height: 600 }}>
        <div style={{ fontFamily: head, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.03em", color: P.ink }}>
          {qwords.map((w, i) => {
            const a = ease(frame, w.t - 2, 6);
            const hit = kw && clean(w.text) === kw;
            return (
              <span key={i} style={{ opacity: 0.16 + 0.84 * a, color: hit ? P.accentText : P.ink, display: "inline-block", marginRight: "0.24em",
                transform: `translateY(${10 * (1 - a)}px)` }}>{w.text}</span>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------- the effect ----------
export function styles() {
  return { hideBase: true };
}

export function Front(ctx) {
  const { params = {}, frame, frames, fps = 30, brand, words = [], text = "", focus } = ctx;
  const P = palette(brand.colors);
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const f = focus || { x: 0.5, y: 0.32 };

  const cls = clausesOf(words, text);
  const pTitle = String(params.title || "").trim();
  const pValue = String(params.value || "").trim();
  const given = listParam(params.items);
  const num = findNumber(words);
  const hasNum = !!(pValue && parseValue(pValue)) || !!num || NUM_RE.test(text);
  let kind = String(params.kind || "auto");
  if (!["steps", "stat", "compare", "quote"].includes(kind)) kind = hasNum ? "stat" : (given.length >= 2 || cls.length >= 3 ? "steps" : "quote"); // one or two clauses read better as a quote than a near-empty step list

  // item times: when the item is spoken, kept in order and inside the beat
  const latest = Math.max(10, frames - 18);
  const timed = (list) => {
    let prev = 2;
    return list.map((it, k) => {
      const fb = Math.round(10 + (k + 0.5) * Math.max(frames - 30, 12) / Math.max(1, list.length));
      // typed items: the spoken match, but never later than about a second per item (a far-off match must not leave the slot empty)
      const raw = it.from != null ? it.from - 3 : Math.min(wordTime(words, it.text, fb), 12 + k * 30) - 3;
      const t = clamp(Math.max(raw, prev + 5), 6, latest);
      prev = t;
      return { text: it.text, t };
    });
  };

  let graphic = null;
  if (kind === "steps") {
    let title = pTitle, list;
    if (given.length) list = given.map((t) => ({ text: t }));
    else if (!title && cls.length >= 3) { title = cls[0].text; list = cls.slice(1); }
    else list = cls;
    list = list.slice(0, 4).map((c) => ({ ...c, text: cap1(firstWords(c.text, 9)) }));
    if (!list.length) list = [{ text: cap1(firstWords(text || "Start here", 8)) }];
    graphic = <Steps P={P} head={head} body={body} frame={frame} fps={fps} title={title ? firstWords(title, 10) : ""} items={timed(list)} />;
  } else if (kind === "stat") {
    const v = parseValue(pValue) || (num && num.v) || parseValue(text) || { pre: "", n: 100, dec: 0, suf: "%" };
    const spoken = pValue ? wordTime(words, pValue, num ? num.from : 8) : (num ? num.from : 8);
    const t = clamp(spoken - 4, 6, Math.min(30, Math.max(6, frames - 30)));
    const label = cap1(pTitle || (num && num.label) || (cls[0] ? firstWords(cls[0].text, 4) : ""));
    graphic = <Stat P={P} head={head} body={body} frame={frame} v={v} label={label} t={t} />;
  } else if (kind === "compare") {
    let labels = ["Before", "After"], title = pTitle;
    const vs = pTitle.split(/\s+(?:vs\.?|versus|or|\/)\s+/i);
    if (vs.length === 2 && vs[0] && vs[1]) { labels = vs.map((s) => cap1(s.trim())); title = ""; }
    let list = given.length ? given.map((t) => ({ text: t })) : cls.slice(0, 6);
    list = list.slice(0, 6).map((c) => ({ ...c, text: cap1(firstWords(c.text, 7)) }));
    if (!list.length) list = [{ text: "Manual" }, { text: "Automatic" }];
    graphic = <Compare P={P} head={head} body={body} frame={frame} fps={fps} labels={labels} title={title ? firstWords(title, 10) : ""} items={timed(list)} />;
  } else {
    let qw;
    if (pTitle) {
      const toks = pTitle.split(/\s+/).filter(Boolean);
      qw = toks.map((t, i) => ({ text: t, t: clamp(Math.min(wordTime(words, t, 8 + i * 9), 8 + i * 9), 4, latest) }));
      let prev = 0; qw.forEach((w) => { w.t = Math.max(w.t, prev); prev = w.t; });
    } else {
      const s = firstSentence(words, text);
      qw = s.length ? s.map((w) => ({ text: w.text.trim(), t: clamp(w.from, 4, latest) })) : [{ text: "Say it once.", t: 4 }];
    }
    let keyword = pValue;
    if (!keyword) {
      const cand = qw.map((w) => w.text.replace(/[^a-z0-9'%$-]/gi, "")).filter((w) => w.length > 3);
      keyword = cand.reduce((a, b) => (b.length > a.length ? b : a), "");
    }
    graphic = <Quote P={P} head={head} frame={frame} qwords={qw} keyword={keyword} />;
  }

  // speaker framing: footage at panel width, face about a third of the way down the panel
  const shift = clamp(400 - f.y * VH, PANEL.height - VH, 0);
  const mask = "linear-gradient(180deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.5) 60%, rgba(0,0,0,0) 100%)";

  return (
    <div style={fill}>
      {/* brand ground with soft top light and a faint dot grid behind the graphic */}
      <div style={{ ...fill, background: `linear-gradient(180deg, ${P.top} 0%, ${P.ground} 55%, ${P.ground} 100%)` }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1000,
        backgroundImage: `radial-gradient(${P.dot} 2px, transparent 2.5px)`, backgroundSize: "36px 36px", backgroundPosition: "18px 18px",
        WebkitMaskImage: mask, maskImage: mask }} />

      {/* the explainer graphic (only this fades at the end) */}
      <div style={{ ...fill, opacity: exitFade(frame, frames) }}>{graphic}</div>

      {/* fixed speaker panel: same box on every beat, no entrance */}
      <div style={{ position: "absolute", ...PANEL, overflow: "hidden", background: "#000",
        boxShadow: P.light ? "0 30px 70px rgba(40,30,15,.22), 0 4px 10px rgba(40,30,15,.08)" : "0 30px 80px rgba(0,0,0,.6)" }}>
        <Speaker style={{ left: 0, top: shift, width: VW, height: VH }} zoom={1.08} />
        <div style={{ position: "absolute", inset: 0, borderRadius: PANEL.borderRadius, boxShadow: `inset 0 0 0 2px ${P.light ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)"}` }} />
      </div>

      <SeamCaption words={words} frame={frame} P={P} font={body} />
    </div>
  );
}
