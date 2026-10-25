# Seam Caption (quiet)

**Description:** Small upper case captions in a tight ink box sit exactly on the split seam and swap word group by word group with the speech.

**When to use:** Calm or documentary videos, or when the top panel is busy and big captions would compete with it. An alternative to the brand's main caption style.

**Inputs:** words.json, a split layout.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/seam_caption_mono.py`.

## Step by step recipe
1. Group words into 1 to 3 word chunks (break on punctuation or a gap over 0.25 s).
2. Draw each chunk upper case in the body font (bold), tracking +6 percent, ground-coloured text on an ink box, centred on y 960.
3. Hard swap on the first word of each chunk. No bounce, no accent.

## Parameters and defaults
* y 960, 1 to 3 words, tracking +6 percent

## QA checklist
* Spelling matches the transcript. The box never covers the face.
* Exported frames checked at start, middle and end of the effect.
