# Transitions

**Description:** Hard cut default, flash, zoom through, whip.

**When to use:** Between sections.

**Inputs:** Two clips.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
* Hard cut: default, free.
* Flash: `xfade=transition=fadewhite:duration=0.15`.
* Whip: `xfade=transition=slideleft:duration=0.2` plus motion blur `tmix` and a whoosh.
* Zoom through: see zoom through skill.
Rule: no more than one non hard transition per 8 seconds.

## Parameters and defaults
* flash 0.15 s, whip 0.2 s

## QA checklist
* Audio crossfade matches the visual length.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
