// Reel formats: pick a proven format and every beat is re-planned with its recipe
// (layout, captions, grade, pace and signature effects). Undo restores the previous edit.
import React, { useState } from "react";
import { FORMATS } from "../formats/index.js";
import { CATALOG } from "../remotion/effects/index.js";
import { api } from "./store.js";
import { toast } from "./Toast.jsx";

export function Formats({ project, fromServer, setLeftTab }) {
  const current = project.settings.format || "";
  const [open, setOpen] = useState(current || FORMATS[0].id);
  const [busy, setBusy] = useState("");
  const ready = project.clips.some((c) => c.words && c.words.length);
  const buckets = [...new Set(FORMATS.map((f) => f.bucket))];

  const use = async (id) => {
    setBusy(id);
    try {
      fromServer(await api("POST", `/api/projects/${project.id}/format`, { format: id }), { replace: true });
      const f = FORMATS.find((x) => x.id === id);
      toast(f ? `${f.name} applied to every beat. Cmd+Z to undo.` : "Format cleared. Beats re-planned with the classic planner.");
      if (f && f.cutout) toast("This format uses a speaker cutout. It is being prepared in the background.");
    } catch (e) {
      toast(String(e.message || e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="formats">
      <div className="studiohint muted small">
        Pick a format and Claude re-plans every beat with its recipe: layout, captions, grade, pace and its signature effects.
        {ready ? "" : " Add a clip first; the format applies as soon as it is transcribed."}
      </div>
      {buckets.map((bk) => (
        <div key={bk}>
          <div className="section">{bk}</div>
          <div className="fmtlist">
            {FORMATS.filter((f) => f.bucket === bk).map((f) => (
              <div key={f.id} className={"card fmt" + (current === f.id ? " on" : "")} onClick={() => setOpen(f.id)}>
                <div className="row between">
                  <b>{f.name}</b>
                  {current === f.id ? <span className="chip on">In use</span> : f.cutout ? <span className="chip">Cutout</span> : null}
                </div>
                <div className="small">{f.tagline}</div>
                {open === f.id ? <>
                  <div className="muted small">{f.look}</div>
                  <div className="muted small"><b>Best for:</b> {f.best_for}</div>
                  <div className="chips">{f.signature.map((id) => <span key={id} className="chip">{(CATALOG[id] && CATALOG[id].name) || id}</span>)}</div>
                  <div className="row">
                    <button className="btn primary small" disabled={!!busy || current === f.id} onClick={(e) => { e.stopPropagation(); use(f.id); }}>
                      {busy === f.id ? "Applying…" : current === f.id ? "In use" : "Use this format"}</button>
                    {current === f.id ? <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); use(f.id); }}>Re-plan</button> : null}
                  </div>
                </> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      {current ? <div className="studiohint"><button className="btn ghost small" disabled={!!busy} onClick={() => use("")}>Clear format (classic planner)</button>
        <button className="btn ghost small" onClick={() => setLeftTab("studio")}>Fine-tune a beat in Effects</button></div> : null}
    </div>
  );
}
