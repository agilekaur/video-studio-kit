# Hand drawn Arrows and Labels

**Description:** Hand drawn arrows with handwritten labels pointing at the subject.

**When to use:** Call out a detail on the speaker or on an object.

**Inputs:** Speaker clip, target points, label text.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion SVG.
1. Arrow path: a curved bezier with small random wobble, stroke white 6px, arrowhead drawn as two strokes.
2. Draw with stroke-dashoffset in 12 frames, then the label types in a handwriting font (for example Caveat or Patrick Hand).
3. Wobble: re render the path noise every 3 frames (seeded) for the boil.

## Parameters and defaults
* stroke 6px, draw 12 frames, wobble every 3 frames

## QA checklist
* Arrow tip on the exact target. Handwriting is legible.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
