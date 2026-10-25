// "Try it on your video": the /video-studio skill in the visitor's browser. Their clip is transcribed,
// storyboarded into beats, each beat gets its best-fit effect, and the full edit plays in their brand.
// Nothing is uploaded: the clip, guide, fonts and logo stay as local blob: URLs.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { Reel } from "../remotion/Reel.jsx";
import { CATALOG } from "../remotion/effects/index.js";
import { computeTimeline } from "../remotion/timeline.js";
import { DEFAULT_BRAND } from "../remotion/kit.jsx";
import { brandFromFiles } from "./brandFiles.js";
import { storyboard, pickEffect, keyWord, topicWord, topicFreq, PURPOSE_LABEL } from "./storyboard.js";

const FPS = 30;
const MAX_SECONDS = 60;
const GROUPS = [
  ["hook", "Hook"], ["list", "List"], ["tools", "Tools and product"], ["proof", "Proof"],
  ["point", "Point"], ["punch", "Punch line"], ["cta", "Call to action"],
];
const ORDERED = GROUPS.flatMap(([k, label]) =>
  Object.values(CATALOG).filter((e) => e.id !== "none" && (e.purposes || [])[0] === k).map((e) => ({ ...e, group: label })));

// The general brand: neutral studio look, set in the faces this page already embeds.
const GENERAL = {
  ...DEFAULT_BRAND,
  id: "general",
  name: "General",
  fonts: {
    heading: { family: "Cabinet Grotesk", weight: 800 },
    caption: { family: "Cabinet Grotesk", weight: 800 },
    body: { family: "Satoshi", weight: 500 },
  },
};

