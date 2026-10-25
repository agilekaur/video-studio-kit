# UI World

**Description:** 2D UI bits (message bubble, grey card, dark card) pop around the speaker, some in front of the torso, some behind a shoulder.

**When to use:** Beat about messages, replies, notifications, apps. 1.5 to 3 seconds.

**Inputs:** Speaker clip, matte, text for 3 to 5 UI elements.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Remotion.
1. Make each element a React div: bubble (white, 28px radius, tail), grey card (#E9E9EC), dark card (#1C1C1E, white text).
2. Layer split: elements flagged `behind` go under the speaker alpha, `front` go over it. Mix both so it feels 3D.
3. Entrance: spring({damping:12, stiffness:140}) scale 0 to 1, staggered 5 frames apart, each on a spoken keyword time from the whisper words list.
4. Soft shadow 0 12px 30px rgba(0,0,0,.3). Slight float: y offset 6px x sin(frame/20).
5. Whole scene push in 1.0 to 1.05.

## Parameters and defaults
* elements 3 to 5, stagger 5 frames, spring damping 12 stiffness 140
* shadow blur 30px

## QA checklist
* Elements never cover the mouth or eyes.
* At least one element behind and one in front of the speaker.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
