# Zoom Through Cut

**Description:** A fast ease in zoom into the speaker's chest. The silhouette acts as a wipe to the next clip.

**When to use:** Transition between sections or topics. 0.4 to 0.6 seconds.

**Inputs:** Clip A (with matte), clip B.

**Implementation route:** Remotion (our design choice). Test status: Tested (xfade zoomin fallback only).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Remotion or ffmpeg plus matte.
1. Last 12 frames of clip A: scale from 1.0 to 6.0 centred on the chest point, Easing.in(Easing.exp).
2. At full zoom the frame is mostly the shirt colour. Fill the matte area of the zoomed frame with clip B (alphamerge) so the silhouette opens onto B.
3. Simple fallback: `xfade=transition=zoomin:duration=0.4`, then add a 3 frame blur.
```
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "xfade=transition=zoomin:duration=0.4:offset=4.6" out.mp4
```
4. Add whoosh SFX at the start of the zoom.

## Parameters and defaults
* duration 0.4 to 0.6 s, end scale 6, ease in

## QA checklist
* B starts exactly when the zoom ends, no flash frame unless intended.
* Maximum 3 per video.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
