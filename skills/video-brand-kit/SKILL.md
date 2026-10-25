---
name: video-brand-kit
description: Builds a brand kit for short-form video (Reels, Shorts, TikTok) from a few questions, the way the AgileKaur kit was made. It asks about the brand, shows three visual directions to pick from, locks one ground colour with a single accent, derives the full colour scale and a dark (Night) theme, checks contrast, picks fonts, and writes the video rules (captions, hook caption, episode tag, safe area, logo, end card, edit style). Output is a ready folder (BRAND-GUIDE.md, COLOURS.txt, fonts, logos, safe-zone overlay, zip) that drops straight into Video Studio's "Your brand kit" box or the editor's Brand tab. Use when the user says "/video-brand-kit", "make my brand kit", "create a brand kit for my videos", "set up my video brand", or has no brand kit to drop into Video Studio.
---

# Video brand kit

You help a creator, coach or small business (often not a designer or developer) make a brand kit for their videos. Keep the conversation short and friendly. Ask, show, confirm, then build. The finished kit must work in Video Studio: its colour file uses role words the importer reads, and its fonts and logos are plain files.

This follows how the AgileKaur kit was made: discovery, three directions, pick one, lock the palette and type, then write the video rules and package the kit.

## Step 0. Look before asking

1. Ask whether they already have any of these, and read what they give you: a website (read its colours and fonts with WebFetch: `theme-color`, CSS custom properties such as `--primary` or `--brand-*`, button and link colours, the page background, `font-family`), a brand guide (PDF or doc), logo files, font files.
2. If they have a full guide already, skip to step 3 and only fill gaps.
3. Pick an output folder: `~/Documents/<brand-slug>-brand-kit/` unless they name one.

## Step 1. Discovery (one message, about six questions)

Number the questions and give a default for each, so "defaults" is a valid answer.

1. **Name and handle.** Brand or channel name exactly as written, and the handle (for example @yourname).
2. **What you make and for whom**, in one line. This steers the feel.
3. **Three words for the feel** (for example calm, sharp, premium). Default: clear, confident, warm.
4. **Light or dark graphics.** Paper-like light ground or studio-dark ground. Default: light.
5. **Colours you must keep**, if any (hex codes or plain words like "navy and orange"), and anything to avoid. Ask what colour their filming set or wall is, so the accent does not clash with it.
6. **Rules.** Emoji in videos? Rounded or square corners? A logo end card, or end on the last line? Defaults: no emoji, square corners, no end card.

## Step 2. Three directions (show, don't describe)

Build one HTML page with three direction boards side by side, each at real 9:16 proportions. Each board shows:

* the ground colour, ink colour and accent,
* a headline pair in the proposed display and body fonts,
* a caption sample (three words, the spoken word on the accent box) over a mid-grey "speaker" block,
* a hook caption and an episode tag,
* the accent used once.

Rules for the directions:
* One ground, one ink, **one accent**. The accent is about 10% of any frame, never a background.
* Make the three genuinely different (for example warm paper with a red accent, cool white with an electric blue, studio dark with an acid or amber accent), all within the user's feel words and must-keep colours.
* Avoid colours that clash with their filming set (step 1, question 5). A purple wall needs a non-purple accent.
* Fonts: free Google Fonts (SIL Open Font License) by default. Good display and body pairs: Bricolage Grotesque + Inter, Space Grotesk + Inter, Archivo (wide) + Archivo, Anton + Inter, Unbounded + Manrope, Fraunces + Inter. Fontshare fonts (Cabinet Grotesk, Satoshi, General Sans) are fine if the user downloads them themselves.

Show the page (publish it as an Artifact if you can, otherwise save it and open it). Ask which direction, and what to change. Iterate until they say yes. Keep their exact words for anything they reject (for example "too purple") and don't bring it back.

## Step 3. Lock the palette

From the chosen direction, write the full scale. Name the tokens like this, with a light (Cream) value and a dark (Night) value for each:

