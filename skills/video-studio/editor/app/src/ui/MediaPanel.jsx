import React from "react";
import { api } from "./store.js";
import { fmtS, frameBus, FPS } from "./util.js";
import { toast } from "./Toast.jsx";

const SFX = ["whoosh", "pop", "thud", "shutter", "ding", "tick"];

export function MediaPanel({ project, fromServer, uploadClips, actions, mutate }) {
  const busy = (c) => ["queued", "ingesting", "transcribing"].includes(c.status);
  const call = async (method, url, body) => {
    try { fromServer(await api(method, url, body)); } catch (e) { toast(e.message, "err"); }
  };
  const move = (i, d) => mutate((p) => { const [c] = p.clips.splice(i, 1); p.clips.splice(i + d, 0, c);
    const ids = p.clips.map((x) => x.id); p.beats.sort((a, b) => ids.indexOf(a.clip) - ids.indexOf(b.clip)); });

  return (
    <div className="mediapanel">
      <div className="ph">
        <h4>Talking-head clips</h4>
        <label className="btn ghost small">Add clips<input type="file" accept="video/*" multiple hidden onChange={(e) => { uploadClips(e.target.files, "clips"); e.target.value = ""; }} /></label>
      </div>
      {!project.clips.length ? <p className="muted small pad">These are transcribed into the main track. Drop files anywhere.</p> : null}
      {project.clips.map((c, i) => (
        <div key={c.id} className="clipcard">
          <div className="row">
            <b className="ell" title={c.name}>{c.name}</b>
            <div className="grow" />
            <button className="icon" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button className="icon" title="Move down" disabled={i === project.clips.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button className="icon" title="Transcribe again" disabled={busy(c)} onClick={() => call("POST", `/api/projects/${project.id}/clips/${c.id}/retry`, {})}>↻</button>
            <button className="icon" title="Remove" disabled={busy(c)} onClick={() => confirm(`Remove "${c.name}" and its beats?`) && call("DELETE", `/api/projects/${project.id}/clips/${c.id}`)}>✕</button>
          </div>
          <div className={"muted small" + (c.status === "error" ? " errtxt" : "")}>
            {c.status === "ready" ? `${fmtS(c.duration)} · ${c.message}${c.low_res ? " · below 1080p" : ""}` : c.status === "error" ? c.message : c.message}
          </div>
          {busy(c) ? <div className="progress"><div style={{ width: `${(c.progress || 0) * 100}%` }} /></div> : null}
          {c.status === "ready" ? (
            <div className="row small">
              <span className="muted">Speaker cutout:</span>
              {c.matte_status === "ready" ? <span className="ok">ready</span>
                : ["queued", "running"].includes(c.matte_status) ? <span className="muted">{Math.round((c.matte_progress || 0) * 100)}%</span>
                : <button className="btn ghost small" onClick={() => call("POST", `/api/projects/${project.id}/clips/${c.id}/matte`)}>{c.matte_status === "error" ? "Retry" : "Prepare"}</button>}
              <span className="muted">(for behind-the-head effects)</span>
            </div>
          ) : null}
        </div>
      ))}

      <div className="ph">
        <h4>Media bin</h4>
        <label className="btn ghost small">Add media<input type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => { uploadClips(e.target.files, "media"); e.target.value = ""; }} /></label>
      </div>
      <p className="muted small pad">B-roll, screen recordings, images, logos and music. Drag them onto the timeline, or use them in effects (phone screen, split screen, collage…).</p>
      <div className="bin">
        {(project.media || []).map((m) => (
          <div key={m.id} className="bincard" draggable onDragStart={(e) => { e.dataTransfer.setData("vs/media", m.id); e.dataTransfer.effectAllowed = "copy"; }}>
            <div className="thumb">
              {m.status !== "ready" ? <span className="muted small">{m.status}</span>
                : m.kind === "image" ? <img src={`/api/projects/${project.id}/media/${m.file}`} alt="" />
                : m.kind === "video" ? <video src={`/api/projects/${project.id}/media/${m.proxy || m.file}#t=0.5`} muted preload="metadata" />
                : <span className="aud">♪</span>}
            </div>
            <div className="ell small" title={m.name}>{m.name}</div>
            <div className="row small">
              <span className="muted">{m.kind}{m.duration ? ` · ${m.duration.toFixed(1)}s` : ""}</span>
              <div className="grow" />
              <button className="icon" title="Add at playhead" disabled={m.status !== "ready"} onClick={() => {
                const t = m.kind === "audio" ? "A2" : "V2";
                actions.addItem({ track: t, media: m.id, from: frameBus.get(), frames: Math.round((m.kind === "image" ? 3 : Math.min(m.duration || 4, 6)) * FPS),
                  params: t === "V2" ? { layout: "full", anim: "pop" } : { db: -18, duck: true } });
              }}>＋</button>
              <button className="icon" title="Remove from bin" onClick={() => confirm(`Remove ${m.name}? Timeline uses of it go too.`) && call("DELETE", `/api/projects/${project.id}/media/${m.id}`)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="ph"><h4>Sound effects</h4></div>
      <div className="sfxlist">
        {SFX.map((s) => (
          <div key={s} className="sfx" draggable onDragStart={(e) => e.dataTransfer.setData("vs/sfx", s)}>
            <button className="icon" title="Listen" onClick={() => new Audio(`/static/sfx/${s}.mp3`).play()}>▶</button>
            <span>{s}</span>
            <div className="grow" />
            <button className="icon" title="Add at playhead" onClick={() => actions.addItem({ track: "A3", from: frameBus.get(), frames: FPS, params: { sfx: s, db: 0 } })}>＋</button>
          </div>
        ))}
      </div>
    </div>
  );
}
