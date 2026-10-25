"""Video Studio: local backend for the editor app (React + Remotion in app/).

Run:  ./run.sh            (http://127.0.0.1:5178)
Projects live in $VS_HOME (default ~/Movies/VideoStudio/<project>/), brand kits in $VS_HOME/_brands/.

The backend owns files and slow jobs (ingest, whisper, cutouts, waveforms, Remotion export).
The edit itself (beats, speed, effects, tracks) is plain JSON the app and /video-studio both edit.
"""
import copy
import json
import os
import queue
import re
import shutil
import subprocess
import threading
import time
import traceback
import uuid

from flask import Flask, abort, jsonify, request, send_file, send_from_directory

from vs import brand as brandlib
from vs import planner, formats

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIST = os.path.join(HERE, "app", "dist")
HOME = os.environ.get("VS_HOME", os.path.expanduser("~/Movies/VideoStudio"))
BRANDS = os.path.join(HOME, "_brands")
PORT = int(os.environ.get("PORT", 5178))
os.makedirs(BRANDS, exist_ok=True)
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mts"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}

app = Flask(__name__, static_folder=os.path.join(HERE, "static"), static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 ** 3

LOCK = threading.RLock()
PROJECTS = {}
JOBS = {}
WORK_Q = queue.Queue()     # ingest + transcription (one at a time, whisper is heavy)
MATTE_Q = queue.Queue()    # cutouts

DEFAULT_SETTINGS = {
    "caption_style": "bold", "caption_words": 3, "caption_y": 1100, "accent": "",
    "grade": "none", "max_gap": 0.4, "tighten": 1.0, "whisper_model": "small", "language": "en",
    "focus": {"x": 0.5, "y": 0.32}, "brand": "", "auto_sfx": True, "safe_zone": "reels", "format": "",
}
BEAT_DEFAULTS = {"speed": 1.0, "ramp": None, "freeze": 0, "volume": 1.0, "transition": "cut", "zoom": 1.0, "params": {}, "note": ""}


@app.after_request
def cors(r):  # Remotion's render browser loads media and fonts from here
    r.headers["Access-Control-Allow-Origin"] = "*"
    return r


# ------------------------------------------------------------------ storage

def slugify(name):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return s or "untitled"


def pdir(pid):
    return os.path.join(HOME, pid)


def upgrade(p):
    p["settings"] = dict(DEFAULT_SETTINGS, **p.get("settings", {}))
    p.setdefault("media", [])
    p.setdefault("items", [])
    p["version"] = 2
    for b in p.get("beats", []):
        for k, v in BEAT_DEFAULTS.items():
            b.setdefault(k, copy.deepcopy(v))
    return p


def load(pid):
    with LOCK:
        if pid in PROJECTS:
            return PROJECTS[pid]
        path = os.path.join(pdir(pid), "project.json")
        if not os.path.exists(path):
            abort(404, "No such project")
        with open(path) as f:
            p = upgrade(json.load(f))
        for c in p["clips"]:  # a crash mid-job leaves a stale status
            if c.get("status") in ("ingesting", "transcribing", "queued"):
                c["status"] = "error"
                c["message"] = "Interrupted. Click retry."
            if c.get("matte_status") in ("queued", "running"):
                c["matte_status"] = "error"
        PROJECTS[pid] = p
        return p


def save(p):
    with LOCK:
        path = os.path.join(pdir(p["id"]), "project.json")
        tmp = path + ".tmp"
        with open(tmp, "w") as f:
            json.dump(p, f, indent=1)
        os.replace(tmp, path)


def load_brand(bid):
    f = os.path.join(BRANDS, bid, "brand.json")
    if not bid or not os.path.exists(f):
        return None
    with open(f) as fh:
        return json.load(fh)


def save_brand(b):
    d = os.path.join(BRANDS, b["id"])
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "brand.json"), "w") as f:
        json.dump(b, f, indent=1)


def payload(p):
    with LOCK:
        snap = copy.deepcopy(p)
    bid = snap["settings"].get("brand")
    return {"project": snap, "brand": brandlib.resolve(load_brand(bid), bid) if bid else None}


# ------------------------------------------------------------------ jobs

