# Ingest and Transcribe

**Description:** Probe clips, normalise, transcribe with word timestamps.

**When to use:** Always the first step.

**Inputs:** One or more raw clips.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
1. Probe: `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of json clip.mp4`.
2. Normalise to a working copy: `ffmpeg -i clip.mp4 -vf "fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -crf 16 -c:a aac -ar 48000 work.mp4` (landscape clips: keep a blurred background fill option).
3. Transcribe:
```python
from faster_whisper import WhisperModel
m = WhisperModel("small", compute_type="int8")
segs, _ = m.transcribe("work.mp4", word_timestamps=True, vad_filter=True)
words = [dict(w=w.word.strip(), s=w.start, e=w.end) for s in segs for w in s.words]
```
4. Save `words.json`. Every later step reads it.

## Parameters and defaults
* model small (base for speed, medium for accents), language en

## QA checklist
* Word count looks right. No segment over 2 s of invented text during silence.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
