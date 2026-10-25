import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing } from "remotion";
import { fill, ease, exitFade, fontStack } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "before-after",
  "name": "Before and After",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "whoosh",
  "desc": "Vertical wipe slider between a flat Before and a graded After.",
  "params": [
    {
      "key": "before",
      "label": "Before label",
      "type": "text",
      "default": "BEFORE"
    },
    {
      "key": "after",
      "label": "After label",
      "type": "text",
      "default": "AFTER"
    },
    {
      "key": "media",
      "label": "Before media (optional)",
      "type": "media",
      "default": ""
    }
  ],
  "status": "ready"
};

const LABEL_Y = 210, HANDLE_Y = 880;

// The base video is the graded After.
export function styles() {
  return { filter: "saturate(1.22) contrast(1.08) brightness(1.03)" };
}

// slider x: enters at the right, sweeps left revealing After, settles back to centre
function sliderX(frame, frames) {
  const end = Math.max(30, frames - 8);
  const a = Math.min(64, Math.round(end * 0.55));
  const ez = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) };
  if (frame < 10 + a) return interpolate(frame, [10, 10 + a], [960, 140], ez);
  return interpolate(frame, [10 + a, Math.min(end, 10 + a + 28)], [140, 540], ez);
}

function MediaFill({ m }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={st} /></Loop>
    : <Img src={m.url} style={st} />;
}

function Pill({ text, style, bg, color, font }) {
  return (
    <div style={{ position: "absolute", top: LABEL_Y, padding: "16px 28px 14px", borderRadius: 999, background: bg, color,
      fontFamily: font, fontSize: 50, lineHeight: 1, letterSpacing: 2, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,.3)", ...style }}>{text}</div>
  );
}

export function Front({ params, frame, frames, brand, media }) {
  const C = brand.colors;
  const m = params.media ? media(params.media) : null;
  const font = fontStack(brand.fonts.heading);
  const x = sliderX(frame, frames);
  const enter = ease(frame, 0, 10);
  const o = exitFade(frame, frames);
  const before = String(params.before || "BEFORE").toUpperCase();
  const after = String(params.after || "AFTER").toUpperCase();
  const clipL = `inset(0 ${1080 - x}px 0 0)`;
  const clipR = `inset(0 0 0 ${x}px)`;
  return (
    <div style={{ ...fill, opacity: o }}>
      {/* Before side: flat copy of the speaker, or the chosen media */}
      <div style={{ ...fill, clipPath: clipL, opacity: enter }}>
        {m ? <MediaFill m={m} /> : <Speaker filter="saturate(.55) contrast(.9) brightness(.97)" />}
        <Pill text={before} style={{ left: 60 }} bg="rgba(17,17,17,.82)" color="#fff" font={font} />
      </div>
      {/* After label lives on the graded base side */}
      <div style={{ ...fill, clipPath: clipR, opacity: enter }}>
        <Pill text={after} style={{ right: 160 }} bg={C.accent} color="#111" font={font} />
      </div>
      {/* slider line + handle */}
      <div style={{ position: "absolute", left: x - 3, top: 0, width: 6, height: 1920 * enter, background: "#fff",
        boxShadow: "0 0 18px rgba(0,0,0,.45)" }} />
      <div style={{ position: "absolute", left: x - 52, top: HANDLE_Y - 52, width: 104, height: 104, borderRadius: 52, background: "#fff",
        transform: `scale(${enter})`, boxShadow: "0 10px 30px rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <svg width="64" height="34" viewBox="0 0 64 34">
          <path d="M18 5 L6 17 L18 29" fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M46 5 L58 17 L46 29" fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
