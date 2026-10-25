# Title Lockup

**Description:** A huge two-line headline with one small connecting word pulls into focus over the speaker's chest, drifts slowly, then smears off to the left with horizontal motion blur.

**When to use:** One key idea per video ("the whole setup", "here's the catch"). One beat, 1.5 to 2 seconds.

**Inputs:** Three short strings from the script: small word, top line, bottom line.

**Implementation route:** Remotion. Composition `R1TitleLockup` (same as `TitleLockup`) in `~/video-studio/remotion/src/effects/TitleLockup.tsx`, composited by the lab's `~/video-studio/lab/effects/title_lockup.py`.

## Step by step recipe
1. `cd ~/video-studio/remotion && npm run brand`.
2. Render the transparent layer with your words: `npx remotion render src/index.ts R1TitleLockup ~/video-studio/lab/cache/remotion/title-lockup/ --sequence --image-format=png --props='{"inF":10,"outF":44,"top":"whole","small":"the","bottom":"setup.","cy":1200}'`.
3. Composite the PNG sequence over the footage. Enter: blur 30 to 0 and scale 1.08 to 1.00 over 8 frames. Exit: 6 frame smear and slide.

## Parameters and defaults
* display font 800 at 214 px, ground-coloured fill with a 12 px ink outline, centre y 1200

## QA checklist
* Words come from the script. Blur is only used as motion, never as a glow.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
