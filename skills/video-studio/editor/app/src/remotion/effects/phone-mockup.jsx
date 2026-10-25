import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing } from "remotion";
import { fill, ease, exitFade } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "phone-mockup",
  "name": "Phone Mockup",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "tools",
    "point"
  ],
  "sfx": "whoosh",
  "desc": "A dark 3D phone slides in, turns to face camera; the screen plays a clip or image from the bin.",
  "params": [
    {
      "key": "media",
      "label": "Screen media",
      "type": "media",
      "default": ""
    },
    {
      "key": "side",
      "label": "Side",
      "type": "select",
      "options": [
        "right",
        "left"
      ],
      "default": "right"
    }
  ],
  "status": "ready"
};

const PW = 400, PH = 820, PT = 250;
const SHIFT = 230;

// The effect owns the frame: a blurred dark copy fills the back, the speaker slides to the
// opposite side with a feathered edge so the phone has room and the face stays clear.
export function styles() {
  return { hideBase: true };
}

export function Behind({ params, frame }) {
  const dir = params.side === "left" ? 1 : -1;
  const p = ease(frame, 0, 16);
  const feather = dir < 0
    ? `linear-gradient(90deg, #000 0%, #000 ${100 - 24 * p}%, transparent 100%)`
    : `linear-gradient(270deg, #000 0%, #000 ${100 - 24 * p}%, transparent 100%)`;
  return (
    <div style={fill}>
      <Speaker zoom={1.15} filter="blur(36px) brightness(.45) saturate(.9)" />
      <Speaker zoom={1 + 0.12 * p} filter={`brightness(${1 - 0.1 * p})`}
        style={{ left: dir * SHIFT * p, WebkitMaskImage: feather, maskImage: feather }} />
    </div>
  );
}

function Media({ m }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  const landscape = m.w && m.h && m.w > m.h * 1.05;
  const el = () => m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={st} /></Loop>
    : <Img src={m.url} style={st} />;
  if (!landscape) return el();
  // landscape media: blurred fill plus the full frame centred, like a phone playing a 16:9 clip
  return (
    <>
      <div style={{ position: "absolute", inset: -40, filter: "blur(30px) brightness(.55)" }}>{el()}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: (PW - 36) * m.h / m.w, transform: "translateY(-50%)" }}>{el()}</div>
    </>
  );
}

// Placeholder app UI in brand colours: no invented text or numbers, just shapes.
function Placeholder({ C, frame }) {
  const bars = [0.55, 0.8, 0.42, 0.95, 0.68, 0.86];
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${C.surface} 0%, #050506 100%)` }}>
      <div style={{ position: "absolute", left: 28, top: 96, width: 150, height: 22, borderRadius: 11, background: "rgba(255,255,255,.85)" }} />
      <div style={{ position: "absolute", left: 28, top: 132, width: 96, height: 14, borderRadius: 7, background: "rgba(255,255,255,.3)" }} />
      <div style={{ position: "absolute", right: 28, top: 92, width: 54, height: 54, borderRadius: 27, background: C.accent }} />
      <div style={{ position: "absolute", left: 24, right: 24, top: 184, height: 250, borderRadius: 30, overflow: "hidden",
        background: `linear-gradient(135deg, ${C.accent}, ${C.primary === C.accent ? "#ff8a00" : C.primary})` }}>
        <div style={{ position: "absolute", left: 24, top: 26, width: 120, height: 16, borderRadius: 8, background: "rgba(0,0,0,.35)" }} />
        <div style={{ position: "absolute", left: 24, bottom: 22, right: 24, height: 130, display: "flex", alignItems: "flex-end", gap: 14 }}>
          {bars.map((h, k) => {
            const g = ease(frame, 14 + k * 3, 12);
            return <div key={k} style={{ flex: 1, height: `${h * 100 * g}%`, borderRadius: 8, background: "rgba(0,0,0,.72)" }} />;
          })}
        </div>
      </div>
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: "absolute", left: 24, right: 24, top: 462 + k * 100, height: 82, borderRadius: 22,
          background: "rgba(255,255,255,.07)", opacity: ease(frame, 20 + k * 4, 8), display: "flex", alignItems: "center", padding: "0 18px", gap: 16, boxSizing: "border-box" }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: k === 0 ? C.accent : "rgba(255,255,255,.18)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: `${70 - k * 12}%`, height: 14, borderRadius: 7, background: "rgba(255,255,255,.75)" }} />
            <div style={{ width: `${46 + k * 8}%`, height: 10, borderRadius: 5, marginTop: 10, background: "rgba(255,255,255,.25)" }} />
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 30, height: 70, borderRadius: 35, background: "rgba(255,255,255,.08)",
        display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        {[0, 1, 2, 3].map((k) => <div key={k} style={{ width: 30, height: 30, borderRadius: 9, background: k === 0 ? C.accent : "rgba(255,255,255,.3)" }} />)}
      </div>
    </div>
  );
}

export function Front({ params, frame, frames, brand, media }) {
  const left = params.side === "left";
  const dir = left ? -1 : 1;
  const C = brand.colors;
  const m = params.media ? media(params.media) : null;
  const t = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const settle = interpolate(frame, [18, 26], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 70deg -> -2deg overshoot -> 0, then a slow idle sway
  const ry = frame < 18 ? dir * (70 * (1 - t) - 2 * t) : -dir * 2 * settle + dir * 2.5 * Math.sin((frame - 18) / 28) * (1 - settle);
  const tx = dir * 900 * (1 - t);
  const bob = 8 * Math.sin(frame / 22);
  const x = left ? 120 : 1080 - 120 - PW;
  const o = exitFade(frame, frames);
  return (
    <div style={{ ...fill, opacity: o }}>
      <div style={{ ...fill, opacity: t, background: `linear-gradient(${left ? 90 : 270}deg, rgba(10,10,12,.85) 0%, rgba(10,10,12,.35) 45%, rgba(10,10,12,0) 70%)` }} />
      <div style={{ ...fill, perspective: 1600, perspectiveOrigin: `${x + PW / 2}px ${PT + PH / 2}px` }}>
        <div style={{ position: "absolute", left: x, top: PT + bob, width: PW, height: PH, transformStyle: "preserve-3d",
          transform: `translateX(${tx}px) rotateY(${ry}deg)` }}>
          <div style={{ position: "absolute", inset: 10, borderRadius: 64, boxShadow: "0 40px 80px rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.4)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 64,
            background: "linear-gradient(135deg, #6a6a72 0%, #1b1b1d 38%, #2b2b2e 62%, #55555c 100%)" }}>
            <div style={{ position: "absolute", inset: 6, borderRadius: 58, background: "#050506", padding: 12, boxSizing: "border-box" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 48, overflow: "hidden", background: "#000" }}>
                {m ? <Media m={m} /> : <Placeholder C={C} frame={frame} />}
                <div style={{ position: "absolute", left: "50%", top: 18, width: 110, height: 32, marginLeft: -55, borderRadius: 16, background: "#000" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,.05) 100%)" }} />
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", left: -4, top: 190, width: 5, height: 70, borderRadius: 3, background: "#3a3a40" }} />
          <div style={{ position: "absolute", right: -4, top: 230, width: 5, height: 110, borderRadius: 3, background: "#3a3a40" }} />
        </div>
      </div>
    </div>
  );
}
