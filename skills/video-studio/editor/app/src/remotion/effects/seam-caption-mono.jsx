import React from "react";
import { Img, OffthreadVideo, Loop } from "remotion";
import { fill, ease, exitFade, fontStack, listParam, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "seam-caption-mono",
  "name": "Seam Caption Mono",
  "big": true,
  "captions": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "tools"
  ],
  "sfx": "tick",
  "desc": "Product screen on top, speaker below; small uppercase mono captions in a tight ink box sit on the seam and hard-swap word group by word group while the screen rows tick on as they are spoken.",
  "params": [
    { "key": "rows", "label": "Screen rows (up to three, each fills when spoken)", "type": "list", "default": [] },
    { "key": "url", "label": "Address in the field", "type": "text", "default": "" },
    { "key": "title", "label": "Screen heading", "type": "text", "default": "" },
    { "key": "subtitle", "label": "Screen sub-heading", "type": "text", "default": "" },
    { "key": "status", "label": "Status line (before the address)", "type": "text", "default": "Live" },
    { "key": "button", "label": "Screen button", "type": "text", "default": "Run" },
    { "key": "media", "label": "Screen media (optional, replaces the drawn screen)", "type": "media", "default": "" }
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
    accent: C.accent, deep: mix(C.accent, "#000000", 0.25), onAccent: lum(C.accent) > 0.6 ? "#111111" : "#ffffff",
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

function Check({ on, P }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flex: "none" }}>
      <rect x="1.5" y="1.5" width="41" height="41" fill={on ? P.ink : "none"} stroke={P.ink} strokeWidth="3" />
      {on ? <path d="M10 23 L19 32 L35 14" fill="none" stroke={P.ground} strokeWidth="5" strokeLinecap="square" /> : null}
    </svg>
  );
}

// the drawn product screen, 1080 wide x h tall; padTop centres the content on a tall frame
function Screen({ h, P, head, body, frame, enter, typed, caret, rows, pressed, status, padTop = 0, rowsY, heading, sub, url, button }) {
  const e = (i) => { const a = ease(frame, enter + i * 1.2, 10); return { opacity: a, transform: `translateY(${22 * (1 - a)}px)` }; };
  const fy = padTop + 330;
  const ry0 = rowsY == null ? fy + 230 : rowsY;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: h, background: P.ground, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 92, background: P.stone, borderBottom: `2px solid ${P.rule}` }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: 70 + i * 34, top: 38, width: 16, height: 16, border: `2px solid ${P.muted}`, boxSizing: "border-box" }} />)}
        <div style={{ position: "absolute", left: 340, width: 400, top: 30, textAlign: "center", fontFamily: body, fontSize: 30, color: P.muted, ...nowrap }}>{url || ""}</div>
      </div>
      <div style={{ position: "absolute", left: 70, top: padTop + 140, width: 940, fontFamily: head, fontSize: fit(heading, 940, 76, 0.52), color: P.ink, lineHeight: 1.1, letterSpacing: "-0.03em", ...nowrap, ...e(0) }}>{heading}</div>
      {sub
        ? <div style={{ position: "absolute", left: 72, top: padTop + 246, width: 938, fontFamily: body, fontSize: fit(sub, 938, 34, 0.5), color: P.muted, ...nowrap, ...e(1) }}>{sub}</div>
        : <div style={{ position: "absolute", left: 72, top: padTop + 258, width: 520, height: 22, background: P.pressed, ...e(1) }} />}
      <div style={{ position: "absolute", left: 70, top: fy, width: 670, height: 120, background: P.field, border: `4px solid ${P.ink}`, boxSizing: "border-box", ...e(2) }}>
        <div style={{ position: "absolute", left: 30, top: 30, right: 20, fontFamily: body, fontSize: 44, lineHeight: "56px", color: typed ? P.ink : P.rule, display: "flex", alignItems: "center", ...nowrap }}>
          <span style={{ whiteSpace: "pre" }}>{typed ? (typed.length > 22 ? "…" + typed.slice(-21) : typed) : "https://"}</span>
          {caret ? <span style={{ display: "inline-block", width: 4, height: 60, background: P.ink, marginLeft: 6, flex: "none" }} /> : null}
        </div>
      </div>
      <div style={{ position: "absolute", left: pressed ? 764 : 760, top: fy + (pressed ? 4 : 0), width: pressed ? 246 : 250, height: pressed ? 116 : 120,
        background: pressed ? P.deep : P.accent, display: "grid", placeItems: "center", ...e(2) }}>
        {button
          ? <div style={{ fontFamily: body, fontSize: fit(button, 210, 40, 0.55), color: P.onAccent, ...nowrap, maxWidth: 220 }}>{button}</div>
          : <svg width="64" height="40" viewBox="0 0 64 40"><path d="M4 20 H54 M38 5 L56 20 L38 35" fill="none" stroke={P.onAccent} strokeWidth="6" strokeLinecap="square" /></svg>}
      </div>
      {status ? (
        <div style={{ position: "absolute", left: 70, top: fy + 146, width: 940, display: "flex", alignItems: "center", gap: 16, ...e(3) }}>
          <div style={{ width: 16, height: 16, background: P.ink, flex: "none" }} />
          <div style={{ fontFamily: body, fontSize: 32, color: P.ink, ...nowrap }}>{status}</div>
        </div>
      ) : null}
      {rows.map(([label, st], i) => {
        const y = ry0 + i * 112;
        return (
          <div key={i} style={{ position: "absolute", left: 70, top: y, width: 940, height: 112, borderTop: `2px solid ${P.rule}`, ...e(3 + i) }}>
            <div style={{ position: "absolute", left: 0, top: 34 }}><Check on={st >= 0.99} P={P} /></div>
            {label
              ? <div style={{ position: "absolute", left: 70, top: 30, width: 440, fontFamily: body, fontSize: fit(label, 440, 40, 0.5), lineHeight: "52px", color: st > 0 ? P.ink : P.muted, ...nowrap }}>{label}</div>
              : <div style={{ position: "absolute", left: 70, top: 46, width: 300, height: 20, background: P.pressed }} />}
            <div style={{ position: "absolute", left: 530, top: 48, width: 410, height: 16, background: P.pressed }}>
              <div style={{ width: `${Math.min(1, st) * 100}%`, height: "100%", background: P.ink }} />
            </div>
            {i === rows.length - 1 ? <div style={{ position: "absolute", left: 0, top: 110, width: 940, height: 2, background: P.rule }} /> : null}
          </div>
        );
      })}
    </div>
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

