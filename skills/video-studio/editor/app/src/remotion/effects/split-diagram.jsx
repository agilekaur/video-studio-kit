import React from "react";
import { fill, ease, pop, exitFade, fontStack, listParam, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "split-diagram",
  "name": "Split Diagram",
  "big": false,
  "captions": false,
  "needs": [],
  "prefers": [],
  "purposes": ["point", "list", "proof", "tools"],
  "sfx": "tick",
  "desc": "Speaker framed in the top box, a diagram builds underneath on the brand ground (flow, bars, cycle or stack), each part landing as it is spoken; a small mono caption sits on the seam. Speaker box and ground hold still, so consecutive beats cut cleanly.",
  "params": [
    { "key": "kind", "label": "Diagram", "type": "select", "options": ["auto", "flow", "bars", "cycle", "stack"], "default": "auto" },
    { "key": "title", "label": "Label above the diagram (blank = none)", "type": "text", "default": "" },
    { "key": "nodes", "label": "Nodes (one per line; blank = clauses from the speech)", "type": "list", "default": [] },
    { "key": "values", "label": "Bar values (e.g. 40, 25, 10; blank = numbers in the speech)", "type": "text", "default": "" }
  ],
  "status": "ready"
};

// ---------- geometry (1080x1920) ----------
const SEAM = 900;                 // speaker box 0..900, diagram below
const L = 76, R = 940;            // text stays clear of the right 140 px
const W = R - L;
const TOP = 1000, BOT = 1480;     // diagram area, nothing important below 1500

