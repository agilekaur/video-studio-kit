// Shared helpers for effect components. Design space is 1080x1920 at 30 fps.
import React from "react";
import { interpolate, spring, Easing } from "remotion";

export const DEFAULT_BRAND = {
  id: "default",
  name: "Studio default",
  colors: {
    accent: "#FFD400",
    primary: "#FFD400",
    text: "#FFFFFF",
    outline: "#000000",
    surface: "#111111",
    surface_text: "#FFFFFF",
    caption_text: "#FFFFFF",
    caption_outline: "#000000",
    caption_active: "#FFD400",
    caption_box: "#FFD400",
    danger: "#E5322D",
  },
  fonts: {
    // Poppins (SIL Open Font License) so the default look can ship with the kit; brand kits bring their own fonts
    heading: { family: "VS Poppins", url: "/static/fonts/Poppins-ExtraBold.ttf", weight: 800 },
    body: { family: "VS Poppins Bold", url: "/static/fonts/Poppins-Bold.ttf", weight: 700 },
    caption: { family: "VS Poppins", url: "/static/fonts/Poppins-ExtraBold.ttf", weight: 800 },
  },
  caption_style: "bold",
  logo: null,
  logo_position: "none",
};

export function mergeBrand(b) {
  if (!b) return DEFAULT_BRAND;
  const own = b.colors || {};
  // A kit with its own accent never inherits the default yellow: highlight roles it leaves out follow its accent.
  const fromAccent = own.accent ? { primary: own.accent, caption_active: own.accent, caption_box: own.accent } : {};
  return {
    ...DEFAULT_BRAND,
    ...b,
    colors: { ...DEFAULT_BRAND.colors, ...fromAccent, ...own },
    fonts: { ...DEFAULT_BRAND.fonts, ...(b.fonts || {}) },
  };
}

// Media paths: project files come from the backend; blob:/data:/http(s): URLs (a visitor's own file in the
// browser preview) are used as they are.
const ABS = /^(blob:|data:|https?:)/;
export const mediaSrc = (base, project, file) => (ABS.test(file || "") ? file : `${base}/api/projects/${project.id}/media/${file}`);
export const assetSrc = (base, path) => (ABS.test(path || "") ? path : `${base}${path}`);

export const fontStack = (f) => `"${f.family}", "Arial Black", Arial, sans-serif`;

// 0..1 ease out over n frames starting at `start`
export const ease = (frame, start, n) =>
  interpolate(frame, [start, start + n], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

export const pop = (frame, fps, start = 0, damping = 12) =>
  spring({ frame: frame - start, fps, config: { damping, stiffness: 180, mass: 0.7 } });

// fade out over the last n frames of the beat
export const exitFade = (frame, frames, n = 5) =>
  interpolate(frame, [frames - n, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const fill = { position: "absolute", left: 0, top: 0, width: 1080, height: 1920 };

// ---- the face is off limits
// Hard rule: no text, card or graphic is ever drawn over the speaker's face. Sitting behind a cutout is
// fine (the head is in front); in front of the footage it must clear this box. Design space 1080x1920,
// focus = the face point (0..1). The box runs hairline to chin with margin.
export const DEFAULT_FOCUS = { x: 0.5, y: 0.32 };
export const SAFE_TOP = 200, SAFE_BOTTOM = 1500;   // inside the Reels UI safe zone
export function faceBox(focus) {
  const f = focus || DEFAULT_FOCUS;
  const fx = f.x * 1080, fy = f.y * 1920;
  return { left: fx - 260, right: fx + 260, top: fy - 300, bottom: fy + 270 };
}

// Top y for a full-width block of height h that wants to sit at `want` without touching the face:
// unchanged when already clear, otherwise the nearest spot above or below the face within [lo, hi].
export function clearOfFace(focus, want, h, lo = SAFE_TOP, hi = SAFE_BOTTOM, gap = 24) {
  const b = faceBox(focus);
  if (want + h <= b.top - gap || want >= b.bottom + gap) return want;
  const above = b.top - gap - h, below = b.bottom + gap;
  const okA = above >= lo, okB = below + h <= hi;
  if (okA && okB) return Math.abs(above - want) <= Math.abs(below - want) ? above : below;
  if (okA) return above;
  if (okB) return below;
  return b.top - lo >= hi - b.bottom ? Math.max(lo, above) : Math.min(hi - h, below);
}

// Share (0..1) of a rect's area that lies on the face box; use it to fade a moving element out before it crosses the face.
export function faceOverlap(focus, x, y, w, h) {
  const b = faceBox(focus);
  const ix = Math.max(0, Math.min(x + w, b.right) - Math.max(x, b.left));
  const iy = Math.max(0, Math.min(y + h, b.bottom) - Math.max(y, b.top));
  return w > 0 && h > 0 ? (ix * iy) / (w * h) : 0;
}

// The free bands above and below the face, [top, bottom] each, within [lo, hi].
export function faceBands(focus, lo = SAFE_TOP, hi = SAFE_BOTTOM, gap = 24) {
  const b = faceBox(focus);
  return { above: [lo, Math.max(lo, b.top - gap)], below: [Math.min(hi, b.bottom + gap), hi] };
}

export function Stroked({ children, size, color = "#fff", stroke = "#000", sw = 6, font, style }) {
  return (
    <span style={{
      fontFamily: font, fontSize: size, color, lineHeight: 1,
      WebkitTextStroke: `${sw}px ${stroke}`, paintOrder: "stroke fill",
      textShadow: `0 6px 18px rgba(0,0,0,.35)`, ...style,
    }}>{children}</span>
  );
}

export function Card({ x, y, w, h, r = 28, bg = "#fff", style, children }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: r, background: bg,
      boxShadow: "0 18px 50px rgba(0,0,0,.35)", overflow: "hidden", ...style }}>{children}</div>
  );
}

// Words of the beat whose text matches `needle` (first token), returns beat-local frame or fallback.
export function wordTime(words, needle, fallback) {
  const tok = String(needle || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).find((t) => t && !["the", "a", "an", "and", "to", "your"].includes(t));
  if (!tok) return fallback;
  const w = words.find((w) => w.text.toLowerCase().replace(/[^a-z0-9]/g, "") === tok);
  return w ? w.from : fallback;
}

export const listParam = (v) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((s) => s.trim()).filter(Boolean);
