# Checklist

**Description:** A rounded panel slides in with a title and a counter (0 of 3). Items start dim with an empty circle and pop to bright with a tick as each is spoken.

**When to use:** Beat lists 2 to 5 items or steps. Speaker is not cut out.

**Inputs:** Speaker clip, word timestamps for each item's spoken moment, item texts, title.

**Implementation route:** Remotion (our design choice). Test status: Tested (ffmpeg panel, counter, items).

## Step by step recipe
TESTED basic ffmpeg version (see COVERAGE.md). Remotion version recommended for the pop.
ffmpeg version (panel slide plus counter plus items, driven by time):
```
D="fontfile=font.ttf"
ffmpeg -i in.mp4 -vf "drawbox=x='if(lt(t,0.5),-800+t*2*880,80)':y=300:w=760:h=520:color=0x111111@0.9:t=fill,
drawtext=$D:text='TO USE THESE':fontsize=48:fontcolor=white:x=120:y=340:enable='gte(t,0.5)',
drawtext=$D:text='1 of 3':fontsize=36:fontcolor=0xaaaaaa:x=120:y=410:enable='between(t,0.5,2)',
drawtext=$D:text='2 of 3':fontsize=36:fontcolor=0xFFD400:x=120:y=410:enable='gte(t,2)',
drawtext=$D:text='Item one':fontsize=44:fontcolor=0xFFD400:x=120:y=500:enable='gte(t,1)'" out.mp4
```
Notes: copy the font to a path with no spaces or commas, otherwise drawtext fails to parse. Use a tick PNG overlay instead of text for the tick.
Remotion version: for each item i with spoken time ti, the circle is grey until ti, then `spring` scale 0.6 to 1.15 to 1 and fills yellow with a tick path drawn by stroke-dashoffset over 6 frames. Counter text is `${done} of ${n}`. Panel enters with translateX -110 to 0 percent in 10 frames.

## Parameters and defaults
* panel 760x520, radius 36, dark #111 at 0.9 (or white panel, dark text), accent #FFD400
* tick pop overshoot 1.15, enter 10 frames

## QA checklist
* Each tick lands within 3 frames of the spoken word.
* Panel never covers the mouth. Place at upper left or lower left.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
