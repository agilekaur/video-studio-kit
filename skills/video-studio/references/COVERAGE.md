# COVERAGE

Every effect from the brief mapped to its skill. Implementation routes (Remotion, ffmpeg, Python) are OUR design choices, not the creator's. Test column: what was actually run with ffmpeg on a generated 1080x1920 test clip in `_test/`.

| # | Effect | Skill file | Route | Test status |
|---|---|---|---|---|
| A1 | Orbit | `effect-orbit/SKILL.md` | Remotion | Not tested |
| A2 | Couch Wall | `effect-couch-wall/SKILL.md` | Remotion | Not tested |
| A3 | UI World | `effect-ui-world/SKILL.md` | Remotion | Not tested |
| A4 | Frame Break | `effect-frame-break/SKILL.md` | ffmpeg | Not tested |
| A5 | Digital Zoom (viewfinder and plain) | `effect-digital-zoom/SKILL.md` | ffmpeg | Tested (plain punch in) |
| A6 | Phone Mockup | `effect-phone-mockup/SKILL.md` | Remotion | Not tested |
| A7 | Checklist | `effect-checklist/SKILL.md` | Remotion | Tested (ffmpeg panel, counter, items) |
| A8 | Headline Wall (a and b) | `effect-headline-wall/SKILL.md` | ffmpeg | Not tested |
| A9 | Zoom Through Cut | `effect-zoom-through-cut/SKILL.md` | Remotion | Tested (xfade zoomin fallback only) |
| A10 | Chart Grow | `effect-chart-grow/SKILL.md` | Remotion | Not tested |
| A11 | Pull back Reveal | `effect-pullback-reveal/SKILL.md` | Remotion | Not tested |
| A12 | Green Screen | `effect-green-screen/SKILL.md` | ffmpeg | Not tested |
| A13 | Paper Cut | `effect-paper-cut/SKILL.md` | Python plus ffmpeg | Not tested |
| A14 | Doodle Boil | `effect-doodle-boil/SKILL.md` | Python plus ffmpeg | Not tested |
| A15 | Vertigo | `effect-vertigo/SKILL.md` | Python plus ffmpeg | lenscorrection time expression FAILED in test, recipe changed to Python |
| A16 | Cover Story | `effect-cover-story/SKILL.md` | ffmpeg | Not tested |
| A17 | Glass Type | `effect-glass-type/SKILL.md` | ffmpeg | Fallback blur tested only; displace untested |
| B1 | Spotlight | `effect-spotlight/SKILL.md` | ffmpeg | Tested |
| B2 | Freeze and Label | `effect-freeze-label/SKILL.md` | Remotion | Tested (freeze, desaturate, flash). Callouts untested |
| B3 | Before and After | `effect-before-after/SKILL.md` | ffmpeg | Tested |
| B4 | Intro thumbnail arch | `effect-intro-thumbnail-arch/SKILL.md` | Remotion | Not tested |
| B5 | Outro comment UI | `effect-outro-comment-ui/SKILL.md` | Remotion | Not tested |
| B6 | Spark and glass shatter text | `effect-text-explosion/SKILL.md` | Remotion | Not tested |
| B7 | Hand drawn arrows and labels | `effect-arrows-labels/SKILL.md` | Remotion | Not tested |
| B8 | Invoice, receipt, logo, plugin pop ups | `effect-popups/SKILL.md` | Remotion | Not tested |
| B9 | Collage of 5 or 12 reels | `effect-collage/SKILL.md` | ffmpeg | Tested |
| B10 | Mock app window | `effect-mock-app-window/SKILL.md` | Remotion | Not tested |
| B11 | Timeline graphic | `effect-timeline-graphic/SKILL.md` | Remotion | Not tested |
| B12 | MINE vs HIS split screen | `effect-split-screen-vs/SKILL.md` | ffmpeg | Not tested |
| C1 | Auto subtitles | `core-captions/SKILL.md` | Remotion | Not tested |
| C2 | Auto jump cuts, silence removal, best take picking | `core-cut-and-takes/SKILL.md` | Python plus ffmpeg | Not tested |
| C3 | B roll, emojis, GIFs | `core-broll-gifs-emoji/SKILL.md` | ffmpeg | Not tested |
| C4 | Zoom in and out punch ins | `effect-digital-zoom/SKILL.md` | ffmpeg | Tested (plain punch in) |
| C5 | Sound effects and music ducking | `core-sound-design/SKILL.md` | ffmpeg | Tested (sidechain duck plus loudnorm) |
| C6 | Transitions | `core-transitions/SKILL.md` | ffmpeg | Not tested |
| C7 | Green screen and background swap | `effect-green-screen/SKILL.md` | ffmpeg | Not tested |
| C8 | Picture in picture, tracking, speed ramps, masks | `core-speed-ramp-tracking/SKILL.md` | Python plus ffmpeg | Not tested |
| C9 | Colour grade | `core-colour-grade/SKILL.md` | ffmpeg | Not tested |
| C10 | Ingest and word level transcription | `core-ingest-transcribe/SKILL.md` | Python plus ffmpeg | Not tested |
| C11 | Speaker cutout (shared) | `core-cutout/SKILL.md` | Python plus ffmpeg | Not tested |
| D1 | Caption styles 1 to 3 (verified) and 4 to 12 (our own additions) | `core-captions/SKILL.md` | Remotion | Not tested |
| F1 | Style analysis, transfer and build your own style | `core-style-analysis/SKILL.md` | Python plus ffmpeg | Partly tested (scene detect, signalstats, silencedetect run) |

## Tested recipes (ffmpeg, generated test clip)
* Digital zoom plain punch in (scale and crop, hard cut): ran, correct output size 1080x1920.
* Spotlight (geq feathered circle): ran, frame viewed, bright centre and darkened surround confirmed.
* Before and After wipe (blend with moving slider and drawbox): ran.
* Checklist panel with counter and items (drawbox and drawtext): ran, frame viewed. Initial attempt failed because a font path contained spaces and a comma, fixed by copying the font to a simple path (noted in the skill).
* Freeze, desaturate and flash: ran.
* Collage with xstack: ran.
* xfade zoomin transition: ran.
* Sidechain duck plus loudnorm: ran.
* Scene detect: ran and correctly found 1 cut in a 2 colour test. signalstats and silencedetect ran.
* Failed test: `lenscorrection` with a time expression. Vertigo recipe was changed to a Python per frame remap.

## Not tested
* All Remotion code (orbit, couch wall, UI world, phone mockup, headline wall a, pull back, chart grow, arch, comment UI, text explosion, arrows, pop ups, mock app, timeline, checklist pop version). Recipes are designs, not run.
* Matting helper `scripts/cutout.py` (rembg not installed here), paper cut, doodle boil, vertigo, frame break, cover story, glass type displace route.
* Style analysis steps that need OCR, MediaPipe or librosa.

## NOT VERIFIABLE from the creator's material
* The actual contents of his skill files (prompts, code, parameters). Everything here is our own reconstruction from visible results.
* Which tools he used (Remotion, ffmpeg, After Effects style rendering or something else). Unknown.
* Render times beyond his statement of about 20 minutes.
* The exact list of the other 4 to 9 effects of the 21 or 26 he mentions. Only 17 named effects plus the extras in section B were seen.
* 9 of the 12 caption styles. Only 3 were seen. Styles 4 to 12 are our own additions.
* Exact fonts, hex colours and spring values. Defaults here are our own choices that match the look.

This package does not reproduce the creator's unreleased files.
