# Collage of Playing Reels

**Description:** A grid of 5 or 12 videos playing at once.

**When to use:** Beat about volume, proof or a body of work.

**Inputs:** 5 or 12 clips (9:16).

**Implementation route:** ffmpeg (our design choice). Test status: Tested.

## Step by step recipe
Design choice: ffmpeg `xstack`.
```
ffmpeg -i 1.mp4 -i 2.mp4 -i 3.mp4 -i 4.mp4 -i 5.mp4 -i 6.mp4 -filter_complex "[0]scale=360:640[a];[1]scale=360:640[b];[2]scale=360:640[c];[3]scale=360:640[d];[4]scale=360:640[e];[5]scale=360:640[f];[a][b][c][d][e][f]xstack=inputs=6:layout=0_0|360_0|720_0|0_640|360_640|720_640" collage.mp4
```
For 12 clips use 4 columns by 3 rows at 270x480 each (pad to 1080x1440). For 5, use a 2 over 3 layout. Mute all but the speaker. Stagger starts by 3 frames for a pop in.

## Parameters and defaults
* grid 3x2, 4x3, tile 360x640 or 270x480

## QA checklist
* All tiles playing, no black tiles. Audio only from the speaker.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