def new_job(kind, pid, **extra):
    jid = uuid.uuid4().hex[:10]
    JOBS[jid] = dict(id=jid, kind=kind, project=pid, status="queued", progress=0.0, message="Queued",
                     cancel=False, result=None, started=time.time(), **extra)
    return JOBS[jid]


def worker(q):
    while True:
        fn, args = q.get()
        try:
            fn(*args)
        except Exception:
            traceback.print_exc()
        q.task_done()


threading.Thread(target=worker, args=(WORK_Q,), daemon=True).start()
threading.Thread(target=worker, args=(MATTE_Q,), daemon=True).start()


def ffprobe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise RuntimeError("Not a readable file: %s" % out.stderr.decode()[-300:])
    return json.loads(out.stdout)


def set_clip(p, cid, **kw):
    with LOCK:
        for c in p["clips"]:
            if c["id"] == cid:
                c.update(kw)
        save(p)


_MODELS = {}


def whisper(name):
    from faster_whisper import WhisperModel
    if name not in _MODELS:
        _MODELS[name] = WhisperModel(name, device="cpu", compute_type="int8")
    return _MODELS[name]


def ingest_and_transcribe(pid, cid, skip_ingest=False):
    p = load(pid)
    clip = next((c for c in p["clips"] if c["id"] == cid), None)
    if not clip:
        return
    d = pdir(pid)
    try:
        if not skip_ingest:
            set_clip(p, cid, status="ingesting", message="Normalising to 1080x1920 30fps", progress=0.0)
            src = os.path.join(d, clip["file"])
            info = ffprobe(src)
            v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
            a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
            if not v:
                raise RuntimeError("No video stream")
            if not a:
                raise RuntimeError("No audio stream: talking-head clips need audio to transcribe")
            dur = float(info["format"].get("duration") or v.get("duration") or 0)
            proxy = os.path.join("work", "%s.mp4" % cid)
            cmd = ["ffmpeg", "-y", "-v", "error", "-progress", "pipe:1", "-i", src,
                   "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1",
                   "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-g", "15", "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart",
                   os.path.join(d, proxy)]
            pr = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            for line in pr.stdout:
                if line.startswith("out_time_ms=") and dur > 0:
                    try:
                        set_clip(p, cid, progress=min(int(line.split("=")[1]) / 1e6 / dur, 1.0) * 0.4)
                    except ValueError:
                        pass
            pr.wait()
            if pr.returncode != 0:
                raise RuntimeError("Normalising failed: " + pr.stderr.read()[-500:])
            set_clip(p, cid, proxy=proxy, duration=dur, src_w=v.get("width"), src_h=v.get("height"),
                     low_res=min(int(v.get("width") or 0), int(v.get("height") or 0)) < 1080)

        model = p["settings"].get("whisper_model", "small")
        set_clip(p, cid, status="transcribing", message="Loading whisper %s (first run downloads it)" % model, progress=0.4)
        wav = os.path.join(d, "work", "%s.wav" % cid)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(d, clip["proxy"]), "-ac", "1", "-ar", "16000", wav], check=True)
        m = whisper(model)
        set_clip(p, cid, message="Transcribing with word timestamps")
        lang = p["settings"].get("language") or None
        segs, info = m.transcribe(wav, word_timestamps=True, language=lang, beam_size=5, vad_filter=False,
                                  condition_on_previous_text=False)
        words = []
        dur = clip.get("duration") or 1
        for s in segs:
            for w in (s.words or []):
                txt = w.word.strip()
                if txt:
                    words.append({"w": txt, "s": round(float(w.start), 3), "e": round(float(w.end), 3), "cut": False})
            set_clip(p, cid, progress=0.4 + 0.6 * min(s.end / dur, 1.0))
        os.remove(wav)
        with LOCK:
            clip["words"] = words
            clip["status"] = "ready"
            clip["message"] = "%d words" % len(words)
            clip["progress"] = 1.0
            p["beats"] = [b for b in p["beats"] if b["clip"] != cid]
            tmp = {"clips": [clip], "beats": [], "settings": p["settings"]}
            planner.plan(tmp)
            for b in tmp["beats"]:
                for k, v in BEAT_DEFAULTS.items():
                    b.setdefault(k, copy.deepcopy(v))
            order = [c["id"] for c in p["clips"]]
            p["beats"] = sorted(p["beats"] + tmp["beats"], key=lambda b: (order.index(b["clip"]) if b["clip"] in order else 99, b["w0"]))
            fmt = formats.get(p["settings"].get("format"))
            if fmt and all(c.get("status") == "ready" for c in p["clips"]):
                planner.plan(p)  # one plan across every clip so the format's pace holds end to end
                upgrade(p)
            save(p)
        if fmt and fmt.get("cutout") and clip.get("matte_status") not in ("ready", "queued", "running"):
            set_clip(p, cid, matte_status="queued", matte_progress=0.0)
            MATTE_Q.put((run_matte, (pid, cid)))
    except Exception as e:
        traceback.print_exc()
        set_clip(p, cid, status="error", message=str(e)[:400])


