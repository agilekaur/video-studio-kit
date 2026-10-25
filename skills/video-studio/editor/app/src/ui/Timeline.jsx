import React, { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG } from "../remotion/effects/index.js";
import { frameBus, FPS, fmt } from "./util.js";
import { useFrame } from "./hooks.js";
import { defaultsFor } from "./Inspector.jsx";

const TRACKS = [
  { key: "FX", label: "Effects", h: 24 },
  { key: "T1", label: "Text", h: 28 },
  { key: "V2", label: "B-roll", h: 34 },
  { key: "V1", label: "Main", h: 58 },
  { key: "A1", label: "Voice", h: 34 },
  { key: "A2", label: "Music", h: 28 },
  { key: "A3", label: "SFX", h: 24 },
];
const RULER = 20;
const GUTTER = 74;
const peakCache = {};

export function Timeline({ project, tl, sel, setSel, seek, actions, mutate }) {
  const scrollRef = useRef(null);
  const [pps, setPps] = useState(null); // pixels per second
  const [drag, setDrag] = useState(null);
  const total = tl.durationInFrames;
  const dur = total / FPS;

  // fit to width on first load and when the edit length changes a lot
  useEffect(() => {
    const w = scrollRef.current ? scrollRef.current.clientWidth - 20 : 800;
    if (!pps || pps * dur < w * 0.3) setPps(Math.max(8, Math.min(240, w / Math.max(dur, 1))));
  }, [dur]); // eslint-disable-line react-hooks/exhaustive-deps
  const P = pps || 40;
  const fx = (f) => (f / FPS) * P;
  const width = Math.max(fx(total) + 200, 400);

  // keep the playhead in view while playing
  useEffect(() => frameBus.sub((f) => {
    const el = scrollRef.current;
    if (!el) return;
    const x = fx(f);
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - 60);
  }), [P]); // eslint-disable-line react-hooks/exhaustive-deps

  const snapPoints = useMemo(() => {
    const pts = [0, total];
    tl.beats.forEach((b) => { if (b.frames) pts.push(b.from, b.from + b.frames); });
    (project.items || []).forEach((it) => pts.push(it.from, it.from + it.frames));
    return pts;
  }, [tl, project.items, total]);
  const snap = (f, skipId) => {
    const cands = [...snapPoints, frameBus.get()];
    let best = f, bd = 8 / P * FPS;
    for (const c of cands) { const d = Math.abs(c - f); if (d < bd) { bd = d; best = c; } }
    return Math.round(best);
  };

  const frameAt = (clientX) => {
    const el = scrollRef.current;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.round(((clientX - r.left + el.scrollLeft) / P) * FPS));
  };

  // ---------------------------------------------------------------- drag handling
  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const df = Math.round(((e.clientX - drag.x0) / P) * FPS);
      if (drag.kind === "scrub") { seek(frameAt(e.clientX)); return; }
      if (drag.kind === "item") {
        const it = drag.orig;
        let from = it.from, frames = it.frames;
        if (drag.mode === "move") from = snap(Math.max(0, it.from + df));
        if (drag.mode === "l") { from = snap(Math.min(it.from + it.frames - 6, Math.max(0, it.from + df))); frames = it.from + it.frames - from; }
        if (drag.mode === "r") frames = Math.max(6, snap(it.from + it.frames + df) - it.from);
        setDrag((d) => ({ ...d, from, frames, moved: d.moved || Math.abs(e.clientX - d.x0) > 3 }));
      }
      if (drag.kind === "edge") setDrag((d) => ({ ...d, df, moved: true }));
    };
    const up = (e) => {
      if (drag.kind === "item" && drag.moved) {
        const patch = { from: drag.from, frames: drag.frames };
        if (drag.mode === "l") patch.in = Math.max(0, (drag.orig.in || 0) + (drag.from - drag.orig.from) / FPS);
        actions.updateItem(drag.orig.id, patch);
      }
      if (drag.kind === "edge" && drag.df) rippleTrim(drag.beatId, drag.side, drag.df);
      setDrag(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [drag, P]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dragging a main-track beat edge cuts or restores words at that edge (ripple).
  const rippleTrim = (beatId, side, df) => {
    const bi = tl.beats.find((b) => b.id === beatId);
    const words = tl.words.filter((w) => w.beat === beatId);
    mutate((d) => {
      const b = d.beats.find((x) => x.id === beatId);
      const c = d.clips.find((x) => x.id === b.clip);
      const ws = c.words;
      const rate = (+b.speed || 1) * (+d.settings.tighten || 1);
      if (side === "l" && df > 0) words.forEach((w) => { if (w.from - bi.from < df) ws[w.i].cut = true; });
      if (side === "r" && df < 0) words.forEach((w) => { if (w.to > bi.from + bi.frames + df) ws[w.i].cut = true; });
      if (df < 0 && side === "l" || df > 0 && side === "r") {
        let budget = (Math.abs(df) / FPS) * rate;
        const order = [];
        for (let i = b.w0; i <= b.w1; i++) order.push(i);
        if (side === "l") {
          const first = order.findIndex((i) => !ws[i].cut);
          for (let k = (first < 0 ? order.length : first) - 1; k >= 0 && budget > 0; k--) { ws[order[k]].cut = false; budget -= ws[order[k]].e - ws[order[k]].s + 0.05; }
        } else {
          let last = -1;
          order.forEach((i, k) => { if (!ws[i].cut) last = k; });
          for (let k = last + 1; k < order.length && budget > 0; k++) { ws[order[k]].cut = false; budget -= ws[order[k]].e - ws[order[k]].s + 0.05; }
        }
      }
    });
  };

  // ---------------------------------------------------------------- drops (media bin, effect cards)
  const onDrop = (track) => (e) => {
    e.preventDefault();
    const f = snap(frameAt(e.clientX));
    const mediaId = e.dataTransfer.getData("vs/media");
    const effectId = e.dataTransfer.getData("vs/effect");
    const sfx = e.dataTransfer.getData("vs/sfx");
    if (effectId && (track === "FX" || track === "V1")) {
      const bi = tl.beats.find((b) => b.frames && b.from <= f && f < b.from + b.frames);
      if (bi) {
        const b = project.beats.find((x) => x.id === bi.id);
        actions.applyEffect(b.id, effectId, defaultsFor(effectId, project, b));
        setSel({ type: "beat", id: b.id });
      }
      return;
    }
    if (sfx) { actions.addItem({ track: "A3", from: f, frames: FPS, params: { sfx, db: 0 } }); return; }
    if (mediaId) {
      const m = project.media.find((x) => x.id === mediaId);
      if (!m) return;
      const t = m.kind === "audio" ? (track === "A3" ? "A3" : "A2") : "V2";
      const frames = m.kind === "image" ? 3 * FPS : Math.round(Math.min(m.duration || 4, t === "A2" ? Math.max(dur - f / FPS, 2) : 6) * FPS);
      actions.addItem({ track: t, media: m.id, from: f, frames, params: t === "V2" ? { layout: "full", anim: "pop" } : t === "A2" ? { db: -18, duck: true } : { db: -6 } });
    }
  };

  const items = project.items || [];
  const itemView = (it) => (drag && drag.kind === "item" && drag.orig.id === it.id ? { ...it, from: drag.from, frames: drag.frames } : it);

  return (
    <div className="timeline">
      <div className="tlbar">
        <span className="muted small">Timeline</span>
        <button className="btn ghost small" title="Add text at playhead (T)" onClick={() => actions.addItem({ track: "T1", from: frameBus.get(), frames: 2 * FPS, params: { kind: "keyword", text: "KEYWORD" } })}>+ Text</button>
        <button className="btn ghost small" title="Add a title" onClick={() => actions.addItem({ track: "T1", from: frameBus.get(), frames: 3 * FPS, params: { kind: "title", text: "Your title" } })}>+ Title</button>
        <button className="btn ghost small" title="Add a lower third" onClick={() => actions.addItem({ track: "T1", from: frameBus.get(), frames: 3 * FPS, params: { kind: "lower_third", text: "Name", sub: "Role" } })}>+ Lower third</button>
        <select className="sel small" value="" onChange={(e) => { if (e.target.value) actions.addItem({ track: "A3", from: frameBus.get(), frames: FPS, params: { sfx: e.target.value, db: 0 } }); }}>
          <option value="">+ Sound effect</option>
          {["whoosh", "pop", "thud", "shutter", "ding", "tick"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="muted small">S splits at the playhead · drag edges to trim · drop media or effects onto tracks</span>
        <div className="grow" />
        <span className="muted small">Zoom</span>
        <input type="range" min={6} max={300} value={P} onChange={(e) => setPps(+e.target.value)} style={{ width: 120 }} />
        <button className="btn ghost small" onClick={() => setPps(Math.max(8, (scrollRef.current.clientWidth - 20) / Math.max(dur, 1)))}>Fit</button>
      </div>
      <div className="tlgrid">
        <div className="gutter">
          <div style={{ height: RULER }} />
          {TRACKS.map((t) => <div key={t.key} className="glabel" style={{ height: t.h }}>{t.label}</div>)}
        </div>
        <div className="tlscroll" ref={scrollRef} onWheel={(e) => { if (e.metaKey || e.ctrlKey) { e.preventDefault(); setPps((p) => Math.max(6, Math.min(300, (p || 40) * (e.deltaY < 0 ? 1.15 : 0.87)))); } }}>
          <div className="tlinner" style={{ width }}>
            <div className="ruler" style={{ height: RULER }} onMouseDown={(e) => { seek(frameAt(e.clientX)); setDrag({ kind: "scrub", x0: e.clientX }); }}>
              <Ticks P={P} dur={dur} />
            </div>
            {TRACKS.map((t) => (
              <div key={t.key} className={"track t" + t.key} style={{ height: t.h }}
                onDragOver={(e) => e.preventDefault()} onDrop={onDrop(t.key)}
                onMouseDown={(e) => { if (e.target === e.currentTarget) { seek(frameAt(e.clientX)); setDrag({ kind: "scrub", x0: e.clientX }); } }}>
                {t.key === "FX" ? tl.beats.filter((b) => b.frames).map((bi) => {
                  const b = project.beats.find((x) => x.id === bi.id);
                  if (!b || b.effect === "none") return null;
                  const e = CATALOG[b.effect];
                  return (
                    <div key={bi.id} className={"blk fx" + (e && e.big ? " big" : "") + (sel.id === b.id ? " sel" : "")} style={{ left: fx(bi.from), width: Math.max(4, fx(bi.frames) - 2) }}
                      onMouseDown={(ev) => { ev.stopPropagation(); setSel({ type: "beat", id: b.id }); }} title={e ? e.name : b.effect}>
                      {e ? e.name : b.effect}
                    </div>
                  );
                }) : null}
                {t.key === "V1" ? tl.beats.filter((b) => b.frames).map((bi) => {
                  const b = project.beats.find((x) => x.id === bi.id);
                  const n = project.beats.indexOf(b) + 1;
                  const ghost = drag && drag.kind === "edge" && drag.beatId === bi.id;
                  return (
                    <div key={bi.id} className={"blk main" + (sel.id === b.id ? " sel" : "")} style={{ left: fx(bi.from), width: Math.max(4, fx(bi.frames) - 2) }}
                      onMouseDown={(ev) => { ev.stopPropagation(); setSel({ type: "beat", id: b.id }); seek(frameAt(ev.clientX)); }}>
                      <Filmstrip project={project} tl={tl} beatId={bi.id} P={P} h={t.h} x0={fx(bi.from)} />
                      <span className="blabel">#{n} {b.purpose}{(+b.speed || 1) !== 1 || b.ramp ? ` · ${b.ramp ? b.speed + "→" + b.ramp.to : b.speed}×` : ""}</span>
                      <i className="edge l" onMouseDown={(ev) => { ev.stopPropagation(); setDrag({ kind: "edge", side: "l", beatId: bi.id, x0: ev.clientX, df: 0 }); }} />
                      <i className="edge r" onMouseDown={(ev) => { ev.stopPropagation(); setDrag({ kind: "edge", side: "r", beatId: bi.id, x0: ev.clientX, df: 0 }); }} />
                      {ghost ? <div className="trimghost" style={drag.side === "l" ? { left: Math.min(0, fx(drag.df)), width: Math.abs(fx(drag.df)) } : { right: Math.min(0, -fx(drag.df)), width: Math.abs(fx(drag.df)) }} /> : null}
                    </div>
                  );
                }) : null}
                {t.key === "A1" ? <Waveform project={project} tl={tl} P={P} h={t.h} width={width} /> : null}
                {["T1", "V2", "A2", "A3"].includes(t.key) ? items.filter((it) => it.track === t.key).map((raw) => {
                  const it = itemView(raw);
                  const m = (project.media || []).find((x) => x.id === it.media);
                  const label = t.key === "T1" ? (it.params?.text || "Text") : it.params?.sfx || (m ? m.name : "missing media");
                  return (
                    <div key={it.id} className={"blk item i" + t.key + (sel.type === "item" && sel.id === it.id ? " sel" : "")} style={{ left: fx(it.from), width: Math.max(6, fx(it.frames) - 1) }}
                      onMouseDown={(ev) => { ev.stopPropagation(); setSel({ type: "item", id: it.id }); setDrag({ kind: "item", mode: "move", orig: raw, x0: ev.clientX, from: raw.from, frames: raw.frames }); }}>
                      <span className="blabel">{label}</span>
                      <i className="edge l" onMouseDown={(ev) => { ev.stopPropagation(); setSel({ type: "item", id: it.id }); setDrag({ kind: "item", mode: "l", orig: raw, x0: ev.clientX, from: raw.from, frames: raw.frames }); }} />
                      <i className="edge r" onMouseDown={(ev) => { ev.stopPropagation(); setSel({ type: "item", id: it.id }); setDrag({ kind: "item", mode: "r", orig: raw, x0: ev.clientX, from: raw.from, frames: raw.frames }); }} />
                    </div>
                  );
                }) : null}
              </div>
            ))}
            <Playhead P={P} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Ticks({ P, dur }) {
  const step = P > 120 ? 0.5 : P > 50 ? 1 : P > 20 ? 2 : P > 10 ? 5 : 10;
  const out = [];
  for (let t = 0; t <= dur + step; t += step) {
    out.push(<div key={t} className="tick" style={{ left: t * P }}>{Number.isInteger(t) ? fmt(t * FPS).replace(/\.0$/, "") : ""}</div>);
  }
  return out;
}

function Playhead({ P }) {
  const f = useFrame();
  return <div className="playhead" style={{ left: (f / FPS) * P }} />;
}

function Filmstrip({ project, tl, beatId, P, h, x0 }) {
  const segs = tl.segments.filter((s) => s.beat === beatId);
  const tw = (h * 90) / 160;
  const tiles = [];
  for (const seg of segs) {
    const clip = project.clips.find((c) => c.id === seg.clip);
    if (!clip) continue;
    const n = Math.max(1, Math.floor(clip.duration || 1));
    const sx = (seg.from / FPS) * P - x0;
    const sw = (seg.frames / FPS) * P;
    for (let x = 0; x < sw; x += tw) {
      const src = seg.kind === "freeze" ? seg.s : seg.s + (x / P) * seg.rate;
      const idx = Math.min(n - 1, Math.max(0, Math.floor(src)));
      tiles.push(
        <div key={seg.from + "-" + x} className="tile" style={{
          left: sx + x, width: Math.min(tw, sw - x), height: h,
          backgroundImage: `url(/api/projects/${project.id}/thumbs/${clip.id})`,
          backgroundSize: `${n * tw}px ${h}px`, backgroundPosition: `${-idx * tw}px 0`,
        }} />,
      );
      if (tiles.length > 400) break;
    }
  }
  return <div className="filmstrip">{tiles}</div>;
}

function Waveform({ project, tl, P, h, width }) {
  const ref = useRef(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    project.clips.forEach((c) => {
      if (!c.proxy || peakCache[project.id + c.id]) return;
      peakCache[project.id + c.id] = "loading";
      fetch(`/api/projects/${project.id}/peaks/clip/${c.id}`).then((r) => r.json()).then((d) => { peakCache[project.id + c.id] = d; setTick((x) => x + 1); })
        .catch(() => { delete peakCache[project.id + c.id]; });
    });
  }, [project.clips, project.id]);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const w = Math.min(Math.ceil(width), 32000);
    cv.width = w;
    cv.height = h;
    const g = cv.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(120,200,255,.75)";
    for (const seg of tl.segments) {
      const pk = peakCache[project.id + seg.clip];
      if (!pk || pk === "loading" || seg.kind === "freeze") continue;
      const x0 = (seg.from / FPS) * P, x1 = ((seg.from + seg.frames) / FPS) * P;
      const beat = project.beats.find((b) => b.id === seg.beat);
      const vol = beat ? beat.volume ?? 1 : 1;
      for (let x = Math.floor(x0); x < x1 && x < w; x++) {
        const src = seg.s + ((x - x0) / P) * seg.rate;
        const a = Math.floor(src * pk.rate), b = Math.max(a + 1, Math.floor((seg.s + ((x + 1 - x0) / P) * seg.rate) * pk.rate));
        let m = 0;
        for (let i = a; i < b && i < pk.peaks.length; i++) m = Math.max(m, pk.peaks[i]);
        const bh = Math.max(1, Math.min(1, m * vol * 1.6) * (h - 4));
        g.fillRect(x, (h - bh) / 2, 1, bh);
      }
    }
  }, [tl, P, h, width, tick, project.id, project.beats]);
  return <canvas ref={ref} className="wave" style={{ width: Math.min(Math.ceil(width), 32000), height: h }} />;
}
