import React from "react";
import { fill, ease, pop, wordTime } from "../kit.jsx";
import { Speaker } from "../speaker.jsx";

export const meta = {
  "id": "phone-chat",
  "name": "Phone Chat",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "tools",
    "proof"
  ],
  "sfx": "pop",
  "captions": false,
  "desc": "Top half: a phone rises and a short chat plays out (typing dots, user message, two replies) ending on one accent button press; speaker below the seam with a small seam caption.",
  "params": [
    {
      "key": "agent",
      "label": "Chat name",
      "type": "text",
      "default": ""
    },
    {
      "key": "status",
      "label": "Status under the name",
      "type": "text",
      "default": "online"
    },
    {
      "key": "user",
      "label": "User message",
      "type": "text",
      "default": ""
    },
    {
      "key": "reply1",
      "label": "Reply 1",
      "type": "text",
      "default": ""
    },
    {
      "key": "reply2",
      "label": "Reply 2 (above the button)",
      "type": "text",
      "default": ""
    },
    {
      "key": "button",
      "label": "Button",
      "type": "text",
      "default": "Confirm"
    },
    {
      "key": "button_done",
      "label": "Button after press",
      "type": "text",
      "default": "Confirmed"
    }
  ],
  "status": "ready"
};

// ---------- split layout (panel on top, speaker below the seam) ----------
const SEAM = 960;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = (h) => { const s = String(h || "#000").replace("#", ""); const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0"); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
function palette(C) {
  const G = C.surface || "#111111", I = C.surface_text || "#ffffff";
  return { G, I, A: C.accent, onA: lum(C.accent) > 0.55 ? "#111111" : "#ffffff", body: lum(G) < 0.2 ? "#000000" : (C.outline || "#0f0d0c"),
    stone: mix(G, I, 0.07), pressed: mix(G, I, 0.14), rule: mix(G, I, 0.2), muted: mix(G, I, 0.5), deep: mix(C.accent, "#000000", 0.25) };
}
// 0..1: the split opens over 9 frames and closes back to the plain frame over the last 8
const splitP = (frame, frames) => ease(frame, 0, 9) * (1 - ease(frame, frames - 8, 7));
// footage shift that puts the face ~320 px under the seam
const shiftFor = (focus) => clamp(SEAM + 320 - focus.y * 1920, 0, SEAM);

export function styles() {
  return { hideBase: true };
}

export function Behind({ frame, frames, focus }) {
  const p = splitP(frame, frames);
  return (
    <div style={fill}>
      <Speaker style={{ left: 0, top: shiftFor(focus) * p, width: 1080, height: 1920 }} />
    </div>
  );
}

// small caption chunk on the seam (the global captions would land on the face in this layout)
function chunks(words) {
  const out = [];
  let cur = [];
  words.forEach((w) => {
    cur.push(w);
    if (cur.length >= 3 || /[.,!?;:]$/.test(w.text)) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
}
function SeamCaption({ words, frame, font, P, bottom }) {
  const cs = chunks(words);
  let c = null;
  cs.forEach((ch, k) => { if (frame >= ch[0].from - 2 && (k === cs.length - 1 || frame < cs[k + 1][0].from - 2)) c = ch; });
  if (!c || frame > c[c.length - 1].to + 20) return null;
  const txt = c.map((w) => w.text).join(" ");
  const size = Math.min(40, 860 / Math.max(1, txt.length * 0.62));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: bottom - 70, height: 70, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: P.I, color: P.G, fontFamily: font, fontSize: size, letterSpacing: 1.5, textTransform: "uppercase",
        padding: "12px 22px 10px", whiteSpace: "nowrap", lineHeight: 1 }}>
        {c.map((w, k) => <span key={k} style={{ opacity: frame >= w.from - 1 ? 1 : 0.4 }}>{(k ? " " : "") + w.text}</span>)}
      </div>
    </div>
  );
}

// ---------- phone chat ----------
const PX = 220, PY = 64, PW = 640, PH = 1060, BEZ = 16, RAD = 70;
const SX = PX + BEZ, SW = PW - 2 * BEZ;
const MX0 = SX + 26, MX1 = SX + SW - 26;
const MAXW = 480, PAD = 24, BTN = 84;
const LIMIT = 846;               // last bubble ends above the seam caption
const DEMO = 120;                // kit timeline is for a 4 s beat
const T = { user: 0.30, type1: 0.62, a1: 1.15, type2: 1.80, a2: 2.45, press: 3.20 };