| Token | Role |
|---|---|
| surface-100 | Ground, about 70% of a frame |
| surface-200 | Stone: inputs, quiet bands, panels |
| surface-300 | Pressed states, placeholders |
| ink | Headlines, outlines |
| ink-body | Running text |
| ink-muted | Labels, help text |
| rule | Hairlines |
| accent | The one pop colour (about 10%) |
| on-accent | Text on an accent fill |
| accent-100, accent-200 | Faint and light tints (selected row, chip) |
| accent-300 | Mid tint for charts only |
| accent-700, accent-800 | Deep and near-black shades |
| danger | Errors only |

Video colours (same in both themes):

| Token | Role |
|---|---|
| caption-fill | Caption letters (a near-white) |
| caption-stroke | Caption outline (a near-black) |
| caption-hot | The spoken-word box and the hook seam (usually the accent) |

Derive the neutrals by mixing ground and ink, and the tints and shades from the accent, then check contrast. Use this with `python3`:

```python
def hx(h): h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
def to(c): return '#%02x%02x%02x' % tuple(max(0,min(255,round(v))) for v in c)
def mix(a,b,t): a,b=hx(a),hx(b); return to([a[i]+(b[i]-a[i])*t for i in range(3)])
def lum(h):
    c=[v/255 for v in hx(h)]; c=[v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4 for v in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def contrast(a,b): la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
# example: ground, ink, accent from the chosen direction
g,i,a='#f6f0e0','#100f0e','#c2152f'
stone,pressed,rule,muted,body=mix(g,i,.05),mix(g,i,.12),mix(g,i,.18),mix(g,i,.66),mix(g,i,.80)
tint100,tint200,tint300=mix(a,'#ffffff',.88),mix(a,'#ffffff',.76),mix(a,'#ffffff',.52)
deep700,deep800=mix(a,'#000000',.38),mix(a,'#000000',.62)
for name,(fg,bg) in {'ink on ground':(i,g),'body on ground':(body,g),'muted on ground':(muted,g),
                     'ground on accent':(g,a),'caption fill on accent':('#f9f5ea',a)}.items():
    print(f'{name}: {contrast(fg,bg):.1f}:1')
```

Body text needs at least 4.5:1, large headlines and captions 3:1. If a pair fails, darken the text or the accent and tell the user in one line. Never change a colour the user insisted on without asking. For Night, swap ground and ink roles, lift the accent a little (lighter, so it holds 3:1 on the dark ground) and recheck.

## Step 4. Type

Pick three roles: **display** (headlines, captions, hooks; ExtraBold 800 or Black 900), **body** (labels, buttons; 400, 500, 700) and optional **mono** (timecodes, episode numbers; for example JetBrains Mono 500).

* Google Fonts: before downloading, name each file, the source (github.com/google/fonts) and the size, and wait for a yes. Download with `curl -fL` from `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/<file>` (encode `[` `]` as `%5B` `%5D`) into `fonts/`, plus the family's `OFL.txt`. If only a variable font exists, keep it; Video Studio reads `.ttf`, `.otf` and `.woff2`.
* Fontshare or paid fonts: the user downloads them (fontshare.com, Download family, the files in `Fonts/OTF/` or `Fonts/WEB/fonts/`) and tells you where they are. Never download these yourself. Record where each font came from in the guide.

## Step 5. Logo

Ask for logo files (transparent PNG or SVG). Video needs two: a light version for footage and dark grounds, and a dark version for light grounds. Name them `<brand>-logo-light.png` and `<brand>-logo-dark.png` (the word "light" tells Video Studio which one to use on footage). If they have no logo, say so and leave it out. Don't design a logo unless they ask.

## Step 6. Video rules

Write these as decisions, with numbers, for a 1080 × 1920 export:

