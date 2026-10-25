import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel.jsx";
import { computeTimeline, FPS, W, H } from "./timeline.js";

export const Root = () => (
  <Composition
    id="Reel"
    component={Reel}
    fps={FPS}
    width={W}
    height={H}
    durationInFrames={30}
    defaultProps={{ project: { id: "", clips: [], beats: [], items: [], media: [], settings: {} }, brand: null, base: "" }}
    calculateMetadata={({ props }) => ({ durationInFrames: computeTimeline(props.project).durationInFrames })}
  />
);
