import React from "react";
import { spring } from "remotion";
import { fill, ease, fontStack, listParam, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "tier-list",
  "name": "Tier List",
  "big": true,
  "captions": false,
  "needs": [],
  "prefers": [],
  "purposes": ["list", "point"],
  "sfx": "pop",
  "desc": "Ranking reel: a tier board (S to D) fills the top half and builds up beat by beat; this beat's item drops into its row when spoken. Speaker below the seam with a small mono seam caption. Use hold on explanation beats to keep the board up without adding.",
  "params": [
    { "key": "board", "label": "Already on the board (one per line, e.g. S: Claude)", "type": "list", "default": [] },
    { "key": "add", "label": "Item this beat places (blank = from the line)", "type": "text", "default": "" },
    { "key": "tier", "label": "Tier", "type": "select", "options": ["auto", "S", "A", "B", "C", "D"], "default": "auto" },
    { "key": "title", "label": "Title above the board", "type": "text", "default": "" },
    { "key": "hold", "label": "Hold (show the board only, add nothing)", "type": "select", "options": ["no", "yes"], "default": "no" }
  ],
  "status": "ready"
};

// ---------- colour ----------
const hex = (c) => {
  let s = String(c || "").trim().replace("#", "");
  if (s.length === 3) s = s.split("").map((x) => x + x).join("");
  const n = parseInt(s.slice(0, 6), 16);
  return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = hex(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

function palette(C) {
  const ground = C.surface || "#111111";
  const light = lum(ground) > 0.5;
  let ink = C.surface_text || (light ? "#141210" : "#f4f1ea");
  if (Math.abs(lum(ground) - lum(ink)) < 0.35) ink = light ? "#141210" : "#f4f1ea";
  // the board is always dark: a dark card on a light ground, a slightly lifted panel on a dark one
  const board = light ? mix(C.outline || "#0f0d0c", "#000000", 0.1) : mix(ground, "#ffffff", 0.05);
  return {
    ground, ink, light, board,
    row: mix(board, "#ffffff", 0.045),
    chip: mix(board, "#ffffff", 0.11), chipEdge: mix(board, "#ffffff", 0.18), chipText: "#f4f1ea",
    muted: mix(ground, ink, 0.55), accent: C.accent || "#FFD400",
  };
}
// classic tier colours, muted so they sit well on a dark board
const TIERS = ["S", "A", "B", "C", "D"];
const TIER_COL = { S: "#E9776E", A: "#EE9F5C", B: "#E9C866", C: "#8DC68A", D: "#78A3DA" };

// ---------- parsing ----------
const STOP = new Set("i im i'm a an the this that these those it its it's is are was were be and or but so if then than to of in on at for with from by as my your our their his her you we they me us them just really very honestly actually basically like still also only even yeah okay ok well now here there what which who how why when where tier tiers list top bottom mid trash worst best rank ranking ranked number one two three goes going go put putting gets get got lands sits say".split(" "));

// "S tier", "A-tier" (capital A only, "a tier list" is not a ranking), "tier S"; then top/god tier = S,
// bottom/trash/worst/garbage/useless = D, mid/middle/average = B; otherwise A
export function parseTier(text) {
  const t = String(text || "");
  let m = t.match(/\b([SABCD]|[sbcd])[\s-]?tier\b(?!\s+lists?\b)/);
  if (m) return m[1].toUpperCase();
  m = t.match(/\btier\s+([SABCD])\b/);
  if (m) return m[1];
  const l = t.toLowerCase();
  if (/\b(top|god|goat)[\s-]?tier\b|\bthe goat\b/.test(l)) return "S";
  if (/\b(bottom|trash|worst|garbage|useless)\b/.test(l)) return "D";
  if (/\bmid\b|\bmiddle\b|\baverage\b/.test(l)) return "B";
  return "A";
}

// first capitalised non-stopword (a product name), else the longest content word
function keyNoun(text) {
  const toks = String(text || "").replace(/\b[SABCD][\s-]?tier\b/g, " ").split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w.+]+$/g, "").replace(/\.$/, "")).filter(Boolean);
  const cap = toks.find((w) => /^[A-Z]/.test(w) && !STOP.has(w.toLowerCase()) && w.length > 1);
  if (cap) return cap;
  const long = toks.filter((w) => !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w)).sort((a, b) => b.length - a.length)[0];
  return long ? long[0].toUpperCase() + long.slice(1) : "Item";
}

