import React from "react";
import { interpolate, Easing } from "remotion";
import { ease, pop, exitFade, fontStack, faceBands, faceOverlap } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "glass-stat",
  "name": "Glass Stat",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof",
    "point"
  ],
  "sfx": "pop",
  "desc": "Frosted-glass card springs in clear of the face: a big counter ticks up to the spoken number, with a label and a small line, bar or ring graph that draws itself.",
  "params": [
    { "key": "value", "label": "Number (blank = from speech, e.g. 3M, 72%, $12k)", "type": "text", "default": "" },
    { "key": "label", "label": "Label (blank = from speech)", "type": "text", "default": "" },
    { "key": "graph", "label": "Graph", "type": "select", "options": ["auto", "line", "bars", "ring", "none"], "default": "auto" },
    { "key": "theme", "label": "Glass", "type": "select", "options": ["dark", "light"], "default": "dark" },
    { "key": "sub", "label": "Second chip (optional, e.g. +12% this month)", "type": "text", "default": "" }
  ],
  "captionY": 1385,
  "status": "ready"
};

// ---------- number parsing ----------
const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE = { thousand: 1e3, million: 1e6, billion: 1e9 };
const MULT = { doubled: 2, double: 2, doubles: 2, twice: 2, tripled: 3, triple: 3, triples: 3, quadrupled: 4, tenfold: 10 };
const UNIT = { k: 1e3, m: 1e6, b: 1e9, bn: 1e9 };
const STOP = new Set("the a an and or but so to of in on for with is are was were be it its it's this that i you we they my your our just really very at by from than then".split(" "));
const isNumWord = (p) => ONES[p] != null || TENS[p] != null;

// {n, dec, prefix, suffix, pct, comma} for display. Under 100k stays a full comma number; bigger gets K/M/B.
function shape(n, { prefix = "", pct = false, x = false, dec = null } = {}) {
  let v = n, suffix = pct ? "%" : x ? "x" : "";
  if (!pct && !x) {
    if (n >= 1e9) { v = n / 1e9; suffix = "B"; }
    else if (n >= 1e6) { v = n / 1e6; suffix = "M"; }
    else if (n >= 1e5) { v = n / 1e3; suffix = "K"; }
  }
  const d = dec != null && !suffix.match(/[KMB]/) ? dec : (Math.round(v) === v ? 0 : Math.min(2, String(+v.toFixed(2)).split(".")[1].length));
  return { n: v, dec: d, prefix, suffix, pct, comma: !suffix && v >= 1000 };
}

// typed value: "3", "40%", "$12k", "1.5M", "+12%", "2x", "10,000", "three million", "doubled"
function parseValue(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^([^\d.]*?)(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(%|percent|x|times|k|m|b|bn|thousand|million|billion)?\s*$/i);
  if (m) {
    const prefix = m[1].trim(), num = parseFloat(m[2].replace(/,/g, "")), u = (m[3] || "").toLowerCase();
    const dec = (m[2].split(".")[1] || "").length;
    if (u === "%" || u === "percent") return shape(num, { prefix, pct: true, dec });
    if (u === "x" || u === "times") return shape(num, { prefix, x: true, dec });
    const mul = UNIT[u] || SCALE[u] || 0;
    if (mul) return { n: num, dec, prefix, suffix: mul === 1e3 ? "K" : mul === 1e6 ? "M" : "B", comma: false };
    return { n: num, dec, prefix, suffix: "", comma: (num >= 1000 && /,/.test(m[2])) || num >= 10000 };
  }
  const sc = scan(s.split(/\s+/).map((t) => ({ text: t, from: 0 })));
  return sc ? sc.val : null;
}

const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9.%$€£,+-]/g, "").replace(/[.,]+$/, "");

