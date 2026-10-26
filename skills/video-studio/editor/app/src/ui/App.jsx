import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject, api, uid } from "./store.js";
import { frameBus, FPS, beatText } from "./util.js";
import { computeTimeline, pacingWarnings, isFiller } from "../remotion/timeline.js";
import { CATALOG } from "../remotion/effects/index.js";
import { FORMATS, FORMAT_BY_ID } from "../formats/index.js";
import { PlayerView } from "./PlayerView.jsx";
import { Timeline } from "./Timeline.jsx";
import { Inspector } from "./Inspector.jsx";
import { Transcript } from "./Transcript.jsx";
import { MediaPanel } from "./MediaPanel.jsx";
import { Studio } from "./Studio.jsx";
import { Formats } from "./Formats.jsx";
import { BrandPanel } from "./BrandPanel.jsx";
import { Toasts, toast } from "./Toast.jsx";

export function App() {
  const store = useProject();
  const { project, brand, mutate, undo, redo, open, fromServer, saveState } = store;
  const [projects, setProjects] = useState([]);
  const [leftTab, setLeftTab] = useState("transcript");
  const [sel, setSel] = useState({ type: "project" });
  const [wordSel, setWordSel] = useState(null);
  const [view, setView] = useState({ captions: true, effects: true, safe: false, focusMode: false, mode: "live" });
  const [job, setJob] = useState(null);
  const playerRef = useRef(null);

  const tl = useMemo(() => (project ? computeTimeline(project) : null), [project]);
  const warnings = useMemo(() => (project && tl ? pacingWarnings(project, tl, CATALOG, (FORMAT_BY_ID[project.settings.format] || {}).pace) : []), [project, tl]);

  const refreshProjects = useCallback(async () => setProjects(await api("GET", "/api/projects")), []);
  useEffect(() => {
    (async () => {
      const list = await api("GET", "/api/projects");
      setProjects(list);
      const h = decodeURIComponent((location.hash.match(/p=([^&]+)/) || [])[1] || "");
      const pid = list.find((p) => p.id === h) ? h : list[0] && list[0].id;
      if (pid) open(pid);
    })();
  }, [open]);

  const seek = useCallback((f) => {
    const p = playerRef.current;
    const max = tl ? tl.durationInFrames - 1 : 0;
    const fr = Math.max(0, Math.min(Math.round(f), max));
    if (p) p.seekTo(fr);
    frameBus.set(fr);
  }, [tl]);

  const togglePlay = useCallback(() => {
    if (view.mode !== "live") { const v = document.getElementById("renderedVid"); if (v) v.paused ? v.play() : v.pause(); return; }
    const p = playerRef.current;
    if (p) p.isPlaying() ? p.pause() : p.play();
  }, [view.mode]);

  const newProject = async () => {
    const name = prompt("Name for the new reel", "Untitled reel");
    if (!name) return;
    const res = await api("POST", "/api/projects", { name });
    await open(res.project.id);
    refreshProjects();
  };

  // ------------------------------------------------------------ edit actions (all undoable)
  const actions = useMemo(() => ({
    toggleCutWords(clipId, a, b) {
      mutate((d) => {
        const c = d.clips.find((c) => c.id === clipId);
        const ws = c.words.slice(a, b + 1);
        const val = !ws.every((w) => w.cut);
        for (let i = a; i <= b; i++) c.words[i].cut = val;
      });
    },
    editWord(clipId, i, text) {
      mutate((d) => { d.clips.find((c) => c.id === clipId).words[i].w = text; });
    },
    removeFillers() {
      let n = 0;
      mutate((d) => d.clips.forEach((c) => (c.words || []).forEach((w) => { if (!w.cut && isFiller(w.w)) { w.cut = true; n++; } })));
      setTimeout(() => toast(n ? `Cut ${n} filler word${n > 1 ? "s" : ""}. Undo with Cmd+Z.` : "No filler words found."), 0);
    },
    splitBeatAtWord(clipId, i) {
      mutate((d) => {
        const b = d.beats.find((x) => x.clip === clipId && x.w0 <= i && i <= x.w1);
        if (!b || i === b.w0) return;
        const nb = { ...JSON.parse(JSON.stringify(b)), id: uid(), w0: i, effect: "none", params: {}, purpose: "point", note: "", ramp: null, freeze: 0 };
        b.w1 = i - 1;
        d.beats.splice(d.beats.indexOf(b) + 1, 0, nb);
      });
    },
    mergeBeat(id) {
      mutate((d) => {
        const k = d.beats.findIndex((b) => b.id === id);
        const b = d.beats[k], n = d.beats[k + 1];
        if (!n || n.clip !== b.clip) return;
        b.w1 = n.w1;
        d.beats.splice(k + 1, 1);
      });
    },
    updateBeat(id, patch) {
      mutate((d) => { Object.assign(d.beats.find((b) => b.id === id), patch); });
    },
    updateItem(id, patch) {
      mutate((d) => { const it = d.items.find((x) => x.id === id); if (it) Object.assign(it, patch); });
    },
    addItem(item) {
      const it = { id: uid(), params: {}, in: 0, ...item };
      mutate((d) => { d.items = d.items || []; d.items.push(it); });
      setSel({ type: "item", id: it.id });
      return it;
    },
    deleteItem(id) {
      mutate((d) => { d.items = d.items.filter((x) => x.id !== id); });
      setSel({ type: "project" });
    },
    setSettings(patch) {
      mutate((d) => { Object.assign(d.settings, patch); });
    },
    applyEffect(beatId, effectId, params) {
      mutate((d) => {
        const b = d.beats.find((x) => x.id === beatId);
        b.effect = effectId;
        b.params = params;
      });
    },
  }), [mutate]);

  // split at playhead: item under playhead if one is selected, else the main-track beat
  const splitAtPlayhead = useCallback(() => {
    if (!project || !tl) return;
    const f = frameBus.get();
    if (sel.type === "item") {
      const it = project.items.find((x) => x.id === sel.id);
      if (it && f > it.from && f < it.from + it.frames) {
        mutate((d) => {
          const a = d.items.find((x) => x.id === it.id);
          const b = { ...JSON.parse(JSON.stringify(a)), id: uid(), from: f, frames: a.from + a.frames - f, in: (a.in || 0) + (f - a.from) / FPS };
          a.frames = f - a.from;
          d.items.push(b);
        });
        return;
      }
    }
    const w = tl.words.find((w) => w.from >= f) || null;
    if (w) actions.splitBeatAtWord(w.clip, w.i);
  }, [project, tl, sel, mutate, actions]);

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const h = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.target.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod) return;
      const f = frameBus.get();
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seek(f - (e.shiftKey ? FPS : 1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(f + (e.shiftKey ? FPS : 1)); }
      else if (e.key === "j") seek(f - FPS);
      else if (e.key === "l") seek(f + FPS);
      else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (wordSel) actions.splitBeatAtWord(wordSel.clip, wordSel.a); else splitAtPlayhead();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (wordSel) actions.toggleCutWords(wordSel.clip, wordSel.a, wordSel.b);
        else if (sel.type === "item") actions.deleteItem(sel.id);
        else if (sel.type === "beat") { const b = project.beats.find((x) => x.id === sel.id); if (b) actions.updateBeat(b.id, { cut: !b.cut }); }
      } else if (e.key === "t") {
        actions.addItem({ track: "T1", from: f, frames: 2 * FPS, params: { kind: "keyword", text: "KEYWORD" } });
      } else if (e.key === "Escape") { setWordSel(null); setView((v) => ({ ...v, focusMode: false })); }
      else if (e.key === "Home") seek(0);
      else if (e.key === "End" && tl) seek(tl.durationInFrames - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, togglePlay, seek, wordSel, sel, actions, splitAtPlayhead, project, tl]);

  // ------------------------------------------------------------ uploads + jobs
  const ensureProject = async () => {
    if (project) return project.id;
    const res = await api("POST", "/api/projects", { name: "Untitled reel" });
    await open(res.project.id);
    refreshProjects();
    return res.project.id;
  };
  // files: File objects from the page, or {path, name} from the Mac app (streamed from disk by the shell)
  const uploadClips = async (files, kind) => {
    const pid = await ensureProject();
    const fromDisk = files.length && files[0].path && !(files[0] instanceof Blob);
    toast(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`);
    try {
      let res;
      if (fromDisk) res = await window.vsDesktop.upload(pid, kind, [...files].map((f) => f.path));
      else {
        const fd = new FormData();
        [...files].forEach((f) => fd.append("files", f));
        res = await api("POST", `/api/projects/${pid}/${kind === "clips" ? "upload" : "media"}`, fd, true);
      }
      fromServer(res);
      toast(kind === "clips" ? "Clips added. Normalising and transcribing." : "Added to the media bin.");
    } catch (e) { toast("Upload failed: " + e.message, "err"); }
  };

  const startRender = async (preview) => {
    await store.flush();
    try {
      const j = await api("POST", `/api/projects/${project.id}/render`, { preview });
      setJob(j);
    } catch (e) { toast(e.message, "err"); }
  };
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const t = setTimeout(async () => {
      const j = await api("GET", `/api/jobs/${job.id}`);
      setJob(j);
      if (j.status === "done") {
        const res = await api("GET", `/api/projects/${project.id}`);
        fromServer(res);
        setView((v) => ({ ...v, mode: "rendered", rendered: j.result.url }));
        toast(j.preview ? "Preview rendered." : `Exported ${j.result.path}`, "", j.preview ? 4000 : 0,
          j.preview ? [] : [["Show in Finder", () => api("POST", `/api/projects/${project.id}/reveal`)]]);
      } else if (j.status === "error") toast("Render failed: " + j.message, "err", 0);
    }, 800);
    return () => clearTimeout(t);
  }, [job, project, fromServer]);

  // drag files anywhere: videos -> clips if the project has none yet, otherwise ask via the drop overlay zones
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    let depth = 0;
    const enter = (e) => { if ([...e.dataTransfer.types].includes("Files")) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e) => e.preventDefault();
    const drop = (e) => { e.preventDefault(); depth = 0; setDragging(false); };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragenter", enter); window.removeEventListener("dragleave", leave); window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, []);

  // Mac app: native menu commands and files dropped on the Dock icon / File > Add Files
  const [diskFiles, setDiskFiles] = useState(null);
  const latest = useRef({});
  latest.current = { newProject, undo, redo };
  useEffect(() => {
    const d = window.vsDesktop;
    if (!d) return;
    const offMenu = d.onMenu((cmd) => {
      const l = latest.current;
      if (cmd === "new-reel") l.newProject(); else if (cmd === "undo") l.undo(); else if (cmd === "redo") l.redo();
    });
    const offFiles = d.onFiles((files) => setDiskFiles(files));
    return () => { offMenu(); offFiles(); };
  }, []);

  const [inspOpen, setInspOpen] = useState(false);
  const pickFormat = async (id) => {
    try {
      fromServer(await api("POST", `/api/projects/${project.id}/format`, { format: id }), { replace: true });
      const f = FORMAT_BY_ID[id];
      toast(f ? `${f.name} applied to every beat. Cmd+Z to undo.` : "Format cleared. Beats re-planned with the classic planner.");
    } catch (e) { toast("Couldn't apply the format: " + e.message, "err"); }
  };
  const buckets = [...new Set(FORMATS.map((f) => f.bucket))];

  const ctx = { project, brand, tl, mutate, actions, sel, setSel, wordSel, setWordSel, seek, view, setView, warnings, store, fromServer, uploadClips, playerRef, setLeftTab };

  return (
    <div className={"app" + (inspOpen ? " insp-open" : "")}>
      <header className="top">
        <div className="logo">Video Studio</div>
        <select className="sel" value={project ? project.id : ""} onChange={(e) => e.target.value && open(e.target.value)}>
          {!projects.length ? <option value="">No projects</option> : null}
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn ghost" onClick={newProject}>New</button>
        {project ? <select className="sel fmtsel" title="Reel format: re-plans every beat" value={project.settings.format || ""} onChange={(e) => pickFormat(e.target.value)}>
          <option value="">Format: none</option>
          {buckets.map((b) => <optgroup key={b} label={b}>{FORMATS.filter((f) => f.bucket === b).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>)}
        </select> : null}
        {project ? <input className="pname" value={project.name} onChange={(e) => mutate((d) => { d.name = e.target.value; }, { history: false })} onBlur={refreshProjects} /> : null}
        <div className="hist">
          <button className="btn ghost icon" title="Undo (Cmd+Z)" disabled={!store.canUndo} onClick={undo}>↶</button>
          <button className="btn ghost icon" title="Redo (Cmd+Shift+Z)" disabled={!store.canRedo} onClick={redo}>↷</button>
        </div>
        <span className="muted small savestate">{saveState}</span>
        <div className="grow" />
        {brand ? <span className="brandchip" onClick={() => setLeftTab("brand")} title="Brand kit">
          <i style={{ background: brand.colors && brand.colors.accent }} /><span className="bname">{brand.name}</span></span> : null}
        <button className="btn ghost insp-toggle" onClick={() => setInspOpen((v) => !v)} aria-pressed={inspOpen}>{inspOpen ? "Close panel" : "Inspector"}</button>
        <button className="btn ghost" disabled={!tl || !tl.segments.length} onClick={() => startRender(true)}>Render preview</button>
        <button className="btn primary" disabled={!tl || !tl.segments.length} onClick={() => startRender(false)}>Export</button>
      </header>

      <main className="main">
        <aside className="left">
          <nav className="tabs">
            {[["formats", "Formats"], ["transcript", "Transcript"], ["media", "Media"], ["studio", "Effects"], ["brand", "Brand"]].map(([k, l]) => (
              <button key={k} className={leftTab === k ? "on" : ""} onClick={() => setLeftTab(k)}>{l}</button>
            ))}
          </nav>
          <div className="leftbody">
            {!project ? <Welcome onNew={newProject} /> :
              leftTab === "formats" ? <Formats {...ctx} /> :
              leftTab === "transcript" ? <Transcript {...ctx} /> :
              leftTab === "media" ? <MediaPanel {...ctx} /> :
              leftTab === "studio" ? <Studio {...ctx} /> :
              <BrandPanel {...ctx} />}
          </div>
        </aside>

        <section className="centre">
          {project && tl ? <PlayerView {...ctx} job={job} cancelJob={() => job && api("POST", `/api/jobs/${job.id}/cancel`)} /> : <div className="empty">Create or open a reel to start.</div>}
        </section>

        <aside className="right">
          {project && tl ? <Inspector {...ctx} /> : null}
        </aside>
      </main>

      <footer className="bottom">
        {project && tl ? <Timeline {...ctx} /> : null}
      </footer>

      {dragging ? <DropZones onDrop={(files, kind) => { setDragging(false); uploadClips(files, kind); }} hasClips={!!(project && project.clips.length)} /> : null}
      {diskFiles && !dragging ? <DropZones files={diskFiles} onDrop={(files, kind) => { setDiskFiles(null); uploadClips(files, kind); }}
        onCancel={() => setDiskFiles(null)} hasClips={!!(project && project.clips.length)} /> : null}
      <Toasts />
    </div>
  );
}

function Welcome({ onNew }) {
  return (
    <div className="welcome">
      <h3>Start a reel</h3>
      <p className="muted">Create a reel, then drop your talking-head clips in. They get transcribed, split into beats and given suggested effects.</p>
      <button className="btn primary" onClick={onNew}>New reel</button>
    </div>
  );
}

// files given (Mac app Dock drop): the zones become buttons for those files
function DropZones({ onDrop, hasClips, files, onCancel }) {
  const zone = (kind, title, sub) => (
    <div className="dz" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e.dataTransfer.files, kind); }}
      onClick={files ? () => onDrop(files, kind) : undefined} style={files ? { cursor: "pointer" } : undefined}>
      <b>{title}</b><span>{sub}</span>
    </div>
  );
  return (
    <div className="dropveil" onClick={files ? (e) => { if (e.target === e.currentTarget) onCancel(); } : undefined}>
      {zone("clips", "Talking-head clips", "Transcribed into the main track")}
      {zone("media", "B-roll, images, music", hasClips ? "Goes to the media bin" : "Add clips first for the main track")}
    </div>
  );
}