function parseBoard(v) {
  const rows = { S: [], A: [], B: [], C: [], D: [] };
  listParam(v).forEach((line) => {
    const m = line.match(/^\s*([SABCDsabcd])\s*(?:tier)?\s*[-:|=]\s*(.+)$/);
    if (m && m[2].trim()) rows[m[1].toUpperCase()].push(m[2].trim());
  });
  return rows;
}

// ---------- geometry ----------
const SEAM = 960;
const BX = 56, BW = 1080 - 140 - BX;      // board x 56..940, clear of the right 140 px
const BY = 196, ROW_H = 128, GAP = 6;     // five rows 196..860
const LABEL_W = 128;
const AX = BX + LABEL_W + 16, AW = BX + BW - 14 - AX;   // chip area inside a row
const CH = 84, CGAP = 12, FS = 35;
const nowrap = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

const chipW = (name) => CH * 0.62 + 16 + Math.min(String(name).length, 16) * FS * 0.6 + 34;

// chip rects {x, y, s, w} for a row (x relative to the chip area, y relative to the row)
function layoutRow(names) {
  const n = names.length;
  if (!n) return [];
  const natural = names.map(chipW);
  const total = natural.reduce((a, b) => a + b, 0) + CGAP * (n - 1);
  const s1 = Math.min(1, AW / total);
  if (s1 >= 0.74) {
    let x = 0; const h = CH * s1;
    return names.map((_, i) => { const r = { x, y: (ROW_H - h) / 2, s: s1, w: natural[i] * s1 }; x += (natural[i] + CGAP) * s1; return r; });
  }
  // two lines: split near half the total width, then shrink to fit
  let acc = 0, cut = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    acc += natural[i] + CGAP;
    if (acc >= total / 2) { cut = Math.max(1, Math.min(n - 1, acc - total / 2 > natural[i] / 2 ? i : i + 1)); break; }
  }
  const lines = [[0, cut], [cut, n]];
  const lw = lines.map(([a, b]) => natural.slice(a, b).reduce((x, y) => x + y, 0) + CGAP * (b - a - 1));
  const s = Math.min(0.66, (ROW_H - 12) / (2 * CH + 8), AW / Math.max(...lw));
  const h = CH * s, top = (ROW_H - (2 * h + 8 * s)) / 2;
  const out = [];
  lines.forEach(([a, b], li) => {
    let x = 0;
    for (let i = a; i < b; i++) { out.push({ x, y: top + li * (h + 8 * s), s, w: natural[i] * s }); x += (natural[i] + CGAP) * s; }
  });
  return out;
}

const hueOf = (name) => { let h = 7; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

function Chip({ name, x, y, s, w, P, body, head, glow = 0, tint }) {
  const h = CH * s, d = CH * 0.62 * s;
  const on = glow > 0.001;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 14 * s, background: P.chip,
      border: `${Math.max(1, 2 * s)}px solid ${on ? mix(P.chipEdge, tint, glow) : P.chipEdge}`, boxSizing: "border-box",
      boxShadow: `0 ${6 * s}px ${18 * s}px rgba(0,0,0,.35)${on ? `, 0 0 ${34 * s * glow}px ${tint}${Math.round(glow * 140).toString(16).padStart(2, "0")}` : ""}`,
      display: "flex", alignItems: "center", paddingLeft: 10 * s, gap: 14 * s, overflow: "hidden" }}>
      <div style={{ width: d, height: d, borderRadius: d, flex: "none", background: `hsl(${hueOf(name)}, 30%, 64%)`, display: "grid", placeItems: "center",
        fontFamily: head, fontSize: d * 0.5, color: "#16130f", lineHeight: 1 }}>{String(name).trim()[0].toUpperCase()}</div>
      <div style={{ fontFamily: body, fontSize: FS * s, color: P.chipText, lineHeight: 1, letterSpacing: "-0.01em", paddingRight: 14 * s, ...nowrap }}>{name}</div>
    </div>
  );
}

