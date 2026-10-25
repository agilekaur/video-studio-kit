# Intro Thumbnail Arch

**Description:** Seven numbered yellow circle thumbnails pop in an arch behind the speaker.

**When to use:** Video opening that promises a list (for example 7 things). 2 to 3 seconds.

**Inputs:** Speaker clip, matte, 7 thumbnails.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Remotion.
1. Arch positions: angle from 200 to -20 deg across 7 items, radius 430px centred at (540, 900). x=cx+r*cos, y=cy-r*sin.
2. Each thumbnail 200x280, radius 24, white border 4px, a yellow circle badge (#FFD400) with a number at the top left.
3. Pop in with spring scale in order left to right, stagger 4 frames.
4. Layer under the speaker alpha so the head overlaps the arch.

## Parameters and defaults
* items 7, radius 430, stagger 4 frames

## QA checklist
* Numbers in order. Arch symmetric. Head overlaps arch.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
