// T1 track: titles, lower thirds, keyword pops, all styled by the brand kit.
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fontStack, clearOfFace } from "./kit.jsx";

export const TEXT_KINDS = {
  title: "Title",
  lower_third: "Lower third",
  keyword: "Keyword pop",
  label: "Small label",
};

// Rough block heights per kind, used to keep every text item off the speaker's face.
const KIND_H = { title: 150, lower_third: 150, keyword: 170, label: 70 };

export function TextItem({ item, brand, focus }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = item.params || {};
  const C = brand.colors;
  const inS = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
  const out = interpolate(frame, [item.frames - 6, item.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const want = +p.y || { title: 360, lower_third: 1380, keyword: 760, label: 260 }[p.kind || "title"];
  const h = p.kind === "keyword" ? (+p.size || 120) * 1.35 : p.kind === "title" ? (+p.size || 110) * 1.3 : KIND_H[p.kind] || 150;
  const y = clearOfFace(focus, want, h);
  const color = p.color || C.text;
  const accent = p.accent || C.accent;

  if (p.kind === "lower_third") {
    return (
      <div style={{ position: "absolute", left: 60, top: y, transform: `translateX(${(1 - inS) * -700}px)`, opacity: out }}>
        <div style={{ background: C.surface, color: C.surface_text, fontFamily: fontStack(brand.fonts.heading), fontSize: 54, padding: "16px 26px", borderRadius: 14, borderLeft: `10px solid ${accent}` }}>{p.text || "Name"}</div>
        {p.sub ? <div style={{ marginTop: 8, display: "inline-block", background: accent, color: "#111", fontFamily: fontStack(brand.fonts.body), fontSize: 36, padding: "8px 18px", borderRadius: 10 }}>{p.sub}</div> : null}
      </div>
    );
  }
  if (p.kind === "keyword") {
    const s = 0.4 + 0.6 * inS;
    return (
      <div style={{ position: "absolute", left: 40, right: 180, top: y, textAlign: "center", transform: `scale(${s}) rotate(${(p.tilt ?? -4)}deg)`, opacity: out }}>
        <span style={{ display: "inline-block", background: accent, color: "#111", fontFamily: fontStack(brand.fonts.heading), fontSize: +p.size || 120, padding: "6px 30px", borderRadius: 18, lineHeight: 1.1 }}>{p.text || "KEYWORD"}</span>
      </div>
    );
  }
  if (p.kind === "label") {
    return (
      <div style={{ position: "absolute", left: 60, top: y, opacity: inS * out, fontFamily: fontStack(brand.fonts.body), fontSize: +p.size || 40, color, background: "rgba(0,0,0,.5)", padding: "8px 18px", borderRadius: 10 }}>{p.text || "Label"}</div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 50, right: 170, top: y, textAlign: p.align || "center", opacity: out, transform: `translateY(${(1 - inS) * 60}px)` }}>
      <span style={{ fontFamily: fontStack(brand.fonts.heading), fontSize: +p.size || 110, color, lineHeight: 1.02, WebkitTextStroke: p.stroke === false ? 0 : `6px ${C.outline}`, paintOrder: "stroke fill", textShadow: "0 8px 22px rgba(0,0,0,.35)" }}>
        {p.text || "Title"}
      </span>
    </div>
  );
}
