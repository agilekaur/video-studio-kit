# Frame Break

**Description:** Speaker sits in a square 1:1 window on dark grey. A hand or the head breaks out of the square and overlays the background.

**When to use:** Beat about breaking limits, thinking outside the box, or a gesture toward camera. About 1 second.

**Inputs:** Speaker clip, matte.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: ffmpeg for the square, overlay of the cutout for the break.
1. Background: `color=c=0x1f1f1f:s=1080x1920`.
2. Square: crop the speaker to 1:1 around the face, scale to 940x940, overlay at x=70,y=490 with rounded corners (use a rounded rectangle alpha mask via `geq` or a PNG mask and `alphamerge`).
3. Break: during the break window, overlay the full size matte cutout (not cropped), scaled so the subject lines up with the square version. The parts outside the square then show over dark grey.
4. Add a quick scale 1.0 to 1.06 pop on the cutout for the pop out feel, 6 frames.
```
ffmpeg -i bg.png -i square.mp4 -i cutout.mov -filter_complex "[0][1]overlay=70:490[a];[a][2]overlay=enable='between(t,1,2)'" out.mp4
```

## Parameters and defaults
* square 940px, background #1f1f1f, break window 0.6 to 1.0 s, pop scale 1.06

## QA checklist
* Cutout lines up exactly with the square footage at the moment of break (no jump).
* Corners rounded, background flat.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
