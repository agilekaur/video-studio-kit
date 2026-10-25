# Sound Design and Music

**Description:** SFX at the right moments, music ducked under voice.

**When to use:** Every edit.

**Inputs:** Final cut audio, SFX folder (whoosh, pop, thud, shutter, glass).

**Implementation route:** ffmpeg (our design choice). Test status: Tested (sidechain duck plus loudnorm).

## Step by step recipe
1. Map events to SFX: transitions get whoosh, popups get pop, big text gets thud, freeze exit gets shutter, explosions get glass.
2. Place each SFX 3 frames before the visual hit. Volume: SFX at -12 dB relative to voice, never above.
3. Music: lo fi or soft beat, loop to length, gain -26 dB under voice with sidechain ducking:
```
ffmpeg -i voice.wav -i music.wav -filter_complex "[1]volume=0.2[m];[m][0]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[d];[0][d]amix=inputs=2:duration=first:normalize=0" out.wav
```
4. Loudness: `loudnorm=I=-14:TP=-1.5:LRA=11` for the final mix.
5. Use only royalty free or user supplied audio. Generate simple SFX with ffmpeg `sine` and `anoisesrc` if no library exists.

## Parameters and defaults
* SFX max one per 1.5 s, music -26 dB, loudness -14 LUFS

## QA checklist
* Voice always clear. No clipping. Loudness measured.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