const clauses = (text) => String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
const short = (s, n) => { const w = String(s).split(/\s+/); return w.length > n ? w.slice(0, n).join(" ") + "…" : s; };
const lines = (s, fs) => Math.max(1, Math.ceil((String(s).length * fs * 0.53) / MAXW));

function layout(texts, fs) {
  const lh = Math.round(fs * 1.33);
  const h = (s) => lines(s, fs) * lh + 2 * PAD - 8;
  const top = PY + 56 + 92 + 36;
  const hu = h(texts.user), h1 = h(texts.reply1), h2 = h(texts.reply2) + BTN + 22;
  const yu = top, y1 = yu + hu + 22, y2 = y1 + h1 + 22;
  return { yu, y1, y2, h2, lh };
}

// spring up 20 px with overshoot plus a quick fade
function spr(frame, t0) {
  const s = pop(frame, 30, t0, 9);
  return { dy: 20 * (1 - s), a: ease(frame, t0, 4) };
}

function Typing({ x, y, frame, t0, t1, P }) {
  if (frame < t0 || frame >= t1) return null;
  const r = spr(frame, t0);
  const a = r.a * (1 - ease(frame, t1 - 2, 2));
  return (
    <div style={{ position: "absolute", left: x, top: y + r.dy, width: 132, height: 68, background: P.stone, opacity: a }}>
      {[0, 1, 2].map((i) => {
        const s = 0.5 + 0.5 * Math.max(0, Math.sin(2 * Math.PI * ((frame - t0) / 30 * 2.4 - i * 0.17)));
        const rr = 7 + 3 * s;
        return <div key={i} style={{ position: "absolute", left: 36 + i * 30 - rr, top: 34 - 3 * s - rr, width: rr * 2, height: rr * 2, borderRadius: rr, background: mix(P.rule, P.muted, s) }} />;
      })}
    </div>
  );
}

