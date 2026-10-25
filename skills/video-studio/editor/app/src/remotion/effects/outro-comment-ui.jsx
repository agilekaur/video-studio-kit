import React from "react";
import { spring } from "remotion";
import { ease, pop, exitFade, fontStack } from "../kit.jsx";

export const meta = {
  "captionY": 960,
  "id": "outro-comment-ui",
  "name": "Outro Comment UI",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "cta"
  ],
  "sfx": "pop",
  "desc": "Comment card springs up in the lower third and types your keyword, then a reply bubble with a link springs in.",
  "params": [
    {
      "key": "keyword",
      "label": "Keyword",
      "type": "text",
      "default": ""
    },
    {
      "key": "handle",
      "label": "Commenter",
      "type": "text",
      "default": "you"
    },
    {
      "key": "reply",
      "label": "Reply",
      "type": "text",
      "default": "Sent you the link"
    }
  ],
  "status": "ready"
};

const STOP = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very me him her them his their its it's isn't don't".split(" "));

// The CTA keyword: the word after "comment" if spoken, else the last strong word of the beat.
function keywordFrom(text) {
  const toks = String(text || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter(Boolean);
  const i = toks.findIndex((w) => /^comment(s)?$/i.test(w));
  if (i >= 0 && toks[i + 1]) return toks[i + 1].toUpperCase();
  const strong = toks.filter((w) => !STOP.has(w.toLowerCase()) && w.length > 2);
  return (strong[strong.length - 1] || "INFO").toUpperCase();
}

const LEFT = 70, W = 860, TOP = 1206;

export function Front({ params, frame, frames, fps, brand, text }) {
  const C = brand.colors;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const kw = String(params.keyword || "").trim() || keywordFrom(text);
  const handle = String(params.handle || "you").trim().replace(/^@/, "") || "you";
  const reply = String(params.reply || "").trim() || "Sent you the link";
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 160, mass: 0.8 } });
  const typeStart = 10;
  const chars = Math.max(0, Math.min(kw.length, Math.floor((frame - typeStart) / 2)));
  const typed = chars >= kw.length;
  const typedAt = typeStart + kw.length * 2;
  const cursorOn = !typed || Math.floor(frame / 8) % 2 === 0;
  const rStart = typedAt + 8;
  const r = frame >= rStart ? spring({ frame: frame - rStart, fps, config: { damping: 14, stiffness: 170, mass: 0.7 } }) : 0;
  const heart = frame >= rStart + 10 ? pop(frame, fps, rStart + 10, 8) : 0;
  const o = exitFade(frame, frames);
  const kwSize = kw.length > 14 ? 40 : 52;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o }}>
      <div style={{ position: "absolute", left: LEFT, top: TOP, width: W, height: 150, borderRadius: 28, background: "#FFFFFF",
        boxShadow: "0 24px 60px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.1)", transform: `translateY(${(1 - enter) * 400}px)`,
        opacity: Math.min(1, enter * 2), display: "flex", alignItems: "center", gap: 26, padding: "0 34px", boxSizing: "border-box" }}>
        <div style={{ width: 84, height: 84, borderRadius: 42, flex: "none", background: "linear-gradient(145deg,#D9D6CF,#A9A49A)",
          display: "grid", placeItems: "center", fontFamily: head, fontSize: 38, color: "#fff" }}>{handle[0].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: body, fontSize: 28, color: "#6B6B6B", whiteSpace: "nowrap" }}>
            <span style={{ color: "#111" }}>@{handle}</span>  · now
          </div>
          <div style={{ fontFamily: head, fontSize: kwSize, color: "#111", lineHeight: 1.1, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden" }}>
            {kw.slice(0, chars)}
            <span style={{ display: "inline-block", width: 5, height: kwSize * 0.9, background: C.accent === "#FFFFFF" ? "#111" : C.accent,
              marginLeft: 4, verticalAlign: "-4px", opacity: cursorOn ? 1 : 0 }} />
          </div>
        </div>
        <svg width="44" height="44" viewBox="0 0 24 24" style={{ flex: "none", transform: `scale(${1 + 0.25 * Math.sin(Math.min(1, heart) * Math.PI)})` }}>
          <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2 0 3.6 1.1 5.4 3 1.8-1.9 3.4-3 5.4-3C21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z"
            fill={heart > 0 ? C.danger : "none"} stroke={heart > 0 ? C.danger : "#9A9A9A"} strokeWidth="1.8" />
        </svg>
      </div>
      {frame >= rStart ? (
        <div style={{ position: "absolute", left: LEFT + 110, top: TOP + 168, width: W - 110, height: 110, borderRadius: 26,
          background: "#F1F0EC", boxShadow: "0 18px 44px rgba(0,0,0,.35)", transform: `translateY(${(1 - r) * 120}px) scale(${0.85 + 0.15 * r})`,
          transformOrigin: "left top", opacity: Math.min(1, r * 1.6), display: "flex", alignItems: "center", gap: 20, padding: "0 26px", boxSizing: "border-box" }}>
          <div style={{ width: 62, height: 62, borderRadius: 31, background: C.accent, flex: "none", display: "grid", placeItems: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
          </div>
          <div style={{ fontFamily: body, fontSize: 34, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{reply}</div>
          <div style={{ fontFamily: body, fontSize: 24, color: "#8A8A8A", flex: "none", opacity: ease(frame, rStart + 6, 6) }}>Sent ✓</div>
        </div>
      ) : null}
    </div>
  );
}
