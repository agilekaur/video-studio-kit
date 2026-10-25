// V2 track: B-roll, screen recordings, images, logos on top of the main video.
import React from "react";
import { mediaSrc } from "./kit.jsx";
import { useCurrentFrame, useVideoConfig, spring, interpolate, OffthreadVideo, Img } from "remotion";

export const MEDIA_LAYOUTS = {
  full: "Full screen",
  top: "Top half",
  card: "Floating card",
  pip: "Picture in picture",
  corner: "Corner logo",
};

export function MediaItem({ item, project, base }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = (project.media || []).find((x) => x.id === item.media);
  if (!m) return null;
  const p = item.params || {};
  const layout = p.layout || "full";
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 160 } });
  const out = interpolate(frame, [item.frames - 5, item.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const url = mediaSrc(base, project, m.proxy || m.file);
  const box = {
    full: { left: 0, top: 0, width: 1080, height: 1920, radius: 0 },
    top: { left: 0, top: 0, width: 1080, height: 960, radius: 0 },
    card: { left: 90, top: 330, width: 900, height: 900 * ((m.h || 9) / (m.w || 16)) || 506, radius: 32 },
    pip: { left: 600, top: 240, width: 400, height: 400 * ((m.h || 16) / (m.w || 9)), radius: 26 },
    corner: { left: 60, top: 120, width: 180, height: 180 * ((m.h || 1) / (m.w || 1)), radius: 0 },
  }[layout];
  const enter = p.anim === "none" ? 1 : s;
  const transform = p.anim === "slide" ? `translateY(${(1 - enter) * 1920}px)` : `scale(${0.85 + 0.15 * enter})`;
  const media = m.kind === "image"
    ? <Img src={url} style={{ width: "100%", height: "100%", objectFit: layout === "corner" ? "contain" : p.fit || "cover" }} />
    : <OffthreadVideo src={url} startFrom={Math.round((item.in || 0) * fps)} volume={Math.pow(10, (+p.db || -60) / 20)} muted={!p.db || +p.db <= -60}
        style={{ width: "100%", height: "100%", objectFit: p.fit || "cover" }} />;
  return (
    <div style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: box.radius,
      overflow: "hidden", opacity: (p.opacity ?? 1) * out * (p.anim === "fade" ? enter : 1), transform,
      boxShadow: box.radius ? "0 24px 60px rgba(0,0,0,.45)" : "none" }}>
      {media}
    </div>
  );
}
