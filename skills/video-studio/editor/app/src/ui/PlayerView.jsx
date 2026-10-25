import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { Reel } from "../remotion/Reel.jsx";
import { frameBus, fmt, FPS } from "./util.js";
import { useFrame } from "./hooks.js";
import { beatAtFrame } from "../remotion/timeline.js";
import { CATALOG } from "../remotion/effects/index.js";

export function PlayerView({ project, brand, tl, view, setView, playerRef, seek, actions, job, cancelJob }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loopBeat, setLoopBeat] = useState(false);
  const [mutedUi, setMutedUi] = useState(new URLSearchParams(location.search).has("muted"));
  const props = useMemo(() => ({
    project, brand, base: "", showCaptions: view.captions, showEffects: view.effects, safeZone: view.safe ? (project.settings.safe_zone || "reels") : null,
  }), [project, brand, view.captions, view.effects, view.safe]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    window.vsPlayer = p; // handy for debugging from the console
    const onFrame = (e) => frameBus.set(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
    };
  }, [playerRef, view.mode, tl.segments.length > 0]);

  // keep the playhead valid when the edit gets shorter
  useEffect(() => { if (frameBus.get() >= tl.durationInFrames) seek(tl.durationInFrames - 1); }, [tl.durationInFrames, seek]);

  const loopRange = useMemo(() => {
    if (!loopBeat) return undefined;
    const b = beatAtFrame(tl, frameBus.get());
    return b ? [b.from, b.from + b.frames - 1] : undefined;
  }, [loopBeat, tl]);

  const onStageClick = (e) => {
    if (!view.focusMode) return;
    const r = e.currentTarget.getBoundingClientRect();
    actions.setSettings({ focus: { x: +((e.clientX - r.left) / r.width).toFixed(3), y: +((e.clientY - r.top) / r.height).toFixed(3) } });
    setView((v) => ({ ...v, focusMode: false }));
  };

  const hasMedia = tl.segments.length > 0;
  const rendered = view.rendered || (project.last_preview || project.last_export || {}).url;

  return (
    <div className="playerview">
      <div className="pbar">
        <div className="seg">
          <button className={view.mode === "live" ? "on" : ""} onClick={() => setView((v) => ({ ...v, mode: "live" }))}>Live</button>
          <button className={view.mode === "rendered" ? "on" : ""} onClick={() => setView((v) => ({ ...v, mode: "rendered" }))} disabled={!rendered}>Rendered</button>
        </div>
        <label className="chk"><input type="checkbox" checked={view.captions} onChange={(e) => setView((v) => ({ ...v, captions: e.target.checked }))} /> Captions</label>
        <label className="chk"><input type="checkbox" checked={view.effects} onChange={(e) => setView((v) => ({ ...v, effects: e.target.checked }))} /> Effects</label>
        <label className="chk"><input type="checkbox" checked={view.safe} onChange={(e) => setView((v) => ({ ...v, safe: e.target.checked }))} /> Safe zone</label>
        <button className={"btn ghost small" + (view.focusMode ? " active" : "")} onClick={() => setView((v) => ({ ...v, focusMode: !v.focusMode }))}>Face point</button>
      </div>

      <div className="stagewrap">
        {view.mode === "rendered" && rendered ? (
          <video id="renderedVid" className="stage" src={rendered} controls playsInline />
        ) : hasMedia ? (
          <div className={"stage" + (view.focusMode ? " focusing" : "")} onClickCapture={onStageClick}>
            <Player
              ref={playerRef}
              component={Reel}
              inputProps={props}
              durationInFrames={tl.durationInFrames}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: "100%", height: "100%" }}
              playbackRate={rate}
              loop={loopBeat}
              inFrame={loopRange ? loopRange[0] : undefined}
              outFrame={loopRange ? loopRange[1] : undefined}
              clickToPlay={false}
              doubleClickToFullscreen={false}
              spaceKeyToPlayOrPause={false}
              numberOfSharedAudioTags={8}
              initiallyMuted={new URLSearchParams(location.search).has("muted")}
              renderLoading={() => <div className="loading">Loading…</div>}
            />
            {view.focusMode ? <FocusDot focus={project.settings.focus} /> : null}
            <ClaudeTag tl={tl} project={project} show={view.effects} />
          </div>
        ) : (
          <div className="stage emptystage">
            <p>{project.clips.length ? "Waiting for transcription…" : "Drop talking-head clips anywhere"}</p>
            <p className="muted small">mp4 · mov · m4v · mkv · webm</p>
          </div>
        )}
      </div>

      <div className="transport">
        <button className="play" onClick={() => { const p = playerRef.current; if (p) p.isPlaying() ? p.pause() : p.play(); }} disabled={!hasMedia || view.mode !== "live"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button className="btn ghost small" title="Back 1 frame (←)" onClick={() => seek(frameBus.get() - 1)}>‹</button>
        <button className="btn ghost small" title="Forward 1 frame (→)" onClick={() => seek(frameBus.get() + 1)}>›</button>
        <TimeLabel total={tl.durationInFrames} />
        <BeatLabel tl={tl} project={project} />
        <div className="grow" />
        <button className="btn ghost small" title="Mute preview" onClick={() => { const p = playerRef.current; if (p) { p.isMuted() ? p.unmute() : p.mute(); setMutedUi(p.isMuted()); } }}>{mutedUi ? "🔇" : "🔊"}</button>
        <label className="chk"><input type="checkbox" checked={loopBeat} onChange={(e) => setLoopBeat(e.target.checked)} /> Loop beat</label>
        <select className="sel small" value={rate} onChange={(e) => setRate(+e.target.value)} title="Review speed (does not change the edit)">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
      </div>

      {job && ["queued", "running"].includes(job.status) ? (
        <div className="jobbar">
          <div className="row"><span>{job.preview ? "Preview" : "Export"}: {job.message}</span><button className="btn ghost small" onClick={cancelJob}>Cancel</button></div>
          <div className="progress"><div style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
        </div>
      ) : null}
    </div>
  );
}

function TimeLabel({ total }) {
  const f = useFrame();
  return <span className="mono">{fmt(f)} / {fmt(total)}</span>;
}

function BeatLabel({ tl, project }) {
  const f = useFrame();
  const bi = beatAtFrame(tl, f);
  if (!bi) return null;
  const n = project.beats.findIndex((b) => b.id === bi.id) + 1;
  const b = project.beats[n - 1];
  const e = CATALOG[b.effect];
  return <span className="muted small">Beat {n} · {b.purpose}{b.effect !== "none" && e ? ` · ${e.name}` : ""}{(+b.speed || 1) !== 1 ? ` · ${b.speed}×` : ""}</span>;
}

function FocusDot({ focus }) {
  return <div className="focusdot" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} />;
}

function ClaudeTag({ tl, project, show }) {
  const f = useFrame();
  if (!show) return null;
  const bi = beatAtFrame(tl, f);
  if (!bi) return null;
  const b = project.beats.find((x) => x.id === bi.id);
  const e = CATALOG[b.effect];
  if (!e || !e.needs || !e.needs.includes("cutout")) return null;
  const c = project.clips.find((x) => x.id === b.clip);
  if (c && c.matte_status === "ready") return null;
  return <div className="ptag">{e.name} needs a speaker cutout. Prepare it in Media.</div>;
}