def run_matte(pid, cid):
    from vs.matte import make_matte
    p = load(pid)
    clip = next((c for c in p["clips"] if c["id"] == cid), None)
    if not clip or not clip.get("proxy"):
        return
    rel = os.path.join("work", "%s_matte.webm" % cid)
    try:
        set_clip(p, cid, matte_status="running", matte_progress=0.0)
        make_matte(os.path.join(pdir(pid), clip["proxy"]), os.path.join(pdir(pid), rel), clip.get("duration") or 1,
                   progress=lambda x: set_clip(p, cid, matte_progress=round(x, 3)))
        set_clip(p, cid, matte=rel, matte_status="ready", matte_progress=1.0)
    except Exception as e:
        traceback.print_exc()
        set_clip(p, cid, matte_status="error", matte_message=str(e)[:300])


def ingest_media(pid, mid):
    p = load(pid)
    m = next((x for x in p["media"] if x["id"] == mid), None)
    if not m:
        return
    d = pdir(pid)
    try:
        src = os.path.join(d, m["file"])
        if m["kind"] == "image":
            from PIL import Image
            if not m["file"].lower().endswith(".svg"):
                with Image.open(src) as im:
                    m["w"], m["h"] = im.size
            m["status"] = "ready"
        else:
            info = ffprobe(src)
            v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
            m["duration"] = float(info["format"].get("duration") or 0)
            if m["kind"] == "video" and v:
                m["w"], m["h"] = v.get("width"), v.get("height")
                proxy = os.path.join("work", "media_%s.mp4" % mid)
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", "scale='min(1080,iw)':-2,fps=30,setsar=1",
                                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-g", "15", "-pix_fmt", "yuv420p",
                                "-c:a", "aac", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", os.path.join(d, proxy)], check=True)
                m["proxy"] = proxy
            m["status"] = "ready"
    except Exception as e:
        m["status"] = "error"
        m["message"] = str(e)[:300]
    with LOCK:
        save(p)


