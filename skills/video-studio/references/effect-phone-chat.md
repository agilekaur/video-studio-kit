# Phone Chat

**Description:** Top half of a split: a phone rises on the surface colour and a short chat plays out, with typing dots before each reply, bubbles springing up and one accent button press at the end. Speaker below the seam.

**When to use:** "I ask it X and it does Y", agent or assistant conversations, approvals.

**Inputs:** The user message and 1 or 2 replies, taken from the script.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/phone_chat.py`.

## Step by step recipe
1. Phone body 640x1060 in ink, 16 px bezel, rounded device corners (the UI inside follows the brand corner rule). It runs past the seam so the split cuts it.
2. User bubble appears on the first spoken word of the request. Typing dots for 0.5 s, then the reply bubble springs in (out-back). Wrap text at 480 px.
3. End on one button in the accent colour that presses (scale 0.96) on the matching word.

## Parameters and defaults
* message size 39 px, line height 52, bubble padding 24, max width 480

## QA checklist
* Chat text comes from the script. Only one accent element in the frame.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
