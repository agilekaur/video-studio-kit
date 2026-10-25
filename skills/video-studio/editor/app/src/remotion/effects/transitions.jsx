import React from "react";
import { fill, exitFade, listParam, faceBox } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "transitions",
  "name": "Transition Sampler",
  "big": false,
  "needs": [],
  "prefers": [],
  "purposes": [
    "point"
  ],
  "sfx": "whoosh",
  "desc": "Four framings of the take (wide, 1.25x punch, 1.35x side crop, 1.55x tight) joined by a light flash, a blurred whip and a hard cut, each landing in a pause. Gives a plain beat rhythm.",
  "params": [
    {
      "key": "labels",
      "label": "Framing labels (optional, one per shot)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const FL = 5, WL = 6;     // flash 0.15 s, whip 0.2 s

// a transition near each target (25 / 50 / 75 % of the beat), snapped into the nearest pause between words
function times(frames, words) {
  const gaps = [];
  for (let k = 0; k < words.length - 1; k++) {
    const a = words[k].to, b = words[k + 1].from;
    gaps.push(b - a >= 2 ? Math.round((a + b) / 2) : Math.round(a + 1));
  }
  const out = [];
  let prev = 6;
  [0.25, 0.5, 0.75].forEach((t, i) => {
    const want = Math.round(frames * t);
    const win = frames * 0.1;
    const lo = prev + 10, hi = frames - 10 - (2 - i) * 10;
    const c = gaps.filter((g) => Math.abs(g - want) <= win && g >= lo && g <= hi).sort((x, y) => Math.abs(x - want) - Math.abs(y - want))[0];
    const v = clamp(c ?? want, lo, Math.max(lo, hi));
    out.push(v);
    prev = v;
  });
  return { flash: out[0], whip: out[1], cut: out[2] };
}

// shot framings: zoom + the design point that lands at frame centre
function shots(focus) {
  const fx = focus.x * 1080, fy = focus.y * 1920;
  return [
    { z: 1, cx: 540, cy: 960 },              // wide
    { z: 1.25, cx: fx, cy: fy + 200 },       // punch
    { z: 1.35, cx: fx + 170, cy: fy + 300 }, // side crop: speaker off centre
    { z: 1.55, cx: fx, cy: fy + 130 },       // tight
  ];
}
function xf(s) {
  const tx = clamp(540 - s.z * s.cx, 1080 - 1080 * s.z, 0), ty = clamp(960 - s.z * s.cy, 1920 - 1920 * s.z, 0);
  return { tx, ty, z: s.z };
}
const tfm = (t, dx = 0) => `translate(${t.tx + dx}px, ${t.ty}px) scale(${t.z})`;

function shotAt(frame, T) {
  if (frame < T.flash) return 0;
  if (frame < T.whip) return 1;
  if (frame < T.cut) return 2;
  return 3;
}

export function styles({ frame, frames, words, focus }) {
  const T = times(frames, words);
  const t = xf(shots(focus)[shotAt(frame, T)]);
  const whip = frame >= T.whip - WL / 2 && frame < T.whip + WL / 2;
  return { hideBase: whip, base: { transform: tfm(t), transformOrigin: "0 0" } };
}

const lum = (h) => { const s = String(h || "#000").replace("#", "").padEnd(6, "0"); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) || 0); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

export function Front({ params, frame, frames, words, focus, brand }) {
  const T = times(frames, words);
  const S = shots(focus).map(xf);
  const C = brand.colors;
  const paper = lum(C.surface) > 0.6 ? C.surface : "#F7F5F0";
  const labels = listParam(params.labels);
  const body = `"${brand.fonts.body.family}", Arial, sans-serif`;
  const out = [];

  // whip: shot B slides out left as shot C slides in, with horizontal motion blur
  const w0 = T.whip - WL / 2;
  if (frame >= w0 && frame < T.whip + WL / 2) {
    const q = (frame - w0 + 0.5) / WL;
    const pw = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
    const off = 1080 * pw, blur = 60 * Math.sin(Math.PI * q);
    out.push(
      <svg key="whipdef" width="0" height="0" style={{ position: "absolute" }}>
        <filter id="vs-whip-blur" x="-10%" y="0" width="120%" height="100%"><feGaussianBlur stdDeviation={`${blur.toFixed(1)} 0`} /></filter>
      </svg>,
      <div key="whip" style={{ ...fill, overflow: "hidden", background: "#000", filter: "url(#vs-whip-blur)" }}>
        <div style={{ ...fill, transform: tfm(S[1], -off), transformOrigin: "0 0" }}><Speaker /></div>
        <div style={{ ...fill, transform: tfm(S[2], 1080 - off), transformOrigin: "0 0" }}><Speaker /></div>
      </div>
    );
  }

  // flash: a paper-coloured flash peaking on the cut point
  const d = Math.abs(frame + 0.5 - T.flash);
  if (d < FL / 2) out.push(<div key="flash" style={{ ...fill, background: paper, opacity: clamp((1 - d / (FL / 2)) * 1.15, 0, 1) }} />);

  // optional framing chips, kept off the face of the current framing
  const i = shotAt(frame, T);
  const lab = labels[i];
  if (lab) {
    const starts = [0, T.flash, T.whip + WL / 2, T.cut];
    const a = clamp((frame - starts[i]) / 8, 0, 1) * exitFade(frame, frames);
    const t = S[i], fb = faceBox(focus);
    const top = t.ty + t.z * fb.top, bottom = t.ty + t.z * fb.bottom, left = t.tx + t.z * fb.left;
    const y = 200 + 62 < top - 12 || 65 + 420 < left ? 200 : bottom + 24 < 1440 ? bottom + 24 : -1;
    if (y > 0 && a > 0) {
      out.push(
        <div key="chip" style={{ position: "absolute", left: 65 - 24 * (1 - a), top: y, opacity: a, background: C.surface, color: C.surface_text, fontFamily: body,
          fontSize: 34, lineHeight: 1, padding: "13px 20px 12px", whiteSpace: "nowrap", maxWidth: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{lab}</div>
      );
    }
  }
  return out.length ? <div style={fill}>{out}</div> : null;
}