def run_render(job, pid, preview):
    p = load(pid)
    job["status"] = "running"
    try:
        with LOCK:
            snap = copy.deepcopy(p)
        bid = snap["settings"].get("brand")
        props = {"project": snap, "brand": brandlib.resolve(load_brand(bid), bid) if bid else None,
                 "base": "http://127.0.0.1:%d" % PORT}
        out_dir = os.path.join(pdir(pid), "edit_out")
        work = os.path.join(pdir(pid), "work")
        os.makedirs(out_dir, exist_ok=True)
        props_path = os.path.join(work, "render_props.json")
        with open(props_path, "w") as f:
            json.dump(props, f)
        name = "preview.mp4" if preview else "%s.mp4" % snap["slug"]
        out = os.path.join(out_dir, name)
        raw = os.path.join(work, "render_raw.mp4")
        cmd = ["node", os.path.join(HERE, "app", "render.mjs"), props_path, raw] + (["--scale", "0.5"] if preview else [])
        job["message"] = "Starting renderer"
        pr = subprocess.Popen(cmd, cwd=os.path.join(HERE, "app"), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        job["_proc"] = pr
        err = None
        for line in pr.stdout:
            try:
                msg = json.loads(line)
            except ValueError:
                continue
            if "progress" in msg:
                job["progress"] = 0.03 + 0.9 * msg["progress"]
                job["message"] = "Rendering %d%%" % round(msg["progress"] * 100)
            elif msg.get("stage") == "bundling":
                job["message"] = "Bundling effects (first render after a change)"
            elif "error" in msg:
                err = msg["error"]
        pr.wait()
        if job["cancel"]:
            raise InterruptedError()
        if pr.returncode != 0:
            raise RuntimeError(err or pr.stderr.read()[-1500:])
        job["message"] = "Normalising loudness to -14 LUFS"
        job["progress"] = 0.95
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
        os.remove(raw)
        if not preview:
            with open(os.path.join(out_dir, "plan.json"), "w") as f:
                json.dump(props, f, indent=1)
        rel = os.path.relpath(out, pdir(pid))
        job["result"] = {"path": out, "url": "/api/projects/%s/media/%s?v=%d" % (pid, rel, int(time.time()))}
        job["status"] = "done"
        job["progress"] = 1.0
        job["message"] = "Saved %s" % out
        with LOCK:
            p["last_preview" if preview else "last_export"] = job["result"]
            save(p)
    except InterruptedError:
        job["status"] = "cancelled"
        job["message"] = "Cancelled"
    except Exception as e:
        traceback.print_exc()
        job["status"] = "error"
        job["message"] = str(e)[:1500]
    job.pop("_proc", None)


# ------------------------------------------------------------------ app shell

@app.route("/")
def index():
    if not os.path.exists(os.path.join(APP_DIST, "index.html")):
        return "App not built. Run: cd app && npm install && npm run build", 500
    return send_from_directory(APP_DIST, "index.html")


@app.route("/assets/<path:p>")
def assets(p):
    return send_from_directory(os.path.join(APP_DIST, "assets"), p)


@app.route("/api/meta")
def meta():
    return jsonify({"home": HOME, "models": ["tiny.en", "base.en", "small", "small.en", "medium.en", "large-v3"]})


# ------------------------------------------------------------------ projects

@app.route("/api/projects", methods=["GET"])
def list_projects():
    out = []
    for name in sorted(os.listdir(HOME)):
        f = os.path.join(HOME, name, "project.json")
        if name.startswith("_") or not os.path.exists(f):
            continue
        try:
            with open(f) as fh:
                pj = json.load(fh)
            out.append({"id": pj["id"], "name": pj["name"], "clips": len(pj["clips"]), "updated": os.path.getmtime(f)})
        except Exception:
            pass
    out.sort(key=lambda x: -x["updated"])
    return jsonify(out)


@app.route("/api/projects", methods=["POST"])
def create_project():
    name = (request.json or {}).get("name") or "Untitled reel"
    slug = slugify(name)
    pid, n = slug, 2
    while os.path.exists(pdir(pid)):
        pid = "%s-%d" % (slug, n)
        n += 1
    for sub in ("clips", "work", "media", "edit_out"):
        os.makedirs(os.path.join(pdir(pid), sub))
    p = upgrade({"id": pid, "name": name, "slug": pid, "created": time.time(), "settings": {}, "clips": [], "beats": []})
    brands = list_brands_raw()
    if brands:
        p["settings"]["brand"] = brands[0]["id"]
    with LOCK:
        PROJECTS[pid] = p
        save(p)
    return jsonify(payload(p))


@app.route("/api/projects/<pid>", methods=["GET"])
def get_project(pid):
    return jsonify(payload(load(pid)))


@app.route("/api/projects/<pid>", methods=["PUT"])
def put_project(pid):
    """The app sends the whole edit (beats, items, settings, word edits). Server-owned fields are kept."""
    p = load(pid)
    body = request.json or {}
    with LOCK:
        if "name" in body:
            p["name"] = str(body["name"])[:120]
        if "settings" in body:
            p["settings"].update(body["settings"])
        if "beats" in body:
            ids = {c["id"]: c for c in p["clips"]}
            clean = []
            for b in body["beats"]:
                c = ids.get(b.get("clip"))
                if not c:
                    continue
                n = max(len(c.get("words", [])), 1)
                b["w0"] = max(0, min(int(b["w0"]), n - 1))
                b["w1"] = max(b["w0"], min(int(b["w1"]), n - 1))
                clean.append(b)
            p["beats"] = clean
        if "items" in body:
            p["items"] = body["items"]
        if "words" in body:  # {clipId: [{w, cut}]} full word state per clip
            for c in p["clips"]:
                ws = body["words"].get(c["id"])
                if ws and len(ws) == len(c.get("words", [])):
                    for old, new in zip(c["words"], ws):
                        old["w"] = str(new.get("w", old["w"]))[:60]
                        old["cut"] = bool(new.get("cut"))
        if "clip_order" in body:
            order = body["clip_order"]
            p["clips"].sort(key=lambda c: order.index(c["id"]) if c["id"] in order else 99)
        if "media_names" in body:
            for m in p["media"]:
                if m["id"] in body["media_names"]:
                    m["name"] = body["media_names"][m["id"]]
        save(p)
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/plan", methods=["POST"])
def replan(pid):
    p = load(pid)
    with LOCK:
        planner.plan(p, keep_effects=bool((request.json or {}).get("keep_effects")))
        upgrade(p)
        save(p)
    return jsonify(payload(p))


@app.route("/api/formats")
def list_formats():
    return jsonify(formats.summary())


@app.route("/api/projects/<pid>/format", methods=["POST"])
def apply_format(pid):
    """Pick a reel format: lock its captions and grade, queue cutouts it needs, re-plan every beat."""
    p = load(pid)
    fid = (request.json or {}).get("format") or ""
    fmt = formats.get(fid)
    if fid and not fmt:
        abort(400, "Unknown format %s" % fid)
    with LOCK:
        p["settings"]["format"] = fid
        if fmt:
            p["settings"].update(fmt.get("settings", {}))
        planner.plan(p)
        upgrade(p)
        save(p)
    if fmt and fmt.get("cutout"):
        for c in p["clips"]:
            if c.get("proxy") and c.get("matte_status") not in ("ready", "queued", "running"):
                set_clip(p, c["id"], matte_status="queued", matte_progress=0.0)
                MATTE_Q.put((run_matte, (pid, c["id"])))
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/upload", methods=["POST"])
def upload(pid):
    """Talking-head clips (transcribed into the main track)."""
    p = load(pid)
    added = []
    for f in request.files.getlist("files"):
        cid = add_clip(p, f.filename, f.save)
        if cid:
            added.append(cid)
    if not added:
        abort(400, "No video files in upload")
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/import", methods=["POST"])
def import_paths(pid):
    """Talking-head clips by local path (edit.py and Claude use this instead of a multipart upload)."""
    p = load(pid)
    added = []
    for path in (request.json or {}).get("paths", []):
        path = os.path.expanduser(path)
        if os.path.isfile(path):
            cid = add_clip(p, path, lambda dst, src=path: shutil.copyfile(src, dst))
            if cid:
                added.append(cid)
    if not added:
        abort(400, "No video files at those paths")
    return jsonify(payload(p))


def add_clip(p, filename, write):
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in VIDEO_EXT:
        return None
    cid = uuid.uuid4().hex[:8]
    fname = os.path.join("clips", "%s%s" % (cid, ext))
    write(os.path.join(pdir(p["id"]), fname))
    clip = {"id": cid, "name": os.path.basename(filename), "file": fname, "proxy": None, "status": "queued",
            "message": "Queued", "progress": 0.0, "words": []}
    with LOCK:
        p["clips"].append(clip)
        save(p)
    WORK_Q.put((ingest_and_transcribe, (p["id"], cid)))
    return cid


@app.route("/api/projects/<pid>/media", methods=["POST"])
def upload_media(pid):
    """B-roll, images, logos, music, sound effects (the media bin)."""
    p = load(pid)
    added = []
    for f in request.files.getlist("files"):
        ext = os.path.splitext(f.filename or "")[1].lower()
        kind = "video" if ext in VIDEO_EXT else "image" if ext in IMAGE_EXT else "audio" if ext in AUDIO_EXT else None
        if not kind:
            continue
        mid = uuid.uuid4().hex[:8]
        fname = os.path.join("media", "%s%s" % (mid, ext))
        f.save(os.path.join(pdir(pid), fname))
        m = {"id": mid, "name": os.path.basename(f.filename), "file": fname, "kind": kind, "status": "processing"}
        with LOCK:
            p["media"].append(m)
            save(p)
        threading.Thread(target=ingest_media, args=(pid, mid), daemon=True).start()
        added.append(mid)
    if not added:
        abort(400, "No supported files (video, image or audio)")
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/media/<mid>", methods=["DELETE"])
def delete_media(pid, mid):
    p = load(pid)
    with LOCK:
        p["media"] = [m for m in p["media"] if m["id"] != mid]
        p["items"] = [i for i in p["items"] if i.get("media") != mid]
        save(p)
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/clips/<cid>/retry", methods=["POST"])
def retry_clip(pid, cid):
    p = load(pid)
    clip = next((c for c in p["clips"] if c["id"] == cid), None) or abort(404)
    model = (request.json or {}).get("model")
    if model:
        with LOCK:
            p["settings"]["whisper_model"] = model
    set_clip(p, cid, status="queued", message="Queued", progress=0.0)
    WORK_Q.put((ingest_and_transcribe, (pid, cid, bool(clip.get("proxy")))))
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/clips/<cid>/matte", methods=["POST"])
def start_matte(pid, cid):
    p = load(pid)
    clip = next((c for c in p["clips"] if c["id"] == cid), None) or abort(404)
    if clip.get("matte_status") in ("queued", "running"):
        return jsonify(payload(p))
    set_clip(p, cid, matte_status="queued", matte_progress=0.0)
    MATTE_Q.put((run_matte, (pid, cid)))
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/clips/<cid>", methods=["DELETE"])
def delete_clip(pid, cid):
    p = load(pid)
    with LOCK:
        clip = next((c for c in p["clips"] if c["id"] == cid), None) or abort(404)
        if clip.get("status") in ("ingesting", "transcribing"):
            abort(409, "Clip is still processing")
        p["clips"].remove(clip)
        p["beats"] = [b for b in p["beats"] if b["clip"] != cid]
        save(p)
    return jsonify(payload(p))


@app.route("/api/projects/<pid>/media/<path:rel>")
def media(pid, rel):
    base = os.path.realpath(pdir(pid))
    full = os.path.realpath(os.path.join(base, rel))
    if not full.startswith(base + os.sep) or not os.path.isfile(full):
        abort(404)
    return send_file(full, conditional=True)


@app.route("/api/projects/<pid>/peaks/<kind>/<oid>")
def peaks(pid, kind, oid):
    """Audio peaks at 100 per second for timeline waveforms (cached)."""
    p = load(pid)
    src = None
    if kind == "clip":
        c = next((c for c in p["clips"] if c["id"] == oid), None)
        src = c and c.get("proxy")
    else:
        m = next((m for m in p["media"] if m["id"] == oid), None)
        src = m and (m.get("proxy") or m.get("file"))
    if not src:
        abort(404)
    cache = os.path.join(pdir(pid), "work", "peaks_%s_%s.json" % (kind, oid))
    if not os.path.exists(cache):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(pdir(pid), src), "-ac", "1", "-ar", "4000",
                              "-f", "s16le", "-"], stdout=subprocess.PIPE).stdout
        import numpy as np
        a = np.abs(np.frombuffer(raw, dtype=np.int16).astype(np.float32)) / 32768.0
        n = len(a) // 40
        pk = a[: n * 40].reshape(n, 40).max(axis=1) if n else np.zeros(0)
        with open(cache, "w") as f:
            json.dump({"rate": 100, "peaks": [round(float(x), 3) for x in pk]}, f)
    return send_file(cache, mimetype="application/json")


