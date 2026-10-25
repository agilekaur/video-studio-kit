// Brand kits: drop in a guide / fonts / logos / website, review what was found, tweak, apply to reels.
import React, { useEffect, useState } from "react";
import { api } from "./store.js";
import { toast } from "./Toast.jsx";
import { CAPTION_STYLES } from "../remotion/captions.jsx";
import { GRADES } from "../remotion/Reel.jsx";
import { CATALOG } from "../remotion/effects/index.js";

const ROLES = [
  ["accent", "Accent", "Highlights, checklist ticks, chart, callouts"],
  ["primary", "Primary", "Main brand colour"],
  ["text", "Text", "Titles and labels"],
  ["outline", "Outline", "Title outline"],
  ["surface", "Panel", "Cards and panels"],
  ["surface_text", "Panel text", ""],
  ["caption_text", "Caption letters", ""],
  ["caption_outline", "Caption outline", ""],
  ["caption_active", "Caption active word", ""],
  ["caption_box", "Caption word box", "Used by the word-box caption style"],
];

export function BrandPanel({ project, brand, actions, fromServer }) {
  const [brands, setBrands] = useState([]);
  const [url, setUrl] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => setBrands(await api("GET", "/api/brands"));
  useEffect(() => { refresh(); }, []);
  const reload = async () => { fromServer(await api("GET", `/api/projects/${project.id}`)); refresh(); };

  const pick = async (bid) => { actions.setSettings({ brand: bid }); setTimeout(reload, 700); };
  const create = async () => {
    const name = prompt("Brand name", "My brand");
    if (!name) return;
    const b = await api("POST", "/api/brands", { name });
    await refresh();
    pick(b.id);
  };
  const put = async (patch) => { await api("PUT", `/api/brands/${brand.id}`, patch); reload(); };
  const doImport = async (files) => {
    if (!brand) return;
    const fd = new FormData();
    [...(files || [])].forEach((f) => fd.append("files", f));
    if (url.trim()) fd.append("url", url.trim());
    setBusy(true);
    try {
      const res = await api("POST", `/api/brands/${brand.id}/import`, fd, true);
      setReport(res.report);
      setUrl("");
      reload();
    } catch (e) { toast("Import failed: " + e.message, "err"); }
    setBusy(false);
  };

  const raw = brand || {};
  const colors = raw.colors || {};

  return (
    <div className="brandpanel">
      <div className="ph">
        <h4>Brand kit for this reel</h4>
        <button className="btn ghost small" onClick={create}>New brand</button>
      </div>
      <div className="pad">
        <select value={project.settings.brand || ""} onChange={(e) => pick(e.target.value)} style={{ width: "100%" }}>
          <option value="">No brand (studio default)</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {!brand ? <p className="muted small pad">A brand kit holds your colours, fonts, logo and caption style. Every caption, title, card and effect uses it. Create one and drop in your brand guide, font files, logos, or your website address.</p> : (
        <>
          <div className="dropbox" onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); doImport(e.dataTransfer.files); }}>
            <b>Drop brand files here</b>
            <span className="muted small">Brand guide (PDF, Markdown, text), colour list, fonts (ttf, otf, woff2), logos (png, svg)</span>
            <label className="btn ghost small">Choose files<input type="file" multiple hidden onChange={(e) => doImport(e.target.files)} /></label>
            <div className="row">
              <input type="text" placeholder="or your website, e.g. agilekaur.com" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} />
              <button className="btn ghost small" disabled={!url.trim() || busy} onClick={() => doImport([])}>Read site</button>
            </div>
            {busy ? <span className="muted small">Reading…</span> : null}
          </div>
          {report ? <div className="report">{report.map((r, k) => <div key={k}>{r}</div>)}
            <div className="muted small">Ask Claude to refine it: "/video-studio refine the {brand.name} brand kit from its guide".</div></div> : null}

          <div className="section">Colours</div>
          {raw.palette && raw.palette.length ? <div className="palette">{raw.palette.map((h) => <span key={h} className="sw" style={{ background: h }} title={h} onClick={() => navigator.clipboard && navigator.clipboard.writeText(h)} />)}</div> : null}
          {ROLES.map(([k, l, hint]) => (
            <div key={k} className="crow" title={hint}>
              <input type="color" value={colors[k] || "#000000"} onChange={(e) => put({ colors: { ...colors, [k]: e.target.value } })} />
              <span>{l}</span>
              <span className="muted small mono">{colors[k] || "default"}</span>
            </div>
          ))}

          <div className="section">Fonts</div>
          {(raw.font_files || []).length ? ["heading", "body", "caption"].map((role) => {
            const cur = (raw.fonts || {})[role];
            return (
              <div key={role} className="field">
                <div className="lbl">{role}</div>
                <select value={cur ? (raw.font_files.find((f) => f.family === cur.label && f.weight === cur.weight) || {}).file || "" : ""}
                  onChange={(e) => put({ fonts: { [role]: { file: e.target.value } } })}>
                  <option value="">Studio default</option>
                  {raw.font_files.map((f) => <option key={f.file} value={f.file}>{f.family} {f.weight}</option>)}
                </select>
                {cur ? <FontSample font={cur} /> : null}
              </div>
            );
          }) : <p className="muted small pad">{raw.font_names ? `The guide names: ${raw.font_names}. ` : ""}Drop the font files (ttf, otf, woff2) to use them.</p>}

          <div className="section">Logo</div>
          {(raw.logos || []).length ? (
            <>
              <div className="logos">{raw.logos.map((l) => (
                <img key={l.file} className={raw.logo_file === l.file ? "on" : ""} src={`/api/brands/${brand.id}/${l.file}`} alt={l.name} title={l.name} onClick={() => put({ logo_file: l.file })} />
              ))}</div>
              <div className="field"><div className="lbl">Show on video</div>
                <select value={raw.logo_position || "none"} onChange={(e) => put({ logo_position: e.target.value })}>
                  {[["none", "Hidden"], ["tl", "Top left"], ["tr", "Top right"], ["bl", "Bottom left"], ["br", "Bottom right"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div className="field"><div className="lbl">Logo height: {raw.logo_height || 72}px</div>
                <input type="range" min={30} max={220} value={raw.logo_height || 72} onChange={(e) => put({ logo_height: +e.target.value })} /></div>
            </>
          ) : <p className="muted small pad">Drop logo files (png or svg). A light version reads best on video.</p>}

          <div className="section">Defaults</div>
          <div className="field"><div className="lbl">Caption style</div>
            <div className="row">
              <select value={raw.caption_style || "bold"} onChange={(e) => put({ caption_style: e.target.value })} style={{ flex: 1 }}>
                {Object.entries(CAPTION_STYLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn ghost small" onClick={() => actions.setSettings({ caption_style: raw.caption_style || "bold", accent: "", grade: raw.grade || project.settings.grade })}>Use on this reel</button>
            </div></div>
          <div className="field"><div className="lbl">Colour grade</div>
            <select value={raw.grade || "none"} onChange={(e) => put({ grade: e.target.value })}>{Object.keys(GRADES).map((k) => <option key={k}>{k}</option>)}</select></div>
          <div className="field"><div className="lbl">Favourite effects ({(raw.favourites || []).length})</div>
            <div className="muted small">{(raw.favourites || []).map((id) => CATALOG[id] && CATALOG[id].name).filter(Boolean).join(", ") || "Star effects in the Effects tab."}</div></div>
          {raw.notes ? <details className="pad"><summary className="muted small">Guide text Claude can read</summary><pre className="notes">{raw.notes.slice(0, 3000)}</pre></details> : null}
          <div className="pad"><button className="btn ghost danger small" onClick={async () => { if (confirm(`Delete brand ${brand.name}?`)) { await api("DELETE", `/api/brands/${brand.id}`); pick(""); } }}>Delete brand</button></div>
        </>
      )}
    </div>
  );
}

function FontSample({ font }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const ff = new FontFace(font.family, `url(${font.url})`, { weight: String(font.weight || 400) });
    ff.load().then((x) => { document.fonts.add(x); setOk(true); }).catch(() => setOk(false));
  }, [font.family, font.url]);
  return <div className="fontsample" style={{ fontFamily: `"${font.family}"`, fontWeight: font.weight, opacity: ok ? 1 : 0.4 }}>The quick brown fox · 0123</div>;
}
