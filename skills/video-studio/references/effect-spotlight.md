# Spotlight

**Description:** Instant darken with a feathered circular highlight on the face, on a punch word.

**When to use:** One punch word or a serious line. 0.5 to 1.5 seconds.

**Inputs:** Speaker clip, face centre (x,y), start and end time.

**Implementation route:** ffmpeg (our design choice). Test status: Tested.

## Step by step recipe
TESTED with ffmpeg (see COVERAGE.md).
```
ffmpeg -i in.mp4 -vf "geq=lum='if(between(T,2,4),lum(X,Y)*(0.35+0.65*clip(1-(hypot(X-540,Y-700)-260)/160,0,1)),lum(X,Y))':cb='cb(X,Y)':cr='cr(X,Y)'" out.mp4
```
Radius 260px solid, 160px feather, outside darkened to 35 percent. Instant on (no fade in), 4 frame fade out. If geq is slow, pre render a radial gradient PNG and use `blend=all_mode=multiply:enable='between(t,2,4)'`.
For moving faces, track the face centre per frame (MediaPipe) and feed x,y from a sendcmd file, or use Remotion with a CSS radial gradient following the tracked point.

## Parameters and defaults
* radius 260, feather 160, outside brightness 0.35, length 0.5 to 1.5 s

## QA checklist
* Face stays inside the bright circle. Dark edge has no banding.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
