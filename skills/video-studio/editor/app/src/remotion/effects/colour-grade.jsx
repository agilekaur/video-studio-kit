import React from "react";
import { interpolate, Easing } from "remotion";
import { fontStack, faceBox } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "colour-grade",
  "name": "Colour Grade Wipe",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "whoosh",
  "desc": "The original shot wipes left to right to a first grade, then to a second, with a cream wipe line and a small label for each.",
  "params": [
    {
      "key": "label1",
      "label": "First grade label (warm, moody, cool, mono, punchy)",
      "type": "text",
      "default": "WARM"
    },
    {
      "key": "label2",
      "label": "Second grade label (warm, moody, cool, mono, punchy)",
      "type": "text",
      "default": "MOODY"
    }
  ],
  "status": "ready"
};

// Kit timing on a 3.4 s beat: wipe 1 at 0.95 s, wipe 2 at 2.15 s, each 0.5 s, in-out cubic. Here the same proportions
// of the beat (wipes capped at 15 frames). The grade is picked from the label's wording; the label changes once the
// wipe passes half way. Grades are CSS filters plus a soft-light tint (moody adds its vignette), on the footage only.

const GRADES = {
  warm: { filter: "brightness(1.05) contrast(1.05) saturate(1.18) sepia(.12)", tint: "rgba(255,150,60,.22)" },
  moody: { filter: "contrast(1.16) saturate(1.05) brightness(.9)", tint: "rgba(0,110,130,.42)", vignette: true },
  cool: { filter: "saturate(.5) contrast(.92) brightness(.98)", tint: "rgba(60,120,200,.3)" },
  mono: { filter: "grayscale(1) contrast(1.15)" },
  punchy: { filter: "contrast(1.14) saturate(1.25)" },
};

function gradeOf(label, fb) {
  const l = String(label || "").toLowerCase();
  if (/mood|teal|cinema|dark|night/.test(l)) return "moody";
  if (/warm|bright|gold|sun|orange/.test(l)) return "warm";
  if (/cool|cold|blue|ice|agency|flat/.test(l)) return "cool";
  if (/mono|b&w|black|grey|gray/.test(l)) return "mono";
  if (/punch|vivid|pop|rich/.test(l)) return "punchy";
  return fb;
}

function Graded({ g, zoom }) {
  const G = GRADES[g];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }}>
      <Speaker zoom={zoom} filter={G.filter} />
      {G.tint ? <div style={{ position: "absolute", inset: 0, background: G.tint, mixBlendMode: "soft-light" }} /> : null}
      {G.vignette ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 60% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)" }} /> : null}
    </div>
  );
}

export function Front({ params, frame, frames, brand, beat, focus }) {
  const steps = [
    { label: "ORIGINAL", g: null },
    { label: String(params.label1 || "WARM").toUpperCase(), g: gradeOf(params.label1 || "warm", "warm") },
    { label: String(params.label2 || "MOODY").toUpperCase(), g: gradeOf(params.label2 || "moody", "moody") },
  ];
  const wl = Math.max(6, Math.min(15, Math.round(frames * 0.147)));
  const starts = [Math.round(frames * 0.28), Math.round(frames * 0.63)];
  const zoom = +(beat && beat.zoom) || 1;
  const ez = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) };
  const pw = starts.map((t) => interpolate(frame, [t, t + wl], [0, 1], ez));
  // under = the grade fully on, over = the grade wiping in from the left
  const cur = pw[1] >= 1 ? 2 : pw[0] >= 1 ? 1 : 0;
  const nxt = cur < 2 && pw[cur] > 0 ? cur + 1 : null;
  const x = nxt ? 1080 * pw[cur] : 0;
  const li = nxt && pw[cur] >= 0.5 ? nxt : cur;
  const lt = li === 0 ? 0 : starts[li - 1] + wl * 0.5;
  const e = interpolate(frame, [lt, lt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const out = interpolate(frame, [frames - 5, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }}>
      {steps[cur].g ? <div style={{ position: "absolute", inset: 0, opacity: out }}><Graded g={steps[cur].g} zoom={zoom} /></div> : null}
      {nxt ? (
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${1080 - x}px 0 0)` }}>
          <Graded g={steps[nxt].g} zoom={zoom} />
        </div>
      ) : null}
      {nxt ? (() => {
        // the wipe line never crosses the face: it breaks around the face box
        const fb = faceBox(focus), onFace = x > fb.left - 3 && x < fb.right + 3;
        const segs = onFace ? [[0, fb.top], [fb.bottom, 1920]] : [[0, 1920]];
        return segs.map(([a, b], i) => (
          <div key={i} style={{ position: "absolute", left: x - 3, top: a, width: 6, height: b - a, background: "#F6F0E0", boxShadow: "0 0 18px rgba(0,0,0,.35)" }} />
        ));
      })() : null}
      <div style={{ position: "absolute", left: 65 - 24 * (1 - e), top: 210, padding: "13px 20px", background: "#F6F0E0", color: "#1A1714",
        fontFamily: fontStack(brand.fonts.body), fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: 1, opacity: e * out, whiteSpace: "nowrap" }}>{steps[li].label}</div>
    </div>
  );
}