// Scan spoken words for the strongest number: units/%/$/"million" beat plain digits beat number words; a lone "one" is ignored.
function scan(words) {
  const toks = words.map((w) => norm(w.text));
  const found = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t) continue;
    let j = i, val = null, score = 0;
    const dm = t.match(/^([$€£+]?)(\d[\d,]*(?:\.\d+)?)(%|x|k|m|b|bn)?$/);
    if (dm) {
      let num = parseFloat(dm[2].replace(/,/g, "")), u = dm[3] || "";
      const prefix = dm[1], dec = (dm[2].split(".")[1] || "").length;
      const nx = toks[i + 1] || "";
      if (!u && (nx === "percent" || nx === "%")) { u = "%"; j++; }
      else if (!u && (nx === "times" || nx === "x")) { u = "x"; j++; }
      else if (!u && SCALE[nx]) { num *= SCALE[nx]; j++; u = "s"; }
      if (u === "%") val = shape(num, { prefix, pct: true, dec });
      else if (u === "x") val = shape(num, { prefix, x: true, dec });
      else if (UNIT[u]) val = shape(num * UNIT[u], { prefix });
      else val = shape(num, { prefix, dec: u === "s" ? null : dec });
      score = prefix || u ? 3 : 2;
    } else if (MULT[t]) {
      val = shape(MULT[t], { x: true }); score = 2;
    } else if (isNumWord(t) || (t.includes("-") && t.split("-").every(isNumWord))) {
      let total = 0, cur = 0, k = i, big = false;
      for (; k < toks.length; k++) {
        const w = toks[k];
        const parts = w.includes("-") ? w.split("-") : [w];
        if (parts.every(isNumWord)) { parts.forEach((p) => { cur += ONES[p] != null ? ONES[p] : TENS[p]; }); continue; }
        if (w === "hundred") { cur = (cur || 1) * 100; continue; }
        if (SCALE[w]) { total += (cur || 1) * SCALE[w]; cur = 0; big = true; continue; }
        if (w === "and" && k > i && isNumWord(toks[k + 1])) continue;
        break;
      }
      const num = total + cur;
      j = k - 1;
      const nx = toks[k] || "";
      if (nx === "percent") { val = shape(num, { pct: true }); j = k; score = 3; }
      else if (nx === "times") { val = shape(num, { x: true }); j = k; score = 2; }
      else { val = shape(num); score = big ? 3 : num >= 10 ? 1.5 : num > 1 ? 1 : 0; }
    }
    if (val && score > 0) { found.push({ val, score, i, j, from: words[i].from }); i = j; }
  }
  if (!found.length) return null;
  found.sort((a, b) => b.score - a.score || a.i - b.i);
  return found[0];
}

// the noun right after the number: "three million installs" -> "installs"
function labelAfter(words, j) {
  const out = [];
  for (let k = j + 1; k < words.length && out.length < 3; k++) {
    const raw = String(words[k].text || "");
    const w = raw.replace(/[^A-Za-z0-9'-]/g, "");
    if (!w) break;
    if (STOP.has(w.toLowerCase())) { if (out.length) break; continue; }
    out.push(w);
    if (/[.,;!?]$/.test(raw)) break;
  }
  return out.join(" ");
}

function keyWord(t) {
  const c = String(t || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !STOP.has(w.toLowerCase()));
  return c.sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0] || "";
}

function fmt(v, s) {
  const str = v.toFixed(s.dec);
  if (!s.comma) return str;
  const [a, b] = str.split(".");
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : "");
}

const lum = (hex) => {
  const h = String(hex || "#888").replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(f.slice(k, k + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// fixed-width digit cells so ticking numerals never jitter, whatever the font's figures are
function Numerals({ text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", fontVariantNumeric: "tabular-nums" }}>
      {String(text).split("").map((ch, k) => {
        const digit = /\d/.test(ch), punct = /[.,]/.test(ch);
        return <span key={k} style={{ display: "inline-block", width: digit ? "0.58em" : punct ? "0.24em" : undefined, textAlign: "center",
          fontSize: ch === "%" ? "0.78em" : undefined, marginLeft: !digit && !punct && k > 0 ? "0.02em" : 0 }}>{ch}</span>;
      })}
    </span>
  );
}

// ---------- graphs (drawn in a gw x gh box) ----------
const LINE = [[0, 0.08], [0.17, 0.22], [0.33, 0.17], [0.5, 0.42], [0.67, 0.36], [0.83, 0.66], [1, 0.95]];
function smooth(P, per = 16) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
function truncate(pts, p) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = len[len.length - 1] * p, res = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (len[i] <= target) { res.push(pts[i]); continue; }
    const r = (target - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
    res.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r]);
    break;
  }
  return res;
}

