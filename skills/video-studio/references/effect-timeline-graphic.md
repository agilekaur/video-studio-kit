# Timeline Graphic

**Description:** An editor timeline with V1, V2 and A1 tracks and clips sliding in.

**When to use:** Beat about editing or process.

**Inputs:** Clip names.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion.
1. Panel with three rows (V1, V2, A1), coloured blocks (blue, purple, green) sliding in from the left with stagger 4 frames.
2. A white playhead line moves left to right over the beat.
3. Audio block gets a small waveform drawn from random bars.

## Parameters and defaults
* rows 3, playhead linear

## QA checklist
* Playhead crosses all tracks. Labels legible.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
