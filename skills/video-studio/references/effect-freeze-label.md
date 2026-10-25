# Freeze and Label

**Description:** Freeze frame, desaturate and darken, slow push in, thin yellow lines draw out to numbered callout boxes, white flash and shutter sound back to playback.

**When to use:** Beat that breaks something down into parts (3 to 5 callouts). 3 to 5 seconds.

**Inputs:** Speaker clip, freeze time, callout texts and target points.

**Implementation route:** Remotion (our design choice). Test status: Tested (freeze, desaturate, flash). Callouts untested.

## Step by step recipe
TESTED the freeze and flash part with ffmpeg.
1. Freeze: `trim` a single frame at tf, `loop=loop=N:size=1`, then `eq=saturation=0.2:brightness=-0.15`.
2. Push in: `zoompan` or scale from 1.0 to 1.06 over the freeze.
3. Callouts (Remotion recommended): for callout k, a yellow (#FFD400) 3px line animates from the target point to a box at the frame edge over 10 frames, then the box scales in with number badge. Stagger 8 frames.
4. Exit: 2 frame white flash (`fade=t=in:color=white`), shutter SFX, playback resumes.
```
ffmpeg -i in.mp4 -filter_complex "[0:v]trim=0:2,setpts=PTS-STARTPTS[a];[0:v]trim=start=2:end=2.04,setpts=PTS-STARTPTS,loop=loop=44:size=1:start=0,eq=saturation=0.2:brightness=-0.15,setpts=N/30/TB[f];[0:v]trim=start=2.04,setpts=PTS-STARTPTS[c];[a][f][c]concat=n=3:v=1:a=0[o]" -map "[o]" out.mp4
```
Remember audio: the voice should continue or pause. Our rule: pause voice, add a low drone, then resume.

## Parameters and defaults
* freeze 1.5 to 3 s, sat 0.2, brightness -0.15, callouts 3 to 5, flash 2 frames

## QA checklist
* Lines end exactly on the thing named. Callout text readable.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