// ---------- seam caption: small uppercase word groups in a tight box on the seam ----------
function chunks(words) {
  const out = [];
  let cur = [];
  words.forEach((w, k) => {
    cur.push(w);
    const next = words[k + 1];
    if (/[,.!?;:]$/.test(w.text.trim()) || !next || next.from - w.to > 8 || cur.length >= 3) {
      out.push({ from: cur[0].from - 1, to: cur[cur.length - 1].to, text: cur.map((x) => x.text.trim()).join(" ").replace(/[,;:]+$/, "") });
      cur = [];
    }
  });
  return out;
}
function SeamCaption({ words, frame, font }) {
  let c = null;
  chunks(words).forEach((x) => { if (frame >= x.from) c = x; });
  if (!c || frame > c.to + 24) return null;
  const t = c.text.toUpperCase();
  const size = Math.max(22, Math.min(34, 760 / Math.max(1, t.length * 0.64)));
  return (
    <div style={{ position: "absolute", left: 140, width: 800, top: SEAM - 30, height: 60, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#f4f1ea", color: "#141210", fontFamily: font, fontSize: size, letterSpacing: "0.07em", lineHeight: 1,
        padding: "13px 18px 11px", whiteSpace: "nowrap", boxShadow: "0 6px 20px rgba(0,0,0,.3)" }}>{t}</div>
    </div>
  );
}

export function styles() {
  return { hideBase: true };
}

