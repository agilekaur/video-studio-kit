// The whole edit as one Remotion composition. Used by the editor Player and by render.mjs.
//
// Layer order (bottom to top):
//   base video (beat segments, speed, punch-in, grade)  ->  freeze layer
//   effect Behind  ->  speaker cutout (matte)  ->  effect Front
//   V2 media items  ->  T1 text items  ->  captions  ->  logo  ->  transitions
//   audio: voice (from base video), A2 music (ducked), A3 sfx, auto effect sfx
import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill, Sequence, OffthreadVideo, Img, Audio, Freeze, useCurrentFrame, useVideoConfig,
  delayRender, continueRender, interpolate, getRemotionEnvironment,
} from "remotion";
import { computeTimeline } from "./timeline.js";
import { EFFECTS } from "./effects/index.js";
import { Captions } from "./captions.jsx";
import { TextItem } from "./text.jsx";
import { MediaItem } from "./media.jsx";
import { mergeBrand, fill , mediaSrc, assetSrc } from "./kit.jsx";
import { BeatContext } from "./speaker.jsx";

export const GRADES = {
  none: "",
  warm: "saturate(1.12) contrast(1.04) sepia(.07)",
  moody: "contrast(1.1) saturate(.86) brightness(.97) hue-rotate(-6deg)",
  mono: "grayscale(1) contrast(1.12)",
  punchy: "contrast(1.14) saturate(1.2)",
  soft: "contrast(.94) saturate(.95) brightness(1.04)",
};

const SFX = { pop: "pop.mp3", whoosh: "whoosh.mp3", thud: "thud.mp3", shutter: "shutter.mp3", ding: "ding.mp3", tick: "tick.mp3" };

