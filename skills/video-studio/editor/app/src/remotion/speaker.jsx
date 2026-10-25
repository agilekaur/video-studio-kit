// <Speaker/>: lets an effect redraw the current beat's footage inside its own layout
// (viewfinder window, collage tile, split screen, phone screen...). Timing, speed and freezes
// match the base video exactly because it reuses the beat's segments.
import React, { createContext, useContext } from "react";
import { mediaSrc } from "./kit.jsx";
import { Sequence, OffthreadVideo, Freeze } from "remotion";

export const BeatContext = createContext(null);

export function Speaker({ style, zoom = 1, filter, cutout = false, origin, objectFit = "cover" }) {
  const ctx = useContext(BeatContext);
  if (!ctx) return null;
  const { beatInfo, project, tl, base } = ctx;
  const focus = (project.settings && project.settings.focus) || { x: 0.5, y: 0.32 };
  const segs = tl.segments.filter((s) => s.beat === beatInfo.id);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, overflow: "hidden", ...style }}>
      {segs.map((seg, k) => {
        const clip = project.clips.find((c) => c.id === seg.clip);
        const file = cutout ? clip.matte : clip.proxy;
        if (!file) return null;
        const v = (
          <OffthreadVideo src={mediaSrc(base, project, file)} startFrom={Math.round(seg.s * 30)}
            playbackRate={seg.rate} muted transparent={cutout} style={{ width: "100%", height: "100%", objectFit }} />
        );
        return (
          <Sequence key={k} from={seg.from - beatInfo.from} durationInFrames={seg.frames} layout="none">
            <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: origin || `${focus.x * 100}% ${focus.y * 100}%`, filter }}>
              {seg.kind === "freeze" ? <Freeze frame={0}>{v}</Freeze> : v}
            </div>
          </Sequence>
        );
      })}
    </div>
  );
}
