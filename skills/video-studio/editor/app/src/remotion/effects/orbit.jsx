import React from "react";
import { Img, OffthreadVideo } from "remotion";
import { fill, pop, exitFade, fontStack, listParam, faceBox, faceOverlap } from "../kit.jsx";

export const meta = {
  "id": "orbit",
  "name": "Orbit",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "tools"
  ],
  "sfx": "whoosh",
  "desc": "3 or 4 vertical cards orbit in 3D around the speaker, behind the head and in front of the chest; cards fade rather than cross the face.",
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
  return out.sort((a, b) => b.length - a.length).slice(0, n);
}

const CW = 270, CH = 470, R = 400, DROP = 230;

// Card i of N: angle a; z = cos(a) > 0 means the near (front) half.
function cards(ctx) {
  const { params, text, frame, frames, focus } = ctx;
  // ring centre: the nearest card's top edge lands just under the chin
  const CY = faceBox(focus).bottom + 24 + CH / 2 - DROP;
  let labels = listParam(params.labels).slice(0, 4);
  if (labels.length < 3) labels = [...labels, ...keywords(text, 4 - labels.length)];
  while (labels.length < 3) labels.push(["Ideas", "Tools", "Results", "Systems"][labels.length]);
  const N = labels.length;
  // Linear spin, one full turn over the beat at most (360 deg per 2.4 s when the beat is short).
  const speed = (2 * Math.PI) / Math.max(frames, 72);
  return labels.map((label, i) => {
    const a = (2 * Math.PI * i) / N + Math.PI / N + frame * speed;
    const z = Math.cos(a);
    return { i, label, a, z, x: 540 + R * Math.sin(a), y: CY + DROP * z, s: 0.65 + 0.35 * (z + 1) / 2 };
  });
}

function Card({ c, ctx, dim }) {
  const { frame, frames, fps, brand, media, params } = ctx;
  const m = params.media ? media(params.media) : null;
  const inS = pop(frame, fps, c.i * 2, 11);
  const s = c.s * (0.4 + 0.6 * inS);
  // never over the face: a card fades out as it swings across it (back cards behind a cutout are hidden by the head anyway)
  const onFace = c.z < 0 && ctx.hasCutout ? 0 : faceOverlap(ctx.focus, c.x - CW * s / 2, c.y - CH * s / 2, CW * s, CH * s);
  const o = Math.min(1, inS * 1.4) * exitFade(frame, frames) * (c.z < 0 ? 0.8 : 1) * dim * Math.max(0, 1 - onFace * 6);
  const hue = [brand.colors.accent, "#7C5CFF", "#22C3A6", "#FF6B4A"][c.i % 4];
  const cover = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div style={{ position: "absolute", left: c.x - CW / 2, top: c.y - CH / 2, width: CW, height: CH, opacity: o,
      transform: `perspective(1400px) rotateY(${-16 * Math.sin(c.a)}deg) scale(${s})`,
      filter: c.z < 0 ? `brightness(${0.72 + 0.28 * (c.z + 1)})` : undefined }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 26, border: "6px solid #fff", overflow: "hidden", boxSizing: "border-box",
        boxShadow: "0 20px 40px rgba(0,0,0,.35)", background: `linear-gradient(160deg, ${hue} 0%, #141414 115%)` }}>
        {m && m.kind === "image" ? <Img src={m.url} style={cover} /> : null}
        {m && m.kind === "video" ? <OffthreadVideo src={m.url} muted startFrom={c.i * 20} style={cover} /> : null}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: m ? 200 : "100%", display: "flex", alignItems: "flex-start",
          padding: "30px 26px 0", boxSizing: "border-box",
          background: m ? "linear-gradient(180deg, rgba(0,0,0,.8), rgba(0,0,0,0))" : "transparent" }}>
          <div>
            <div style={{ fontFamily: fontStack(brand.fonts.body), fontSize: 24, letterSpacing: 3, color: "rgba(255,255,255,.8)", marginBottom: 10 }}>
              {String(c.i + 1).padStart(2, "0")}
            </div>
            <div style={{ fontFamily: fontStack(brand.fonts.heading), fontSize: Math.min(54, 214 / Math.max(c.label.length * 0.6, 1)), lineHeight: 1, color: "#fff", whiteSpace: "nowrap",
              textTransform: "uppercase", textShadow: "0 3px 12px rgba(0,0,0,.3)" }}>{c.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Behind(ctx) {
  // Without a cutout the back cards are kept faint, and any that reach the face fade out (see Card).
  const dim = ctx.hasCutout ? 1 : 0.35;
  return (
    <div style={fill}>
      {cards(ctx).filter((c) => c.z < 0).sort((a, b) => a.z - b.z).map((c) => <Card key={c.i} c={c} ctx={ctx} dim={dim} />)}
    </div>
  );
}

export function Front(ctx) {
  return (
    <div style={fill}>
      {cards(ctx).filter((c) => c.z >= 0).sort((a, b) => a.z - b.z).map((c) => <Card key={c.i} c={c} ctx={ctx} dim={1} />)}
    </div>
  );
}
