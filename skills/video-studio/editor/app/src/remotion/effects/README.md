# Effect contract

One file per effect. Each file exports `meta` and any of `Behind`, `Front` and `styles`.

```js
export const meta = { id, name, big, needs: [], prefers: [], purposes: [], sfx, desc, params: [...], status };
export function Behind(ctx) {}   // drawn over the base video, UNDER the speaker cutout
export function Front(ctx) {}    // drawn over the cutout (and over Behind)
export function styles(ctx) {}   // optional: returns { zoom, base, cutout, filter, freeze, freezeFilter, hideBase }
```

* Design space is 1080x1920 px at 30 fps. Use absolute positioning in px.
* Keep text and UI clear of the right 140 px and the bottom 420 px (platform buttons). Captions sit around y 1040 to 1160, so avoid that band unless the effect owns the frame.
* `ctx`:
  * `frame` and `frames`: beat-local frame and the beat length in frames. Use `frame` for every animation, never `useCurrentFrame` at module level.
  * `fps` is 30. `params` holds the values from meta.params, and they may be empty strings or arrays. Always fall back to something sensible built from `ctx.text`.
  * `brand.colors`: `accent primary text outline surface surface_text caption_text caption_outline caption_active caption_box danger`.
  * `brand.fonts`: `{heading, body, caption}`, each `{family, url, weight}`. Use `fontStack(brand.fonts.heading)` from `../kit.jsx`.
  * `focus` is `{x, y}`, 0 to 1, the speaker's face point.
  * **Never draw over the face.** Anything in `Front`, or in `Behind` when there is no cutout, must stay clear of `faceBox(focus)` from `../kit.jsx`. Use `clearOfFace` to place a block, `faceBands` to fit a word into the free band above or below the face, and `faceOverlap` to fade out anything that moves across it. If the free band sits where the captions go, set `captionY` (or `captions: false`) in `meta`.
  * `words`: `[{text, from, to}]` in beat-local frames. `text` is the beat's spoken text.
  * `media(id)` returns `{url, kind: 'image'|'video', w, h}` or null. Params of type `media` hold a media id.
  * `hasCutout`: true when an alpha cutout of the speaker is drawn between Behind and Front.
* `styles(ctx)` changes the BASE video wrapper:
  * `zoom` multiplies the punch-in.
  * `base` and `cutout` are extra CSS for the 1080x1920 wrappers (transform, clipPath, opacity, borderRadius, left/top/width/height). They override the default `transform: scale(zoom)` when they set `transform`.
  * `filter` is extra CSS filter on the base. `hideBase: true` hides the base (the effect then draws its own background).
  * `freeze: true` holds the beat's first frame with `freezeFilter`, while the audio keeps playing.
* Animate with `ease`, `pop` and `exitFade` from `../kit.jsx`, or with remotion `interpolate` and `spring`. Everything must be deterministic, so seed any randomness from frame numbers only (no Math.random).
* Enter in 6 to 12 frames, and exit or fade in the last 5 frames (`exitFade(frame, frames)`).
* Use `<OffthreadVideo>` and `<Img>` from remotion for media, never `<video>` or `<img>`.
* Set `meta.status` to "ready" when done.
* `import { Speaker } from "../speaker.jsx"` renders the current beat's footage in any box. Props:
  * `style`: absolute box, e.g. `{left, top, width, height, borderRadius}`.
  * `zoom`, `filter`, `origin`, `objectFit`.
  * `cutout`: true uses the alpha cutout and only works when `ctx.hasCutout`.
  
  Timing and speed match the base video. Use it for tiles, windows, split screens and phone screens. Pair it with `styles() => ({hideBase: true})` when the effect owns the whole frame.
