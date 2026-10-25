# Kinetic CTA

**Description:** Full-frame speaker while huge outlined words hard-cut in on each spoken word of the closing line, with a 2-frame scale pop and one small punch-in on the strongest word.

**When to use:** The call to action or last line of the video. One beat, 2 to 3 seconds.

**Inputs:** Speaker clip, words.json, the closing line split into 3 to 5 word groups.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/kinetic_cta.py`.

## Step by step recipe
1. Split the closing line into word groups of 1 to 3 words. Each group appears 1 frame before its first word is spoken and stays until the next group.
2. Draw each group in the brand display font, upper case, in the caption fill colour with a 6 px outline in the caption stroke colour. Size it to about 80 percent of the safe width, capped at 380 px tall.
3. Pop: scale 1.06 to 1.00 over 2 frames. No fades.
4. Punch the footage in 4 percent on the one strongest group. Only one group may sit on the accent box (if the brand uses one).

## Parameters and defaults
* centre line y 1150, width 80 percent of the safe area, outline 6 px, pop 2 frames

## QA checklist
* Every word on screen is in the script. Words never cover the face.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
