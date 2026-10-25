#!/usr/bin/env bash
# Video Studio Kit v2 installer for macOS.
#
#   bash install.sh             install or update
#   bash install.sh --dry-run   show what would happen, change nothing
#
# Copies two Claude Code skills into ~/.claude/skills/ (video-studio and video-brand-kit), sets up the editor and
# adds the `vs` command. Safe to run again. Your brand kits and projects (~/Movies/VideoStudio/) are never touched.

set -euo pipefail

DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY=1 ;;
    --help|-h) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (use --dry-run or --help)"; exit 2 ;;
  esac
done

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
BACKUP_DIR="$HOME/.claude/skills-backup"   # outside skills/, so Claude Code does not load old copies
HOME_DIR="${VS_HOME:-$HOME/Movies/VideoStudio}"
STAMP="$(date +%Y%m%d-%H%M%S)"
STASH="$(mktemp -d -t vskit)"
trap 'rm -rf "$STASH"' EXIT

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '  \033[33m! %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mStopped: %s\033[0m\n' "$*"; exit 1; }
run() { if [ "$DRY" = 1 ]; then printf '  [dry-run] %s\n' "$*"; else "$@"; fi; }

[ "$DRY" = 1 ] && bold "Dry run: nothing will be changed."

# ------------------------------------------------------------------ 1. this Mac
bold "1/6  Checking your Mac"
[ "$(uname -s)" = "Darwin" ] || fail "this installer is for macOS only."
info "macOS $(sw_vers -productVersion), $(uname -m)"
FREE_GB=$(df -g "$HOME" | awk 'NR==2 {print $4}')
info "free disk space: ${FREE_GB} GB (the kit needs about 2 GB, plus 1 to 3 GB for each project)"
[ "${FREE_GB:-0}" -ge 3 ] || warn "less than 3 GB free. The install may fail."
[ -d "$KIT/skills/video-studio/editor" ] || fail "run this from the unzipped kit folder (skills/ must be next to install.sh)."
command -v claude >/dev/null 2>&1 && info "Claude Code: found" || warn "Claude Code not found. Install it from claude.com/claude-code before using the skills."

# ------------------------------------------------------------------ 2. Homebrew
bold "2/6  Homebrew"
BREW=""
for b in "$(command -v brew 2>/dev/null || true)" /opt/homebrew/bin/brew /usr/local/bin/brew; do
  if [ -n "$b" ] && [ -x "$b" ]; then BREW="$b"; break; fi
done
if [ -z "$BREW" ]; then
  echo
  echo "Homebrew is not installed. It is the standard tool for installing ffmpeg, Node and Python on a Mac."
  echo "Install it with the official command from brew.sh, then run this installer again:"
  echo
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo
  exit 1
fi
eval "$("$BREW" shellenv)"
info "found: $BREW"

# ------------------------------------------------------------------ 3. ffmpeg, node, python
bold "3/6  ffmpeg, Node and Python"
for pkg in ffmpeg node python@3.12; do
  if "$BREW" list --versions "$pkg" >/dev/null 2>&1; then info "$pkg: already installed"
  else info "$pkg: installing (this can take a few minutes)"; run "$BREW" install "$pkg"; fi
done
PY312="$("$BREW" --prefix python@3.12 2>/dev/null || echo /opt/homebrew/opt/python@3.12)/bin/python3.12"

# ------------------------------------------------------------------ 4. Claude Code skills
bold "4/6  Claude Code skills ($SKILLS_DIR)"
run mkdir -p "$SKILLS_DIR"
for skill in video-studio video-brand-kit; do
  target="$SKILLS_DIR/$skill"
  if [ -d "$target" ]; then
    run mkdir -p "$BACKUP_DIR"
    # keep the set-up parts (Python packages, cutout model, Node packages) so an update does not download them again
    for keep in editor/.venv editor/models editor/app/node_modules; do
      if [ -e "$target/$keep" ]; then run mkdir -p "$(dirname "$STASH/$skill/$keep")"; run mv "$target/$keep" "$STASH/$skill/$keep"; fi
    done
    run mv "$target" "$BACKUP_DIR/$skill-$STAMP"
    info "$skill: your previous version is saved in $BACKUP_DIR/$skill-$STAMP"
  fi
  run cp -R "$KIT/skills/$skill" "$target"
  if [ -d "$STASH/$skill" ]; then run rsync -a "$STASH/$skill/" "$target/"; run rm -rf "$STASH/$skill"; fi
  info "$skill: installed"
done
if [ -d "$SKILLS_DIR/brand-setup" ]; then
  warn "an older /brand-setup skill is still installed. /video-brand-kit replaces it; you can delete $SKILLS_DIR/brand-setup."
fi

# ------------------------------------------------------------------ 5. the editor
bold "5/6  The editor (first time: 5 to 10 minutes, about 1.5 GB)"
info "Python packages, the speaker cutout model and the editor app"
run env SETUP_ONLY=1 PYTHON="$PY312" bash "$SKILLS_DIR/video-studio/editor/run.sh"
run chmod +x "$SKILLS_DIR/video-studio/editor/vs-cli"
BREWBIN="${VS_BIN_DIR:-$("$BREW" --prefix)/bin}"
if [ -e "$BREWBIN/vs" ] && [ "$(readlink "$BREWBIN/vs")" != "$SKILLS_DIR/video-studio/editor/vs-cli" ]; then
  warn "$BREWBIN/vs already exists and is not this kit's. Replacing it (the old link pointed to $(readlink "$BREWBIN/vs" || echo 'a file'))."
fi
run ln -sf "$SKILLS_DIR/video-studio/editor/vs-cli" "$BREWBIN/vs"
info "vs command: installed"

# ------------------------------------------------------------------ 6. demo clip
bold "6/6  Demo clip"
run mkdir -p "$HOME_DIR/_demo"
if [ -f "$KIT/demo/demo.mp4" ]; then run cp "$KIT/demo/demo.mp4" "$HOME_DIR/_demo/demo.mp4"; info "demo clip: $HOME_DIR/_demo/demo.mp4"; fi

bold "Done."
[ "$DRY" = 1 ] && echo "  (dry run: nothing was changed)"
cat <<EOF

Next steps:
  1. Try the demo:  vs demo     (edits the demo clip as a Founder Story and opens the editor)
  2. Make your brand kit: open Claude Code (type claude) and type /video-brand-kit
  3. Edit your own clip in Claude Code:
       /video-studio ~/Desktop/clip.mp4
     and paste your script. Claude picks the reel format that fits, or name one:
       /video-studio case-study ~/Desktop/clip.mp4
  4. See the 16 formats any time:  vs formats

Projects and brand kits live in: $HOME_DIR
EOF
