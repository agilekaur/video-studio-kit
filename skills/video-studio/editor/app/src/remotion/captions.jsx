import React from "react";
import { useCurrentFrame, spring } from "remotion";
import { fontStack, clearOfFace } from "./kit.jsx";
import { EFFECTS } from "./effects/index.js";
import { beatAtFrame } from "./timeline.js";

const BIG_WORD_EFFECTS = new Set(["cover-story", "glass-type", "text-explosion", "vertigo", "headline-wall"]);

export const CAPTION_STYLES = {
  bold: "Bold Centre",
  brand: "Word box (brand)",
  boxed: "Boxed highlight",
  clean: "Lowercase keyword",
  outline: "Outline pop",
  karaoke: "Karaoke line",
  stacked: "One big word",
  glass: "Soft glass pill",
  fitted: "Fitted (one hero word)",
  off: "No captions",
};

export function Captions({ tl, project, brand }) {
  const frame = useCurrentFrame();
  const st = project.settings || {};
  const style = st.caption_style || brand.caption_style || "bold";
  const n = tl.chunks.findIndex((c) => c.from <= frame && frame < c.to);
  if (n < 0) return null;
  const chunk = tl.chunks[n];
  const words = chunk.words.map((i) => tl.words[i]);
  let active = -1;
  words.forEach((w, k) => { if (w.from <= frame) active = k; });

  const C = brand.colors;
  const accent = st.accent || C.caption_active || C.accent;
  const font = fontStack(brand.fonts.caption || brand.fonts.heading);
  // effects that own the lower third (cards, comment UI) lift the captions via meta.captionY
  const bi = beatAtFrame(tl, frame);
  const bb = bi && project.beats.find((x) => x.id === bi.id);
  const fxm = bb && EFFECTS[bb.effect] && EFFECTS[bb.effect].meta;
  // never over the face: a caption band (about 250px tall) that would touch it moves above or below it
  if (fxm && fxm.captions === false) return null;   // the effect is the text (checklist)
  // a big-word effect (Cover Story and friends) already shows its word: skip the caption that repeats it
  const big = bb && BIG_WORD_EFFECTS.has(bb.effect) && bb.params && bb.params.word;
  if (big) {
    const k = String(big).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (k && words.some((w) => w.text.toLowerCase().replace(/[^a-z0-9]/g, "") === k)) return null;
  }
  const y = clearOfFace(st.focus, ((fxm && fxm.captionY) || +st.caption_y || 1100) - 125, 250) + 125;
  const upper = !["clean", "karaoke"].includes(style);
  const base = { bold: 104, brand: 96, boxed: 96, clean: 82, outline: 100, karaoke: 60, stacked: 190, glass: 74 }[style] || 100;
  const popFor = (k) => {
    if (k !== active) return 1;
    const s = spring({ frame: frame - words[k].from, fps: 30, config: { damping: 11, stiffness: 220 } });
    return 1 + (style === "bold" || style === "outline" ? 0.15 : 0.06) * s;
  };
  const txt = (w) => {
    let t = w.text.trim();
    if (style === "clean") t = t.replace(/[.,!?;:]+$/, "");
    return upper ? t.toUpperCase() : t.toLowerCase();
  };

  if (style === "stacked") {
    const w = words[Math.max(active, 0)];
    const k = Math.max(active, 0);
    const s = spring({ frame: frame - w.from, fps: 30, config: { damping: 12 } });
    return (
      <div style={{ position: "absolute", left: 40, right: 180, top: y - 120, textAlign: "center", fontFamily: font, fontSize: base,
        color: k % 2 ? accent : C.caption_text, transform: `scale(${0.7 + 0.3 * s})`, WebkitTextStroke: `10px ${C.caption_outline}`, paintOrder: "stroke fill", lineHeight: 1 }}>
        {txt(w)}
      </div>
    );
  }

  if (style === "fitted") {
    // One hero word huge in the accent, the rest of the chunk fitted above and below it to the same width.
    const STOPW = /^(the|a|an|and|or|but|so|to|of|in|on|for|with|is|are|was|it|this|that|i|you|we|my|your|our|just|be|at|by|as)$/i;
    const clean = (w) => w.text.trim().replace(/[.,!?;:"]+$/g, "");
    let h = 0;
    words.forEach((w, k) => { const c = clean(w); if (!STOPW.test(c) && c.length > clean(words[h]).length) h = k; });
    const glyph = (s) => Math.max(1, s.length) * 0.6;
    const heroTxt = clean(words[h]).toUpperCase();
    const heroSize = Math.min(230, 860 / glyph(heroTxt));
    const heroW = glyph(heroTxt) * heroSize;
    const line = (ws) => ws.map(clean).join(" ").toUpperCase();
    const before = line(words.slice(0, h)), after = line(words.slice(h + 1));
    const fit = (s) => Math.min(heroSize * 0.42, Math.max(34, heroW / glyph(s)));
    const seen = (k) => (k <= active ? 1 : 0.35);
    const hs = spring({ frame: frame - words[h].from, fps: 30, config: { damping: 12, stiffness: 200 } });
    const small = (s, k0, k1) => s ? (
      <div style={{ fontSize: fit(s), lineHeight: 1, color: C.caption_text, letterSpacing: "0.02em", whiteSpace: "nowrap",
        opacity: Math.max(...words.slice(k0, k1).map((_, i) => seen(k0 + i))) }}>{s}</div>
    ) : null;
    const top = clearOfFace(st.focus, y - 170, 340);
    return (
      <div style={{ position: "absolute", left: 40, width: 900, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        fontFamily: font, WebkitTextStroke: `6px ${C.caption_outline}`, paintOrder: "stroke fill", textShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
        {small(before, 0, h)}
        <div style={{ fontSize: heroSize, lineHeight: 0.92, color: accent, whiteSpace: "nowrap", opacity: seen(h) > 0.5 ? 1 : 0.4,
          transform: `scale(${active >= h ? 0.9 + 0.1 * hs : 0.9})` }}>{heroTxt}</div>
        {small(after, h + 1, words.length)}
      </div>
    );
  }

  if (style === "karaoke") {
    return (
      <div style={{ position: "absolute", left: 60, right: 180, top: 1500, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 14px",
        fontFamily: fontStack(brand.fonts.body), fontSize: base, lineHeight: 1.2, background: "rgba(0,0,0,.45)", borderRadius: 18, padding: "14px 22px" }}>
        {words.map((w, k) => {
          const p = Math.max(0, Math.min(1, (frame - w.from) / Math.max(1, w.to - w.from)));
          return (
            <span key={k} style={{ backgroundImage: `linear-gradient(90deg, ${accent} ${p * 100}%, #fff ${p * 100}%)`, WebkitBackgroundClip: "text", color: "transparent" }}>{txt(w)}</span>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", left: 60, width: 880, top: y, transform: "translateY(-50%)", display: "flex", flexWrap: "wrap",
      justifyContent: "center", alignItems: "baseline", gap: `0 ${base * 0.26}px`, lineHeight: 1.08, fontFamily: font }}>
      {words.map((w, k) => {
        const on = k === active;
        const sz = base * popFor(k);
        if ((style === "brand" || style === "boxed") && on) {
          return (
            <span key={k} style={{ fontSize: sz, background: style === "brand" ? C.caption_box : accent, color: style === "brand" ? C.caption_text : "#111",
              borderRadius: base * 0.18, padding: `${base * 0.06}px ${base * 0.16}px`, lineHeight: 1.05 }}>{txt(w)}</span>
          );
        }
        if (style === "glass") {
          return (
            <span key={k} style={{ fontSize: sz, color: on ? accent : "#fff", background: "rgba(255,255,255,.16)", backdropFilter: "blur(14px)",
              borderRadius: 99, padding: `4px ${base * 0.3}px`, fontFamily: fontStack(brand.fonts.body) }}>{txt(w)}</span>
          );
        }
        const sw = style === "outline" ? 8 : style === "clean" ? 3 : 7;
        return (
          <span key={k} style={{
            fontSize: sz, color: on ? accent : style === "brand" ? C.caption_text : "rgba(255,255,255,.95)",
            WebkitTextStroke: `${sw}px ${style === "outline" ? "#000" : C.caption_outline}`, paintOrder: "stroke fill",
            textShadow: "0 6px 16px rgba(0,0,0,.35)", fontFamily: style === "clean" ? fontStack(brand.fonts.body) : font,
          }}>{txt(w)}</span>
        );
      })}
    </div>
  );
}
