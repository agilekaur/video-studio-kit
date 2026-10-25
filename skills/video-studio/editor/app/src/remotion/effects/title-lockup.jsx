import React from "react";
import { interpolate, Easing } from "remotion";
import { fontStack, faceBands } from "../kit.jsx";

export const meta = {
  "id": "title-lockup",
  "name": "Title Lockup",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "hook"
  ],
  "sfx": "thud",
  "captions": false,
  "desc": "A huge two-line headline pulls into focus from blur under the face, drifts, then smears off to the left as the beat ends.",
  "params": [
    {
      "key": "small",
      "label": "Small connector word above (blank: from the speech)",
      "type": "text",
      "default": ""
    },
    {
      "key": "line1",
      "label": "Big line 1 (blank: from the speech)",
      "type": "text",
      "default": ""
    },
    {
      "key": "line2",
      "label": "Big line 2",
      "type": "text",
      "default": ""
    }
  ],
  "status": "ready"
};

// Kit: line 1 centred at y 1160 and line 2 at 1390 (display font, <=300 px, ~820 px wide, caption fill + ink outline,
// tracking -4%), a small body-font connector tucked top left at (118, 985). Pull into focus over 12 frames
// (blur 18 -> 0, scale 1.10 -> 1.00), slow 3% drift, then a horizontal smear off to the left over the last 11 frames.
// The lockup is the text on this beat, so the normal captions are off.

const STOP = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our their its at as by from just here's heres".split(" "));
const clean = (s) => String(s || "").replace(/[^A-Za-z0-9'$%-]/g, "");

let _cv;
function textW(s, family, size, weight = 800) {
  try {
    _cv = _cv || document.createElement("canvas");
    const g = _cv.getContext("2d");
    g.font = `${weight} ${size}px ${family}`;
    return g.measureText(s).width;
  } catch (e) {
    return s.length * size * 0.6;
  }
}

// No text given: the first two consecutive strong words of the opening sentence, with the stop word before them as the connector.
function fromSpeech(text) {
  const sent = String(text || "").split(/(?<=[.!?])\s+/)[0] || "";
  const t = sent.split(/\s+/).map(clean).filter(Boolean);
  for (let i = 0; i < t.length - 1; i++) {
    if (!STOP.has(t[i].toLowerCase()) && !STOP.has(t[i + 1].toLowerCase())) {
      const prev = i > 0 && STOP.has(t[i - 1].toLowerCase()) ? t[i - 1].toLowerCase() : "";
      return [prev, t[i], t[i + 1]];
    }
  }
  return ["", t[0] || "", t[1] || ""];
}

export function Front({ params, frame, frames, brand, focus, text }) {
  let small = String(params.small || "").trim(), l1 = String(params.line1 || "").trim(), l2 = String(params.line2 || "").trim();
  if (!l1 && !l2) [small, l1, l2] = params.small ? [small, ...fromSpeech(text).slice(1)] : fromSpeech(text);
  l1 = l1.toUpperCase(); l2 = l2.toUpperCase();
  if (!l1 && !l2) return null;
  const C = brand.colors;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);

  // kit layout (y 985..1520) fitted into the free band under the face, never on it
  const { below } = faceBands(focus);
  const H0 = 560, Y0 = 975;                          // kit block: connector top 985 .. line 2 bottom ~1520
  const bandH = below[1] - below[0];
  const k = Math.min(1, bandH / H0);
  const top = below[0] + Math.max(0, (bandH - H0 * k) / 2);
  const Y = (y) => top + (y - Y0) * k;
  const TARGET = 800;                               // 140..940: clear of the right-side buttons
  const lineSize = (s) => Math.min(300 * k, (TARGET * 200) / Math.max(1, textW(s, head, 200) * 0.96));
  const s1 = l1 ? lineSize(l1) : 0, s2 = l2 ? lineSize(l2) : 0;
  const ss = small ? Math.min(76 * k, (700 * 100) / Math.max(1, textW(small, body, 100, 700))) : 0;

  // motion
  const FOCUS = 12, SMEAR = Math.max(FOCUS + 9, frames - 12);
  const p = interpolate(frame, [0, FOCUS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const q = interpolate(frame, [SMEAR, SMEAR + 11], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  if (q >= 1) return null;
  const drift = 0.03 * Math.min(1, Math.max(0, (frame - FOCUS) / Math.max(1, SMEAR - FOCUS)));
  const z = 1.1 - 0.1 * p + drift;
  const a = Math.min(1, p * 1.4) * (1 - Math.min(1, Math.max(0, (q - 0.7) / 0.3)));
  const blur = 18 * (1 - p);
  const smear = 70 * q;                              // horizontal-only motion blur
  const dx = -1150 * q;
  const fid = "tl-smear";

  const big = (s, size, cy) => (
    <div style={{ position: "absolute", left: 0, width: 1080, top: cy - size * 0.5, height: size, lineHeight: `${size}px`, textAlign: "center",
      fontFamily: head, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.04, whiteSpace: "nowrap", color: C.caption_text,
      WebkitTextStroke: `${Math.max(10, Math.round(size / 18))}px ${C.caption_outline}`, paintOrder: "stroke fill", transform: "translateX(-10px)" }}>{s}</div>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: a }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={fid} x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation={`${smear.toFixed(2)} 0`} />
          </filter>
        </defs>
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: `540px ${Y(1250)}px`,
        transform: `translateX(${dx}px) scale(${z})`, filter: q > 0 ? `url(#${fid})` : blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        {small ? (
          <div style={{ position: "absolute", left: 118, top: Y(985), fontFamily: body, fontWeight: 700, fontSize: ss, lineHeight: 1, letterSpacing: -ss * 0.01,
            color: C.caption_text, WebkitTextStroke: `8px ${C.caption_outline}`, paintOrder: "stroke fill", whiteSpace: "nowrap" }}>{small}</div>
        ) : null}
        {l1 ? big(l1, s1, Y(small ? 1160 : 1150)) : null}
        {l2 ? big(l2, s2, Y(1390)) : null}
      </div>
    </div>
  );
}
