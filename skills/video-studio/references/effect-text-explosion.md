# Spark and Glass Shatter Text

**Description:** The punch word explodes into sparks or glass shards.

**When to use:** One climax word per video at most.

**Inputs:** Speaker clip, word and its timestamp.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion.
1. Show the word large, then at the end of the word split it into 24 to 40 triangular shards (clip-path polygons from a Delaunay mesh over the word box).
2. Each shard gets random velocity (outward), rotation and fade over 18 frames, gravity 0.4.
3. Add 30 small spark circles in yellow and white, scale down to 0.
4. SFX: glass break or whoomph at the word start.

## Parameters and defaults
* shards 24 to 40, duration 18 frames

## QA checklist
* Used once only. Does not obscure the face.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
