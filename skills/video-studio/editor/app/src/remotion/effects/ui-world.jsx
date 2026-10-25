import React from "react";
import { spring } from "remotion";
import { fill, exitFade, fontStack, listParam, wordTime } from "../kit.jsx";

export const meta = {
  "id": "ui-world",
  "name": "UI World",
  "big": true,
  "needs": [
    "cutout"
  ],
  "prefers": [],
  "purposes": [
    "tools",
    "point"
  ],
  "sfx": "pop",
  "desc": "Message bubbles and cards pop around the speaker, some behind a shoulder.",
  "params": [
    {
      "key": "lines",
      "label": "Bubble text (one per line)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

export function styles({ frame, frames }) {
  return { zoom: 1 + 0.05 * Math.min(frame / Math.max(frames, 1), 1) };
}

// Slots around the speaker. behind: tucked under the cutout (beside the head / shoulder); front: over the torso.
// All clear of the right 140 px, the bottom 420 px and the caption band (1040 to 1160).
const SLOTS = [
  { kind: "bubble", behind: true, x: 30, y: 110, w: 420, side: "left" },
  { kind: "bubble", behind: false, x: 500, y: 850, w: 420, side: "right", tint: "accent" },
  { kind: "dark", behind: true, x: 580, y: 300, w: 360 },
  { kind: "grey", behind: false, x: 60, y: 1190, w: 470 },
  { kind: "dark", behind: false, x: 380, y: 1340, w: 540 },
];

function chunks(text, n) {
  const w = String(text || "").split(/\s+/).filter(Boolean);
  if (!w.length) return [];
  const size = Math.max(3, Math.ceil(w.length / n));
  const out = [];
  for (let i = 0; i < w.length && out.length < n; i += size) out.push(w.slice(i, i + size).join(" ").replace(/[,.]$/, ""));
  return out;
}

function items(ctx) {
  const { params, text, words, frames } = ctx;
  let lines = listParam(params.lines).slice(0, 5);
  if (!lines.length) lines = chunks(text, 4);
  if (!lines.length) lines = ["New message", "Can we talk?", "Booked!", "3 new replies"];
  const span = Math.max(frames - 30, 20);
  return lines.map((line, i) => {
    const fallback = 4 + Math.round((i * span) / Math.max(lines.length, 1));
    let t = params.lines && listParam(params.lines).length ? wordTime(words, line, fallback) : fallback;
    t = Math.max(t, 4 + i * 5); // keep the 5 frame stagger
    return { i, line, t, slot: SLOTS[i % SLOTS.length] };
  });
}

function El({ it, ctx }) {
  const { frame, frames, fps, brand } = ctx;
  const { slot, line, i, t } = it;
  if (frame < t) return null;
  const s = spring({ frame: frame - t, fps, config: { damping: 12, stiffness: 140 } });
  const float = 6 * Math.sin((frame + i * 17) / 20);
  const body = fontStack(brand.fonts.body);
  const accent = slot.tint === "accent";
  const base = { position: "absolute", left: slot.x, top: slot.y + float, width: slot.w, opacity: exitFade(frame, frames) * Math.min(1, s * 1.5),
    transform: `scale(${s})`, transformOrigin: slot.side === "right" ? "90% 100%" : "10% 100%", boxShadow: "0 12px 30px rgba(0,0,0,.3)",
    boxSizing: "border-box" };
  if (slot.kind === "bubble") {
    const bg = accent ? brand.colors.accent : "#fff";
    return (
      <div style={{ ...base, background: bg, borderRadius: 28, padding: "26px 32px", color: "#111", fontFamily: body, fontSize: 40, lineHeight: 1.18 }}>
        {line}
        <div style={{ position: "absolute", bottom: -12, [slot.side === "right" ? "right" : "left"]: 26, width: 34, height: 34, background: bg,
          transform: "rotate(45deg)", borderRadius: 6 }} />
      </div>
    );
  }
  const dark = slot.kind === "dark";
  return (
    <div style={{ ...base, background: dark ? "#1C1C1E" : "#E9E9EC", color: dark ? "#fff" : "#111", borderRadius: 30, padding: "24px 28px",
      display: "flex", gap: 22, alignItems: "center" }}>
      <div style={{ flex: "none", width: 64, height: 64, borderRadius: dark ? 18 : 32, background: dark ? brand.colors.accent : "#c9c9cf",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontStack(brand.fonts.heading), fontSize: 34, color: "#111" }}>
        {line.trim().charAt(0).toUpperCase()}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: body, fontSize: 24, opacity: 0.55, letterSpacing: 1, marginBottom: 6 }}>{dark ? "NOW" : "1 new message"}</div>
        <div style={{ fontFamily: body, fontSize: 36, lineHeight: 1.15 }}>{line}</div>
      </div>
    </div>
  );
}

export function Behind(ctx) {
  // Without a cutout the "behind" bits still sit at the frame edges, clear of the face.
  const fx = ctx.focus.x * 1080, fy = ctx.focus.y * 1920;
  const clear = (sl) => ctx.hasCutout || !(Math.abs(sl.x + sl.w / 2 - fx) < 320 && Math.abs(sl.y + 60 - fy) < 360);
  return <div style={fill}>{items(ctx).filter((it) => it.slot.behind && clear(it.slot)).map((it) => <El key={it.i} it={it} ctx={ctx} />)}</div>;
}

export function Front(ctx) {
  return <div style={fill}>{items(ctx).filter((it) => !it.slot.behind).map((it) => <El key={it.i} it={it} ctx={ctx} />)}</div>;
}
