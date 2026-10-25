"""Turns clips + words + beats into an output timeline.

Every edit in the UI changes only the project JSON; this module derives the cut list
(segments), output times for each beat and word, and caption chunks. Preview, overlay
rendering and export all read from the same result so they never disagree.
"""

FPS = 30
PAD_IN = 0.06
PAD_OUT = 0.10


def q(t):
    """Snap to the frame grid so segment lengths are exact in the export."""
    return round(t * FPS) / FPS


def _clip_map(project):
    return {c["id"]: c for c in project["clips"]}


def compute(project):
    st = project.get("settings", {})
    max_gap = float(st.get("max_gap", 0.4))
    clips = _clip_map(project)
    segments, beats_out, words_out = [], [], []
    out = 0.0
    last_end = {}  # clip id -> source end of last emitted segment (avoid overlapping audio)

    for b in project["beats"]:
        clip = clips.get(b["clip"])
        info = {"id": b["id"], "out_s": out, "out_e": out, "dur": 0.0, "segs": []}
        beats_out.append(info)
        if not clip or b.get("cut"):
            continue
        words = clip.get("words", [])
        idx = [i for i in range(b["w0"], b["w1"] + 1) if 0 <= i < len(words) and not words[i].get("cut")]
        if not idx:
            continue
        dur_clip = clip.get("duration", 1e9)

        runs = []
        cur = [idx[0]]
        for i in idx[1:]:
            p = cur[-1]
            contiguous = (i == p + 1)
            gap = words[i]["s"] - words[p]["e"]
            if contiguous and gap <= max_gap:
                cur.append(i)
            else:
                runs.append(cur)
                cur = [i]
        runs.append(cur)

        for run in runs:
            a, z = run[0], run[-1]
            s = words[a]["s"] - PAD_IN
            e = words[z]["e"] + PAD_OUT
            if a > 0:  # never start inside the previous word
                s = max(s, min(words[a - 1]["e"], words[a]["s"]))
            if z + 1 < len(words):  # never run into the next word
                e = min(e, max(words[z + 1]["s"], words[z]["e"]))
            le = last_end.get(clip["id"])
            if le is not None and s < le <= words[a]["s"]:  # adjacent beat already played this audio
                s = le
            s = max(0.0, s)
            e = min(dur_clip, e)
            s, e = q(s), q(e)
            if e - s < 2.0 / FPS:
                continue
            seg = {"clip": clip["id"], "s": s, "e": e, "out_s": q(out), "out_e": q(out + (e - s)),
                   "beat": b["id"], "first_word": a, "last_word": z}
            segments.append(seg)
            info["segs"].append(len(segments) - 1)
            for i in run:
                w = words[i]
                ws = seg["out_s"] + max(0.0, w["s"] - s)
                we = seg["out_s"] + min(e - s, max(w["e"] - s, w["s"] - s + 0.05))
                words_out.append({"clip": clip["id"], "i": i, "text": w["w"], "out_s": ws, "out_e": we, "beat": b["id"]})
            out = seg["out_e"]
            last_end[clip["id"]] = e
        info["out_e"] = out
        info["dur"] = out - info["out_s"]

    chunks = caption_chunks(words_out, int(st.get("caption_words", 3)))
    return {"segments": segments, "beats": beats_out, "words": words_out, "chunks": chunks, "duration": out}


def caption_chunks(words_out, max_words=3):
    chunks, cur = [], []
    for k, w in enumerate(words_out):
        if cur:
            prev = words_out[cur[-1]]
            brk = (len(cur) >= max_words or prev["text"].rstrip()[-1:] in ".?!,;:"
                   or w["out_s"] - prev["out_e"] > 0.3 or w["beat"] != prev["beat"])
            if brk:
                chunks.append(cur)
                cur = []
        cur.append(k)
    if cur:
        chunks.append(cur)
    res = []
    for n, c in enumerate(chunks):
        s = words_out[c[0]]["out_s"]
        e = words_out[c[-1]]["out_e"] + 0.35
        if n + 1 < len(chunks):
            e = min(e, words_out[chunks[n + 1][0]]["out_s"])
        res.append({"words": c, "s": s, "e": max(e, words_out[c[-1]]["out_e"])})
    return res


def beat_at(tl, t):
    for b in tl["beats"]:
        if b["dur"] > 0 and b["out_s"] <= t < b["out_e"]:
            return b
    return None
