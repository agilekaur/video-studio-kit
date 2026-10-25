# Colour Grade

**Description:** Moody teal and orange or bright warm grade, applied after cuts.

**When to use:** Whole video look.

**Inputs:** Edited clip, preset name.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Moody: `eq=contrast=1.1:saturation=1.1:gamma=0.95,colorbalance=rs=.08:gs=-.02:bs=-.1:rh=.1:bh=.1,vignette=PI/6`.
Bright warm: `eq=contrast=1.05:brightness=0.04:saturation=1.15,colorbalance=rm=.05:bm=-.06`.
Apply to the base video only, not to caption or graphic layers. Keep skin tones: compare mean hue on the face region before and after.

## Parameters and defaults
* moody vs bright warm, vignette optional

## QA checklist
* Skin natural. Highlights not clipped (YAVG under 235).
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
