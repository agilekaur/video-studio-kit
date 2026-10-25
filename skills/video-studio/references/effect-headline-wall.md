# Headline Wall

**Description:** (a) Three floating phone frames behind the speaker, or (b) a dense repeating typographic pattern of a keyword scrolling slowly upward behind the cut out speaker.

**When to use:** Beat anchored on one keyword or theme word. 2 to 4 seconds.

**Inputs:** Speaker clip, matte, keyword, palette (brand colours).

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Remotion for (a), ffmpeg or Remotion for (b).
Form (b), fast route with PIL then ffmpeg:
1. Render a 1080x4000 PNG of the keyword repeated in rows, alternating row offset by half a word, font size 150 to 200, tight leading, two tones (text colour 12 percent darker than background, for example #8a6f5a on #e8dccb).
2. Scroll it: `ffmpeg -loop 1 -i wall.png -vf "crop=1080:1920:0:'mod(t*90,2000)'" -t 4 wall.mp4`.
3. Composite: background wall, then speaker cutout on top (`overlay`).
Form (a): three phone frames (reuse phone mockup div), each bobbing with y = 12*sin(frame/15 + phase) and rotateY +/- 12 deg, placed left, right, upper centre behind the alpha.

## Parameters and defaults
* scroll 90 px per second, font 150 to 200 px, two tone difference 12 percent
* phones 3, bob 12 px

## QA checklist
* Pattern low contrast so captions stay readable.
* Speaker silhouette clean. Keyword spelt right.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