@app.route("/api/projects/<pid>/thumbs/<cid>")
def thumbs(pid, cid):
    """Filmstrip sprite: one 90x160 frame per second of the clip."""
    p = load(pid)
    c = next((c for c in p["clips"] if c["id"] == cid), None)
    if not c or not c.get("proxy"):
        abort(404)
    out = os.path.join(pdir(pid), "work", "thumbs_%s.jpg" % cid)
    if not os.path.exists(out):
        n = max(1, int(c.get("duration") or 1))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(pdir(pid), c["proxy"]), "-vf",
                        "fps=1,scale=90:160,tile=%dx1" % min(n, 600), "-frames:v", "1", "-q:v", "5", out], check=True)
    return send_file(out, mimetype="image/jpeg")


@app.route("/api/projects/<pid>/render", methods=["POST"])
def start_render(pid):
    load(pid)
    preview = bool((request.json or {}).get("preview"))
    for j in JOBS.values():
        if j["project"] == pid and j["kind"] == "render" and j["status"] in ("queued", "running"):
            return jsonify(job_view(j))
    job = new_job("render", pid, preview=preview)
    threading.Thread(target=run_render, args=(job, pid, preview), daemon=True).start()
    return jsonify(job_view(job))


def job_view(j):
    return {k: v for k, v in j.items() if not k.startswith("_")}


