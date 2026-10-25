# Speaker Cutout (Matting)

**Description:** Shared helper that produces an alpha cutout of the speaker for every layered effect.

**When to use:** Before any effect that places things behind or in front of the speaker.

**Inputs:** work.mp4.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Run `python ~/.claude/skills/video-studio/scripts/cutout.py work.mp4 out_dir`. It uses rembg (u2net_human_seg) frame by frame to write RGBA PNGs, then ffmpeg builds `cutout.mov` (ProRes 4444) plus a `matte.mp4`.
Alternatives: MediaPipe Selfie Segmentation (fast, rougher edge) or RobustVideoMatting (best temporal stability). Smooth the matte over time (blend with the previous frame at 0.3) and erode 1px.
Our design choice: process only the frame ranges where a cutout effect is used, to save time.

## Parameters and defaults
* erode 1 px, temporal blend 0.3

## QA checklist
* Hair and hands clean. No flicker.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
