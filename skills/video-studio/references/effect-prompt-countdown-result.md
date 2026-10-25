# Prompt, Countdown, Result

**Description:** The top half tells a three-step story in about 4 seconds: a prompt box types an input and sends, a huge countdown runs to zero, then it snaps to a springing tick and a result line.

**When to use:** "Paste in X and in 60 seconds you get Y". Any input, wait, output beat.

**Inputs:** The input text (for example a URL), the time claim and the result line, all from the script.

**Implementation route:** Python (PIL). Reference implementation in the lab: `~/video-studio/lab/effects/prompt_countdown_result.py`.

## Step by step recipe
1. Beat 1: label plus input box (surface colour, rule outline). Type the input over about 0.7 s, then press the send button.
2. Beat 2: the countdown in the display font with tabular digits, eased so it slows near zero. Use the accent only on the last 3 counts.
3. Beat 3: a tick springs in with the result line, timed to the result word.

## Parameters and defaults
* typing 0.12 to 0.80 s, countdown 1.22 to 2.48 s, result at about 2.66 s (local time)

## QA checklist
* The time claim matches the script exactly. Never invent a number.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
