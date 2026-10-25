# Vertigo

**Description:** Dolly zoom: the background field of view widens and distorts while the subject stays the same size. Big bold white text sits behind the subject.

**When to use:** Dramatic reveal beat. 1 to 2 seconds.

**Inputs:** Speaker clip, matte, word.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: lenscorrection time expression FAILED in test, recipe changed to Python.

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: layered ffmpeg or Remotion.
1. Split foreground (alpha cutout) and background (video with the subject area inpainted, or simply the original).
2. ffmpeg `lenscorrection` does NOT accept time expressions (tested, it errors). So distort per frame in Python: for frame n with p=min(n/45,1), build a barrel remap with OpenCV (`cv2.remap`, radial k = -0.4*p) and scale the background by 1+0.35*p, then crop to 1080x1920. Write frames to PNG and encode with ffmpeg. Alternative with sendcmd: `sendcmd` can update `lenscorrection` k1 at set times in steps (for example every 3 frames, untested).
3. Keep the foreground cutout at scale 1.0.
4. Insert the word between the layers, white, heavy sans, 300 to 400px.
5. Order: background, text, foreground cutout.

## Parameters and defaults
* length 1.5 s, k1 0 to -0.4, bg scale to 1.35

## QA checklist
* Subject size constant. Background clearly stretches.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
