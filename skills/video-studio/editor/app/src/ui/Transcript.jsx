import React, { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG } from "../remotion/effects/index.js";
import { api } from "./store.js";
import { fmt } from "./util.js";
import { useFrameSelect } from "./hooks.js";
import { isFiller } from "../remotion/timeline.js";
import { toast } from "./Toast.jsx";

export function Transcript({ project, tl, actions, sel, setSel, wordSel, setWordSel, seek, fromServer }) {
  const [editing, setEditing] = useState(null); // "clip:i"
  const boxRef = useRef(null);
  const times = useMemo(() => Object.fromEntries(tl.beats.map((b) => [b.id, b])), [tl]);
  const wordOut = useMemo(() => {
    const m = {};
    tl.words.forEach((w) => { m[w.clip + ":" + w.i] = w; });
    return m;
  }, [tl]);
  const clips = Object.fromEntries(project.clips.map((c) => [c.id, c]));
  const fillers = project.clips.reduce((n, c) => n + (c.words || []).filter((w) => !w.cut && isFiller(w.w)).length, 0);
  const busy = project.clips.some((c) => !["ready", "error"].includes(c.status));

  const clickWord = (e, clip, i, beatId) => {
    if (e.shiftKey && wordSel && wordSel.clip === clip) {
      const anc = wordSel.anchor ?? wordSel.a;
      setWordSel({ clip, a: Math.min(anc, i), b: Math.max(anc, i), anchor: anc });
    } else {
      setWordSel({ clip, a: i, b: i, anchor: i });
      const w = wordOut[clip + ":" + i] || tl.words.find((x) => x.clip === clip && x.i > i);
      if (w) seek(w.from);
    }
    setSel({ type: "beat", id: beatId });
  };

  const replan = async () => {
    if (!confirm("Rebuild beats and effect suggestions from the transcript? Beat edits are replaced (undo brings them back). Word cuts and fixes stay.")) return;
    fromServer(await api("POST", `/api/projects/${project.id}/plan`, {}), { replace: true });
    toast("Beats re-planned.");
  };

  return (
    <div className="transcript" ref={boxRef}>
      <div className="tools">
        <button className="btn ghost small" onClick={actions.removeFillers} disabled={!fillers} title="Cut um, uh, erm…">Remove fillers{fillers ? ` (${fillers})` : ""}</button>
        <button className="btn ghost small" onClick={replan} disabled={!project.clips.some((c) => c.words && c.words.length)}>Re-plan beats</button>
      </div>
      <p className="hint">Click a word to jump · Shift-click for a range · <kbd>Del</kbd> cut/restore · <kbd>S</kbd> split beat · double-click to fix a word</p>
      {project.beats.map((b, n) => {
        const c = clips[b.clip];
        if (!c) return null;
        const e = CATALOG[b.effect];
        const bt = times[b.id];
        const isSel = sel.type === "beat" && sel.id === b.id;
        return (
          <div key={b.id} className={"beat" + (isSel ? " sel" : "") + (b.cut ? " iscut" : "")} onClick={(ev) => { if (!ev.target.closest(".w")) setSel({ type: "beat", id: b.id }); }}>
            <div className="beath">
              <span className="n">#{n + 1}</span>
              <span className="pill">{b.purpose}</span>
              {b.cut ? <span className="pill cut">cut</span> : b.effect !== "none" && e ? <span className="pill fx">{e.name}</span> : null}
              {(+b.speed || 1) !== 1 || b.ramp ? <span className="pill">{b.ramp ? `${b.speed}→${b.ramp.to}×` : `${b.speed}×`}</span> : null}
              <span className="tm">{bt && bt.frames ? `${fmt(bt.from)}–${fmt(bt.from + bt.frames)}` : "—"}</span>
            </div>
            <div className="words">
              {(c.words || []).slice(b.w0, b.w1 + 1).map((w, k) => {
                const i = b.w0 + k;
                const key = c.id + ":" + i;
                const inSel = wordSel && wordSel.clip === c.id && i >= wordSel.a && i <= wordSel.b;
                const gap = k > 0 && w.s - c.words[i - 1].e > 0.6 ? <span className="gap">⋯{(w.s - c.words[i - 1].e).toFixed(1)}s </span> : null;
                if (editing === key) {
                  return <React.Fragment key={i}>{gap}<WordEditor value={w.w} onDone={(v) => { setEditing(null); if (v && v !== w.w) actions.editWord(c.id, i, v); }} /> </React.Fragment>;
                }
                return (
                  <React.Fragment key={i}>
                    {gap}
                    <Word text={w.w} cut={w.cut} filler={isFiller(w.w)} sel={inSel} out={wordOut[key]}
                      onClick={(e) => clickWord(e, c.id, i, b.id)} onDoubleClick={() => setEditing(key)} />{" "}
                  </React.Fragment>
                );
              })}
            </div>
            {b.note ? <div className="note">{b.note}</div> : null}
          </div>
        );
      })}
      {!project.beats.length ? <p className="muted pad">{busy ? "Transcribing… beats appear here when it finishes." : "Add talking-head clips in Media (or drop them anywhere)."}</p> : null}
    </div>
  );
}

function Word({ text, cut, filler, sel, out, onClick, onDoubleClick }) {
  const now = useFrameSelect((f) => !!(out && out.from <= f && f < out.to + 1), [out && out.from, out && out.to]);
  const ref = useRef(null);
  useEffect(() => { if (now && ref.current) ref.current.scrollIntoView({ block: "nearest" }); }, [now]);
  return (
    <span ref={ref} className={"w" + (cut ? " cut" : "") + (sel ? " selw" : "") + (now ? " now" : "") + (filler && !cut ? " filler" : "")}
      onClick={onClick} onDoubleClick={onDoubleClick}>{text}</span>
  );
}

function WordEditor({ value, onDone }) {
  const [v, setV] = useState(value);
  return (
    <input className="wedit" autoFocus value={v} size={Math.max(3, v.length)} onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v.trim())} onKeyDown={(e) => { if (e.key === "Enter") onDone(v.trim()); if (e.key === "Escape") onDone(value); e.stopPropagation(); }} />
  );
}
