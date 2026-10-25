# Split Screen MINE vs HIS

**Description:** Side by side comparison with labels, for example MINE and HIS.

**When to use:** Comparison beats.

**Inputs:** Two clips or two images, two labels.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: ffmpeg `hstack` (or `vstack` for 9:16).
```
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[a];[1]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[b];[a][b]vstack,drawtext=fontfile=font.ttf:text='MINE':fontsize=64:fontcolor=white:x=40:y=40,drawtext=fontfile=font.ttf:text='THEIRS':fontsize=64:fontcolor=white:x=40:y=1000" out.mp4
```
Use a vertical stack for portrait video. Add a 6px divider.

## Parameters and defaults
* split 50/50, label 64px

## QA checklist
* Labels on the right halves. Both halves synced.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
