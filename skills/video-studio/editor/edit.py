#!/usr/bin/env python3
"""One command: raw talking-head clips in, a finished reel in a chosen format out.

    python3 edit.py --format founder-story ~/Downloads/raw.mov
    python3 edit.py --format case-study --brand agilekaur a.mov b.mov
    python3 edit.py --list

Needs the editor running (editor/run.sh). Creates a project, applies the format (captions, grade,
pace, beat -> effect recipe, cutouts when the format uses them), waits for transcription and
cutouts, prints the beat plan and renders edit_out/<project>.mp4. The project stays open in the
app at http://127.0.0.1:5178 for notes and fine-tuning.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:%s" % os.environ.get("PORT", "5178")


def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        sys.exit("API %s %s failed: %s" % (method, path, e.read().decode()[:400]))


def say(msg):
    print(msg, flush=True)


def wait_clips(pid, cutout):
    last = ""
    while True:
        p = api("GET", "/api/projects/%s" % pid)["project"]
        clips = p["clips"]
        bad = [c for c in clips if c.get("status") == "error"]
        if bad:
            sys.exit("Transcription failed: %s" % bad[0].get("message"))
        if cutout and any(c.get("matte_status") == "error" for c in clips):
            say("Cutout failed; effects that need it fall back to their no-cutout look.")
            cutout = False
        done = all(c.get("status") == "ready" for c in clips) and (
            not cutout or all(c.get("matte_status") == "ready" for c in clips))
        line = " | ".join("%s: %s%s" % (c["name"], c.get("message", ""),
                                         (", cutout %d%%" % round(100 * (c.get("matte_progress") or 0))) if cutout else "")
                          for c in clips)
        if line != last:
            say("  " + line)
            last = line
        if done:
            return p
        time.sleep(2)


def beat_table(p):
    clips = {c["id"]: c for c in p["clips"]}
    say("\n  #  purpose   effect                    line")
    n = 0
    for b in p["beats"]:
        if b.get("cut"):
            continue
        n += 1
        ws = clips[b["clip"]]["words"][b["w0"]:b["w1"] + 1]
        text = " ".join(w["w"] for w in ws if not w.get("cut"))
        eff = b["effect"] + (" (zoom %.2f)" % b["zoom"] if b["effect"] == "none" and b.get("zoom", 1) > 1 else "")
        say("%3d  %-9s %-25s %s" % (n, b["purpose"], eff, text[:70]))
    say("")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--format", "-f", help="format id (see --list)")
    ap.add_argument("--brand", help="brand kit id or name (default: first kit, else the general brand)")
    ap.add_argument("--name", help="project name (default: first clip's name + format)")
    ap.add_argument("--focus", help="face point as x,y from 0 to 1 (default 0.5,0.32)")
    ap.add_argument("--preview", action="store_true", help="half-resolution preview render")
    ap.add_argument("--plan-only", action="store_true", help="stop after the beat plan, no render")
    ap.add_argument("--list", action="store_true", help="list formats and exit")
    a = ap.parse_args()

    try:
        formats = api("GET", "/api/formats")
    except urllib.error.URLError:
        sys.exit("Video Studio isn't running. Start it with: %s/run.sh" % os.path.dirname(os.path.abspath(__file__)))
    if a.list or not a.format:
        for f in formats:
            say("%-15s %-17s %s" % (f["id"], f["name"], f["tagline"]))
        return
    fmt = next((f for f in formats if f["id"] == a.format), None)
    if not fmt:
        sys.exit("Unknown format %r. Try --list." % a.format)
    clips = [os.path.abspath(os.path.expanduser(c)) for c in a.clips]
    missing = [c for c in clips if not os.path.isfile(c)]
    if not clips or missing:
        sys.exit("No clip found at: %s" % (", ".join(missing) or "(none given)"))

    name = a.name or "%s %s" % (os.path.splitext(os.path.basename(clips[0]))[0], fmt["name"])
    pid = api("POST", "/api/projects", {"name": name})["project"]["id"]
    settings = {}
    if a.brand:
        brands = api("GET", "/api/brands")
        b = next((b for b in brands if a.brand.lower() in (b["id"].lower(), b.get("name", "").lower())), None)
        if not b:
            sys.exit("No brand kit %r. Kits: %s" % (a.brand, ", ".join(b["id"] for b in brands) or "none"))
        settings["brand"] = b["id"]
    if a.focus:
        x, y = (float(v) for v in a.focus.split(","))
        settings["focus"] = {"x": x, "y": y}
    if settings:
        api("PUT", "/api/projects/%s" % pid, {"settings": settings})
    api("POST", "/api/projects/%s/format" % pid, {"format": fmt["id"]})
    say("Project %s, format %s%s" % (pid, fmt["name"], " (with speaker cutout)" if fmt.get("cutout") else ""))
    api("POST", "/api/projects/%s/import" % pid, {"paths": clips})
    say("Transcribing%s..." % (" and cutting out" if fmt.get("cutout") else ""))
    p = wait_clips(pid, fmt.get("cutout"))
    p = api("POST", "/api/projects/%s/format" % pid, {"format": fmt["id"]})["project"]  # final plan across all clips
    beat_table(p)
    if a.plan_only:
        say("Plan only. Open %s to review." % BASE)
        return
    job = api("POST", "/api/projects/%s/render" % pid, {"preview": a.preview})
    last = ""
    while job["status"] in ("queued", "running"):
        time.sleep(2)
        job = api("GET", "/api/jobs/%s" % job["id"])
        if job["message"] != last:
            say("  " + job["message"])
            last = job["message"]
    if job["status"] != "done":
        sys.exit("Render %s: %s" % (job["status"], job["message"]))
    say("\nDone: %s\nOpen %s to give notes and fine-tune." % (job["result"]["path"], BASE))


if __name__ == "__main__":
    main()