export function Front({ params, frame, frames, brand, words, text }) {
  const C = brand.colors, P = palette(C);
  const body = `"${brand.fonts.body.family}", Arial, sans-serif`, head = `"${brand.fonts.heading.family}", "Arial Black", Arial, sans-serif`;
  const cl = clauses(text);
  const texts = {
    user: String(params.user || "").trim() || short(cl[0] || "Can you handle this?", 8),
    reply1: String(params.reply1 || "").trim() || short(cl[1] || "On it.", 12),
    reply2: String(params.reply2 || "").trim() || short(cl[2] || cl[cl.length - 1] || "Ready when you are.", 10),
  };
  const agent = String(params.agent || "").trim() || "Assistant";
  const status = String(params.status ?? "online").trim();
  const btn = String(params.button || "").trim() || "Confirm";
  const btnDone = String(params.button_done || "").trim() || "Confirmed";

  // font size that keeps the last bubble above the seam caption
  let fs = 24;
  for (const f of [39, 36, 33, 30, 27, 24]) { const L0 = layout(texts, f); if (L0.y2 + L0.h2 <= LIMIT) { fs = f; break; } }
  const L = layout(texts, fs);

  // timeline: the kit's 4 s demo spread over the beat; spoken words pull the user bubble and the press
  const sc = Math.max(0.3, frames / DEMO);
  const tt = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, Math.round(v * 30 * sc)]));
  const wu = String(params.user || "").trim() ? wordTime(words, params.user, -1) : -1;
  if (wu > 4 && wu < tt.type1) tt.user = wu;
  const wb = wordTime(words, btn, -1);
  if (wb > tt.a2 + 8 && wb < frames - 10) tt.press = wb;
  const pressed = frame >= tt.press + 3;

  const p = splitP(frame, frames);
  const rise = 420 * (1 - ease(frame, 0, 18));
  const R = (t0) => (frame >= t0 ? spr(frame, t0) : null);
  const ru = R(tt.user), r1 = R(tt.a1), r2 = R(tt.a2);
  const pp = frame >= tt.press ? Math.min(1, (frame - tt.press) / 7) : 0;
  const bsc = pp > 0 && pp < 1 ? 1 - 0.04 * Math.sin(Math.PI * pp) : 1;
  const ring = frame >= tt.press ? Math.min(1, (frame - tt.press) / 12) : 0;
  const ringR = 26 + 70 * (1 - Math.pow(1 - ring, 3));
  const bubble = (dark) => ({ fontFamily: body, fontSize: fs, lineHeight: `${L.lh}px`, letterSpacing: -0.2, padding: `${PAD - 4}px ${PAD}px`,
    background: dark ? P.I : P.stone, color: dark ? P.G : P.I, boxSizing: "border-box", maxWidth: MAXW + 2 * PAD, overflowWrap: "anywhere" });

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SEAM, overflow: "hidden", transform: `translateY(${-(1 - p) * SEAM}px)`, background: P.stone }}>
      <div style={{ position: "absolute", left: 0, top: rise, width: 1080, height: SEAM + 200 }}>
        {/* device */}
        <div style={{ position: "absolute", left: PX, top: PY, width: PW, height: PH, borderRadius: RAD, background: P.body }}>
          <div style={{ position: "absolute", left: BEZ, top: BEZ, right: BEZ, bottom: 0, background: P.G }} />
          <div style={{ position: "absolute", left: PW / 2 - 60, top: BEZ, width: 120, height: 26, background: P.body }} />
          <div style={{ position: "absolute", left: BEZ + 28, top: 56, width: 66, height: 66, background: P.I, color: P.G, fontFamily: head, fontSize: 44,
            display: "grid", placeItems: "center", lineHeight: 1 }}>{agent.slice(0, 1).toUpperCase()}</div>
          <div style={{ position: "absolute", left: BEZ + 114, top: 56, right: BEZ + 28 }}>
            <div style={{ fontFamily: body, fontSize: 37, color: P.I, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent}</div>
            {status ? <div style={{ fontFamily: body, fontSize: 24, color: P.muted, marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: P.muted }} />{status}</div> : null}
          </div>
          <div style={{ position: "absolute", left: BEZ, right: BEZ, top: 56 + 92, height: 2, background: P.rule }} />
        </div>
        {/* user bubble, right aligned */}
        {ru ? <div style={{ position: "absolute", right: 1080 - MX1, top: L.yu + ru.dy, opacity: ru.a, ...bubble(true) }}>{texts.user}</div> : null}
        <Typing x={MX0} y={L.y1} frame={frame} t0={tt.type1} t1={tt.a1} P={P} />
        {r1 ? <div style={{ position: "absolute", left: MX0, top: L.y1 + r1.dy, opacity: r1.a, ...bubble(false) }}>{texts.reply1}</div> : null}
        <Typing x={MX0} y={L.y2} frame={frame} t0={tt.type2} t1={tt.a2} P={P} />
        {r2 ? (
          <div style={{ position: "absolute", left: MX0, top: L.y2 + r2.dy, opacity: r2.a, width: MAXW + 2 * PAD, ...bubble(false), paddingBottom: PAD }}>
            <div>{texts.reply2}</div>
            <div style={{ position: "relative", height: BTN, marginTop: 22 }}>
              <div style={{ position: "absolute", inset: 0, transform: `scale(${bsc})`, background: pressed ? P.deep : P.A, color: pressed ? "#fff" : P.onA,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: body, fontSize: 36, lineHeight: 1, whiteSpace: "nowrap" }}>
                {pressed ? <svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" /></svg> : null}
                {pressed ? btnDone : btn}
              </div>
              {ring > 0 && ring < 1 ? (
                <div style={{ position: "absolute", left: "50%", top: "50%", width: 2 * ringR, height: 2 * ringR,
                  transform: "translate(-50%,-50%)", borderRadius: "50%", border: `3px solid ${P.I}`, opacity: 1 - ring, boxSizing: "border-box" }} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <SeamCaption words={words} frame={frame} font={body} P={P} bottom={SEAM - 22} />
      <div style={{ position: "absolute", left: 0, right: 0, top: SEAM - 2, height: 2, background: P.I }} />
    </div>
  );
}