function paramsFor(id, text, purpose, freq = {}) {
  const e = CATALOG[id];
  const p = {};
  for (const f of (e && e.params) || []) p[f.key] = Array.isArray(f.default) ? [...f.default] : f.default;
  if (["cover-story", "glass-type", "text-explosion", "vertigo", "headline-wall"].includes(id)) p.word = topicWord(text, freq) || keyWord(text);
  if (id === "outro-comment-ui") {
    const m = text.match(/\b(?:comment|type)\s+["']?([A-Za-z0-9]+)/i);
    p.keyword = (m ? m[1] : keyWord(text)).toUpperCase();
  }
  if (id === "checklist" || id === "mock-app-window") p.title = text.split(/\s+/).slice(0, 4).join(" ").replace(/[,.]$/, "").toUpperCase();
  const [auto, autoParams] = pickEffect(purpose || "point", text, freq);
  return auto === id ? { ...p, ...autoParams } : p;
}

// A typed line with no transcript: spread across the clip; longer words get more time.
function wordsFor(line, seconds) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const start = 0.25, end = Math.max(start + 1, seconds - 0.35);
  const weights = tokens.map((t) => 0.6 + Math.min(t.length, 12) * 0.12 + (/[.,!?]$/.test(t) ? 0.5 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = start;
  return tokens.map((w, i) => {
    const d = ((end - start) * weights[i]) / total;
    const word = { w, s: +t.toFixed(3), e: +(t + d * 0.86).toFixed(3) };
    t += d;
    return word;
  });
}

// A pasted script on top of the transcript: align the two word lists (edit-distance alignment) so every
// script word takes the timing of the heard word it lines up with. The script's spelling always wins
// (Whisper hears "Vercel" as "versatile"); extra script words share time with their neighbours.
const normTok = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
function timedWords(line, heard) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (!heard.length) return [];
  if (!tokens.length) return heard;
  const A = tokens.map(normTok), B = heard.map((w) => normTok(w.w));
  const n = A.length, m = B.length;
  // dp over (script i, heard j); substitution is cheaper when the words share their first letters
  const cost = (x, y) => (x === y ? 0 : x && y && (x.startsWith(y.slice(0, 3)) || y.startsWith(x.slice(0, 3))) ? 0.6 : 1);
  const D = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  for (let i = 1; i <= n; i++) D[i][0] = i;
  for (let j = 1; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    D[i][j] = Math.min(D[i - 1][j - 1] + cost(A[i - 1], B[j - 1]), D[i - 1][j] + 1, D[i][j - 1] + 1);
  const match = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (D[i][j] === D[i - 1][j - 1] + cost(A[i - 1], B[j - 1])) { match[i - 1] = j - 1; i--; j--; }
    else if (D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  // unmatched script words: spread between the nearest matched neighbours
  const out = [];
  for (let i = 0; i < n; i++) {
    if (match[i] >= 0) { const h = heard[match[i]]; out.push({ w: tokens[i], s: h.s, e: h.e }); continue; }
    let k = i; while (k < n && match[k] < 0) k++;
    const prevEnd = out.length ? out[out.length - 1].e : heard[0].s;
    const nextStart = k < n ? heard[match[k]].s : heard[m - 1].e + 0.3;
    const gap = Math.max(nextStart - prevEnd, 0.12 * (k - i));
    const step = gap / (k - i);
    for (let q = i; q < k; q++) out.push({ w: tokens[q], s: prevEnd + (q - i) * step, e: prevEnd + (q - i + 0.9) * step });
    i = k - 1;
  }
  // matched words never overlap the inserted ones
  for (let i = 1; i < out.length; i++) if (out[i].s < out[i - 1].s) out[i].s = out[i - 1].s + 0.01;
  return out;
}

function probeVideo(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => resolve({ duration: v.duration, w: v.videoWidth, h: v.videoHeight });
    v.onerror = () => reject(new Error("This browser cannot play that file. Try an MP4 (H.264) or MOV."));
    v.src = url;
  });
}

// effects whose big on-screen word the storyboard lets you edit
const bigWordKey = (id) => (["cover-story", "glass-type", "text-explosion", "vertigo", "headline-wall"].includes(id) ? "word" : id === "outro-comment-ui" ? "keyword" : null);

const fmt = (frames) => { const t = frames / FPS; return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`; };

export function TryIt({ exampleBase = "v/" }) {
  const [clip, setClip] = useState(null);
  const [clipError, setClipError] = useState("");
  const [brandMode, setBrandMode] = useState("general");
  const [ownBrand, setOwnBrand] = useState(null);
  const [report, setReport] = useState([]);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState("");
  const [heard, setHeard] = useState([]);
  const [stt, setStt] = useState({ status: "idle", stage: "" });
  const [overrides, setOverrides] = useState({}); // beat id -> effect id the visitor picked
  const [wordEdits, setWordEdits] = useState({}); // beat id -> big word the visitor typed
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState({ x: 0.5, y: 0.32 });
  const [placingFace, setPlacingFace] = useState(false);
  const [muted, setMuted] = useState(true);
  const playerRef = useRef(null);
  const panelRef = useRef(null);
  const sttRun = useRef(0);
  const sbRef = useRef(null);

  const brand = useMemo(() => {
    if (brandMode !== "own" || !ownBrand) return GENERAL;
    return {
      ...GENERAL, ...ownBrand,
      colors: { ...GENERAL.colors, ...ownBrand.colors },
      fonts: { ...GENERAL.fonts, ...(ownBrand.fonts || {}) },
      logo_position: ownBrand.showLogo === false ? "none" : ownBrand.logo_position,
    };
  }, [brandMode, ownBrand]);

  const runTranscription = async (file, secs) => {
    const run = ++sttRun.current;
    setHeard([]);
    setStt({ status: "running", stage: "Starting" });
    try {
      const mod = await import("./stt.js");
      const words = await mod.transcribe(file, secs, (stage) => { if (sttRun.current === run) setStt({ status: "running", stage }); });
      if (sttRun.current !== run) return;
      setHeard(words);
      setLine((cur) => (cur.trim() ? cur : words.map((w) => w.w).join(" ")));
      setStt({ status: words.length ? "done" : "empty", stage: "" });
    } catch (e) {
      if (sttRun.current === run) setStt({ status: "error", stage: e.message || String(e) });
    }
  };

  // #stt-check on the page link: run the speech model on a 2 s test tone (checks the hosted runtime loads)
  useEffect(() => {
    if (location.hash !== "#stt-check") return;
    const sr = 16000, n = sr * 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin((i / sr) * 2 * Math.PI * 220) * 3000, true);
    runTranscription(new File([buf], "check.wav", { type: "audio/wav" }), 2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onClip = async (file) => {
    if (!file) return;
    setClipError("");
    if (!/^video\//.test(file.type) && !/\.(mp4|mov|m4v|webm)$/i.test(file.name)) { setClipError("That isn't a video file. Drop an MP4 or MOV."); return; }
    const url = URL.createObjectURL(file);
    try {
      const meta = await probeVideo(url);
      if (clip) URL.revokeObjectURL(clip.url);
      setClip({ url, name: file.name, ...meta });
      setOverrides({});
      setWordEdits({});
      setSelected(null);
      runTranscription(file, Math.min(meta.duration || 10, MAX_SECONDS));
    } catch (e) {
      URL.revokeObjectURL(url);
      setClipError(e.message);
    }
  };

  const onBrandFiles = async (files) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const res = await brandFromFiles([...files], ownBrand);
      setOwnBrand({ ...res.brand, showLogo: ownBrand ? ownBrand.showLogo : true });
      setReport(res.report);
      setBrandMode("own");
    } finally { setBusy(false); }
  };

  const setColor = (k, v) => {
    setOwnBrand((b) => ({ ...(b || { id: "yours", name: "Your brand", colors: {}, fonts: {} }), colors: { ...((b && b.colors) || {}), [k]: v } }));
    setBrandMode("own");
  };

  // ---- the edit: words -> storyboard -> project
  const seconds = clip ? Math.min(clip.duration || 10, MAX_SECONDS) : 10;
  const settings = useMemo(() => ({
    caption_style: brand.caption_style || "bold", caption_words: 3, caption_y: 1100, accent: "", grade: "none",
    max_gap: 0.45, tighten: 1, focus, auto_sfx: false,
  }), [brand.caption_style, focus]);
  const words = useMemo(() => (heard.length ? timedWords(line, heard) : line.trim() && stt.status !== "running" ? wordsFor(line, seconds) : []),
    [heard, line, seconds, stt.status]);
  const board = useMemo(() => (words.length ? storyboard(words, settings) : null), [words, settings]);
  const project = useMemo(() => {
    if (!clip) return null;
    if (!board) {
      return {
        id: "try", settings: { ...settings, caption_style: "off", max_gap: 99 },
        clips: [{ id: "c1", name: clip.name, proxy: clip.url, duration: clip.duration, status: "ready", words: [{ w: "", s: 0, e: Math.max(0.5, seconds - 0.1) }] }],
        beats: [{ id: "b0", clip: "c1", w0: 0, w1: 0, cut: false, purpose: "point", effect: "none", params: {}, zoom: 1, speed: 1, ramp: null, freeze: 0, volume: 1, transition: "cut" }],
        items: [], media: [],
      };
    }
    const text = (b) => board.words.slice(b.w0, b.w1 + 1).filter((w) => !w.cut).map((w) => w.w).join(" ");
    const freq = topicFreq(board.words.filter((w) => !w.cut).map((w) => w.w).join(" "));
    const beats = board.beats.map((b) => {
      let nb = overrides[b.id] && overrides[b.id] !== b.effect
        ? { ...b, effect: overrides[b.id], params: paramsFor(overrides[b.id], text(b), b.purpose, freq), zoom: 1 } : b;
      const key = bigWordKey(nb.effect);
      if (key && wordEdits[b.id] != null) nb = { ...nb, params: { ...nb.params, [key]: wordEdits[b.id] } };
      return nb;
    });
    return { id: "try", settings, clips: [{ id: "c1", name: clip.name, proxy: clip.url, duration: clip.duration, status: "ready", words: board.words }], beats, items: [], media: [] };
  }, [clip, board, overrides, wordEdits, settings, seconds]);
  const tl = useMemo(() => (project ? computeTimeline(project) : null), [project]);

  const seekBeat = (id) => {
    setSelected(id);
    const bi = tl && tl.beats.find((b) => b.id === id);
    const p = playerRef.current;
    if (bi && bi.frames && p) { p.seekTo(bi.from); p.play(); }
  };

  // the page's effect cards call window.vsTry(id): put that effect on the selected beat
  const apiRef = useRef({});
  apiRef.current = { project, selected, seekBeat };
  useEffect(() => {
    window.vsTry = (id) => {
      const { project: pr, selected: sel, seekBeat: seek } = apiRef.current;
      const live = pr && pr.beats.filter((b) => !b.cut && b.id !== "b0");
      if (CATALOG[id] && live && live.length) {
        const target = live.find((b) => b.id === sel) || live.find((b) => b.effect === "none") || live[0];
        setOverrides((o) => ({ ...o, [target.id]: id }));
        setTimeout(() => seek(target.id), 50);
      }
      if (panelRef.current) panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return () => { delete window.vsTry; };
  }, []);

  useEffect(() => {
    const p = playerRef.current;
    if (p && board) { p.seekTo(0); p.play(); }
  }, [board && board.beats.length, clip && clip.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeFace = (e) => {
    if (!placingFace) return;
    const r = e.currentTarget.getBoundingClientRect();
    setFocus({ x: +((e.clientX - r.left) / r.width).toFixed(3), y: +((e.clientY - r.top) / r.height).toFixed(3) });
    setPlacingFace(false);
  };

  const C = brand.colors;
  const working = clip && stt.status === "running";
  const bigCount = project && board ? project.beats.filter((b) => !b.cut && CATALOG[b.effect] && CATALOG[b.effect].big).length : 0;

  return (
    <div className="try" ref={panelRef}>
      <ol className="try-how">
        <li><b>Transcribe</b><span>Every word of your clip, with its timing, in your browser.</span></li>
        <li><b>Storyboard</b><span>Split into beats of one idea each. Pauses, ums and retakes are cut.</span></li>
        <li><b>Pick effects</b><span>Each beat gets the effect that fits it: a hook, a list, proof, a call to action. Big effects are spaced out so the edit breathes.</span></li>
        <li><b>Render</b><span>Captions and graphics in your brand, timed to your words. Change any beat below.</span></li>
      </ol>

      <div className="try-steps">
        <Step n="1" title="Your talking head" done={!!clip}>
          <DropZone accept="video/*" onFiles={(fs) => onClip(fs[0])} label={clip ? `Using ${clip.name}` : "Drop a video, or choose a file"}
            hint={clip ? `${Math.round(clip.duration)}s${clip.duration > MAX_SECONDS ? `, editing the first ${MAX_SECONDS}s` : ""}` : `MP4 or MOV, up to ${MAX_SECONDS} seconds is edited. Vertical or landscape.`} id="try-clip" />
          {clipError ? <p className="try-error" role="alert">{clipError}</p> : null}
        </Step>

        <Step n="2" title="Your brand" done={brandMode === "own"}>
          <div className="try-seg" role="radiogroup" aria-label="Brand">
            <button type="button" role="radio" aria-checked={brandMode === "general"} onClick={() => setBrandMode("general")}>General brand</button>
            <button type="button" role="radio" aria-checked={brandMode === "own"} onClick={() => setBrandMode("own")} disabled={!ownBrand}>Your brand kit</button>
          </div>
          <p className="try-note">If you don't add a brand kit, the preview uses the general brand.</p>
          <DropZone multiple onFiles={onBrandFiles} label={busy ? "Reading your brand files…" : "Drop your brand kit"}
            hint="Brand guide (PDF, Markdown or text with your hex codes), font files, logos." id="try-brand" />
          <SkillOffer />
          {report.length ? <ul className="try-report">{report.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
          {brandMode === "own" ? (
            <div className="try-colors">
              {[["accent", "Accent"], ["caption_box", "Caption box"], ["surface", "Panels"], ["surface_text", "Panel text"]].map(([k, l]) => (
                <label key={k} className="try-color">
                  <input type="color" value={C[k] || "#000000"} onChange={(e) => setColor(k, e.target.value)} id={`try-c-${k}`} />
                  <span>{l}</span>
                </label>
              ))}
              {ownBrand && ownBrand.logo ? (
                <label className="try-check"><input type="checkbox" checked={ownBrand.showLogo !== false} id="try-logo"
                  onChange={(e) => setOwnBrand((b) => ({ ...b, showLogo: e.target.checked }))} /> Show logo</label>
              ) : null}
            </div>
          ) : null}
        </Step>

        <Step n="3" title="Your script" done={!!line.trim()} optional>
          <p className="try-note">Paste the script you read. It corrects the captions and steers the storyboard. Leave it empty and the transcript is used.</p>
          {stt.status === "running" ? <p className="try-status" role="status">{stt.stage}…</p> : null}
          {stt.status === "done" ? <p className="try-status" role="status">Check names and brands in the text below. Speech recognition often mishears them (Vercel can come out as "versatile"). Fix them here or paste your script.</p> : null}
          {stt.status === "empty" ? <p className="try-note">No speech found in the clip. Paste your script to add captions.</p> : null}
          {stt.status === "error" ? <p className="try-error" role="alert">Couldn't transcribe this clip ({stt.stage}). Paste your script; it will be spread across the clip.</p> : null}
          <textarea id="try-line" rows={5} value={line} onChange={(e) => setLine(e.target.value)}
            placeholder={clip ? "Your words appear here after transcription, or paste your script." : "Paste your script here, or drop a clip and it's transcribed for you."} />
        </Step>
      </div>

      <div className="try-stage">
        <div className="try-stage-head">
          <span className="try-kicker">{clip ? (working ? "Editing…" : "Your edit") : "Example edit"}</span>
          <h3>{clip ? (board ? `${project.beats.filter((b) => !b.cut).length} beats · ${bigCount} big effects · ${fmt(tl.durationInFrames)}` : working ? stt.stage : "Waiting for words") : "Your video, edited"}</h3>
        </div>
        <div className={"try-screen" + (placingFace ? " placing" : "")} onClickCapture={placeFace}>
          {clip && tl ? (
            <Player ref={playerRef} component={Reel} inputProps={{ project, brand, base: "" }}
              durationInFrames={tl.durationInFrames} fps={FPS} compositionWidth={1080} compositionHeight={1920}
              style={{ width: "100%", height: "100%" }} loop autoPlay initiallyMuted clickToPlay={false} controls />
          ) : (
            <video src={`${exampleBase}agilekaur_short.mp4`} poster={`${exampleBase}agilekaur_short.jpg`} autoPlay muted loop playsInline />
          )}
          {placingFace ? <div className="try-face" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} /> : null}
        </div>
        {clip ? (
          <div className="try-tools">
            <button type="button" onClick={() => { const p = playerRef.current; if (!p) return; if (muted) { p.unmute(); p.play(); } else p.mute(); setMuted(!muted); }}>
              {muted ? "Sound on" : "Sound off"}
            </button>
            <button type="button" onClick={() => setPlacingFace((v) => !v)} aria-pressed={placingFace}>{placingFace ? "Click the face" : "Set face point"}</button>
          </div>
        ) : null}
        <p className="try-note">
          {clip ? "Preview quality, made in your browser. Effects that layer graphics behind your head use their front version here; the full Video Studio cuts you out for those."
            : "A finished edit made by Video Studio. Drop your own clip to get yours."}
        </p>
      </div>

      {clip && board ? (
        <div className="try-board" ref={sbRef}>
          <div className="try-board-head"><h4>Storyboard</h4><span>Click a beat to jump to it. Change its effect to re-edit that beat.</span></div>
          <div className="try-table" role="table" aria-label="Storyboard">
            {project.beats.map((b, k) => {
              const bi = tl.beats.find((x) => x.id === b.id);
              const t = board.words.slice(b.w0, b.w1 + 1).filter((w) => !w.cut).map((w) => w.w).join(" ");
              return (
                <div key={b.id} role="row" className={"try-row" + (b.cut ? " cut" : "") + (selected === b.id ? " on" : "")} onClick={() => !b.cut && seekBeat(b.id)}>
                  <span className="try-cell n" role="cell">{k + 1}</span>
                  <span className="try-cell tm" role="cell">{b.cut ? "cut" : bi && bi.frames ? fmt(bi.from) : ""}</span>
                  <span className="try-cell txt" role="cell">{t || "(cut)"}{b.cut ? <em> retake removed</em> : null}</span>
                  <span className="try-cell pur" role="cell">{PURPOSE_LABEL[b.purpose] || b.purpose}</span>
                  <span className="try-cell fx" role="cell" onClick={(e) => e.stopPropagation()}>
                    {!b.cut && bigWordKey(b.effect) ? (
                      <input type="text" className="try-word" id={`try-word-${b.id}`} aria-label={`Big word for beat ${k + 1}`}
                        value={(b.params && b.params[bigWordKey(b.effect)]) || ""} placeholder="Big word"
                        onChange={(e) => setWordEdits((w) => ({ ...w, [b.id]: e.target.value.toUpperCase() }))} />
                    ) : null}
                    {b.cut ? null : (
                      <select id={`try-fx-${b.id}`} aria-label={`Effect for beat ${k + 1}`} value={b.effect}
                        onChange={(e) => { setOverrides((o) => ({ ...o, [b.id]: e.target.value })); setTimeout(() => seekBeat(b.id), 50); }}>
                        <option value="none">No effect</option>
                        {GROUPS.map(([g, label]) => (
                          <optgroup key={g} label={label}>
                            {ORDERED.filter((e) => (e.purposes || [])[0] === g).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// "No brand kit yet?": the /video-brand-kit skill, published next to the page, copied for Claude Code.
const SKILL_URL = "skills/video-brand-kit/SKILL.md";
const INSTALL = "mkdir -p ~/.claude/skills/video-brand-kit && pbpaste > ~/.claude/skills/video-brand-kit/SKILL.md";

function SkillOffer() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const area = useRef(null);
  const load = async () => {
    if (text) return text;
    const r = await fetch(SKILL_URL);
    if (!r.ok) throw new Error("The skill file could not be loaded.");
    const t = await r.text();
    setText(t);
    return t;
  };
  const copy = async (value, done) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(done);
    } catch (e) {
      setOpen(true);
      setStatus("Copy didn't work here. Select the text below and copy it.");
      setTimeout(() => area.current && area.current.select(), 50);
    }
  };
  return (
    <div className="try-skill">
      <b>No brand kit yet?</b>
      <p>Get the free <code>/video-brand-kit</code> skill for Claude Code. It asks about your brand, shows three looks to pick from, and builds a kit (colours, fonts, logo, caption and video rules) that you can drop in here.</p>
      <ol>
        <li><button type="button" onClick={async () => { try { const t = await load(); copy(t, "Skill copied. Now copy the install command."); } catch (e) { setStatus(e.message); } }}>Copy the skill</button></li>
        <li>In Terminal on your Mac, run: <code className="try-cmd">{INSTALL}</code>
          <button type="button" onClick={() => copy(INSTALL, "Command copied. Paste it into Terminal and press Return.")}>Copy command</button></li>
        <li>Open Claude Code and type <code>/video-brand-kit</code>.</li>
      </ol>
      {status ? <p className="try-status" role="status">{status}</p> : null}
      <details open={open} onToggle={(e) => { setOpen(e.currentTarget.open); if (e.currentTarget.open) load().catch(() => {}); }}>
        <summary>Read the skill</summary>
        <textarea ref={area} id="try-skill-text" readOnly rows={10} value={text || "Loading…"} />
      </details>
    </div>
  );
}

function Step({ n, title, done, optional, children }) {
  return (
    <div className={"try-step" + (done ? " done" : "")}>
      <div className="try-step-head"><span className="try-n">{n}</span><h4>{title}</h4>{optional ? <span className="try-opt">Optional</span> : null}</div>
      {children}
    </div>
  );
}

function DropZone({ onFiles, label, hint, accept, multiple, id }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);
  return (
    <div className={"try-drop" + (over ? " over" : "")}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}>
      <b>{label}</b>
      <span>{hint}</span>
      <button type="button" onClick={() => input.current && input.current.click()}>Choose {multiple ? "files" : "a file"}</button>
      <input ref={input} id={id} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