@app.route("/api/jobs/<jid>")
def get_job(jid):
    return jsonify(job_view(JOBS.get(jid) or abort(404)))


@app.route("/api/jobs/<jid>/cancel", methods=["POST"])
def cancel_job(jid):
    j = JOBS.get(jid) or abort(404)
    j["cancel"] = True
    pr = j.get("_proc")
    if pr and pr.poll() is None:
        pr.kill()
    return jsonify(job_view(j))


@app.route("/api/projects/<pid>/reveal", methods=["POST"])
def reveal(pid):
    p = load(pid)
    target = (p.get("last_export") or {}).get("path") or os.path.join(pdir(pid), "edit_out")
    subprocess.Popen(["open", "-R", target] if os.path.isfile(target) else ["open", target])
    return jsonify({"ok": True})


# ------------------------------------------------------------------ brand kits

def list_brands_raw():
    out = []
    for bid in sorted(os.listdir(BRANDS)):
        b = load_brand(bid)
        if b:
            out.append(b)
    return out


@app.route("/api/brands")
def list_brands():
    return jsonify([brandlib.resolve(b, b["id"]) for b in list_brands_raw()])


@app.route("/api/brands", methods=["POST"])
def create_brand():
    name = (request.json or {}).get("name") or "New brand"
    bid = slugify(name)
    n = 2
    while os.path.exists(os.path.join(BRANDS, bid)):
        bid = "%s-%d" % (slugify(name), n)
        n += 1
    b = {"id": bid, "name": name, "colors": {}, "fonts": {}, "logos": [], "logo_position": "none", "created": time.time()}
    save_brand(b)
    return jsonify(brandlib.resolve(b, bid))


