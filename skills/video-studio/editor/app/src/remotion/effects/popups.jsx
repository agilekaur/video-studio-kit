import React from "react";
import { ease, pop, exitFade, fontStack, listParam } from "../kit.jsx";

export const meta = {
  "captionY": 960,
  "id": "popups",
  "name": "Pop up cards",
  "big": true,
  "needs": [],
  "prefers": [],
  "purposes": [
    "proof",
    "tools"
  ],
  "sfx": "pop",
  "desc": "Stacked receipt or invoice cards spring in under the speaker, rows stagger on, optional red total; or a plugin-style card with a generic icon and Install button.",
  "params": [
    {
      "key": "variant",
      "label": "Style",
      "type": "select",
      "options": [
        "invoice",
        "plugin"
      ],
      "default": "invoice"
    },
    {
      "key": "title",
      "label": "Title",
      "type": "text",
      "default": ""
    },
    {
      "key": "lines",
      "label": "Lines (one per line, 'Label  value' for a right column)",
      "type": "list",
      "default": []
    },
    {
      "key": "total",
      "label": "Total line (red)",
      "type": "text",
      "default": ""
    }
  ],
  "status": "ready"
};

const BOTTOM = 1494; // keep clear of the bottom 420px
const LEFT = 70, W = 860; // right edge 930, clear of the right 140px

const clauses = (text) => String(text || "").split(/[.,;!?]+/).map((s) => s.trim()).filter(Boolean);
const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// "Label  value" lines: split on a tab, " | ", " - " or two+ spaces so users can type "Tool  $49".
function splitLine(s) {
  const m = String(s).split(/\t| \| | - | {2,}/);
  return m.length > 1 ? [m[0].trim(), m.slice(1).join(" ").trim()] : [String(s).trim(), ""];
}

