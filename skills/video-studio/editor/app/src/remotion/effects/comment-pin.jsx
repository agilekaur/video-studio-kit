import React from "react";
import { interpolate, Easing } from "remotion";
import { fontStack, faceBox, faceBands, SAFE_TOP, SAFE_BOTTOM } from "../kit.jsx";

export const meta = {
  "id": "comment-pin",
  "name": "Comment Pin",
  "big": false,
  "needs": [],
  "prefers": [],
  "purposes": ["hook", "point"],
  "sfx": "pop",
  "captionY": 1370,
  "desc": "Reply-to-a-comment pin: a clean comment card (avatar, handle, comment, likes, Reply) pinned above or below the face. 'enter' springs it in and reveals the words; 'hold' keeps it static so it carries across beats.",
  "params": [
    { "key": "handle", "label": "Commenter handle", "type": "text", "default": "viewer" },
    { "key": "comment", "label": "Comment (blank = spoken text)", "type": "text", "default": "" },
    { "key": "likes", "label": "Like count", "type": "text", "default": "" },
    { "key": "mode", "label": "Mode", "type": "select", "options": ["enter", "hold"], "default": "enter" },
    { "key": "theme", "label": "Theme", "type": "select", "options": ["light", "dark"], "default": "light" }
  ],
  "status": "ready"
};

// ---- fixed geometry (identical on every beat, so pinned beats cut seamlessly)
const W = 820, LEFT = 60;            // right edge 880, clear of the right 140 px
const PAD_X = 36, PAD_Y = 30, AV = 76, AV_GAP = 22;
const TEXT_W = W - PAD_X * 2 - AV - AV_GAP;
const HEAD_H = 38, HEAD_GAP = 8, FOOT_GAP = 18, FOOT_H = 34, LH = 1.24;
const GAP = 28;                      // breathing room from the face box

