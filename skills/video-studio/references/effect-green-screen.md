# Green Screen

**Description:** Screen recording or document fills the background. The speaker is cut out, scaled into the bottom right corner pointing at it.

**When to use:** Beat that says 'look at this', 'here is the doc', 'on screen'. 3 to 8 seconds.

**Inputs:** Speaker clip, matte, screen recording or image.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: ffmpeg.
```
ffmpeg -i screen.mp4 -i speaker_cutout.mov -filter_complex "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg];[1]scale=620:-1[s];[bg][s]overlay=W-w-20:H-h-20:format=auto" out.mp4
```
1. If the screen is landscape, fit it to width on a dark panel with the speaker below, instead of crop.
2. Add a drop shadow by duplicating the cutout, `colorize` black, blur 20, offset 0 20.
3. Speaker pop in: scale 0.8 to 1 in 6 frames.

## Parameters and defaults
* speaker width 620 px, margin 20 px, shadow blur 20

## QA checklist
* Speaker does not hide key screen content.
* Cutout edge has no green or grey halo (erode matte 1px).
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