function Invoice({ params, frame, frames, fps, brand, text }) {
  const C = brand.colors;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const cl = clauses(text);
  const lines = listParam(params.lines).slice(0, 4);
  const rows = (lines.length ? lines : cl.slice(1, 4).map((s) => short(s, 34))).slice(0, 4);
  const shownRows = rows.length ? rows : ["Item 1", "Item 2", "Item 3"];
  const title = short(params.title || (cl[0] ? cl[0].split(/\s+/).slice(0, 5).join(" ") : "Invoice"), 34);
  const total = String(params.total || "").trim();
  const rowH = 46;
  const h = 26 + 40 + 12 + shownRows.length * rowH + (total ? 70 : 4) + 24;
  const top = BOTTOM - h;
  const o = exitFade(frame, frames);
  // the two back cards peek out above the front card
  const backs = [{ rot: 3, dx: 26, dy: -20, d: 0 }, { rot: -2, dx: -16, dy: -10, d: 3 }];
  const s0 = pop(frame, fps, 6, 13);
  const totalT = 8 + 5 * shownRows.length + 6;
  const tp = pop(frame, fps, totalT, 8);
  const tScale = 1 + 0.15 * Math.sin(Math.min(1, Math.max(0, frame - totalT) / 10) * Math.PI);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: o }}>
      {backs.map((b, k) => {
        const s = pop(frame, fps, b.d, 13);
        return (
          <div key={k} style={{ position: "absolute", left: LEFT + b.dx, top: top + b.dy, width: W, height: h, borderRadius: 26,
            background: k ? "#F4F2EE" : "#E6E2DA", boxShadow: "0 16px 40px rgba(0,0,0,.28)",
            transform: `translateY(${(1 - s) * 260}px) rotate(${b.rot * s}deg)`, opacity: Math.min(1, s * 1.5) }} />
        );
      })}
      <div style={{ position: "absolute", left: LEFT, top, width: W, height: h, borderRadius: 28, background: "#FFFFFF",
        boxShadow: "0 24px 60px rgba(0,0,0,.38), 0 2px 6px rgba(0,0,0,.12)", padding: "26px 40px 24px", boxSizing: "border-box",
        transform: `translateY(${(1 - s0) * 300}px) rotate(${3 * (1 - s0)}deg)`, opacity: Math.min(1, s0 * 1.5), overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40 }}>
          <span style={{ fontFamily: head, fontSize: 36, color: "#111", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 640 }}>{title}</span>
          <span style={{ width: 54, height: 12, borderRadius: 6, background: C.accent, flex: "none" }} />
        </div>
        <div style={{ height: 2, background: "repeating-linear-gradient(90deg,#D6D3CC 0 10px,transparent 10px 18px)", margin: "10px 0 0" }} />
        {shownRows.map((r, k) => {
          const st = 8 + 5 * k;
          const p = ease(frame, st, 8);
          const [lab, val] = splitLine(r);
          return (
            <div key={k} style={{ height: rowH, display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: k < shownRows.length - 1 ? "1px solid #EEECE7" : "none",
              opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: body, fontSize: 30, color: "#2A2A2A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: val ? 560 : 760 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: "#C9C5BD", flex: "none" }} />{lab}
              </span>
              {val ? <span style={{ fontFamily: body, fontSize: 31, color: "#111" }}>{val}</span> : null}
            </div>
          );
        })}
        {total ? (
          <div style={{ marginTop: 12, height: 58, borderRadius: 16, background: "rgba(229,50,45,.08)", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 22px", opacity: frame < totalT ? 0 : Math.min(1, tp * 1.4) }}>
            <span style={{ fontFamily: body, fontSize: 28, color: C.danger, letterSpacing: 2 }}>TOTAL</span>
            <span style={{ fontFamily: head, fontSize: 42, color: C.danger, transform: `scale(${tScale})`, transformOrigin: "right center", display: "inline-block" }}>{total}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Plugin({ params, frame, frames, fps, brand, text }) {
  const C = brand.colors;
  const head = fontStack(brand.fonts.heading), body = fontStack(brand.fonts.body);
  const cl = clauses(text);
  const lines = listParam(params.lines);
  const name = short(params.title || (cl[0] ? cl[0].split(/\s+/).slice(0, 3).join(" ") : "Plugin"), 24);
  const desc = short(lines[0] || cl[1] || cl[0] || "", 40);
  const h = 250, top = BOTTOM - h;
  const s = pop(frame, fps, 0, 12);
  const ic = pop(frame, fps, 6, 9);
  const btn = ease(frame, 14, 8);
  const press = frame >= 34 ? ease(frame, 34, 6) : 0;
  const installed = frame >= 40;
  const o = exitFade(frame, frames);
  const c2 = C.primary && C.primary.toLowerCase() !== String(C.accent).toLowerCase() ? C.primary : C.danger;
  return (
    <div style={{ position: "absolute", left: LEFT, top, width: W, height: h, borderRadius: 32, opacity: o * Math.min(1, s * 1.4),
      background: "linear-gradient(180deg,#1E1E22,#141416)", border: "1px solid rgba(255,255,255,.08)",
      boxShadow: "0 28px 70px rgba(0,0,0,.5)", transform: `translateY(${(1 - s) * 260}px) scale(${0.9 + 0.1 * s})`,
      padding: 36, boxSizing: "border-box", display: "flex", gap: 30, alignItems: "center" }}>
      <div style={{ width: 150, height: 150, borderRadius: 36, flex: "none", transform: `scale(${ic})`,
        background: `linear-gradient(145deg, ${C.accent} 30%, ${c2})`,
        boxShadow: "inset 0 2px 0 rgba(255,255,255,.35), 0 10px 26px rgba(0,0,0,.4)", display: "grid", placeItems: "center" }}>
        <svg width="78" height="78" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0V7zM12 16v5" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: head, fontSize: 46, color: "#fff", lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontFamily: body, fontSize: 28, color: "rgba(255,255,255,.6)", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
        <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 12, height: 58, padding: "0 30px", borderRadius: 29,
          background: installed ? "rgba(255,255,255,.12)" : C.accent, color: installed ? "#fff" : "#111", fontFamily: body, fontSize: 28,
          opacity: btn, transform: `scale(${1 - 0.08 * Math.sin(press * Math.PI)})` }}>
          {installed ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          ) : null}
          {installed ? "Installed" : "Install"}
        </div>
      </div>
    </div>
  );
}

export function Front(ctx) {
  return ctx.params.variant === "plugin" ? <Plugin {...ctx} /> : <Invoice {...ctx} />;
}
