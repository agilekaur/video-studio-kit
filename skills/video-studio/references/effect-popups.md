# Pop up Cards (invoice, receipt, logo, plugin card)

**Description:** Invoices or receipts that stack with a red total, logo pop ups, and a plugin style pop up card.

**When to use:** Beat that mentions money, tools, brands or a plugin.

**Inputs:** Speaker clip, text, logos (only logos the user owns or is allowed to use).

**Implementation route:** Remotion (our design choice). Test status: Not tested (recipe is design, run a quick test render first).

## Step by step recipe
Design choice: Remotion.
1. Invoice: white card with rows, each row staggered in by 5 frames, final total line red (#E5322D) scaling 1.0 to 1.15 to 1.
2. Stack: three cards offset by 30px and rotated 3, -2, 4 degrees.
3. Logo pop: spring scale from 0, 6 frame overshoot, soft shadow.
4. Plugin card: dark rounded card with icon square, name, one line and an Install style button (no real trademarks, use a generic icon).
5. Remove all pop ups before the next beat.

## Parameters and defaults
* stagger 5 frames, total red #E5322D

## QA checklist
* No third party logos without permission. Numbers match the script.
* Effect obeys SKILL.md pacing (one big effect per beat, 1.5 s gap).
* Exported frames checked at start, middle and end of the effect.
