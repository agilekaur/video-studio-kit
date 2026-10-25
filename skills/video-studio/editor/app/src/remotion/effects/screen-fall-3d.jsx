import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing, spring } from "remotion";
import { fill, ease, listParam } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "screen-fall-3d",
  "name": "Screen Fall 3D",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "whoosh",
  "captions": false,
  "desc": "Top half: six near-identical website screens pop in, then tilt back 55 degrees and recede into a fog of the ground colour one after another; speaker below the seam. Volume and sameness.",
  "params": [
    {
      "key": "cards",
      "label": "Screen headlines (optional, one per line)",
      "type": "list",
      "default": []
    },
    {
      "key": "media",
      "label": "Screen media (optional)",
      "type": "media",
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

// ---------- screen fall ----------
const CW = 440, CH = 280, K = 0.88;            // drawn at 440x280, shown at 88 %
const CX = [290, 750], CY = [170, 450, 730];   // card centres in the panel (2 x 3)
const CELLS = CY.flatMap((y) => CX.map((x) => ({ x: x - CW / 2, y: y - CH / 2 })));
const ORDER = [4, 5, 2, 3, 0, 1];               // front row falls first

function Bar({ w, h = 10, c, mt = 0 }) {
  return <div style={{ width: w, height: h, background: c, marginTop: mt, flex: "none" }} />;
}

function MediaFill({ m }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={st} /></Loop>
    : <Img src={m.url} style={st} />;
}

function Screen({ i, P, label, m, font }) {
  const HERO = [P.stone, P.pressed, P.I, P.stone, P.muted, P.pressed];
  const hero = HERO[i];
  const onDark = Math.abs(lum(hero) - lum(P.G)) > 0.35;
  const ink = onDark ? P.G : P.I;
  return (
    <div style={{ width: CW, height: CH, background: P.G, border: `3px solid ${P.I}`, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 30, background: P.stone, borderBottom: `2px solid ${P.rule}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 7, flex: "none" }}>
        {[0, 1, 2].map((k) => <div key={k} style={{ width: 8, height: 8, background: k === 0 ? P.muted : P.rule }} />)}
        <div style={{ marginLeft: 14, width: 190, height: 12, background: P.G, border: `1px solid ${P.rule}` }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 12, flex: "none" }}>
        <div style={{ width: 26, height: 12, background: P.I }} />
        <div style={{ flex: 1 }} />
        {[34, 30, 38].map((w, k) => <Bar key={k} w={w} h={7} c={P.rule} />)}
        <div style={{ width: 46, height: 16, background: P.I }} />
      </div>
      <div style={{ position: "relative", margin: "2px 16px 0", height: 120, background: hero, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px", overflow: "hidden", flex: "none" }}>
        {m ? <MediaFill m={m} /> : label ? (
          <>
            <div style={{ fontFamily: font, fontSize: 30, lineHeight: 1.05, color: ink, maxWidth: 340, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{label}</div>
            <div style={{ width: 70, height: 18, marginTop: 10, background: ink }} />
          </>
        ) : (
          <>
            <Bar w={230} h={16} c={ink} />
            <Bar w={170} h={16} c={ink} mt={8} />
            <Bar w={120} h={7} c={onDark ? P.rule : P.muted} mt={12} />
            <div style={{ width: 70, height: 20, marginTop: 12, background: ink }} />
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, padding: "14px 16px" }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ flex: 1 }}>
            <div style={{ width: 18, height: 18, background: P.rule }} />
            <Bar w={100} h={7} c={P.muted} mt={8} />
            <Bar w={80} h={6} c={P.rule} mt={6} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Front({ params, frame, frames, fps, brand, words, media }) {
  const P = palette(brand.colors);
  const body = `"${brand.fonts.body.family}", Arial, sans-serif`, head = `"${brand.fonts.heading.family}", "Arial Black", Arial, sans-serif`;
  const labels = listParam(params.cards);
  const m = params.media ? media(params.media) : null;
  const p = splitP(frame, frames);
  // kit: cards land, then fall from ~39 % of the beat (frame 33 of 84); the fall stretches so it ends near the beat's end
  const stag = frames > 150 ? 4 : 3;
  const fallStart = clamp(Math.round(frames * 0.39), 16, Math.max(16, frames - 30 - stag * 5 - 10));
  const fallDur = clamp(frames - fallStart - stag * 5 - 10, 30, 170);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, overflow: "hidden", transform: `translateY(${-(1 - p) * SEAM}px)`, background: P.G }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, perspective: 1400, perspectiveOrigin: "540px 120px" }}>
        {CELLS.map((c, i) => {
          const rank = ORDER.indexOf(i);
          const inS = spring({ frame: frame - 3 - rank * 2, fps, config: { damping: 15, stiffness: 170, mass: 0.7 } });
          const f0 = fallStart + rank * stag;
          const q = interpolate(frame, [f0, f0 + fallDur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.55, 0, 0.35, 1) });
          const rot = 55 * Easing.out(Easing.cubic)(Math.min(1, q * 1.6));
          const z = -1900 * q, lift = -260 * q, fog = Math.pow(q, 1.6);
          const op = interpolate(inS, [0, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ position: "absolute", left: c.x, top: c.y, width: CW, height: CH, transformOrigin: "50% 100%", opacity: op, zIndex: rank,
              transform: `translate3d(0, ${lift + (1 - inS) * 40}px, ${z}px) rotateX(${rot}deg) scale(${K * (0.92 + 0.08 * inS)})` }}>
              <Screen i={i} P={P} label={labels.length ? labels[i % labels.length] : ""} m={m} font={head} />
              <div style={{ position: "absolute", inset: 0, background: P.G, opacity: fog }} />
            </div>
          );
        })}
      </div>
      <SeamCaption words={words} frame={frame} font={body} P={P} bottom={SEAM - 22} />
      <div style={{ position: "absolute", left: 0, right: 0, top: SEAM - 2, height: 2, background: P.I }} />
    </div>
  );
}
