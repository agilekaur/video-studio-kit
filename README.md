# Video Studio Kit v2

Turn a raw talking-head clip into a finished vertical video (Reels, Shorts, TikTok) in your own brand, by asking
Claude Code. You film. Claude cuts the pauses, ums and retakes, picks a reel format that fits your script, edits it
end to end in that format, adds captions, effects and sound in your colours and fonts, and exports a ready-to-post
MP4. Then you fine-tune anything yourself in an editor in your browser.

It is free. It runs on your Mac. Your footage stays on your Mac.

## What is inside

* **Two Claude Code skills.** `/video-brand-kit` builds your brand kit with you (colours, fonts, logo, caption
  style). `/video-studio` edits your videos with it.
* **16 reel formats.** Founder Story, Business Reel, Case Study, Listicle, Tool Demo, Visual Essay, Panel Explainer,
  Glass Explainer, Split Diagram, Fitted Captions, Tier List, Cut-out Grid, Teardown, Prompt Reel, Reply to a Comment
  and Newsroom. Each one locks a layout, a caption style, a pace and three or four signature effects, so every
  edit looks designed.
* **49 effects**, all built in code (Remotion): cover story, orbit, tier list, glass stats, comment pin, cut-out
  grid, checklists, phone chat, proof push-in, kinetic call to action and more.
* **The editor.** A page on your own Mac (http://127.0.0.1:5178) with your transcript, a beat timeline, the Formats
  tab and a live preview of the exact final frame.
* **The `vs` command** to open the editor, list formats, edit a clip or try the demo.
* **A demo clip** so you can see it work before you film anything.

## Requirements

* A Mac with macOS 13 or newer (Apple Silicon or Intel)
* [Claude Code](https://claude.com/claude-code) and a Claude plan that includes it
* About 2 GB of free disk space, plus 1 to 3 GB for each project
* About 15 minutes for the first setup (most of it is downloads)

The installer adds ffmpeg, Node and Python with Homebrew if you don't have them.

## Quick start

1. Unzip the kit, for example into your Downloads folder.
2. Open Terminal and run:
   ```
   cd ~/Downloads/video-studio-kit && bash install.sh
   ```
3. Try the demo: `vs demo`
4. Open Claude Code (type `claude`) and type `/video-brand-kit` to make your brand kit.
5. Edit your own clip in Claude Code: `/video-studio ~/Desktop/clip.mp4` and paste your script.
   Claude recommends the format that fits, or name one: `/video-studio case-study ~/Desktop/clip.mp4`.

## The vs command

| Command | What it does |
|---|---|
| `vs open` | Start the editor and open it in your browser |
| `vs formats` | List the 16 reel formats |
| `vs edit <clip> <format>` | Edit a clip end to end into a format |
| `vs demo` | Edit the demo clip as a Founder Story |
| `vs stop` | Stop the editor |

## Updating from v1

Run `install.sh` from this folder. It saves your old skills to `~/.claude/skills-backup/` first. `/video-brand-kit`
replaces the old `/brand-setup`; your v1 projects in `~/video-studio` are left alone.

## Good to know

* Renders use your computer: a 40-second video takes a few minutes.
* The speaker cutout (used by formats such as Visual Essay, Tool Demo, Cut-out Grid and Newsroom) takes about 2.5
  times the clip length the first time.
* If your company has more than three people, Remotion, one of the tools inside, needs a paid company licence.
  See LICENSE.md.
