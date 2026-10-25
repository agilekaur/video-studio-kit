import React from "react";
import { Img, OffthreadVideo, interpolate, Easing } from "remotion";
import { fill, ease, exitFade, fontStack, listParam } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "couch-wall",
  "name": "Couch Wall",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "proof"
  ],
  "sfx": "whoosh",
  "desc": "Curved wall of cards scrolls behind the cut-out speaker with a slow push in.",
  "params": [
    {
      "key": "labels",
      "label": "Card labels (one per line)",
      "type": "list",
      "default": []
    },
    {
      "key": "media",
      "label": "Card media (optional)",
      "type": "media",
      "default": ""
    }
  ],
  "status": "ready"
};

const STOP = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very its it's isn't dont don't can not have has had will would what when then than from about into".split(" "));
function keywords(text, n) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text || "").split(/\s+/)) {
    const w = raw.replace(/[^A-Za-z0-9']/g, "");
    if (!w || w.length < 3 || STOP.has(w.toLowerCase()) || seen.has(w.toLowerCase())) continue;
    seen.add(w.toLowerCase());
    out.push(w);
  }
  return out.slice(0, n);
}

const push = (frame, frames) =>
  interpolate(frame, [0, Math.max(frames - 1, 1)], [1, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });

export function styles({ hasCutout, frame, frames }) {
  if (!hasCutout) return { hideBase: frame < frames - 5 };
  return { hideBase: frame < frames - 5, zoom: push(frame, frames) };
}

const STEP = 14, RADIUS = 900, CW = 300, CH = 520, ROWS = 5, PITCH = 560;
const HUES = ["#7C5CFF", "#FF6B4A", "#22C3A6", "#2F80ED", "#E8417A", "#F2A93B"];

function Tile({ label, k, m, live, brand }) {
  const hue = k % 3 === 0 ? brand.colors.accent : HUES[k % HUES.length];
  const cover = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: 26, overflow: "hidden", border: "4px solid rgba(255,255,255,.85)", boxSizing: "border-box",
      background: `linear-gradient(165deg, ${hue}, #121216 120%)` }}>
      {m && m.kind === "image" ? <Img src={m.url} style={{ ...cover, filter: `hue-rotate(${(k * 47) % 360}deg)` }} /> : null}
      {m && m.kind === "video" && live ? <OffthreadVideo src={m.url} muted startFrom={(k * 13) % 60} style={cover} /> : null}
      {m && m.kind === "video" && !live ? <div style={{ ...cover, background: `linear-gradient(165deg, ${hue}, #121216 120%)` }} /> : null}
      <div style={{ position: "absolute", left: 24, top: 24, width: 54, height: 54, borderRadius: 27, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 0, height: 0, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: "19px solid #fff", marginLeft: 5 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "70px 24px 28px", background: "linear-gradient(0deg, rgba(0,0,0,.7), rgba(0,0,0,0))",
        fontFamily: fontStack(brand.fonts.heading), color: "#fff", fontSize: Math.min(52, 250 / Math.max(label.length * 0.6, 1)), lineHeight: 1,
        textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

function Wall(ctx) {
  const { params, text, frame, frames, brand, media } = ctx;
  let labels = listParam(params.labels);
  if (!labels.length) labels = keywords(text, 12);
  if (!labels.length) labels = ["Episode", "Clip", "Story", "Guide", "Review", "Recap"];
  const m = params.media ? media(params.media) : null;
  const scroll = frame * 0.6;
  const cols = 15;
  const tiles = [];
  for (let c = 0; c < cols; c++) {
    // wrap so the wall is endless, right to left
    let ang = ((c * STEP - scroll) % (cols * STEP) + cols * STEP) % (cols * STEP) - (cols * STEP) / 2;
    if (Math.abs(ang) > 84) continue;
    for (let r = 0; r < ROWS; r++) {
      const k = c * ROWS + r;
      const live = Math.abs(ang) < 32 && r >= 1 && r <= 3 && (c + r) % 3 === 0;
      tiles.push(
        <div key={k} style={{ position: "absolute", left: -CW / 2, top: (r - (ROWS - 1) / 2) * PITCH - CH / 2 + (c % 2) * 90, width: CW, height: CH,
          transform: `rotateY(${ang}deg) translateZ(${-RADIUS}px)`, backfaceVisibility: "hidden" }}>
          <Tile label={labels[(c * 2 + r) % labels.length]} k={k} m={m} live={live} brand={brand} />
        </div>
      );
    }
  }
  const s = push(frame, frames) * (1.06 - 0.06 * ease(frame, 0, 10));
  return (
    <div style={{ ...fill, background: "radial-gradient(ellipse at 50% 40%, #2a2a33, #0b0b0e 75%)", overflow: "hidden" }}>
      <div style={{ ...fill, perspective: 1200, perspectiveOrigin: "50% 45%", transform: `scale(${1.55 * s})`, transformOrigin: "50% 45%",
        filter: "brightness(.7) blur(2px)" }}>
        <div style={{ position: "absolute", left: 540, top: 864, width: 0, height: 0, transformStyle: "preserve-3d" }}>{tiles}</div>
      </div>
      <div style={{ ...fill, background: "radial-gradient(ellipse 55% 45% at 50% 38%, rgba(0,0,0,0), rgba(0,0,0,.45))" }} />
    </div>
  );
}

export function Behind(ctx) {
  const { frame, frames, hasCutout } = ctx;
  const o = exitFade(frame, frames);
  if (hasCutout) return <div style={{ ...fill, opacity: o }}><Wall {...ctx} /></div>;
  // No cutout: the wall surrounds a rounded window of the footage so the face stays clear.
  const k = ease(frame, 0, 8);
  return (
    <div style={{ ...fill, opacity: o }}>
      <Wall {...ctx} />
      <Speaker style={{ left: 110, top: 220, width: 860, height: 1240, borderRadius: 44, transform: `scale(${0.94 + 0.06 * k})`,
        boxShadow: "0 30px 80px rgba(0,0,0,.5)" }} origin="50% 30%" zoom={push(frame, frames)} />
    </div>
  );
}
