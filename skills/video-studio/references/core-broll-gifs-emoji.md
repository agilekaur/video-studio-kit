# B roll, GIFs and Emoji

**Description:** Insert b roll and reaction GIFs and emoji at keywords.

**When to use:** When the script mentions a visual thing.

**Inputs:** words.json, b roll or GIF folder.

**Implementation route:** ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
1. Find keywords (nouns, numbers, tools) from words.json.
2. Overlay b roll for 1 to 2 s at a keyword with the voice continuing (J cut). `overlay=enable='between(t,a,b)'`, scale to fill 1080x1920.
3. Emoji: render with Noto Color Emoji via PIL, pop spring in near the word, 0.8 s.
4. GIFs: convert to mp4 first, overlay at the lower third at 70 percent width.
5. Max one b roll or GIF per 4 s.

## Parameters and defaults
* b roll 1 to 2 s, GIF width 70 percent

## QA checklist
* Media is licensed or user owned. Does not cover the face for long.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
