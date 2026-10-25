# Selection Highlight

**Description:** On a drawn website, a tint text selection sweeps a phrase, then a handle box with a size badge grabs an element, is dragged wider and snaps onto a button.

**When to use:** "Change anything", "edit the whole thing", precision or control lines.

**Inputs:** A drawn screen (or a still from a screen recording), the phrase from the script.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/selection_highlight.py`.

## Step by step recipe
1. Draw the screen on the night colour (or the ground for light looks), headline in the display font.
2. Selection: an accent-tint box sweeps left to right across the spoken phrase.
3. Handle box: square handles at the corners, a small badge showing a size that ticks up while the box is dragged wider, then a jump to the button on its spoken word.

## Parameters and defaults
* sweep 0.45 s, drag 0.5 s, accent only on the selection and badge

## QA checklist
* Handles follow the brand corner rule. One accent use per frame.
* Exported frames checked at start, middle and end of the effect.
