# Paper Cut

**Description:** Speaker cut out on black with a thick jagged torn paper white border and a stop motion boil.

**When to use:** Playful emphasis or a meme beat. 1 to 2 seconds.

**Inputs:** Speaker clip, matte.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Python (OpenCV) plus ffmpeg.
1. For each output frame n, take matte alpha, dilate by 14px, add noise: perturb the contour with random radial offsets (seeded by n//3 so the border changes every 3 frames).
2. Fill the dilated shape white, composite the speaker cutout on top, put on black.
3. Hold the video frame constant for 2 frames at a time (`fps=10` then `fps=30`) for the stop motion cadence, or only boil the border and keep the video smooth. Our recommendation: only boil the border.
4. Add a faint paper grain overlay at 6 percent.

## Parameters and defaults
* border 14px, boil every 3 frames, grain 6 percent

## QA checklist
* Border jagged but even. Face untouched.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
