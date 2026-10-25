# Mock App Window

**Description:** A mock app window with a progress bar and a checklist.

**When to use:** Beat that shows a process running.

**Inputs:** Item texts, duration.

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion.
1. Window: dark card, three traffic light dots, title bar, radius 24.
2. Progress bar fills from 0 to 100 percent over the beat (linear), percentage text updates.
3. Checklist rows tick as the bar passes 25, 50, 75, 100 percent (reuse the checklist tick animation).

## Parameters and defaults
* bar linear, 4 rows

## QA checklist
* Bar finishes exactly on the last spoken item.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
