# Digital Zoom

**Description:** Two forms. (a) Viewfinder: blurred full screen copy plus a small rounded sharp window with a red record dot, snap zoom with stepped jump cuts. (b) Plain: jump cut to 110 or 125 percent crops on emphasis words.

**When to use:** Plain version: any emphasis word, roughly every 4 to 8 seconds. Viewfinder: a hook or a 'watch this' moment.

**Inputs:** Speaker clip, word timestamps, face centre x,y (from MediaPipe or manual).

**Implementation route:** ffmpeg (our design choice). Test status: Tested (plain punch in).

## Step by step recipe
TESTED plain version with ffmpeg (see COVERAGE.md).
Plain punch in (hard cut to 125 percent between t1 and t2):
```
ffmpeg -i in.mp4 -vf "scale=w='if(between(t,2,4),1350,1080)':h='if(between(t,2,4),2400,1920)':eval=frame,crop=1080:1920:(iw-1080)/2:(ih-1920)/2-60" out.mp4
```
The -60 nudges the crop up so the face stays in the upper third. Alternate 100, 110, 125, 110, 100 across several jump cuts for the stepped feel (no easing).
Viewfinder version:
1. Background: `scale=1080:1920,gblur=sigma=40,eq=brightness=-0.1`.
2. Window: crop 9:16 around the face to 760x1000, overlay centred, rounded corners via alpha mask, 3px white outline.
3. Red dot: `drawtext` with a red filled circle character or `drawbox` replaced by an overlay PNG, blinking with `enable='lt(mod(t,1),0.6)'`, plus text REC.
4. Snap zoom: three steps of crop size 760, 640, 520 held 4 frames each, no easing.

## Parameters and defaults
* plain scales: 1.10 and 1.25, hold 0.4 to 1.2 s, max one punch in per 3 s
* viewfinder window 760x1000, blur sigma 40, steps 4 frames

## QA checklist
* Face stays inside the frame and upper third.
* Cuts are instant, not eased.
* Crop never softens: source must be 1080p or higher, otherwise cap at 110 percent.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
