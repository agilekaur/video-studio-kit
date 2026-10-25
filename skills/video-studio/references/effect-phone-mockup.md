# Phone Mockup

**Description:** A dark 3D smartphone slides in from the right, rotates on Y to face camera, screen shows a UI or clip.

**When to use:** Beat about an app, a result on screen, or 'on your phone'. 1.5 to 2 seconds.

**Inputs:** Speaker clip, screen clip or image for the phone screen. Optional matte.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion CSS 3D.
1. Phone: div 420x860, radius 64px, 6px #2b2b2e border, subtle metallic gradient edge (linear-gradient 135deg #5a5a60, #1b1b1d, #4a4a50).
2. Screen: inner div with the clip as `<OffthreadVideo>`, radius 52px.
3. Motion: translateX from 900px to 0 and rotateY from 70deg to 0 over 18 frames, easing Easing.out(Easing.cubic). Settle with a tiny 2 degree overshoot.
4. Background: solid #101012 behind or a dark dim of the speaker video at 30 percent.
5. Shadow: 0 40px 80px rgba(0,0,0,.5).

## Parameters and defaults
* phone 420x860, entrance 18 frames, rotateY 70 to 0, dim of background 0.3

## QA checklist
* Screen content readable at settle.
* Nothing clipped at the frame edge.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
