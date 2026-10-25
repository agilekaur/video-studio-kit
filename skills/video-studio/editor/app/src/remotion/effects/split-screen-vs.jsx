import React from "react";
import { Img, OffthreadVideo, Loop } from "remotion";
import { fill, ease, pop, exitFade, fontStack } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "split-screen-vs",
  "name": "Split Screen VS",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "whoosh",
  "desc": "Side-by-side comparison with labels, speaker on one side and media on the other.",
  "params": [
    {
      "key": "media",
      "label": "Other side media",
      "type": "media",
      "default": ""
    },
    {
      "key": "left",
      "label": "Left label",
      "type": "text",
      "default": "MINE"
    },
    {
      "key": "right",
      "label": "Right label",
      "type": "text",
      "default": "THEIRS"
    }
  ],
  "status": "ready"
};

// 9:16 split is a vertical stack: speaker on top (the "left" label), other side below (the "right" label).
const DIV = 820;   // divider y (bottom label clears the caption band)
const LIFT = 170;  // how far the speaker footage moves up to sit in the top half

export function styles({ frame }) {
  const p = ease(frame, 0, 12);
  return { base: { transform: `translateY(${-LIFT * p}px)` } };
}

function MediaFill({ m }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={st} /></Loop>
    : <Img src={m.url} style={st} />;
}

function Label({ text, x, y, s, bg, color, font }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${s})`, transformOrigin: "0% 50%",
      background: bg, color, fontFamily: font, fontSize: 52, lineHeight: 1, letterSpacing: 1,
      padding: "16px 26px 14px", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,.35)", whiteSpace: "nowrap" }}>{text}</div>
  );
}

export function Front({ params, frame, frames, fps, brand, media }) {
  const C = brand.colors;
  const m = params.media ? media(params.media) : null;
  const p = ease(frame, 0, 12);
  const top = DIV + (1920 - DIV) * (1 - p);
  const o = exitFade(frame, frames);
  const font = fontStack(brand.fonts.heading);
  const left = String(params.left || "MINE").toUpperCase();
  const right = String(params.right || "THEIRS").toUpperCase();
  const vs = pop(frame, fps, 10, 9);
  return (
    <div style={{ ...fill, opacity: o }}>
      {/* bottom half: media, or a second desaturated, tighter speaker copy */}
      <div style={{ position: "absolute", left: 0, top, width: 1080, height: 1920 - DIV, overflow: "hidden", background: "#0b0b0c" }}>
        {m ? <MediaFill m={m} /> : (
          <div style={{ position: "absolute", left: 0, top: -170, width: 1080, height: 1920 }}>
            <Speaker zoom={1.25} filter="grayscale(1) contrast(1.12) brightness(.82)" />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,0) 30%)" }} />
      </div>
      {/* divider */}
      <div style={{ position: "absolute", left: 0, top: top - 4, width: 1080, height: 8, background: C.accent, boxShadow: "0 0 24px rgba(0,0,0,.5)" }} />
      {/* labels hug the divider */}
      <Label text={left} x={56} y={DIV - 104} s={pop(frame, fps, 6, 10)} bg={C.accent} color="#111" font={font} />
      <Label text={right} x={56} y={DIV + 30} s={pop(frame, fps, 9, 10)} bg="rgba(17,17,17,.9)" color="#fff" font={font} />
      {/* VS badge */}
      <div style={{ position: "absolute", left: 790, top: DIV - 64, width: 128, height: 128, borderRadius: 64, transform: `scale(${vs}) rotate(${-8 * (1 - vs)}deg)`,
        background: "#111", border: `6px solid ${C.accent}`, boxSizing: "border-box", display: "grid", placeItems: "center",
        color: C.accent, fontFamily: font, fontSize: 54, letterSpacing: -1, boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>VS</div>
    </div>
  );
}
