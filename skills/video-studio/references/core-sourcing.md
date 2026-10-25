# Sourcing: storyboard every frame, then pick where each visual comes from

**Description:** Before rendering, every beat in the storyboard gets a layout and a visual source. The source is chosen per beat for what looks best and is most truthful, not one tool for the whole video.

**When to use:** Always, as part of workflow step 5 (beat table becomes the storyboard).

## The storyboard table

One row per beat. Show it to the user before rendering ("show me the plan" stops here).

| # | Time | Spoken line | Purpose | Layout | Visual | Source | Why | Cost / ask |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.0-2.6 | "Agencies charge five grand a month" | hook | full speaker | Cover Story "$5k" | code | exact number from script, brand type | none |

* **Layout** is one of: `split` (proof top, speaker bottom, captions on the seam), `full speaker`, `full proof`, `full speaker + overlay`. Switch layout on beat changes with hard cuts; it is the main source of rhythm (reference finding: a layout change every 2 to 4 seconds).
* **Source** is one of the five below. A beat can combine them (for example a Higgsfield background under a code-drawn title).

## The five sources, and the decision rule

Work down this list and take the first source that can show the beat truthfully and well.

1. **Screen recordings from the user (proof).** Use whenever the line describes the product doing something ("paste in your website", "hands you a plan"). Real interface beats any drawing. If none were supplied, ask once, naming the exact actions to record (30 s is enough), then fall back to code mockups and flag it in the report. Treatment: crop tight, slow push-in (1.00 to 1.06 over the beat), keep the cursor, optional selection highlight or badge drawn in code on top.
2. **Code (PIL/numpy in the effects lab, or Remotion).** The default for anything with text, numbers, UI, timing to words or brand styling: captions, titles, checklists, counters, charts, mockups, kinetic words, selection boxes. Use the PIL lab (`fxlab/fx.py` framework) first; move an effect to **Remotion** when it needs real 3D perspective, smooth motion blur, physics springs or many layered elements and the PIL version looks stiff. Remotion is free for individuals and companies of up to 3 people; larger teams need a company licence. Installed project: `~/video-studio-remotion` (remotion 4, React 18). Render a frame with `npx remotion still src/index.ts <Comp> out.png --frame=N`, a clip with `npx remotion render src/index.ts <Comp> out.mp4`, and composite the result over the footage with ffmpeg.
3. **Higgsfield (generative AI video/image, MCP connected).** Only for imagery code cannot draw and the user cannot film: cinematic b-roll, abstract or atmospheric backgrounds, product-style beauty shots, a stylised scene for a metaphor. Rules:
   * Never for text, numbers, logos, UIs or anything that must be exact. Generated text is garbled; draw text in code on top.
   * Never generate a real person, the speaker's likeness, a real brand's product or anything that could pass as real footage of a real event.
   * Check `balance` first. Show the planned generations with model, duration and estimated credits in the storyboard's Cost column and get a yes before generating. Prefer 9:16, 720p, 5 s, and image generation over video when a still with a code push-in is enough.
   * Prompt in the brand palette (cream #f6f0e0, graphite #100f0e, one cherry #c2152f accent; no purple or lilac, no glow-heavy looks for AgileKaur) and say "no text, no logos" in every prompt.
   * Save generations to `edit_out/assets/` and log model, prompt and cost in `edl.json`.
4. **Asset libraries (Lottie / LottieFiles, free stock).** Only for small generic helpers (a loader, a confetti burst, a tick) when drawing it in code would take longer and the style still matches the kit. Downloads need the user's OK (say file, source and size). Check the licence, recolour to the palette, and never use a library asset as the hero of a beat.
5. **The talking-head footage itself.** Re-used moments, crops, grades and cutouts (collage, couch wall, thumbnails, PiP). Free and always on-brand, so prefer it over stock for "many examples" beats.

## Per-beat heuristics

| Beat type | First choice | Fallback |
|---|---|---|
| Hook with a number or claim from the script | code (Cover Story, Glass Type, kinetic words) | |
| Product does X | screen recording in `split` or `full proof` | code mockup (prompt-countdown-result, mock app window, phone chat) |
| Metaphor or emotion ("it's absurd", "the old way") | `full speaker` + Spotlight or punch-in | Higgsfield b-roll for the metaphor |
| List / steps | code (checklist, freeze and label, orbit) | |
| Volume ("every site looks the same") | footage collage or screen recordings in 3D screen fall | Higgsfield stills of generic layouts, no text |
| Section change | layout switch (hard cut) | title lockup |
| Call to action | `full speaker` + kinetic words (code) | |
| Atmosphere behind a title | Higgsfield abstract background (no text) under a code title | brand cream or night ground |

## QA additions

* Every on-screen word, number and name comes from the script or the user, regardless of source.
* Generated or library assets are recoloured or prompted to the palette; nothing purple, no glows for AgileKaur.
* The report lists every external asset with its source, licence or model, and credits spent.