// ---------- palette from the brand ground ----------
const rgb = (h) => { const s = String(h || "#000").replace("#", ""); const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0"); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
function palette(C) {
  const G = C.surface || "#111111";
  let I = C.surface_text || "#ffffff";
  if (Math.abs(lum(G) - lum(I)) < 0.35) I = lum(G) > 0.5 ? "#141210" : "#f6f3ec";
  const light = lum(G) > 0.5;
  const A = C.accent || "#FFD400";
  return {
    G, I, A, light, onA: lum(A) > 0.55 ? "#111111" : "#ffffff",
    rule: mix(G, I, light ? 0.16 : 0.2), muted: mix(G, I, 0.5), soft: mix(G, I, light ? 0.06 : 0.09), card: light ? mix(G, "#ffffff", 0.55) : mix(G, I, 0.06),
  };
}

// ---------- text from the beat ----------
const CONNECT = new Set(["and", "then", "next", "after", "so", "or"]);
const SKIP = new Set(["a", "an", "the", "it", "its", "it's", "you", "your", "you're", "we", "i", "i'll", "i'm", "to", "of", "that", "this", "is", "are", "was", "just", "like", "but", "right", "now", "say", "so", "they", "there", "here", "also", "really", "for", "with", "in", "on", "at", "by", "if", "only", "be", "has", "have", "can", "will", "what", "how"]);
const clean = (s) => String(s).replace(/[.,;:!?"“”]+/g, "").trim();
// clauses as word groups (split on , ; . and / then), each with the frame it starts
function clauses(words) {
  const out = [];
  let cur = [];
  const push = () => { if (cur.length) out.push(cur); cur = []; };
  words.forEach((w) => {
    const t = clean(w.text).toLowerCase();
    if (CONNECT.has(t) && cur.length) { push(); return; }
    if (CONNECT.has(t)) return;
    cur.push(w);
    if (/[.,;:!?]$/.test(w.text.trim())) push();
  });
  push();
  return out;
}
// 1-3 meaningful words from a clause
function labelOf(ws) {
  const toks = ws.map((w) => clean(w.text)).filter(Boolean);
  let i = 0;
  while (i < toks.length - 1 && SKIP.has(toks[i].toLowerCase())) i++;
  const take = (n) => { let j = Math.min(toks.length, i + n); while (j > i + 1 && SKIP.has(toks[j - 1].toLowerCase())) j--; return toks.slice(i, j).join(" "); };
  let s = take(3);
  if (s.length > 22) s = take(2);
  if (s.length > 22) s = s.slice(0, 21) + "…";
  return s;
}
function pickEven(arr, n) {
  if (arr.length <= n) return arr;
  return Array.from({ length: n }, (_, k) => arr[Math.round((k * (arr.length - 1)) / (n - 1))]);
}

const NUM = /(\$|£|€)?(\d+(?:[.,]\d+)*)\s*(%|percent|x\b|k\b|m\b|bn\b|million|billion|thousand|hours?|days?|minutes?)?/gi;
function parseValues(s) {
  const out = [];
  String(s || "").replace(NUM, (m, cur, n, unit) => {
    const v = parseFloat(n.replace(/,/g, ""));
    if (!isNaN(v)) {
      const u = (unit || "").toLowerCase();
      const short0 = u === "percent" ? "%" : u === "million" ? "M" : u === "billion" ? "B" : u === "thousand" ? "K" : u.startsWith("hour") ? "h" : u.startsWith("day") ? "d" : u.startsWith("minute") ? "min" : u.toUpperCase().replace("X", "x");
      const short = short0 === "BN" ? "B" : short0;
      const mult = { K: 1e3, M: 1e6, B: 1e9 }[short.toUpperCase()] || 1;
      out.push({ v: v * mult, label: (cur || "") + n + short });
    }
    return m;
  });
  return out;
}

function autoKind(text, nodeCount) {
  if (/\d/.test(text)) return "bars";
  if (/\b(loop|loops|again|repeat|repeats|cycle|flywheel|compounds?)\b/i.test(text)) return "cycle";
  if (/\b(then|next|after|afterwards)\b/i.test(text) || nodeCount >= 3) return "flow";
  return "stack";
}

// ---------- seam caption: 1-3 word groups, hard swaps ----------
function chunks(words) {
  const out = [];
  let cur = [];
  words.forEach((w, k) => {
    cur.push(w);
    const next = words[k + 1];
    if (/[,.!?;:]$/.test(w.text.trim()) || !next || next.from - w.to > 8 || cur.length >= 3) {
      out.push({ from: cur[0].from - 1, to: cur[cur.length - 1].to, text: cur.map((x) => x.text.trim()).join(" ").replace(/[,;:.]+$/, "") });
      cur = [];
    }
  });
  return out;
}
function SeamCaption({ words, frame, P, font }) {
  let c = null;
  chunks(words).forEach((x) => { if (frame >= x.from) c = x; });
  if (!c || frame > c.to + 24) return null;
  const t = c.text.toUpperCase();
  const size = Math.min(34, 760 / Math.max(1, t.length * 0.66));
  return (
    <div style={{ position: "absolute", left: 140, width: 800, top: SEAM - 30, height: 60, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: P.I, color: P.G, fontFamily: font, fontSize: size, letterSpacing: "0.08em", lineHeight: 1, padding: "13px 18px 11px", whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums" }}>{t}</div>
    </div>
  );
}

// ---------- shared bits ----------
const fitSize = (s, maxW, size, k = 0.56) => Math.max(20, Math.min(size, maxW / Math.max(1, String(s).length * k)));
const nowrap = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const appear = (frame, t, n = 9) => ease(frame, t, n);
const rise = (a, d = 18) => ({ opacity: a, transform: `translateY(${d * (1 - a)}px)` });

// arrow drawn along a straight segment, p = 0..1
function Arrow({ x1, y1, x2, y2, p, color, w = 4 }) {
  if (p <= 0) return null;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const h = 14;
  const head = `M${ex - ux * h - uy * h * 0.75} ${ey - uy * h + ux * h * 0.75} L${ex} ${ey} L${ex - ux * h + uy * h * 0.75} ${ey - uy * h - ux * h * 0.75}`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={w} strokeLinecap="square" />
      {p > 0.15 ? <path d={head} fill="none" stroke={color} strokeWidth={w} strokeLinecap="square" strokeLinejoin="miter" /> : null}
    </g>
  );
}

// ---------- FLOW ----------
function Flow({ items, frame, fps, P, head, body, y0, y1 }) {
  const n = items.length;
  const active = items.reduce((a, it, i) => (frame >= it.t ? i : a), -1);
  if (n <= 3) {
    const gap = 70, bw = (W - gap * (n - 1)) / n, bh = 190;
    const cy = (y0 + y1) / 2, by = cy - bh / 2;
    return (
      <div style={fill}>
        <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0 }}>
          {items.slice(1).map((it, i) => {
            const x1 = L + (i + 1) * bw + i * gap + 10, x2 = x1 + gap - 20;
            return <Arrow key={i} x1={x1} y1={cy} x2={x2} y2={cy} p={ease(frame, it.t - 8, 10)} color={P.I} />;
          })}
        </svg>
        {items.map((it, i) => {
          const a = appear(frame, it.t), on = i === active, s = 0.92 + 0.08 * pop(frame, fps, it.t, 11);
          const x = L + i * (bw + gap);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: by, width: bw, height: bh, boxSizing: "border-box", padding: "22px 22px",
              background: on ? P.A : P.card, border: `3px solid ${on ? P.A : P.I}`, opacity: a, transform: `translateY(${20 * (1 - a)}px) scale(${a > 0 ? s : 1})`,
              display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontFamily: body, fontSize: 24, letterSpacing: "0.12em", color: on ? P.onA : P.muted }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: head, fontSize: fitSize(it.label, bw - 44, 46, 0.52), lineHeight: 1.08, color: on ? P.onA : P.I, letterSpacing: "-0.01em" }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    );
  }
  // 4-5 nodes: top to bottom
  const gap = 24, bh = Math.min(96, (y1 - y0 - gap * (n - 1)) / n);
  const total = n * bh + (n - 1) * gap, top = (y0 + y1 - total) / 2;
  const bw = W;
  return (
    <div style={fill}>
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0 }}>
        {items.slice(1).map((it, i) => {
          const yA = top + (i + 1) * bh + i * gap + 2, yB = yA + gap - 4;
          return <Arrow key={i} x1={L + 44} y1={yA} x2={L + 44} y2={yB} p={ease(frame, it.t - 6, 7)} color={P.I} w={3} />;
        })}
      </svg>
      {items.map((it, i) => {
        const a = appear(frame, it.t), on = i === active;
        const y = top + i * (bh + gap);
        return (
          <div key={i} style={{ position: "absolute", left: L, top: y, width: bw, height: bh, boxSizing: "border-box", display: "flex", alignItems: "center",
            background: on ? P.A : P.card, border: `3px solid ${on ? P.A : P.I}`, opacity: a, transform: `translateX(${-30 * (1 - a)}px)` }}>
            <div style={{ width: 88, textAlign: "center", fontFamily: body, fontSize: 24, letterSpacing: "0.1em", color: on ? P.onA : P.muted, flex: "none" }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ width: 2, alignSelf: "stretch", background: on ? P.onA : P.rule, opacity: 0.35, flex: "none" }} />
            <div style={{ paddingLeft: 26, fontFamily: head, fontSize: fitSize(it.label, bw - 160, 44, 0.52), color: on ? P.onA : P.I, ...nowrap }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- BARS ----------
function Bars({ items, vals, frame, P, head, body, y0, y1 }) {
  const n = items.length;
  const row = Math.min(168, (y1 - y0) / n);
  const top = (y0 + y1 - row * n) / 2;
  const max = Math.max(...vals.map((v) => v.v), 1e-6);
  const barW = W - 190;
  const hi = vals.reduce((b, v, i) => (v.v > vals[b].v ? i : b), 0);
  return (
    <div style={fill}>
      <div style={{ position: "absolute", left: L, top: top - 10, width: 3, height: row * n + 4, background: P.I, opacity: ease(frame, 0, 10) }} />
      {items.map((it, i) => {
        const a = appear(frame, it.t), g = ease(frame, it.t, 18);
        const y = top + i * row, bw = Math.max(10, (vals[i].v / max) * barW) * g;
        const on = i === hi;
        return (
          <div key={i} style={{ position: "absolute", left: L, top: y, width: W, height: row, opacity: a }}>
            <div style={{ position: "absolute", left: 22, top: 0, width: barW, fontFamily: body, fontSize: 30, letterSpacing: "0.06em", textTransform: "uppercase", color: P.muted, ...nowrap }}>{it.label}</div>
            <div style={{ position: "absolute", left: 3, top: 46, width: bw, height: row - 66, background: on ? P.A : P.I }} />
            <div style={{ position: "absolute", left: 3 + bw + 18, top: 36, fontFamily: head, fontSize: Math.min(66, row - 64), lineHeight: 1, color: on ? P.A : P.I,
              fontVariantNumeric: "tabular-nums", opacity: ease(frame, it.t + 8, 8), whiteSpace: "nowrap" }}>{vals[i].label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- CYCLE ----------
function Cycle({ items, frame, fps, P, head, body, y0, y1 }) {
  const n = items.length;
  const cx = L + W / 2, cy = (y0 + y1) / 2;
  const r = Math.min(200, (y1 - y0) / 2 - 36);
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const ring = ease(frame, 2, 14);
  const circ = 2 * Math.PI * r;
  const spin = (frame * 2.4) % 360;   // rotating arrow loop
  const active = items.reduce((a, it, i) => (frame >= it.t ? i : a), -1);
  const allIn = items.length && frame >= items[items.length - 1].t;
  return (
    <div style={fill}>
      <svg width="1080" height="1920" style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.rule} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - ring)} transform={`rotate(-90 ${cx} ${cy})`} />
        <g transform={`rotate(${spin} ${cx} ${cy})`} opacity={ring}>
          <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * Math.sin(1.1)} ${cy - r * Math.cos(1.1)}`} fill="none" stroke={P.A} strokeWidth="7" strokeLinecap="butt" />
          {(() => {
            const t = 1.1, px = cx + r * Math.sin(t), py = cy - r * Math.cos(t);
            const tx = Math.cos(t), ty = Math.sin(t);   // tangent (clockwise)
            const nx = -ty, ny = tx, h = 18;
            return <path d={`M ${px - tx * h + nx * h * 0.8} ${py - ty * h + ny * h * 0.8} L ${px + tx * 4} ${py + ty * 4} L ${px - tx * h - nx * h * 0.8} ${py - ty * h - ny * h * 0.8} Z`} fill={P.A} />;
          })()}
        </g>
      </svg>
      <div style={{ position: "absolute", left: cx - 120, width: 240, top: cy - 26, textAlign: "center", fontFamily: body, fontSize: 24, letterSpacing: "0.16em",
        color: P.muted, opacity: allIn ? ease(frame, items[items.length - 1].t + 6, 10) : 0 }}>REPEAT</div>
      {items.map((it, i) => {
        const a = appear(frame, it.t), on = i === active, s = 0.9 + 0.1 * pop(frame, fps, it.t, 11);
        const x = cx + r * Math.cos(angle(i)), y = cy + r * Math.sin(angle(i));
        const fs = fitSize(it.label, 250, 38, 0.54);
        return (
          <div key={i} style={{ position: "absolute", left: x - 140, top: y - 34, width: 280, height: 68, display: "flex", justifyContent: "center", alignItems: "center",
            opacity: a, transform: `scale(${a > 0 ? s : 1})` }}>
            <div style={{ background: on ? P.A : P.G, border: `3px solid ${on ? P.A : P.I}`, color: on ? P.onA : P.I, fontFamily: head, fontSize: fs, lineHeight: 1,
              padding: "13px 20px 12px", maxWidth: 280, boxSizing: "border-box", ...nowrap }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- STACK ----------
function Stack({ items, frame, fps, P, head, body, y0, y1 }) {
  const n = items.length;
  const gap = 14, lh = Math.min(92, (y1 - y0 - gap * (n - 1)) / n);
  const total = n * lh + (n - 1) * gap, bottom = (y0 + y1 + total) / 2;
  const cx = L + W / 2, wMax = W, wMin = Math.max(440, W * 0.56);
  const active = items.reduce((a, it, i) => (frame >= it.t ? i : a), -1);
  return (
    <div style={fill}>
      {items.map((it, i) => {
        const w = n === 1 ? wMax : wMax - ((wMax - wMin) * i) / (n - 1);
        const y = bottom - (i + 1) * lh - i * gap;
        const d = ease(frame, it.t, 10), on = i === active;
        const land = pop(frame, fps, it.t + 6, 10);
        return (
          <div key={i} style={{ position: "absolute", left: cx - w / 2, top: y - 70 * (1 - d), width: w, height: lh, boxSizing: "border-box", opacity: d,
            background: on ? P.A : i % 2 ? P.card : P.soft, border: `3px solid ${on ? P.A : P.I}`, display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scaleY(${d >= 1 ? 0.96 + 0.04 * land : 1})`, transformOrigin: "50% 100%" }}>
            <div style={{ position: "absolute", left: 20, fontFamily: body, fontSize: 22, letterSpacing: "0.1em", color: on ? P.onA : P.muted }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ fontFamily: head, fontSize: fitSize(it.label, w - 120, 40, 0.52), color: on ? P.onA : P.I, maxWidth: w - 120, ...nowrap }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- layout ----------
const shiftFor = (focus) => Math.max(SEAM - 1920, Math.min(0, SEAM / 2 + 90 - (focus.y * 1920 - 15)));

export function styles() {
  return { hideBase: true };
}

export function Behind(ctx) {
  const { brand, focus } = ctx;
  const P = palette(brand.colors);
  const f = focus || { x: 0.5, y: 0.32 };
  return (
    <div style={fill}>
      <div style={{ ...fill, background: P.G }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, overflow: "hidden", background: "#000" }}>
        <Speaker style={{ left: 0, top: shiftFor(f), width: 1080, height: 1920 }} zoom={1.06} />
      </div>
    </div>
  );
}

export function Front(ctx) {
  const { params, frame, frames, fps, brand, words, text } = ctx;
  const P = palette(brand.colors);
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);

  // nodes: given, or clauses of the speech; each lands when its words are spoken
  const given = listParam(params.nodes).slice(0, 5);
  const span = Math.max(frames - 24, 12);
  let items;
  if (given.length) {
    // typed nodes land on their spoken word, but never more than about a second apart (so long beats are never empty)
    items = given.map((label, i) => ({ label, t: Math.min(wordTime(words, label, Math.round(6 + (i * span) / Math.max(given.length, 1))), 12 + i * 30) }));
  } else {
    const cl = clauses(words).map((ws) => ({ label: labelOf(ws), t: ws[0].from })).filter((c) => c.label);
    items = pickEven(cl, 4);
    if (!items.length) items = [{ label: "Start", t: 6 }, { label: "Build", t: 6 + span / 3 }, { label: "Grow", t: 6 + (2 * span) / 3 }];
  }
  const kindP = String(params.kind || "auto");
  let kind = kindP === "auto" || !kindP ? autoKind(text + " " + (params.values || ""), items.length) : kindP;

  // bar values: the param, else numbers in the speech, else a descending decorative set
  let vals = parseValues(params.values);
  if (!vals.length) vals = parseValues(text);
  if (kind === "bars") {
    if (!given.length && vals.length >= 2 && items.length < vals.length) {
      // more numbers than clauses: label each bar by the words around its number
      items = vals.slice(0, 5).map((v, i) => ({ label: v.label, t: items[Math.min(i, items.length - 1)].t + i * 4 }));
    }
    items = items.slice(0, 5);
    const deco = [1, 0.74, 0.52, 0.36, 0.24];
    vals = items.map((_, i) => vals[i] || { v: deco[i] * 100, label: "" });
  }
  if (kind === "cycle") {
    items = items.slice(0, 5);
  }
  if (kind === "cycle" && items.length < 3) kind = "flow"; // a loop needs three spoken steps; never pad with invented ones
  // a single idea stays a single layer: never invent labels the speaker did not say

  // entrance floor so nothing pops on frame 0, and a stagger so near-simultaneous words still read
  items = items.map((it, i) => ({ ...it, t: Math.max(4 + i * 5, Math.min(Math.round(it.t) - 2, frames - 14)) }));

  const title = String(params.title || "").trim();
  const y0 = title ? TOP + 40 : TOP - 20, y1 = BOT;
  const o = exitFade(frame, frames);
  const P2 = { frame, fps, P, head, body, y0, y1, items };
  const enter = ease(frame, 0, 10);

  return (
    <div style={fill}>
      <div style={{ ...fill, opacity: o }}>
        {title ? (
          <div style={{ position: "absolute", left: L, top: TOP - 40, width: W, display: "flex", alignItems: "center", gap: 16, ...rise(enter, 12) }}>
            <div style={{ width: 28, height: 6, background: P.A, flex: "none" }} />
            <div style={{ fontFamily: body, fontSize: 28, letterSpacing: "0.14em", textTransform: "uppercase", color: P.I, ...nowrap }}>{title}</div>
          </div>
        ) : null}
        {kind === "bars" ? <Bars {...P2} vals={vals} />
          : kind === "cycle" ? <Cycle {...P2} />
          : kind === "stack" ? <Stack {...P2} />
          : <Flow {...P2} />}
      </div>
      <div style={{ position: "absolute", left: 0, top: SEAM - 2, width: 1080, height: 4, background: P.I }} />
      <SeamCaption words={words} frame={frame} P={P} font={body} />
    </div>
  );
}