export function Front({ params, frame, frames, fps, brand, words, text, focus }) {
  const P = palette(brand.colors);
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const rows = parseBoard(params.board);
  const boardEmpty = TIERS.every((t) => !rows[t].length);
  const hold = params.hold === true || /^(yes|true|1|on)$/i.test(String(params.hold || ""));
  const add = String(params.add || "").trim() || keyNoun(text);
  const tsel = String(params.tier || "auto").trim().toUpperCase();
  const tier = hold ? null : (TIERS.includes(tsel) ? tsel : parseTier(text));
  const title = (String(params.title || "").trim() || "Tier list").toUpperCase();

  // the chip lands on its spoken name, else ~0.4 s in
  const t0 = Math.max(boardEmpty ? 10 : 4, Math.min(Math.max(4, frames - 14), wordTime(words, add, 12) - 3));
  const spRaw = spring({ frame: frame - t0, fps, config: { damping: 13, stiffness: 170, mass: 0.8 } });
  const sp = frame >= t0 + 30 ? 1 : spRaw;   // exact rest so the next beat (or a hold) matches pixel for pixel
  const flash = frame >= t0 + 5 ? Math.max(0, 1 - (frame - t0 - 5) / 16) : 0;
  const settle = ease(frame, t0, 10);         // chips already in the row make room

  // face framed ~390 px under the seam
  const f = focus || { x: 0.5, y: 0.32 };
  const shift = Math.max(-SEAM, Math.min(0, 390 - f.y * 1920));
  const enter = boardEmpty && !hold ? ease(frame, 0, 10) : 1;
  const placed = TIERS.reduce((a, t) => a + rows[t].length, 0) + (tier && frame >= t0 + 4 ? 1 : 0);

  let newChip = null;
  if (tier && frame >= t0 - 1) {
    const i = TIERS.indexOf(tier);
    const r = layoutRow([...rows[tier], add]).slice(-1)[0];
    const ty = BY + i * (ROW_H + GAP) + r.y, tx = AX + r.x;
    const fromY = 30, fromX = Math.min(tx, 540 - r.w / 2);
    const k = Math.min(1, sp);
    const y = fromY + (ty - fromY) * sp, x = fromX + (tx - fromX) * k;
    const moving = sp !== 1;
    newChip = (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, opacity: Math.min(1, (frame - t0 + 1) / 3),
        transform: moving ? `rotate(${-7 * (1 - k)}deg) scale(${1 + 0.22 * (1 - k)})` : undefined,
        transformOrigin: `${x + r.w / 2}px ${y + CH * r.s / 2}px` }}>
        <Chip name={add} x={x} y={y} s={r.s} w={r.w} P={P} body={body} head={head} glow={flash} tint={TIER_COL[tier]} />
      </div>
    );
  }

  return (
    <div style={fill}>
      <div style={{ ...fill, background: "#0d0c0b" }} />
      <div style={{ position: "absolute", left: 0, top: SEAM, width: 1080, height: 1920 - SEAM, overflow: "hidden" }}>
        <Speaker style={{ top: shift }} />
      </div>

      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, background: P.ground, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: BX + 2, top: 116, width: 600, display: "flex", alignItems: "center", gap: 16, opacity: enter }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: P.accent, flex: "none" }} />
          <div style={{ fontFamily: body, fontSize: 30, letterSpacing: "0.16em", color: P.ink, lineHeight: 1, ...nowrap }}>{title}</div>
        </div>
        <div style={{ position: "absolute", left: BX + BW - 300, width: 300, top: 120, textAlign: "right", fontFamily: body, fontSize: 24, letterSpacing: "0.14em",
          color: P.muted, lineHeight: 1, opacity: enter }}>{String(placed).padStart(2, "0")} RANKED</div>

        <div style={{ position: "absolute", left: BX - 10, top: BY - 10, width: BW + 20, height: 5 * ROW_H + 4 * GAP + 20, borderRadius: 22, background: P.board,
          boxShadow: P.light ? "0 24px 60px rgba(20,16,10,.28)" : "0 0 0 2px rgba(255,255,255,.04)", opacity: enter }} />
        {TIERS.map((t, i) => {
          const y = BY + i * (ROW_H + GAP);
          const e = boardEmpty && !hold ? ease(frame, i * 1.2, 9) : 1;
          const isT = t === tier;
          const before = layoutRow(rows[t]);
          const after = isT ? layoutRow([...rows[t], add]) : before;
          const fl = isT ? flash : 0;
          const col = TIER_COL[t];
          return (
            <div key={t} style={{ position: "absolute", left: BX, top: y, width: BW, height: ROW_H, opacity: e, transform: e < 1 ? `translateX(${-40 * (1 - e)}px)` : undefined }}>
              <div style={{ position: "absolute", left: LABEL_W, top: 0, right: 0, bottom: 0, background: fl > 0 ? mix(P.row, col, 0.16 * fl) : P.row, borderRadius: "0 12px 12px 0" }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: LABEL_W, height: ROW_H, borderRadius: "12px 0 0 12px",
                background: fl > 0 ? mix(col, "#ffffff", 0.45 * fl) : col, display: "grid", placeItems: "center",
                transform: fl > 0 ? `scale(${1 + 0.06 * fl})` : undefined, boxShadow: fl > 0 ? `0 0 ${40 * fl}px ${col}` : "none" }}>
                <div style={{ fontFamily: head, fontSize: 70, color: "#18130f", lineHeight: 1, marginTop: 4 }}>{t}</div>
              </div>
              {rows[t].map((nm, k) => {
                const a = before[k], b = after[k], q = settle;
                return <Chip key={k} name={nm} x={AX - BX + a.x + (b.x - a.x) * q} y={a.y + (b.y - a.y) * q} s={a.s + (b.s - a.s) * q} w={a.w + (b.w - a.w) * q}
                  P={P} body={body} head={head} />;
              })}
            </div>
          );
        })}
        {newChip}
      </div>

      <div style={{ position: "absolute", left: 0, top: SEAM - 2, width: 1080, height: 4, background: "#0d0c0b" }} />
      <SeamCaption words={words} frame={frame} font={body} />
    </div>
  );
}
