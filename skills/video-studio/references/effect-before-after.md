# Before and After

**Description:** Vertical wipe slider with a handle. Left is flat or log footage labelled Before, right is graded and labelled After.

**When to use:** Beat about transformation, grade, upgrade. 2 to 4 seconds.

**Inputs:** One clip (or two versions of it).

**Implementation route:** ffmpeg (our design choice). Test status: Tested.

## Step by step recipe
TESTED with ffmpeg (see COVERAGE.md).
```
ffmpeg -i in.mp4 -filter_complex "[0:v]split[a][b];[a]eq=saturation=0.3:contrast=0.8[flat];[b]eq=saturation=1.4:contrast=1.15,colorbalance=rs=.1:bs=-.1[grade];[flat][grade]blend=all_expr='if(lt(X,W*clip(T/6,0,1)),A,B)'[o];[o]drawbox=x='iw*min(t/6,1)-3':y=0:w=6:h=ih:color=white:t=fill" out.mp4
```
Note: in this expression, pixels left of the slider show A (flat), right show B (graded). Slider travels left to right over the beat. Add a round handle PNG with `<` `>` at mid height, overlaid with the same x expression. Add Before and After labels with drawtext, hidden when the slider covers them.
Tip: ease the slider with `0.5-0.5*cos(pi*clip(T/D,0,1))` in place of T/6.

## Parameters and defaults
* slider time 2 to 4 s, handle 6px line plus round handle

## QA checklist
* The two sides align frame for frame. Labels on correct sides.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
