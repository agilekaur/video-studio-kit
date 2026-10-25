# Video Studio for Mac

A double-clickable Mac app for the Video Studio editor. It's a thin Electron shell around the same editor you get from `../run.sh`. The edit model, effects and server API are unchanged, and Claude help still comes through `/video-studio`.

## Build

```bash
cd ~/.claude/skills/video-studio/editor/desktop
npm install
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
```

This produces an unsigned app at `dist/mac-arm64/Video Studio.app`. Drag it to /Applications or the Dock. The first time you open it, right-click it and choose **Open**, because the app is unsigned. To run without packaging, use `npm start`.

## What it does

- **Launch:** runs the same steps as `run.sh`. It creates `editor/.venv` on the first run, runs `npm install` in `app/` if needed, and rebuilds `app/dist` when `app/src` is newer. It then starts `server.py` on a free local port, waits for `/api/meta` to answer, and opens the editor.
- **Quit:** stops the backend (SIGTERM, then SIGKILL after 3 s).
- **File menu:** New Reel… (⌘N), Add Files to Reel… (⌘O), and Open Projects Folder (⇧⌘O, opens `$VS_HOME`, default `~/Movies/VideoStudio`).
- **Edit menu:** Undo and Redo run the editor's own history. Inside text fields they do normal text undo.
- **View menu:** reload, zoom, full screen and dev tools.
- **Dropping files:** drop files on the window as in the browser. Files dropped on the Dock icon or opened with File > Add Files show a picker for "Talking-head clips" or "B-roll, images, music". The shell then streams them from disk straight to the backend.
- **Audio:** the player uses the app's own Chromium with autoplay allowed, so audio works from the first click.

## Where things are

- **Editor folder:** the app finds `server.py` in this order: `$VS_EDITOR`, the folder the app was built in (`editor/desktop/dist/...`), then `~/.claude/skills/video-studio/editor`.
- **Logs:** backend and setup output goes to `~/Library/Logs/Video Studio.log` (Help > Backend Log).
- **PATH:** apps opened from Finder start with a bare PATH, so the shell reads your login shell's PATH and adds `/opt/homebrew/bin`, `/usr/local/bin` and `~/.local/bin`. That lets the backend find `node`, `ffmpeg` and `ffprobe`.
- **Versions:** electron 44.5.1 and electron-builder 26.17.0, both pinned.
