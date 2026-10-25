# Couch Wall

**Description:** A curved wall of video cards scrolls behind the cut out speaker with a slow push in.

**When to use:** Beat about variety, volume or a library of things. 2 to 3 seconds.

**Inputs:** Speaker clip and matte. 12 to 24 thumbnails or short clips.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Remotion CSS 3D.
1. Build a grid of 3 rows by 8 columns of 9:16 cards on a cylinder. Card angle = col * 14 deg, rotateY(angle) translateZ(-900px) inside a parent with perspective 1200px.
2. Scroll by adding frame*0.6 deg to every angle, so the wall moves right to left.
3. Dim the wall to 70 percent brightness and blur 2px so the speaker stays the focus.
4. Place the speaker alpha cutout on top. Push in the whole composition from scale 1.0 to 1.08 over the beat (ease in out).
5. Fallback in ffmpeg: tile thumbnails with `xstack`, scroll with `overlay=x='-t*120'`, no curve.

## Parameters and defaults
* columns 8, rows 3, curve 14 deg per column, scroll 0.6 deg per frame
* push in 1.0 to 1.08, wall brightness 0.7

## QA checklist
* Wall reads as curved, not flat (unless fallback used).
* Speaker edges clean. Wall never overpowers the face.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
