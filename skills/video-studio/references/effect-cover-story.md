# Cover Story

**Description:** A huge bold word sits behind the subject like a magazine masthead, slow push in.

**When to use:** Intro or title beat. 2 to 4 seconds.

**Inputs:** Speaker clip, matte, word, accent colour.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: ffmpeg plus cutout (or Remotion).
1. Render the word with PIL at 420 px bold sans, letters spaced tight, accent colour (for example #2ECC71 or preset colour), placed at y 12 to 30 percent of frame height.
2. Composite: video, word, cutout on top (word behind head, can be covered by shoulders).
3. Slow push in: `zoompan` or Remotion scale 1.0 to 1.06 over the beat.
```
ffmpeg -i video.mp4 -i word.png -i cutout.mov -filter_complex "[0][1]overlay[a];[a][2]overlay,scale=w='1080*(1+0.06*t/3)':h=-2:eval=frame,crop=1080:1920" out.mp4
```

## Parameters and defaults
* font 420 px, push in 6 percent, word height 12 to 30 percent

## QA checklist
* Head overlaps the word (depth reads). Word fully legible.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