// The effect owns the frame: the screen drops in over the top half while the speaker slides into the bottom half.
export function styles() {
  return { hideBase: true };
}

export function Front(ctx) {
  const { params, frame, frames, brand, words, text, focus, media } = ctx;
  const P = palette(brand.colors);
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const m = params.media ? media(params.media) : null;
  const cl = clausesOf(text);
  const url = String(params.url || "").trim();
  const title = String(params.title || "").trim() || (cl[0] ? firstWords(cl[0], 5) : "");
  const sub = String(params.subtitle || "").trim();
  const button = String(params.button || "").trim();
  const given = listParam(params.rows).slice(0, 3);
  const labels = given.length ? given : (cl.length > 1 ? cl.slice(1, 4).map((s) => firstWords(s, 4)) : ["", "", ""]);
  const fr = [0.1, 0.3, 0.72];
  const rows = labels.map((l, i) => {
    const t0 = Math.max(8 + i * 6, wordTime(words, l, Math.round(fr[i] * frames)) - 2);
    return [l, ease(frame, t0, 27)];
  });
  const status = [String(params.status || "").trim(), url].filter(Boolean).join(" ");
  const p = ease(frame, 0, 10) * (1 - ease(frame, frames - 7, 7));   // drops in, slides back out
  const D = splitShift(focus);
  const cap = chunkAt(chunks(words), frame);
  const o = 1;
  return (
    <div style={{ ...fill, opacity: o }}>
      <div style={{ ...fill, background: P.ink }} />
      <Speaker style={{ top: D * p }} />
      <div style={{ position: "absolute", left: 0, top: -SEAM * (1 - p), width: 1080, height: SEAM, overflow: "hidden" }}>
        {m ? <MediaFill m={m} />
          : <Screen h={SEAM} P={P} head={head} body={body} frame={frame} enter={4} heading={title} sub={sub} url={url} button={button}
              typed={url} caret={false} pressed status={status} rows={rows} />}
      </div>
      <div style={{ position: "absolute", left: 0, top: SEAM * p - 2, width: 1080, height: 4, background: P.ink }} />
      {p > 0.95 ? <SeamCaption text={cap} y={SEAM} P={P} font={body} /> : null}
    </div>
  );
}
