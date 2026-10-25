# Pull back Reveal

**Description:** Starts tight on a UI card, then pulls back on Z to reveal a multi plane workspace of floating cards with the speaker on one side.

**When to use:** Opening of a section about a system, workspace or tool stack. 1.5 to 2 seconds.

**Inputs:** Speaker clip, 4 to 8 UI card images.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion CSS 3D.
1. Scene with perspective 1400px. Cards at differing translateZ (0, -200, -450) and offsets, speaker video on a card at the right.
2. Camera is the parent: translateZ from +1100 to 0 over 20 frames, Easing.out(Easing.quart). Start framed on one card filling the screen.
3. Slight drift afterwards: rotateY 3 deg x sin(frame/40).
4. Background #0e0e10 with faint dot grid.

## Parameters and defaults
* camera move 20 frames, 8 cards, depth layers 3

## QA checklist
* First frame is a clean card, last frame shows the whole workspace.
* Text on cards stays legible at rest.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