const rgb = (h) => { const s = String(h || "#000").replace("#", ""); const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0"); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

// Greedy word wrap with an average glyph width; deterministic, no DOM measuring.
function wrapCount(words, size, width) {
  const cw = size * 0.5, sp = size * 0.28;
  let lines = 1, cur = 0;
  for (const w of words) {
    const ww = w.length * cw;
    if (cur === 0) cur = ww;
    else if (cur + sp + ww <= width) cur += sp + ww;
    else { lines += 1; cur = ww; }
  }
  return lines;
}
// Biggest size that wraps into 3 lines; past the smallest size, trim whole words and end on an ellipsis.
function fitText(all) {
  for (const s of [44, 41, 38, 35, 32]) {
    const n = wrapCount(all, s, TEXT_W);
    if (n <= 3) return { size: s, lines: n, words: all };
  }
  let words = all.slice();
  while (words.length > 1 && wrapCount([...words.slice(0, -1), words[words.length - 1] + "\u2026"], 32, TEXT_W) > 3) words.pop();
  words = [...words.slice(0, -1), words[words.length - 1].replace(/[,.;:!?-]+$/, "") + "\u2026"];
  return { size: 32, lines: 3, words };
}

const cardHeight = (size, lines) => PAD_Y * 2 + HEAD_H + HEAD_GAP + Math.ceil(lines * size * LH) + FOOT_GAP + FOOT_H;

// Placement from focus only: hug the face from above if the band above fits the tallest card,
// otherwise hang from just below the chin. The face-side edge is the anchor, so it never moves.
const MAX_H = cardHeight(44, 3);   // tallest card any comment can make
function anchor(focus) {
  const b = faceBox(focus);
  const bands = faceBands(focus, SAFE_TOP, SAFE_BOTTOM, GAP);
  if (bands.above[1] - bands.above[0] >= MAX_H) return { side: "above", edge: b.top - GAP };
  return { side: "below", edge: b.bottom + GAP };
}

function Heart({ filled, color, stroke, size = 30, scale = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none", transform: `scale(${scale})` }}>
      <path d="M12 20.5s-7.3-4.4-9.3-8.9C1.3 8.4 3.2 5 6.7 5c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.5 0 5.4 3.4 4 6.6-2 4.5-9.3 8.9-9.3 8.9z"
        fill={filled ? color : "none"} stroke={filled ? color : stroke} strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function Front({ params = {}, frame, frames, brand, text, focus }) {
  const C = brand.colors;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const handle = (String(params.handle || "").trim().replace(/^@/, "") || "viewer");
  const comment = (String(params.comment || "").trim() || String(text || "").trim() || "How did you do that?");
  const likes = String(params.likes || "").trim();
  const hold = params.mode === "hold";
  const dark = params.theme === "dark";

  const T = dark
    ? { bg: "#17171B", ink: "#F4F3F0", muted: "#9C9BA3" }
    : { bg: "#FFFFFF", ink: "#111111", muted: "#8A8986" };
  const avBg = C.accent || "#FFD400";
  const avInk = lum(avBg) > 0.55 ? "#111111" : "#FFFFFF";
  const heartRed = C.danger || "#E5322D";

  const { size, lines, words } = fitText(comment.split(/\s+/).filter(Boolean));
  const H = cardHeight(size, lines);
  const a = anchor(focus);
  const top = a.side === "above" ? a.edge - H : a.edge;

  // ---- motion (all of it settles to exactly the hold state well inside the beat)
  const f = hold ? 1e6 : frame;
  const p = interpolate(f, [0, 11], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.7)) });
  const scale = 0.84 + 0.16 * p;
  const rot = -4 * (1 - p);
  const lift = (a.side === "above" ? -1 : 1) * 40 * (1 - p);
  const alpha = interpolate(f, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const step = Math.max(1, Math.min(3, 22 / Math.max(1, words.length)));
  const wordIn = (i) => interpolate(f, [5 + i * step, 5 + i * step + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const doneAt = 5 + words.length * step + 3;
  const hp = interpolate(f, [doneAt, doneAt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const heartScale = 1 + 0.35 * Math.sin(hp * Math.PI);
  const filled = hp > 0.2;
  const exit = !hold && params.exit === "fade"
    ? interpolate(frame, [frames - 5, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, pointerEvents: "none", opacity: exit }}>
      <div style={{
        position: "absolute", left: LEFT, top, width: W, height: H, boxSizing: "border-box",
        padding: `${PAD_Y}px ${PAD_X}px`, borderRadius: 28, background: T.bg,
        boxShadow: dark
          ? "0 22px 56px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.06)"
          : "0 22px 56px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.10)",
        transform: `translateY(${lift}px) scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: a.side === "above" ? "50% 100%" : "50% 0%",
        opacity: alpha, display: "flex", gap: AV_GAP,
      }}>
        <div style={{ width: AV, height: AV, borderRadius: AV / 2, flex: "none", background: avBg,
          display: "grid", placeItems: "center", fontFamily: head, fontWeight: brand.fonts.heading.weight || 800,
          fontSize: 36, color: avInk, lineHeight: 1 }}>{handle[0].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ height: HEAD_H, display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{ fontFamily: head, fontWeight: brand.fonts.heading.weight || 800, fontSize: 32, color: T.ink, overflow: "hidden", textOverflow: "ellipsis" }}>{handle}</span>
            <span style={{ fontFamily: body, fontSize: 27, color: T.muted }}>· 2h</span>
          </div>
          <div style={{ marginTop: HEAD_GAP, fontFamily: body, fontWeight: brand.fonts.body.weight || 600, fontSize: size, lineHeight: LH,
            color: T.ink, letterSpacing: -0.2, height: Math.ceil(lines * size * LH), overflow: "hidden" }}>
            {words.map((w, i) => {
              const o = wordIn(i);
              return <span key={i} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 10}px)`, marginRight: "0.26em" }}>{w}</span>;
            })}
          </div>
          <div style={{ marginTop: FOOT_GAP, height: FOOT_H, display: "flex", alignItems: "center", gap: 26 }}>
            <span style={{ fontFamily: body, fontSize: 27, color: T.muted, letterSpacing: 0.2 }}>Reply</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Heart filled={filled} color={heartRed} stroke={T.muted} size={32} scale={heartScale} />
              {likes ? <span style={{ fontFamily: body, fontSize: 27, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{likes}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
