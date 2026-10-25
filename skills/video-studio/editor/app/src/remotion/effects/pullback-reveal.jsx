import React from "react";
import { Img, OffthreadVideo, Loop, interpolate, Easing } from "remotion";
import { fill, ease, exitFade, fontStack, listParam } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "pullback-reveal",
  "name": "Pull back Reveal",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof",
    "tools"
  ],
  "sfx": "whoosh",
  "desc": "Starts tight on a UI card, pulls back to reveal floating cards with the speaker to one side.",
  "params": [
    {
      "key": "media",
      "label": "Card media (optional)",
      "type": "media",
      "default": ""
    },
    {
      "key": "labels",
      "label": "Card labels (one per line)",
      "type": "list",
      "default": []
    }
  ],
  "status": "ready"
};

export function styles() {
  return { hideBase: true };
}

// hero card (camera starts framed on it)
const HERO = { x: 60, y: 300, w: 560, h: 380, z: 0 };
// speaker card on the right, slightly in front
const SPK = { x: 560, y: 560, w: 440, h: 760, z: 60 };
// label cards: [x, y, z]
const SLOTS = [[70, 760, -120], [60, 1240, -240], [690, 230, -380], [520, 1400, -200]];
// skeleton-only background cards: [x, y, w, h, z]
const GHOSTS = [[-160, 120, 420, 260, -700], [720, -80, 380, 240, -800], [-120, 1420, 460, 300, -750], [700, 1460, 420, 280, -650], [420, 40, 260, 160, -900]];

const STOP = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very its it's".split(" "));
function keyWords(text, n) {
  const seen = new Set();
  return String(text || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9'%$]/g, "")).filter((w) => {
    const k = w.toLowerCase();
    if (!w || w.length < 4 || STOP.has(k) || seen.has(k)) return false;
    seen.add(k); return true;
  }).slice(0, n);
}

function MediaFill({ m }) {
  const st = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return m.kind === "video"
    ? <Loop durationInFrames={Math.max(30, Math.round((m.duration || 6) * 30))}><OffthreadVideo src={m.url} muted style={st} /></Loop>
    : <Img src={m.url} style={st} />;
}

const card = (x, y, w, h, z, extra) => ({
  position: "absolute", left: x, top: y, width: w, height: h, transform: `translateZ(${z}px)`, borderRadius: 28, overflow: "hidden",
  background: "rgba(28,28,32,.92)", boxShadow: "0 30px 70px rgba(0,0,0,.55), inset 0 0 0 2px rgba(255,255,255,.07)", ...extra,
});

function Skeleton({ C, rows = 3, accent = true }) {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.8 }} />)}
      </div>
      {Array.from({ length: rows }).map((_, k) => (
        <div key={k} style={{ height: 14, borderRadius: 7, marginBottom: 16, width: `${[78, 54, 66, 40][k % 4]}%`,
          background: accent && k === 0 ? C.accent : "rgba(255,255,255,.18)" }} />
      ))}
    </div>
  );
}

export function Front({ params, frame, frames, brand, media, text }) {
  const C = brand.colors;
  const m = params.media ? media(params.media) : null;
  const given = listParam(params.labels).slice(0, 4);
  const labels = given.length ? given : keyWords(text, 4).map((w) => w.toUpperCase());
  const cam = interpolate(frame, [0, 20], [1100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const settle = ease(frame, 16, 20);
  const drift = 3 * Math.sin(frame / 40) * settle;
  const o = exitFade(frame, frames);
  const font = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const ox = HERO.x + HERO.w / 2, oy = HERO.y + HERO.h / 2;
  // camera starts centred on the hero card, then drifts back to the resting layout
  const k = cam / 1100;
  const dx = (540 - ox) * k, dy = (960 - oy) * k;
  return (
    <div style={{ ...fill, background: "#0e0e10", opacity: o }}>
      <div style={{ ...fill, opacity: 0.35, backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1.4px, transparent 1.5px)", backgroundSize: "40px 40px" }} />
      <div style={{ ...fill, background: `radial-gradient(70% 45% at 30% 30%, ${C.accent}22, rgba(0,0,0,0) 70%)` }} />
      <div style={{ ...fill, perspective: 1400, perspectiveOrigin: "540px 960px" }}>
        <div style={{ ...fill, transformStyle: "preserve-3d", transformOrigin: `${ox}px ${oy}px`,
          transform: `translate3d(${dx}px, ${dy}px, ${cam}px) rotateY(${drift}deg) rotateX(${drift * 0.4}deg)` }}>
          {GHOSTS.map(([x, y, w, h, z], k) => (
            <div key={"g" + k} style={card(x, y, w, h, z, { opacity: 0.55 })}><Skeleton C={C} rows={3} accent={false} /></div>
          ))}
          {labels.map((lab, k) => {
            const [x, y, z] = SLOTS[k];
            return (
              <div key={"l" + k} style={card(x, y, 420, 150, z, { display: "flex", alignItems: "center", gap: 22, padding: "0 28px", boxSizing: "border-box" })}>
                <div style={{ width: 70, height: 70, borderRadius: 20, flex: "none", background: k === 0 ? C.accent : "rgba(255,255,255,.12)",
                  color: k === 0 ? "#111" : "#fff", display: "grid", placeItems: "center", fontFamily: font, fontSize: 34 }}>{k + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: font, fontSize: 40, color: "#fff", lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lab}</div>
                  <div style={{ height: 10, width: 140, borderRadius: 5, marginTop: 12, background: "rgba(255,255,255,.2)" }} />
                </div>
              </div>
            );
          })}
          <div style={card(HERO.x, HERO.y, HERO.w, HERO.h, HERO.z, { background: m ? "#000" : `linear-gradient(160deg, #26262b, #151518)` })}>
            {m ? <MediaFill m={m} /> : (
              <>
                <Skeleton C={C} rows={2} />
                <div style={{ position: "absolute", left: 26, right: 26, bottom: 26, height: 170, display: "flex", alignItems: "flex-end", gap: 14 }}>
                  {[0.45, 0.62, 0.5, 0.78, 0.7, 0.95].map((h, k) => (
                    <div key={k} style={{ flex: 1, height: `${h * 100 * ease(frame, 18 + k * 2, 12)}%`, borderRadius: 8,
                      background: k === 5 ? C.accent : "rgba(255,255,255,.22)" }} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={card(SPK.x, SPK.y, SPK.w, SPK.h, SPK.z, { borderRadius: 34, boxShadow: `0 40px 90px rgba(0,0,0,.6), 0 0 0 4px ${C.accent}` })}>
            <Speaker zoom={1.25} style={{ width: SPK.w, height: SPK.h }} />
          </div>
        </div>
      </div>
    </div>
  );
}
