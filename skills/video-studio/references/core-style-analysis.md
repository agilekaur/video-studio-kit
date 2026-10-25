# Style Analysis and Transfer

**Description:** Measure a reference video into a style JSON and apply it to new footage. Also a 3 step build your own style.

**When to use:** User drops a reference video or says 'copy this style'.

**Inputs:** Reference video, new footage.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Partly tested (scene detect, signalstats, silencedetect run).

## Step by step recipe
Measure (all with ffmpeg and Python):
1. Cut rate: `ffmpeg -i ref.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep pts_time` then cuts per minute = count / duration * 60. (Scene threshold 0.3 for hard cuts, 0.15 to catch zoom jump cuts.)
2. Pacing: whisper word timings give words per minute and mean pause length.
3. Zoom habit: take face box width per second (MediaPipe) and count step changes above 8 percent.
4. Caption style: sample 1 frame per second, find text boxes (OCR with pytesseract), record font height as percent of frame, vertical position, dominant text colour.
5. Colour: `ffmpeg -i ref.mp4 -vf "fps=1,signalstats,metadata=print" -f null -` for YAVG, SATAVG; hue histogram from sampled frames.
6. SFX density: detect short loud transients in the audio (librosa onset detect) per minute, music level as RMS difference between speech and non speech parts.
7. Graphics frequency: frames where the scene is not a plain talking head (edge density or matte area change) per minute.
Write `style.json`:
```json
{"cuts_per_min":22,"wpm":165,"zoom_steps_per_min":6,"caption":{"style":1,"size_pct":6,"y_pct":55,"accent":"#FFD400"},"grade":{"yavg":118,"satavg":62},"sfx_per_min":14,"music_db":-26,"graphics_per_min":5}
```
Apply: every rule in SKILL.md reads `style.json` instead of defaults (cut density sets silence threshold and punch in frequency, and so on).
Build your own style (3 steps): (1) collect 5 to 10 inspiration videos, (2) run the analysis and add the user's own notes, (3) produce 3 variations of `style.json` (calm, standard, punchy) and render a 10 second sample of each for the user to choose.

## Parameters and defaults
* scene threshold 0.3 and 0.15, sample 1 fps

## QA checklist
* style.json complete. Sample renders produced for each variation.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