@app.route("/api/brands/<bid>", methods=["PUT"])
def update_brand(bid):
    b = load_brand(bid) or abort(404)
    body = request.json or {}
    for k in ("name", "colors", "caption_style", "logo_position", "logo_file", "logo_height", "logo_opacity", "grade",
              "effects_allowed", "favourites", "notes", "rules", "end_card"):
        if k in body:
            b[k] = body[k]
    if "fonts" in body:  # role -> {file} picked from font_files
        for role, f in body["fonts"].items():
            match = next((x for x in b.get("font_files", []) if x["file"] == f.get("file")), None)
            if match:
                b.setdefault("fonts", {})[role] = dict(match)
    save_brand(b)
    return jsonify(brandlib.resolve(b, bid))


@app.route("/api/brands/<bid>/import", methods=["POST"])
def import_brand(bid):
    b = load_brand(bid) or abort(404)
    d = os.path.join(BRANDS, bid)
    tmp = os.path.join(d, "incoming")
    os.makedirs(tmp, exist_ok=True)
    paths = []
    for f in request.files.getlist("files"):
        fn = os.path.join(tmp, re.sub(r"[^A-Za-z0-9._-]+", "-", os.path.basename(f.filename or "file")))
        f.save(fn)
        paths.append(fn)
    url = (request.form.get("url") or "").strip() or None
    if url and not re.match(r"^https?://", url):
        url = "https://" + url
    report = brandlib.import_files(b, d, paths, url=url)
    shutil.rmtree(tmp, ignore_errors=True)
    save_brand(b)
    return jsonify({"brand": brandlib.resolve(b, bid), "report": report})


@app.route("/api/brands/<bid>", methods=["DELETE"])
def delete_brand(bid):
    d = os.path.join(BRANDS, bid)
    if os.path.isdir(d):
        shutil.rmtree(d)
    return jsonify({"ok": True})


@app.route("/api/brands/<bid>/<path:rel>")
def brand_file(bid, rel):
    base = os.path.realpath(os.path.join(BRANDS, bid))
    full = os.path.realpath(os.path.join(base, rel))
    if not full.startswith(base + os.sep) or not os.path.isfile(full):
        abort(404)
    return send_file(full, conditional=True)


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(409)
def err(e):
    return jsonify({"error": getattr(e, "description", str(e))}), e.code


if __name__ == "__main__":
    print("Video Studio on http://127.0.0.1:%d  (projects in %s)" % (PORT, HOME))
    app.run(host="127.0.0.1", port=PORT, threaded=True, debug=False)