* **Captions:** display font at 96 to 112 px (up to 120 for condensed faces), 1 to 3 words at a time, `caption-fill` with a 6 to 8 px `caption-stroke` outline, the spoken word on a `caption-hot` box. Sentence case unless the user wants ALL CAPS. Centred around y 1100. **Never over the face**: if a graphic sits there, captions move above or below it.
* **Hook caption:** the first 2 seconds, once per video. Two short lines on ground-colour bands with the accent as a seam or underline.
* **Episode tag:** optional, top left at about y 120: the series name in the body font plus an episode number in mono.
* **Safe area (Reels):** keep text inside x 60 to 940 and between y 220 and 1500. The right 140 px and the bottom 420 px belong to the app's buttons.
* **Accent use:** one accent moment per frame.
* **Logo:** where it may appear (an end card, a corner watermark, or nowhere) and its clear space.
* **End card:** none by default (the video ends on the last line). If they want one, design it on the Night ground with the light logo, 1.5 to 2 seconds.
* **Edit style:** hard cuts by default, punch-ins on emphasis words, and the effects that suit the brand. Pick 6 to 10 favourites from Video Studio's list: Cover Story, Title Lockup, Checklist, Freeze and Label, Phone Mockup, Phone Chat, Proof Push-in, Layout Switcher, Chart Grow, Spotlight, Kinetic CTA, Outro Comment UI. Say which ones to avoid (for example glow-heavy effects for a minimal brand).
* **Never list:** things the brand never does on video (for example emoji, gradients, glows, drop shadows, italic headings, invented numbers).
* **Before you deliver:** a short checklist (spelling against the script, nothing over the face, inside the safe area, one accent moment per frame, loudness about -14 LUFS, the platform's AI label if the speaker is an AI avatar).

Optional, if the user wants it: **voice** (how captions and on-screen words sound: sentence length, person, banned words) and up to four **beliefs** (one-line positions the content keeps returning to). Use only lines the user approves.

## Step 7. Write the kit

Write this folder:

```
<brand>-brand-kit/
  BRAND-GUIDE.md        the whole kit: intro, colour (Cream and Night tables), video colours, type, logo, video rules
  COLOURS.txt           every colour, one per line, in the format below
  fonts/                font files and their licence files
  logos/                logo PNG or SVG files
  overlays/safe-zone-guide-1080x1920.png
  directions.html       the three direction boards from step 2
```

**COLOURS.txt** must use these exact role words, so Video Studio and other importers can read it. One colour per line, hex after the label, the light (Cream) value first and the Night value second:

```
<Brand> colours (hex)            Cream      Night
Ground (surface-100)             #f6f0e0    #110f0e
Stone (surface-200)              #ebe2d0    #1d1a18
Pressed (surface-300)            #dad0bd    #2e2a27
Ink                              #100f0e    #f0ebde
Body text                        #31302f    #cfcac0
Muted text                       #535250    #a9a49c
Hairline                         #cfc6b9    #36322f
Accent (the one pop colour)      #c2152f    #f45152
Text on accent                   #f6f0e0    #0a0908
Accent 100 faint tint            #ffe7e6    #331414
Accent 700 deep                  #7c111d    #f69b98
Danger (form errors only)        #a90017    #f5886c

Video captions (same in both)
  Caption letters                #f9f5ea
  Caption outline                #0f0d0c
  Spoken-word box / hook seam    #c2152f
```

Keep the words "Ground", "Ink", "Body text", "Accent", "Caption letters", "Caption outline" and "Spoken-word box" on their lines. Only the accent line may say "accent" without "tint", "deep" or "faint".

**Safe-zone overlay:** draw a transparent 1080 × 1920 PNG with PIL (`pip install pillow` if needed, after asking): shade the top 220 px, the bottom 420 px and the right 140 px in semi-transparent red, and outline the safe box with a dashed white line.

Then zip the folder (`<brand>-brand-kit.zip`) next to it.

## Step 8. Check it in Video Studio

Tell the user how to see the kit on real effects:

* **On the Video Studio Effects page:** in "Try it on your video", drop a clip, then drop `COLOURS.txt` (or `BRAND-GUIDE.md`), the font files and the light logo into "Drop your brand kit". Every effect previews in the new brand.
* **In the Video Studio editor app:** Brand tab, New brand, then drop the same files.

If you can open a browser, check that the importer found the accent, caption letters, caption outline, spoken-word box, ground and ink. If it missed one, fix the wording on that line in `COLOURS.txt`.

## Step 9. Wrap up

In a few short lines: the chosen direction, the core colours with hex values, the fonts, the caption style, the end-card decision, where the folder and zip are, and that they can run `/video-brand-kit` again to change anything.

## Rules

* Ask before every download, and download fonts only from the Google Fonts repository.
* Never invent colours, claims, numbers or testimonials the user did not approve. Show hex values before writing files.
* Keep the brand name and handle exactly as typed.
* One accent. Never a gradient, glow or purple-by-default.
* Text never covers the speaker's face.
