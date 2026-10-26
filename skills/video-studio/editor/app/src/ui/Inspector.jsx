import React from "react";
import { CATALOG } from "../remotion/effects/index.js";
import { CAPTION_STYLES } from "../remotion/captions.jsx";
import { TEXT_KINDS } from "../remotion/text.jsx";
import { MEDIA_LAYOUTS } from "../remotion/media.jsx";
import { GRADES } from "../remotion/Reel.jsx";
import { beatText, fmt, keyWord, FPS } from "./util.js";
import { api } from "./store.js";
import { toast } from "./Toast.jsx";

const PURPOSES = ["hook", "point", "list", "proof", "tools", "punch", "cta"];
const GRADE_NAMES = { none: "None", warm: "Bright warm", moody: "Moody teal and orange", mono: "Black and white", punchy: "Punchy", soft: "Soft" };

export function Inspector(ctx) {
  const { sel, setSel, project, warnings } = ctx;
  return (
    <div className="inspector">
      <div className="seg tabs2">
        <button className={sel.type !== "project" ? "on" : ""} onClick={() => sel.type === "project" && project.beats[0] && setSel({ type: "beat", id: project.beats[0].id })}>Selection</button>
        <button className={sel.type === "project" ? "on" : ""} onClick={() => setSel({ type: "project" })}>Project</button>
      </div>
      <div className="ibody">
        {sel.type === "beat" ? <BeatInspector {...ctx} /> : sel.type === "item" ? <ItemInspector {...ctx} /> : <ProjectInspector {...ctx} />}
      </div>
      <Checks warnings={warnings} project={project} setSel={setSel} seek={ctx.seek} tl={ctx.tl} />
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div className="field">
      <div className="lbl">{label}</div>
      {children}
      {hint ? <p className="hintline">{hint}</p> : null}
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <button key={String(v)} className={String(value) === String(v) ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export function ParamField({ p, value, onChange, project }) {
  if (p.type === "list") {
    const v = Array.isArray(value) ? value.join("\n") : value || "";
    return <Field label={p.label}><textarea value={v} onChange={(e) => onChange(e.target.value.split("\n"))} rows={4} /></Field>;
  }
  if (p.type === "select") {
    return <Field label={p.label}><Seg value={value ?? p.default} options={p.options.map((o) => [o, o])} onChange={onChange} /></Field>;
  }
  if (p.type === "color") {
    return <Field label={p.label}><div className="row"><input type="color" value={value || "#FFD400"} onChange={(e) => onChange(e.target.value)} />
      {value ? <button className="btn ghost small" onClick={() => onChange("")}>Use brand</button> : <span className="muted small">brand accent</span>}</div></Field>;
  }
  if (p.type === "range" || p.type === "number") {
    const v = value ?? p.default;
    return <Field label={`${p.label}: ${v}`}><input type="range" min={p.min ?? 0} max={p.max ?? 100} step={p.step ?? 1} value={v} onChange={(e) => onChange(+e.target.value)} /></Field>;
  }
  if (p.type === "media") {
    const media = (project.media || []).filter((m) => m.kind !== "audio" && m.status === "ready");
    return (
      <Field label={p.label} hint={media.length ? null : "Add B-roll or images in the Media tab."}>
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">None</option>
          {media.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
    );
  }
  return <Field label={p.label}><input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} /></Field>;
}

function BeatInspector({ project, tl, sel, actions, seek, playerRef, setLeftTab, fromServer }) {
  const b = project.beats.find((x) => x.id === sel.id);
  if (!b) return <p className="muted pad">Select a beat in the transcript or timeline.</p>;
  const n = project.beats.indexOf(b) + 1;
  const bt = tl.beats.find((x) => x.id === b.id);
  const e = CATALOG[b.effect] || CATALOG.none;
  const set = (patch) => actions.updateBeat(b.id, patch);
  const setParam = (k, v) => actions.updateBeat(b.id, { params: { ...(b.params || {}), [k]: v } });
  const clip = project.clips.find((c) => c.id === b.clip);
  const needsCut = (e.needs || []).includes("cutout") || (e.prefers || []).includes("cutout");
  const speed = +b.speed || 1;

  const prepCutout = async () => {
    fromServer(await api("POST", `/api/projects/${project.id}/clips/${clip.id}/matte`));
    toast("Preparing the speaker cutout. About 2.5× the clip length on this Mac.");
  };

  return (
    <div>
      <div className="ihead">
        <h3>Beat {n}</h3>
        <span className="muted mono">{bt && bt.frames ? `${fmt(bt.from)}–${fmt(bt.from + bt.frames)} · ${(bt.frames / FPS).toFixed(1)}s` : "not in the cut"}</span>
      </div>
      <div className="quote">{beatText(project, b) || "(all words cut)"}</div>
      <div className="row gap">
        <button className="btn ghost small" onClick={() => { if (bt) { seek(bt.from); playerRef.current && playerRef.current.play(); } }}>▶ Play beat</button>
        <button className="btn ghost small" onClick={() => actions.mergeBeat(b.id)}>Merge next</button>
        <label className="chk danger"><input type="checkbox" checked={!!b.cut} onChange={(ev) => set({ cut: ev.target.checked })} /> Cut beat</label>
      </div>

      <Field label="Purpose"><select value={b.purpose} onChange={(ev) => set({ purpose: ev.target.value })}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select></Field>

      <Field label="Effect">
        <div className="row">
          <select value={b.effect} onChange={(ev) => actions.applyEffect(b.id, ev.target.value, defaultsFor(ev.target.value, project, b))} style={{ flex: 1 }}>
            {Object.values(CATALOG).map((x) => <option key={x.id} value={x.id}>{x.name}{x.needs && x.needs.includes("cutout") ? " (cutout)" : ""}</option>)}
          </select>
          <button className="btn ghost small" onClick={() => setLeftTab("studio")}>Browse</button>
        </div>
        <p className="hintline">{e.desc}</p>
      </Field>
      {needsCut && clip && clip.matte_status !== "ready" ? (
        <div className="callout">
          {clip.matte_status === "running" || clip.matte_status === "queued"
            ? `Preparing cutout… ${Math.round((clip.matte_progress || 0) * 100)}%`
            : <>This effect layers graphics behind the speaker. <button className="btn primary small" onClick={prepCutout}>Prepare cutout</button></>}
        </div>
      ) : null}
      {(e.params || []).map((p) => <ParamField key={p.key} p={p} value={(b.params || {})[p.key]} onChange={(v) => setParam(p.key, v)} project={project} />)}

      <div className="section">Time</div>
      <Field label={`Speed: ${speed.toFixed(2)}×`} hint="Voice pitch is preserved. Captions and effects follow the new timing.">
        <input type="range" min={0.25} max={4} step={0.05} value={speed} onChange={(ev) => set({ speed: +ev.target.value })} />
        <Seg value={speed} options={[[0.5, "0.5"], [0.75, "0.75"], [1, "1×"], [1.25, "1.25"], [1.5, "1.5"], [2, "2"]]} onChange={(v) => set({ speed: v })} />
      </Field>
      <Field label="Speed ramp">
        <div className="row">
          <label className="chk"><input type="checkbox" checked={!!b.ramp} onChange={(ev) => set({ ramp: ev.target.checked ? { to: speed >= 1.5 ? 1 : 2, ease: "smooth" } : null })} /> Ramp to</label>
          {b.ramp ? <>
            <input type="number" className="num" min={0.25} max={4} step={0.25} value={b.ramp.to} onChange={(ev) => set({ ramp: { ...b.ramp, to: +ev.target.value } })} />×
            <select value={b.ramp.ease || "smooth"} onChange={(ev) => set({ ramp: { ...b.ramp, ease: ev.target.value } })}><option value="smooth">smooth</option><option value="linear">linear</option></select>
          </> : null}
        </div>
      </Field>
      <Field label={`Hold last frame: ${(+b.freeze || 0).toFixed(1)}s`}>
        <input type="range" min={0} max={3} step={0.1} value={+b.freeze || 0} onChange={(ev) => set({ freeze: +ev.target.value })} />
      </Field>
      <Field label="Punch in"><Seg value={+b.zoom || 1} options={[[1, "None"], [1.1, "1.1×"], [1.25, "1.25×"], [1.4, "1.4×"]]} onChange={(v) => set({ zoom: v })} /></Field>
      <Field label="Transition in"><Seg value={b.transition || "cut"} options={[["cut", "Cut"], ["flash", "Flash"], ["whip", "Whip"]]} onChange={(v) => set({ transition: v })} /></Field>
      <Field label={`Voice volume: ${Math.round((b.volume ?? 1) * 100)}%`}>
        <input type="range" min={0} max={2} step={0.05} value={b.volume ?? 1} onChange={(ev) => set({ volume: +ev.target.value })} />
      </Field>
    </div>
  );
}

export function defaultsFor(effectId, project, b) {
  const e = CATALOG[effectId];
  const p = {};
  for (const f of (e && e.params) || []) p[f.key] = Array.isArray(f.default) ? [...f.default] : f.default;
  const txt = beatText(project, b);
  if (["cover-story", "glass-type", "text-explosion", "vertigo", "headline-wall"].includes(effectId)) p.word = keyWord(txt);
  if (effectId === "outro-comment-ui") {
    const m = txt.match(/\b(?:comment|type)\s+["']?([A-Za-z0-9]+)/i);
    p.keyword = (m ? m[1] : keyWord(txt)).toUpperCase();
  }
  if (effectId === "checklist" || effectId === "mock-app-window") p.title = txt.split(/\s+/).slice(0, 4).join(" ").replace(/[,.]$/, "").toUpperCase();
  for (const k of Object.keys(p)) if (b.params && b.params[k] && String(b.params[k]).length && b.effect === effectId) p[k] = b.params[k];
  return p;
}

function ItemInspector({ project, sel, actions }) {
  const it = (project.items || []).find((x) => x.id === sel.id);
  if (!it) return <p className="muted pad">Select a clip on the timeline.</p>;
  const p = it.params || {};
  const setP = (k, v) => actions.updateItem(it.id, { params: { ...p, [k]: v } });
  const m = (project.media || []).find((x) => x.id === it.media);
  const title = { V2: m ? m.name : "Media", T1: TEXT_KINDS[p.kind || "title"], A2: m ? m.name : "Music", A3: p.sfx ? `SFX: ${p.sfx}` : m ? m.name : "Sound" }[it.track];
  return (
    <div>
      <div className="ihead"><h3>{title}</h3><span className="muted mono">{fmt(it.from)} · {(it.frames / FPS).toFixed(1)}s</span></div>
      <Field label={`Length: ${(it.frames / FPS).toFixed(1)}s`}>
        <input type="range" min={6} max={Math.max(20 * FPS, it.frames)} value={it.frames} onChange={(e) => actions.updateItem(it.id, { frames: +e.target.value })} />
      </Field>
      {it.track === "T1" ? <>
        <Field label="Kind"><Seg value={p.kind || "title"} options={Object.entries(TEXT_KINDS)} onChange={(v) => setP("kind", v)} /></Field>
        <Field label="Text"><input type="text" value={p.text || ""} onChange={(e) => setP("text", e.target.value)} /></Field>
        {p.kind === "lower_third" ? <Field label="Second line"><input type="text" value={p.sub || ""} onChange={(e) => setP("sub", e.target.value)} /></Field> : null}
        <Field label={`Height: ${p.y || "auto"}`}><input type="range" min={120} max={1500} step={10} value={p.y || 600} onChange={(e) => setP("y", +e.target.value)} /></Field>
        <Field label={`Size: ${p.size || "auto"}`}><input type="range" min={30} max={260} step={2} value={p.size || 110} onChange={(e) => setP("size", +e.target.value)} /></Field>
        <Field label="Colour"><div className="row"><input type="color" value={p.color || "#ffffff"} onChange={(e) => setP("color", e.target.value)} />{p.color ? <button className="btn ghost small" onClick={() => setP("color", "")}>Use brand</button> : null}</div></Field>
      </> : null}
      {it.track === "V2" ? <>
        <Field label="Layout"><select value={p.layout || "full"} onChange={(e) => setP("layout", e.target.value)}>{Object.entries(MEDIA_LAYOUTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Fit"><Seg value={p.fit || "cover"} options={[["cover", "Fill"], ["contain", "Fit"]]} onChange={(v) => setP("fit", v)} /></Field>
        <Field label="Animation in"><Seg value={p.anim || "pop"} options={[["pop", "Pop"], ["slide", "Slide"], ["fade", "Fade"], ["none", "None"]]} onChange={(v) => setP("anim", v)} /></Field>
        <Field label={`Opacity: ${Math.round((p.opacity ?? 1) * 100)}%`}><input type="range" min={0.1} max={1} step={0.05} value={p.opacity ?? 1} onChange={(e) => setP("opacity", +e.target.value)} /></Field>
        {m && m.kind === "video" ? <Field label={`Clip audio: ${p.db ? p.db + " dB" : "muted"}`}><input type="range" min={-60} max={0} value={p.db ?? -60} onChange={(e) => setP("db", +e.target.value)} /></Field> : null}
      </> : null}
      {it.track === "A2" || it.track === "A3" ? <>
        <Field label={`Volume: ${p.db ?? (it.track === "A2" ? -18 : 0)} dB`}><input type="range" min={-40} max={6} value={p.db ?? (it.track === "A2" ? -18 : 0)} onChange={(e) => setP("db", +e.target.value)} /></Field>
        {it.track === "A2" ? <Field label="Duck under voice"><label className="chk"><input type="checkbox" checked={p.duck !== false} onChange={(e) => setP("duck", e.target.checked)} /> Drop {Math.abs(p.duck_db ?? -10)} dB while speaking</label></Field> : null}
      </> : null}
      {it.track === "A2" || it.track === "V2" ? (
        <Field label={`Start inside the file: ${(it.in || 0).toFixed(1)}s`}><input type="range" min={0} max={Math.max(1, (m && m.duration) || 30)} step={0.1} value={it.in || 0} onChange={(e) => actions.updateItem(it.id, { in: +e.target.value })} /></Field>
      ) : null}
      <button className="btn ghost danger" onClick={() => actions.deleteItem(it.id)}>Delete</button>
    </div>
  );
}

function ProjectInspector({ project, actions, store, brand }) {
  const st = project.settings;
  const set = actions.setSettings;
  return (
    <div>
      <div className="section first">Captions</div>
      <Field label="Style"><select value={st.caption_style} onChange={(e) => set({ caption_style: e.target.value })}>{Object.entries(CAPTION_STYLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Words per caption"><Seg value={+st.caption_words || 3} options={[[1, "1"], [2, "2"], [3, "3"], [4, "4"]]} onChange={(v) => set({ caption_words: v })} /></Field>
      <Field label={`Height: ${st.caption_y}`}><input type="range" min={600} max={1500} step={10} value={st.caption_y} onChange={(e) => set({ caption_y: +e.target.value })} /></Field>
      <Field label="Active word colour"><div className="row"><input type="color" value={st.accent || (brand && brand.colors && (brand.colors.caption_active || brand.colors.accent)) || "#FFD400"} onChange={(e) => set({ accent: e.target.value })} />
        {st.accent ? <button className="btn ghost small" onClick={() => set({ accent: "" })}>Use brand</button> : <span className="muted small">from brand</span>}</div></Field>

      <div className="section">Pace</div>
      <Field label={`Tighten everything: ${(+st.tighten || 1).toFixed(2)}×`} hint="A small global speed-up many Shorts use. Stacks with per-beat speed.">
        <input type="range" min={1} max={1.25} step={0.01} value={+st.tighten || 1} onChange={(e) => set({ tighten: +e.target.value })} />
      </Field>
      <Field label={`Cut pauses longer than ${(+st.max_gap).toFixed(2)}s`}>
        <input type="range" min={0.15} max={1.5} step={0.05} value={st.max_gap} onChange={(e) => set({ max_gap: +e.target.value })} />
      </Field>

      <div className="section">Look and sound</div>
      <Field label="Colour grade"><select value={st.grade} onChange={(e) => set({ grade: e.target.value })}>{Object.keys(GRADES).map((k) => <option key={k} value={k}>{GRADE_NAMES[k] || k}</option>)}</select></Field>
      <Field label="Sound effects"><label className="chk"><input type="checkbox" checked={st.auto_sfx !== false} onChange={(e) => set({ auto_sfx: e.target.checked })} /> Add whoosh, pop and thud on effects and transitions</label></Field>
      <Field label="Safe zone guide"><Seg value={st.safe_zone || "reels"} options={[["reels", "Reels"], ["shorts", "Shorts"], ["tiktok", "TikTok"]]} onChange={(v) => set({ safe_zone: v })} /></Field>
      <Field label="Face point" hint="Used by punch-ins, spotlight, arrows and callouts. Set it with Face point above the video.">
        <span className="mono muted">x {Math.round(st.focus.x * 100)}% · y {Math.round(st.focus.y * 100)}%</span>
      </Field>

      <div className="section">Transcription</div>
      <Field label="Whisper model" hint="small is the default. medium.en and large-v3 are slower and more accurate.">
        <div className="row">
          <select value={st.whisper_model} onChange={(e) => set({ whisper_model: e.target.value })}>{["tiny.en", "base.en", "small", "small.en", "medium.en", "large-v3"].map((m) => <option key={m}>{m}</option>)}</select>
          <input type="text" className="num" placeholder="lang" value={st.language || ""} onChange={(e) => set({ language: e.target.value })} />
        </div>
      </Field>
    </div>
  );
}

function Checks({ warnings, project, setSel, seek, tl }) {
  if (!project.beats.length) return null;
  return (
    <div className="checks">
      <div className="section">Checks</div>
      {!warnings.length ? <div className="chkrow ok">Pacing checks pass.</div> : warnings.map((w, k) => {
        const n = w.beat ? project.beats.findIndex((b) => b.id === w.beat) + 1 : null;
        return (
          <div key={k} className="chkrow" onClick={() => { if (w.beat) { setSel({ type: "beat", id: w.beat }); const b = tl.beats.find((x) => x.id === w.beat); if (b) seek(b.from); } }}>
            {n ? <b>#{n} </b> : null}{w.msg}
          </div>
        );
      })}
    </div>
  );
}