function useFonts(brand, base) {
  // only block frames while rendering; the editor Player just swaps fonts in when they arrive
  const [handle] = useState(() => (getRemotionEnvironment().isRendering ? delayRender("brand fonts") : null));
  useEffect(() => {
    const fonts = Object.values(brand.fonts || {}).filter((f) => f && f.url);
    const seen = new Set();
    Promise.all(fonts.map((f) => {
      const key = f.family + f.url;
      if (seen.has(key)) return null;
      seen.add(key);
      const ff = new FontFace(f.family, `url(${assetSrc(base, f.url)})`, { weight: String(f.weight || 400) });
      return ff.load().then((x) => document.fonts.add(x)).catch(() => null);
    })).finally(() => { if (handle !== null) continueRender(handle); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function hasCutout(project, b) {
  const fx = b && EFFECTS[b.effect];
  if (!fx) return false;
  const wants = [...(fx.meta.needs || []), ...(fx.meta.prefers || [])].includes("cutout");
  const clip = project.clips.find((c) => c.id === b.clip);
  return !!(wants && clip && clip.matte_status === "ready" && clip.matte);
}

function beatCtx(project, tl, beatInfo, frame, brand, base) {
  const b = project.beats.find((x) => x.id === beatInfo.id);
  const words = tl.words.filter((w) => w.beat === b.id).map((w) => ({ text: w.text, from: w.from - beatInfo.from, to: w.to - beatInfo.from }));
  const media = (id) => {
    const m = (project.media || []).find((x) => x.id === id);
    return m ? { ...m, url: mediaSrc(base, project, m.proxy || m.file) } : null;
  };
  return {
    frame: frame - beatInfo.from, frames: beatInfo.frames, fps: 30, params: b.params || {}, beat: b, brand,
    focus: (project.settings && project.settings.focus) || { x: 0.5, y: 0.32 }, words,
    text: words.map((w) => w.text).join(" "), media, base, project, hasCutout: hasCutout(project, b),
  };
}

function effectStyles(project, tl, beatInfo, frame, brand, base) {
  const b = project.beats.find((x) => x.id === beatInfo.id);
  const fx = b && EFFECTS[b.effect];
  const st = (fx && fx.styles && fx.styles(beatCtx(project, tl, beatInfo, frame, brand, base))) || {};
  return { b, fx, st };
}

function VideoSeg({ seg, project, tl, brand, base, layer }) {
  const frame = useCurrentFrame(); // local to the Sequence
  const clip = project.clips.find((c) => c.id === seg.clip);
  const beatInfo = tl.beats.find((x) => x.id === seg.beat);
  const g = seg.from + frame;
  const { b, st } = effectStyles(project, tl, beatInfo, g, brand, base);
  const focus = (project.settings && project.settings.focus) || { x: 0.5, y: 0.32 };
  const zoom = (+b.zoom || 1) * (st.zoom || 1);
  const grade = GRADES[(project.settings || {}).grade] || "";
  const extra = layer === "cutout" ? (st.cutout || st.base) : st.base;
  const src = layer === "cutout"
    ? mediaSrc(base, project, clip.matte)
    : mediaSrc(base, project, clip.proxy);
  const style = {
    ...fill, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
    transform: `scale(${zoom})`, filter: [grade, layer === "cutout" ? "" : st.filter || ""].join(" ").trim() || undefined,
    ...(extra || {}),
  };
  if (st.hideBase && layer !== "cutout") style.opacity = 0;
  const video = (
    <OffthreadVideo
      src={src}
      startFrom={Math.round(seg.s * 30)}
      playbackRate={seg.rate}
      muted={layer === "cutout" || seg.kind === "freeze" || seg.volume === 0}
      volume={seg.volume ?? 1}
      transparent={layer === "cutout"}
      style={{ width: 1080, height: 1920, objectFit: "cover" }}
    />
  );
  return <div style={style}>{seg.kind === "freeze" ? <Freeze frame={0}>{video}</Freeze> : video}</div>;
}

// Frozen picture for effects like freeze-label: first frame of the beat, held, audio keeps playing underneath.
function FreezeLayer({ beatInfo, project, tl, brand, base }) {
  const frame = useCurrentFrame();
  const seg = tl.segments.find((s) => s.beat === beatInfo.id);
  const clip = project.clips.find((c) => c.id === seg.clip);
  const { b, st } = effectStyles(project, tl, beatInfo, beatInfo.from + frame, brand, base);
  if (!st.freeze) return null;
  const focus = (project.settings && project.settings.focus) || { x: 0.5, y: 0.32 };
  const zoom = (+b.zoom || 1) * (st.zoom || 1);
  return (
    <div style={{ ...fill, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`, transform: `scale(${zoom})`,
      filter: `${GRADES[(project.settings || {}).grade] || ""} ${st.freezeFilter || "saturate(.2) brightness(.88)"}` }}>
      <Freeze frame={0}>
        <OffthreadVideo src={mediaSrc(base, project, clip.proxy)} startFrom={Math.round(seg.s * 30)} muted
          style={{ width: 1080, height: 1920, objectFit: "cover" }} />
      </Freeze>
    </div>
  );
}

function EffectLayer({ beatInfo, project, tl, brand, base, part }) {
  const frame = useCurrentFrame();
  const b = project.beats.find((x) => x.id === beatInfo.id);
  const fx = EFFECTS[b.effect];
  const Comp = fx && fx[part];
  if (!Comp) return null;
  const ctx = beatCtx(project, tl, beatInfo, beatInfo.from + frame, brand, base);
  return (
    <BeatContext.Provider value={{ beatInfo, project, tl, base }}>
      <AbsoluteFill style={{ overflow: "hidden" }}><Comp {...ctx} /></AbsoluteFill>
    </BeatContext.Provider>
  );
}

function Flash({ n = 5 }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, n], [0.92, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#fff", opacity: o }} />;
}

function Whip() {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backdropFilter: `blur(${o * 26}px)`, WebkitBackdropFilter: `blur(${o * 26}px)` }} />;
}

function Logo({ brand, base }) {
  if (!brand.logo || !brand.logo_position || brand.logo_position === "none") return null;
  const pos = { tl: { left: 60, top: 120 }, tr: { right: 170, top: 120 }, bl: { left: 60, bottom: 260 }, br: { right: 170, bottom: 260 } }[brand.logo_position] || { left: 60, top: 120 };
  return <Img src={assetSrc(base, brand.logo)} style={{ position: "absolute", height: brand.logo_height || 72, opacity: brand.logo_opacity ?? 0.9, ...pos }} />;
}

// Text items step aside while an effect owns the whole frame (split layouts move the speaker's face,
// so a title placed for the normal frame could land on it). Those effects draw their own text.
function TextGate({ item, project, tl, brand, base, focus }) {
  const frame = useCurrentFrame();
  const g = item.from + frame;
  const bi = tl.beats.find((b) => b.frames > 0 && b.from <= g && g < b.from + b.frames);
  if (bi) {
    const { st } = effectStyles(project, tl, bi, g, brand, base);
    if (st.hideBase) return null;
  }
  return <TextItem item={item} brand={brand} focus={focus} />;
}

// The logo steps aside too while an effect owns the whole frame.
function LogoGate({ project, tl, brand, base }) {
  const g = useCurrentFrame();
  const bi = tl.beats.find((b) => b.frames > 0 && b.from <= g && g < b.from + b.frames);
  if (bi && effectStyles(project, tl, bi, g, brand, base).st.hideBase) return null;
  return <Logo brand={brand} base={base} />;
}

// Music ducking: volume drops under speech.
function duckVolume(tl, item, base) {
  const speech = tl.words;
  const vol = Math.pow(10, (+item.params?.db ?? -18) / 20);
  const duck = Math.pow(10, (+item.params?.duck_db ?? -10) / 20);
  return (f) => {
    const g = item.from + f;
    if (item.params?.duck === false) return vol;
    const near = speech.some((w) => g >= w.from - 6 && g <= w.to + 8);
    return near ? vol * duck : vol;
  };
}

export const Reel = ({ project, brand: brandIn, base = "", showCaptions = true, showEffects = true, safeZone = null }) => {
  const brand = useMemo(() => mergeBrand(brandIn), [brandIn]);
  useFonts(brand, base);
  const tl = useMemo(() => computeTimeline(project), [project]);
  const items = project.items || [];
  const st = project.settings || {};
  const autoSfx = st.auto_sfx !== false;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {tl.segments.map((seg, k) => (
        <Sequence key={"v" + k} from={seg.from} durationInFrames={seg.frames} premountFor={20} layout="none">
          <VideoSeg seg={seg} project={project} tl={tl} brand={brand} base={base} layer="base" />
        </Sequence>
      ))}

      {showEffects && tl.beats.filter((b) => b.frames > 0).map((bi) => {
        const b = project.beats.find((x) => x.id === bi.id);
        const fx = EFFECTS[b.effect];
        if (!fx) return null;
        const cut = hasCutout(project, b);
        return (
          <Sequence key={"fx" + bi.id} from={bi.from} durationInFrames={bi.frames} layout="none">
            {fx.styles ? <FreezeLayer beatInfo={bi} project={project} tl={tl} brand={brand} base={base} /> : null}
            <EffectLayer beatInfo={bi} project={project} tl={tl} brand={brand} base={base} part="Behind" />
            {cut ? tl.segments.filter((s) => s.beat === bi.id).map((seg, k) => (
              <Sequence key={"c" + k} from={seg.from - bi.from} durationInFrames={seg.frames} layout="none">
                <VideoSeg seg={seg} project={project} tl={tl} brand={brand} base={base} layer="cutout" />
              </Sequence>
            )) : null}
            <EffectLayer beatInfo={bi} project={project} tl={tl} brand={brand} base={base} part="Front" />
            {autoSfx && fx.meta.sfx && SFX[fx.meta.sfx] ? (
              <Sequence from={0} durationInFrames={30} layout="none">
                <Audio src={`${base}/static/sfx/${SFX[fx.meta.sfx]}`} volume={0.35} />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}

      {items.filter((it) => it.track === "V2").map((it) => (
        <Sequence key={it.id} from={it.from} durationInFrames={Math.max(1, it.frames)} layout="none">
          <MediaItem item={it} project={project} base={base} brand={brand} />
        </Sequence>
      ))}
      {items.filter((it) => it.track === "T1").map((it) => (
        <Sequence key={it.id} from={it.from} durationInFrames={Math.max(1, it.frames)} layout="none">
          <TextGate item={it} project={project} tl={tl} brand={brand} base={base} focus={st.focus} />
        </Sequence>
      ))}

      {showCaptions && st.caption_style !== "off" ? <Captions tl={tl} project={project} brand={brand} /> : null}
      <LogoGate project={project} tl={tl} brand={brand} base={base} />

      {showEffects && tl.beats.filter((b) => b.frames > 0).map((bi) => {
        const b = project.beats.find((x) => x.id === bi.id);
        if (!b.transition || b.transition === "cut") return null;
        return (
          <Sequence key={"t" + bi.id} from={bi.from} durationInFrames={8} layout="none">
            {b.transition === "flash" ? <Flash /> : <Whip />}
            {autoSfx ? <Audio src={`${base}/static/sfx/${b.transition === "flash" ? SFX.shutter : SFX.whoosh}`} volume={0.3} /> : null}
          </Sequence>
        );
      })}

      {items.filter((it) => it.track === "A2" || it.track === "A3").map((it) => {
        const m = (project.media || []).find((x) => x.id === it.media);
        if (!m && !it.params?.sfx) return null;
        const src = it.params?.sfx ? `${base}/static/sfx/${SFX[it.params.sfx]}` : mediaSrc(base, project, m.file);
        return (
          <Sequence key={it.id} from={it.from} durationInFrames={Math.max(1, it.frames)} layout="none">
            <Audio src={src} startFrom={Math.round((it.in || 0) * 30)}
              volume={it.track === "A2" ? duckVolume(tl, it, base) : Math.pow(10, (+it.params?.db || 0) / 20)} />
          </Sequence>
        );
      })}

      {safeZone ? <SafeZone kind={safeZone} /> : null}
    </AbsoluteFill>
  );
};

// Platform UI guides, preview only.
export function SafeZone({ kind }) {
  const z = {
    reels: { top: 220, bottom: 420, right: 140, left: 60 },
    shorts: { top: 180, bottom: 380, right: 150, left: 60 },
    tiktok: { top: 160, bottom: 440, right: 150, left: 60 },
  }[kind] || { top: 220, bottom: 420, right: 140, left: 60 };
  const shade = "rgba(255,40,80,.16)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: z.top, background: shade }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: z.bottom, background: shade }} />
      <div style={{ position: "absolute", right: 0, top: z.top, bottom: z.bottom, width: z.right, background: shade }} />
      <div style={{ position: "absolute", left: z.left, right: z.right, top: z.top, bottom: z.bottom, border: "3px dashed rgba(255,255,255,.55)" }} />
    </AbsoluteFill>
  );
}
