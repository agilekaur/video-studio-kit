# Chart Grow

**Description:** A line chart draws from bottom left to top right with a soft white gradient fill, overlaid on the speaker.

**When to use:** Beat about growth, revenue, views, progress. 1.5 to 2.5 seconds.

**Inputs:** Speaker clip, optional data points (otherwise a smooth rising curve).

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion SVG.
1. Path through 8 points rising with small dips. Use stroke white 8px, round caps.
2. Draw with stroke-dasharray equal to path length and stroke-dashoffset animated from length to 0 over 36 frames, ease out.
3. Fill: same path closed to the bottom, linearGradient white at 0.35 opacity to 0 at the base, clipped by a rect whose width grows with the line.
4. Add an end dot with a glow when drawing finishes.
5. ffmpeg fallback: pre render the chart as a PNG sequence from Python PIL and overlay.

## Parameters and defaults
* draw time 1.2 s, stroke 8px, fill opacity 0.35 to 0

## QA checklist
* Line starts at the frame bottom and ends high right.
* Chart does not hide the face.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