function Graph({ kind, gw, gh, p, frame, fps, t0, accent, ink, fillTo, id, glow }) {
  if (kind === "line") {
    const pad = 16;
    const pts = smooth(LINE.map(([x, y]) => [pad + x * (gw - pad * 2), gh - pad - y * (gh - pad * 2)]));
    const line = truncate(pts, Math.max(0.002, p));
    const tip = line[line.length - 1];
    const d = line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${d} L${tip[0].toFixed(1)} ${gh - pad} L${pad} ${gh - pad} Z`;
    const pulse = 1 + 0.18 * Math.sin(Math.max(0, frame - t0) / 5);
    return (
      <svg width={gw} height={gh} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${id}-af`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.45" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-g`}>
            <stop offset="0" stopColor={glow} stopOpacity="0.95" />
            <stop offset="1" stopColor={glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0.33, 0.66].map((g) => (
          <line key={g} x1={pad} x2={gw - pad} y1={pad + g * (gh - pad * 2)} y2={pad + g * (gh - pad * 2)} stroke={ink} strokeOpacity="0.12" strokeWidth="2" strokeDasharray="4 10" />
        ))}
        <line x1={pad} x2={gw - pad} y1={gh - pad} y2={gh - pad} stroke={ink} strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
        <path d={area} fill={`url(#${id}-af)`} />
        <path d={d} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={tip[0]} cy={tip[1]} r={34 * pulse} fill={`url(#${id}-g)`} />
        <circle cx={tip[0]} cy={tip[1]} r="10" fill={accent} stroke="#fff" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "bars") {
    const H = [0.3, 0.46, 0.4, 0.68, 1];
    const n = H.length, gap = 14, bw = (gw - gap * (n - 1)) / n;
    return (
      <svg width={gw} height={gh} style={{ overflow: "visible" }}>
        <line x1="0" x2={gw} y1={gh - 1} y2={gh - 1} stroke={ink} strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
        {H.map((h, k) => {
          const s = pop(frame, fps, t0 + k * 4, 13);
          const bh = Math.max(0, (gh - 8) * h * Math.min(1.08, s));
          const last = k === n - 1;
          return <rect key={k} x={k * (bw + gap)} y={gh - 4 - bh} width={bw} height={bh} rx={Math.min(10, bw / 2)}
            fill={last ? accent : ink} fillOpacity={last ? 1 : 0.22 + k * 0.06} />;
        })}
      </svg>
    );
  }
  if (kind === "ring") {
    const R = Math.min(gw, gh) / 2 - 14, cx = gw / 2, cy = gh / 2, C = 2 * Math.PI * R;
    const f = Math.max(0, Math.min(1, fillTo)) * p;
    const a = -Math.PI / 2 + f * 2 * Math.PI;
    return (
      <svg width={gw} height={gh} style={{ overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={ink} strokeOpacity="0.14" strokeWidth="18" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={accent} strokeWidth="18" strokeLinecap="round"
          strokeDasharray={`${C * f} ${C}`} transform={`rotate(-90 ${cx} ${cy})`} />
        {f > 0.01 ? <circle cx={cx + R * Math.cos(a)} cy={cy + R * Math.sin(a)} r="5" fill="#fff" /> : null}
      </svg>
    );
  }
  return null;
}

// ---------- the card ----------
export function Front(ctx) {
  const { params, frame, frames, fps, brand, focus, words = [], text, beat } = ctx;
  const C = brand.colors;
  const light = params.theme === "light";
  const id = `gs-${(beat && beat.id) || "x"}`.replace(/[^a-zA-Z0-9_-]/g, "");

  // what to show
  const spoken = scan(words);
  let stat = parseValue(params.value), t0 = 8, labelGuess = "";
  if (stat) {
    // tick when the same number is spoken, if it is
    const hit = spoken && Math.abs(spoken.val.n - stat.n) < 1e-6 && spoken.val.suffix === stat.suffix ? spoken : null;
    if (hit) { t0 = Math.max(6, hit.from); labelGuess = labelAfter(words, hit.j); }
  } else if (spoken && !String(params.value || "").trim()) {
    stat = spoken.val; t0 = Math.max(6, spoken.from); labelGuess = labelAfter(words, spoken.j);
  }
  if (t0 > frames - 40) t0 = Math.max(6, frames - 40);
  const word = stat ? "" : (String(params.value || "").trim() || keyWord(text) || "").toUpperCase();
  const rawLabel = String(params.label || "").trim() || labelGuess || (stat ? keyWord(text) : "");
  const label = rawLabel.length > 30 ? rawLabel.slice(0, 29).trimEnd() + "…" : rawLabel;
  const sub = String(params.sub || "").trim();
  let graph = params.graph || "auto";
  if (graph === "auto") graph = stat && stat.pct ? "ring" : "line";
  const hasGraph = graph !== "none";

  // placement: the bigger free band beside the face, above the lifted captions (captionY 1385 -> top ~1260)
  const { above, below } = faceBands(focus, 200, 1250, 28);
  const isBelow = below[1] - below[0] >= above[1] - above[0];
  const band = isBelow ? below : above;
  const chipH = sub ? 72 : 0, chipGap = sub ? 16 : 0;
  const H = Math.max(180, Math.min(300, band[1] - band[0] - chipH - chipGap));
  const u = H / 300;
  const X = 70, W = 860, R = Math.round(44 * u);
  const blockH = H + chipH + chipGap;
  const Y = Math.round(isBelow ? band[0] : band[1] - blockH);
  const cardTop = isBelow ? Y : Y + chipH + chipGap;
  const chipTop = isBelow ? Y + H + chipGap : Y;

  // motion: spring in, fade out
  const s = pop(frame, fps, 0, 14);
  const k = 0.9 + 0.1 * s;
  const lift = (1 - s) * 40 * (isBelow ? 1 : -1);
  const o = ease(frame, 0, 6) * exitFade(frame, frames);
  const safety = 1 - Math.min(1, faceOverlap(focus, X, cardTop + lift, W, H) * 4);
  const cx = X + W / 2, cy = cardTop + H / 2;
  const rx = cx - (W / 2) * k, ry = cy - (H / 2) * k + lift, rw = W * k, rh = H * k;

  // counter: ease out over ~1s from the spoken number
  const p = interpolate(frame, [t0, t0 + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const shown = stat ? `${stat.prefix}${fmt(stat.n * p, stat)}${stat.suffix}` : word;
  const settle = stat ? 1 + 0.035 * Math.sin(Math.min(1, Math.max(0, frame - t0 - 24) / 8) * Math.PI) : 1;

  // colours
  const ink = light ? "#0E0E10" : "#FFFFFF";
  const inkSoft = light ? "rgba(14,14,16,.62)" : "rgba(255,255,255,.74)";
  let accent = C.accent || "#FFD400";
  if (light && lum(accent) > 0.55) accent = "#0E0E10";
  const glow = lum(accent) < 0.08 ? "#ffffff" : accent;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const tint = light ? "rgba(255,255,255,.5)" : "rgba(18,18,22,.42)";
  const glassFilter = light ? "blur(30px) saturate(1.6) brightness(1.25)" : "blur(30px) saturate(1.5) brightness(.78)";

  // content sizes
  const padX = Math.round(50 * u);
  const gw = hasGraph ? Math.round((graph === "ring" ? 210 : 270) * u) : 0, gh = Math.round(graph === "ring" ? 210 * u : 180 * u);
  const textW = W - padX * 2 - (hasGraph ? gw + 40 * u : 0);
  const chars = Math.max(1, shown.length);
  const numSize = Math.round(Math.min(186 * u, textW / (chars * (stat ? 0.6 : 0.66))));
  const labelSize = Math.round(40 * u);

  const clip = `inset(${ry}px ${1080 - rx - rw}px ${1920 - ry - rh}px ${rx}px round ${R * k}px)`;
  const cp = pop(frame, fps, Math.min(t0 + 18, frames - 20), 12);
  const chipW = Math.min(620, Math.round(sub.length * 20 + 116));
  const cY = chipTop + (1 - cp) * 20 * (isBelow ? 1 : -1);
  const chipClip = `inset(${cY}px ${1080 - X - chipW}px ${1920 - cY - chipH}px ${X}px round ${chipH / 2}px)`;
  const rim = light
    ? "inset 0 1.5px 0 rgba(255,255,255,.95), inset 0 0 0 1.5px rgba(255,255,255,.6), inset 0 -1px 0 rgba(0,0,0,.06)"
    : "inset 0 1.5px 0 rgba(255,255,255,.45), inset 0 0 0 1.5px rgba(255,255,255,.16), inset 0 -1px 0 rgba(255,255,255,.08)";
  const sheen = light
    ? "linear-gradient(160deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.12) 42%, rgba(255,255,255,.22) 100%)"
    : "linear-gradient(160deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.04) 40%, rgba(255,255,255,.08) 100%)";

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o * safety }}>
      {/* soft shadow under the pane (outer shadow only, never painted inside the glass) */}
      <div style={{ position: "absolute", left: rx, top: ry, width: rw, height: rh, borderRadius: R * k,
        boxShadow: "0 40px 90px rgba(0,0,0,.38), 0 10px 26px rgba(0,0,0,.22)" }} />
      {/* frosted glass: the footage itself, blurred, clipped to the card */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, clipPath: clip, WebkitClipPath: clip }}>
        <Speaker filter={glassFilter} zoom={1.06} />
        <div style={{ position: "absolute", inset: 0, background: tint }} />
      </div>
      {/* sheen, rim light and content */}
      <div style={{ position: "absolute", left: rx, top: ry, width: rw, height: rh, borderRadius: R * k, overflow: "hidden", background: sheen, boxShadow: rim }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0",
          display: "flex", alignItems: "center", padding: `0 ${padX}px`, boxSizing: "border-box", gap: 40 * u }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: head, fontWeight: brand.fonts.heading.weight || 800, fontSize: numSize, lineHeight: 0.92,
              letterSpacing: "-0.02em", color: ink, whiteSpace: "nowrap", transform: `scale(${settle})`, transformOrigin: "0% 60%",
              textShadow: light ? "none" : "0 2px 12px rgba(0,0,0,.18)" }}>
              {stat ? <Numerals text={shown} /> : shown}
            </div>
            {label ? (
              <div style={{ marginTop: 16 * u, display: "flex", alignItems: "center", gap: 14 * u, opacity: ease(frame, 6, 10),
                transform: `translateY(${(1 - ease(frame, 6, 10)) * 10}px)` }}>
                <span style={{ width: 12 * u, height: 12 * u, borderRadius: 99, background: accent, boxShadow: `0 0 14px ${glow}`, flex: "none" }} />
                <span style={{ fontFamily: body, fontWeight: brand.fonts.body.weight || 700, fontSize: labelSize, color: inkSoft,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
              </div>
            ) : null}
          </div>
          {hasGraph ? (
            <div style={{ flex: "none", width: gw, height: gh }}>
              <Graph kind={graph} gw={gw} gh={gh} p={p} frame={frame} fps={fps} t0={t0} accent={accent} ink={ink}
                fillTo={stat && stat.pct ? stat.n / 100 : 0.78} id={id} glow={glow} />
            </div>
          ) : null}
        </div>
      </div>
      {/* optional second chip */}
      {sub && cp > 0.01 ? (
        <div style={{ opacity: Math.min(1, cp * 1.4) }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, clipPath: chipClip, WebkitClipPath: chipClip }}>
            <Speaker filter={glassFilter} zoom={1.06} />
            <div style={{ position: "absolute", inset: 0, background: tint }} />
          </div>
          <div style={{ position: "absolute", left: X, top: cY, width: chipW, height: chipH, borderRadius: chipH / 2,
            boxSizing: "border-box", display: "flex", alignItems: "center", gap: 14, padding: "0 28px", background: sheen,
            boxShadow: `${rim}, 0 16px 36px rgba(0,0,0,.28)` }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
              <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
            </svg>
            <span style={{ fontFamily: body, fontWeight: brand.fonts.body.weight || 700, fontSize: 34, color: ink, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
