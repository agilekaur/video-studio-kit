# Glass Type

**Description:** A large bold word in front of the speaker acts as refractive glass: blur plus displacement of the video beneath. Speaker not cut out.

**When to use:** Title or hook word. 1.5 to 3 seconds.

**Inputs:** Speaker clip, word.

**Implementation route:** ffmpeg (our design choice). Test status: Fallback blur tested only; displace untested.

## Step by step recipe
Design choice: ffmpeg with displace, or Remotion SVG filter.
1. Render the word as a white on black mask PNG (`mask.png`) and a soft gradient normal map (blur of mask, 12px) for displacement.
2. ffmpeg: `[0]split[a][b];[a]gblur=sigma=14[bl];[bl][map][map]displace=edge=smear[d];[d][mask]alphamerge`, composite over `[b]`, add a 2px white edge highlight and 18 percent white tint.
3. Fallback: blurred, brightened copy masked by the word shape (`alphamerge`) with a white stroke. This reads as frosted glass.
4. Slow drift: shift mask x by 20px over the beat.

## Parameters and defaults
* blur 14, tint 0.18, edge 2px, font 380 px

## QA checklist
* Word clearly distorts what is beneath, not just a flat overlay.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
