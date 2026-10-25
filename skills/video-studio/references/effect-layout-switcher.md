# Layout Switcher

**Description:** Hard cuts on the beat between a 50/50 split (proof on top, speaker below), a punched-in full speaker shot and a full-frame proof screen with a slow push, with one quiet caption pinned to the seam throughout.

**When to use:** Any video built from the storyboard's layouts. Layout changes every 2 to 4 seconds are the main source of rhythm.

**Inputs:** Speaker clip, a proof visual (screen recording or a drawn screen), words.json.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/layout_switcher.py`.

## Step by step recipe
1. Pick the layout per beat from the storyboard: `split`, `full speaker`, `full proof`, `full speaker + overlay`.
2. Split: proof panel 1080x960 on top, speaker 1080x960 below (crop the face into the top third of the bottom half), a 4 px seam line in ink or ground.
3. Full speaker: 1.00 or 1.10 crop, step on a stressed word. Full proof: the screen fills the frame with a slow push 1.00 to 1.06.
4. Cut only on word boundaries. Hard cuts, no transitions.
5. Keep captions on the same line (the seam, y 960) in every layout so the changes read as one system.

## Parameters and defaults
* seam y 960, push 1.00 to 1.06, punch-in 1.10

## QA checklist
* Cuts land on words, not mid-word. The face is never cut by the seam.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
