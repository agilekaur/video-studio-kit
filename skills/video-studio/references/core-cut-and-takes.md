# Cut Silences, Jump Cuts and Best Take

**Description:** Remove dead air, pick the best take of repeated lines, add jump cuts.

**When to use:** After transcription.

**Inputs:** work.mp4, words.json.

**Implementation route:** Python plus ffmpeg (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
1. Silences: `ffmpeg -i work.mp4 -af silencedetect=n=-35dB:d=0.35 -f null -` then keep ranges that are speech. Pad 0.06 s before and 0.1 s after each speech range.
2. Repeated takes: group sentences by text similarity (difflib ratio above 0.8). Score each: fewer filler words (um, uh, like), steadier pace (words per second near median), no stumbles (word gap above 0.6 s inside the sentence). Pick the highest score.
3. Assemble: write a concat list of kept ranges, cut with `-ss/-to` and re encode with fixed GOP (`-g 30`) to keep sync, or one filter graph with `trim`/`atrim` and `concat`.
4. Jump cuts: remaining gaps become hard cuts. Every 4 to 8 s alternate between 100 and 110 percent crop on a cut (see digital zoom skill) to hide the cut.
5. Log the edit decision list to `edl.json` (source range, output range, reason).

## Parameters and defaults
* silence threshold -35 dB, min 0.35 s, pad 0.06/0.1 s, filler words list

## QA checklist
* No clipped first syllables. Audio and video in sync after cuts.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
