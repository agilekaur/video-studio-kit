# Orbit

**Description:** 3 or 4 vertical cards orbit in 3D around the speaker, behind the head and in front of the chest.

**When to use:** Beat names a set of things (tools, ideas, results) or says 'everything around you'. One beat, 1 to 2 seconds.

**Inputs:** Speaker clip, matte (alpha), 3 or 4 card images or short clips (9:16, 360x640 source).

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

**Needs cutout:** Needs a speaker matte. Run `python ~/.claude/skills/video-studio/scripts/cutout.py in.mp4 out_dir` first (alpha PNG sequence plus a matte.mp4). See cutout notes in SKILL.md section 7.

## Step by step recipe
Design choice: Remotion with plain CSS 3D transforms (ffmpeg cannot do this cleanly).
1. Layers, bottom to top: (a) original video, (b) back half of orbit cards, (c) speaker alpha cutout, (d) front half of orbit cards.
2. For card i of N, angle a = 2*pi*(i/N) + frame*speed. Position x = R*sin(a), z = R*cos(a). Card is in the back half when cos(a) < 0, so render it in layer (b), else layer (d).
3. Scale = 0.65 + 0.35*(cos(a)+1)/2. Opacity 0.75 at back, 1 at front. Always face the camera (rotateY small, about 15 deg x sin(a)).
4. Style: 6px white border, 24px radius, drop shadow 0 20px 40px rgba(0,0,0,.35).
5. Centre the ring at head height, y about 38% of frame height, ring tilt 8 deg so it reads as an ellipse.
6. Linear speed, one full turn over the beat length at most. No easing on the spin. Ease the cards in with a 6 frame scale pop.
7. Render the effect section as its own composition, then drop it into the main timeline with ffmpeg overlay or render the full video in Remotion.

## Parameters and defaults
* cards: 4, radius R: 360px, speed: 360 deg per 2.4 s
* ring tilt: 8 deg, border 6px white, min scale 0.65
* length: 1.0 to 2.0 s

## QA checklist
* Cards pass behind the head and in front of the chest (check three frames).
* No jitter at the matte edge. Shadow looks soft.
* Spin speed constant. Only one big effect in the beat.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
