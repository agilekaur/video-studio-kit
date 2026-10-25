# Screen Fall 3D

**Description:** Six identical drawn website screens pop in flat on the top panel, then tilt back 55 degrees and recede into a fog of the ground colour one after another. Speaker below the seam.

**When to use:** Volume or sameness lines ("every site looks the same", "thousands of templates").

**Inputs:** None (screens are drawn). Optional: swap the drawn screens for stills from the user's recordings.

**Implementation route:** Remotion (true CSS 3D). Composition `R3ScreenFall` (same as `ScreenFall`) in `~/video-studio/remotion/src/effects/ScreenFall.tsx`, composited by the lab's `~/video-studio/lab/effects/screen_fall_3d.py`.

## Step by step recipe
1. `cd ~/video-studio/remotion && npm run brand` so the colours follow brand.json.
2. Render the transparent layer: `npx remotion render src/index.ts R3ScreenFall ~/video-studio/lab/cache/remotion/screen-fall-3d/ --sequence --image-format=png`.
3. Composite the PNG sequence over the footage (the lab effect shows how). Cards fall from frame `fallStart` (default 30), staggered 3 frames.

## Parameters and defaults
* 6 cards 440x280, tilt 55 degrees, depth -1900 px, fall 50 frames

## QA checklist
* No accent colour on the screens. The fog is a flat colour, not a glow.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
