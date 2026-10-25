# Captions

**Description:** Word level captions in 3 verified styles plus 9 of our own.

**When to use:** Every video unless told no captions. Default style 1.

**Inputs:** words.json, style id.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion (preferred, per word animation) or ASS subtitles through ffmpeg (fast fallback).
Group words: 1 to 3 words per caption, break on punctuation or gap above 0.3 s. Safe area: centre of frame y 900 to 1300, never lower than y 1500.
Remotion: per word component, active word = frame within [s,e]. Active scale 1.0 to 1.15 spring, colour change.
ASS fallback: write `Dialogue` lines with `{\\c&H00D7FF&\\fscx115\\fscy115}` tags per active word, then `ffmpeg -i in.mp4 -vf "ass=caps.ass" out.mp4`.
VERIFIED styles from the reels:
* Style 1 Bold Centre: heavy sans 96 to 120 px, 1 to 3 words, active word scales to 115 percent and turns yellow #FFD400, others white at 80 percent, soft shadow.
* Style 2 Clean Phrase: sans 56 to 64 px, full phrase on up to 2 lines, progressive orange to yellow highlight sweeping across words, small header line above, subtle dark gradient behind.
* Style 3 Lowercase Keyword: lowercase sans 80 px, 1 or 2 words, keyword in yellow.
OUR OWN ADDITIONS (not from the creator, labelled as such):
* 4 Boxed Highlight: active word on a rounded yellow box with dark text.
* 5 Karaoke Bar: full line at the bottom, white, active word fills left to right.
* 6 Serif Editorial: serif 90 px, cream text, italic keyword.
* 7 Outline Pop: white fill, black 8px stroke, active word scales 1.2.
* 8 Typewriter: letters appear one by one, monospace.
* 9 Stacked Big: one word at a time, 200 px, alternating colours.
* 10 Underline Draw: keyword gets a hand drawn underline.
* 11 Emoji Tag: key nouns followed by an emoji pop.
* 12 Soft Glass: text on a frosted rounded pill.
Defaults: style 1, yellow #FFD400, font Montserrat ExtraBold or Inter Black (open licence), max 2 lines, line height 1.05.

## Parameters and defaults
* font size 96 to 120, active scale 1.15, accent #FFD400, y centre 1100

## QA checklist
* Spelling matches transcript. No caption over 3 words in style 1. Does not cover platform buttons (right 140px).
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
