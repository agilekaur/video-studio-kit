# Doodle Boil

**Description:** Rough white hand drawn outline traces the body contour, wiggling every few frames, with floating hand drawn hearts over the unaltered video.

**When to use:** Fun, warm or personal beats. 1.5 to 3 seconds.

**Inputs:** Speaker clip, matte.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Python (OpenCV) plus ffmpeg.
1. `cv2.findContours` on the matte, simplify with approxPolyDP epsilon 3.
2. For each frame group (n//3) add smooth noise to the contour points (amplitude 4 to 7px) and draw a polyline 6px white with round joins, slightly overshooting the start and end for a hand drawn feel.
3. Hearts: 3 to 5 small heart paths, rise 80px over 40 frames, wobble, fade out. Draw them with the same wobble.
4. Composite over the original video with `overlay`.

## Parameters and defaults
* line 6px white, wobble 4 to 7px every 3 frames, hearts 3 to 5

## QA checklist
* Outline hugs the body, not the room.
* Video underneath is untouched.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
