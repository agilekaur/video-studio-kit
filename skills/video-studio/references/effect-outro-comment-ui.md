# Outro Comment UI

**Description:** A fake comment box with a typed keyword and a reply bubble with a link icon pops up from the bottom with a spring.

**When to use:** Call to action ('comment GUIDE and I will send it'). 2 to 3 seconds.

**Inputs:** Speaker clip, keyword, reply text.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion.
1. Card: white, radius 28, 880px wide, avatar circle, name line, typed keyword using a typewriter (one character per 2 frames) with a blinking cursor.
2. After typing, a reply bubble (grey) springs in beneath with a link icon and a short line ('sent').
3. Entrance: translateY 400 to 0 with spring damping 14.
4. Keep the card at the lower third, above platform UI (y 1200 to 1500).

## Parameters and defaults
* typing 2 frames per character, spring damping 14

## QA checklist
* Keyword spelt exactly as the CTA. Card clear of platform buttons.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
