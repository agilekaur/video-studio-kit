# Speed Ramps, PiP and Object Tracking

**Description:** Speed ramps, picture in picture and attaching graphics to a tracked object.

**When to use:** Specific beats.

**Inputs:** Clip, ranges, tracking points.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
* Speed ramp: split into three segments and `setpts=PTS/2` in the middle, with `atempo=2` on audio, or use `minterpolate` for slow motion.
* PiP: `overlay=W-w-40:H-h-300` with scaled 360 px window and rounded mask.
* Tracking: MediaPipe face or hand landmarks per frame, smooth with a 5 frame moving average, feed x,y into Remotion props so graphics follow.
* Masks: use the matte for any reveal that follows the body.

## Parameters and defaults
* ramp 2x for 0.6 s, smoothing 5 frames

## QA checklist
* Tracked graphic does not jitter.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
