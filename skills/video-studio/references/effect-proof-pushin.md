# Proof Push-in

**Description:** A clean result page fills the top half and slowly pushes in towards one line while a cursor glides to it, a tint sweep marks the key phrase and a small badge springs onto it.

**When to use:** "It hands you X". Point at the one line of a result the speaker names.

**Inputs:** A screen recording or a drawn result page, the key phrase from the script.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/proof_pushin.py`.

## Step by step recipe
1. Page: ground card on the surface colour, a title in the display font, skeleton bars in the pressed colour for content you do not have. Never invent numbers; use skeleton bars instead.
2. Push in 1.00 to 1.08 over the beat towards the key line.
3. Cursor glides to the line, a tint sweep runs across the key phrase on the spoken words, then an ink badge springs on.

## Parameters and defaults
* push 1.00 to 1.08, sweep 0.7 s, accent used once

## QA checklist
* The key phrase is in the script. Skeleton bars stand in for anything not supplied.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
