// The effect studio: every /video-studio effect as a card with a live preview on your own footage.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { Reel } from "../remotion/Reel.jsx";
import { CATALOG } from "../remotion/effects/index.js";
import { computeTimeline } from "../remotion/timeline.js";
import { defaultsFor } from "./Inspector.jsx";
import { api } from "./store.js";
import { FPS } from "./util.js";
import { toast } from "./Toast.jsx";

const FILTERS = [["all", "All"], ["hook", "Hook"], ["list", "List"], ["proof", "Proof"], ["tools", "Tools"], ["punch", "Punch"], ["point", "Point"], ["cta", "CTA"]];

export function Studio({ project, brand, sel, setSel, actions, fromServer }) {
  const [filter, setFilter] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const favs = new Set((brand && brand.favourites) || []);
  const beat = (sel.type === "beat" && project.beats.find((b) => b.id === sel.id)) || project.beats.find((b) => !b.cut) || null;
  const n = beat ? project.beats.indexOf(beat) + 1 : 0;

  const list = useMemo(() => Object.values(CATALOG).filter((e) => e.id !== "none")
    .filter((e) => filter === "all" || (e.purposes || []).includes(filter))
    .filter((e) => !favOnly || favs.has(e.id))
    .filter((e) => !q || (e.name + " " + e.desc).toLowerCase().includes(q.toLowerCase())), [filter, favOnly, q, brand]); // eslint-disable-line

  const toggleFav = async (id) => {
    if (!brand) return toast("Pick or create a brand kit first (Brand tab).");
    const next = favs.has(id) ? [...favs].filter((x) => x !== id) : [...favs, id];
    await api("PUT", `/api/brands/${brand.id}`, { favourites: next });
    fromServer(await api("GET", `/api/projects/${project.id}`));
  };

  const apply = (id) => {
    if (!beat) return;
    actions.applyEffect(beat.id, id, defaultsFor(id, project, beat));
    setSel({ type: "beat", id: beat.id });
    toast(`${CATALOG[id].name} applied to beat ${n}.`);
  };

  return (
    <div className="studio">
      {picked && beat ? <Preview project={project} brand={brand} beat={beat} effectId={picked} /> : (
        <div className="studiohint muted small">Click a card to preview it on {beat ? `beat ${n}` : "your footage"}. Drag a card onto a beat in the timeline, or press Apply.</div>
      )}
      {picked ? (
        <div className="row gap pad">
          <b>{CATALOG[picked].name}</b>
          <div className="grow" />
          <button className="btn ghost small" onClick={() => toggleFav(picked)}>{favs.has(picked) ? "★ Favourite" : "☆ Favourite"}</button>
          <button className="btn primary small" disabled={!beat} onClick={() => apply(picked)}>Apply to beat {n}</button>
        </div>
      ) : null}
      <div className="filters">
        {FILTERS.map(([k, l]) => <button key={k} className={"chip" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{l}</button>)}
        <button className={"chip" + (favOnly ? " on" : "")} onClick={() => setFavOnly(!favOnly)}>★ Brand</button>
        <input className="search" placeholder="Search effects" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="cards">
        {list.map((e) => (
          <div key={e.id} className={"card" + (picked === e.id ? " on" : "")} draggable
            onDragStart={(ev) => { ev.dataTransfer.setData("vs/effect", e.id); ev.dataTransfer.effectAllowed = "copy"; }}
            onClick={() => setPicked(e.id)} onDoubleClick={() => apply(e.id)}>
            <div className="ctitle">{favs.has(e.id) ? "★ " : ""}{e.name}</div>
            <div className="cdesc">{e.desc}</div>
            <div className="badges">
              <span className={"badge" + (e.big ? " big" : "")}>{e.big ? "big" : "small"}</span>
              {(e.needs || []).includes("cutout") ? <span className="badge cut">cutout</span> : (e.prefers || []).includes("cutout") ? <span className="badge">better with cutout</span> : null}
              {(e.params || []).some((p) => p.type === "media") ? <span className="badge">uses media</span> : null}
              {e.status !== "ready" ? <span className="badge warn">in progress</span> : null}
            </div>
          </div>
        ))}
      </div>
      <p className="muted small pad">Pacing rule from the skill: one big effect per beat, 1.5 s between big effects, about one per 6 to 7 seconds. The Checks list flags breaks.</p>
    </div>
  );
}

function Preview({ project, brand, beat, effectId }) {
  const ref = useRef(null);
  const proj = useMemo(() => {
    const p = JSON.parse(JSON.stringify(project));
    const b = p.beats.find((x) => x.id === beat.id);
    b.effect = effectId;
    b.params = defaultsFor(effectId, project, beat);
    b.cut = false;
    return p;
  }, [project, beat, effectId]);
  const tl = useMemo(() => computeTimeline(proj), [proj]);
  const bi = tl.beats.find((b) => b.id === beat.id);
  useEffect(() => { const p = ref.current; if (p && bi) { p.seekTo(bi.from); p.play(); } }, [effectId, bi && bi.from]);
  if (!bi || !bi.frames) return <div className="studiohint muted small">That beat is cut. Select another beat.</div>;
  return (
    <div className="minipreview">
      <Player ref={ref} component={Reel} inputProps={{ project: proj, brand, base: "" }} durationInFrames={tl.durationInFrames} fps={FPS}
        compositionWidth={1080} compositionHeight={1920} style={{ width: "100%", height: "100%" }} loop inFrame={bi.from} outFrame={bi.from + bi.frames - 1}
        initiallyMuted autoPlay clickToPlay={false} />
    </div>
  );
}
