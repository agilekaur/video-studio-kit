"""Beat planning: split transcript into beats, flag retakes, suggest one effect per beat.

Follows SKILL.md section 3: one big effect per beat, >= 1.5 s between big effects,
about one big effect per 6.5 s, hook gets a strong open, last beat is the call to action.
"""
import re
import uuid
from difflib import SequenceMatcher

from . import effects, formats
from .timeline import compute

LIST_CUES = re.compile(r"\b(first|second|third|fourth|step|steps|tips|ways|things|reasons|mistakes|rules|"
                       r"number one|number two|(\d+|two|three|four|five|six|seven) (things|ways|tips|steps|tools|apps|mistakes|lessons|rules|habits|signs))\b", re.I)
GROWTH = re.compile(r"\b(grew|grow|growth|doubled|tripled|increase[sd]?|revenue|sales|leads|followers|views|"
                    r"subscribers|went from|up to|percent|x)\b|%|\$", re.I)
NUMBER = re.compile(r"\d|%|\$|\b(hundred|thousand|million|billion|double|triple|half)\b", re.I)
CTA = re.compile(r"\b(comment|follow|subscribe|link in|dm me|save this|share this|type)\b", re.I)
TOOLS = re.compile(r"\b(chatgpt|claude|gemini|notion|zapier|make\.com|canva|figma|excel|sheets|slack|hubspot|"
                   r"xero|myob|shopify|airtable|perplexity|midjourney|cursor|n8n|lovable|gpt|copilot|ai agent|agents?)\b", re.I)
CONTRAST = re.compile(r"\b(before and after|used to|instead of|versus|vs\.?|old way|new way|but now|compared to|went from)\b", re.I)
TIER_WORDS = re.compile(r"\b(tier|rank|ranked|ranking|goat|trash|overrated|underrated|top of|bottom of|the best|the worst)\b", re.I)
TIER_OF = re.compile(r"\b([SABCD])[- ]tier\b", re.I)
KEYWORD_CTA = re.compile(r"\b(?:comment|type)\s+[\"']?([A-Za-z0-9]+)", re.I)
STOP = set("the a an and or but so to of in on for with is are was were be been it this that i you we they my your our "
           "just really very can will would could should do does did have has had not no yes if then than at by from as "
           "about into what when how why who which there here".split())


def _norm(t):
    return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()


def new_id():
    return uuid.uuid4().hex[:8]


def split_beats(clip):
    """Sentence-ish beats of 1.2 to ~6 s from one clip's words."""
    words = clip.get("words", [])
    beats, cur = [], []
    for i, w in enumerate(words):
        if cur:
            p = words[cur[-1]]
            span = w["e"] - words[cur[0]]["s"]
            end_sent = p["w"].rstrip()[-1:] in ".?!"
            if end_sent or w["s"] - p["e"] > 0.8 or (span > 6.0 and p["w"].rstrip()[-1:] in ",;:") or span > 7.5:
                beats.append(cur)
                cur = []
        cur.append(i)
    if cur:
        beats.append(cur)
    merged = []
    for b in beats:
        dur = words[b[-1]]["e"] - words[b[0]]["s"]
        if merged and dur < 1.2 and (words[merged[-1][-1]]["e"] - words[merged[-1][0]]["s"]) < 4.5:
            merged[-1] = merged[-1] + b
        else:
            merged.append(b)
    return [(b[0], b[-1]) for b in merged]


def text_of(clip, b):
    ws = clip["words"][b["w0"]:b["w1"] + 1]
    return " ".join(w["w"].strip() for w in ws if not w.get("cut"))


def key_word(text):
    cands = [re.sub(r"[^A-Za-z0-9']", "", w) for w in text.split()]
    cands = [c for c in cands if c and c.lower() not in STOP]
    if not cands:
        return ""
    return max(cands, key=lambda c: (len(c) >= 4, len(c))).upper()


def suggest(purpose, text):
    if purpose == "hook":
        return "cover-story", {"word": key_word(text)}
    if purpose == "cta":
        m = re.search(r"\b(?:comment|type)\s+[\"']?([A-Za-z0-9]+)", text, re.I)
        return "outro-comment-ui", {"keyword": (m.group(1).upper() if m else key_word(text))}
    if purpose == "list":
        parts = [p.strip(" .") for p in re.split(r",|\band\b", text) if len(p.strip().split()) >= 1]
        items = parts[1:5] if len(parts) >= 3 else []
        return "checklist", {"title": " ".join(text.split()[:4]).upper().strip(",."), "items": items}
    if purpose == "proof":
        if GROWTH.search(text):
            return "chart-grow", {"label": ""}
        return "popups", {"title": key_word(text), "lines": [], "total": ""}
    if purpose == "tools":
        return "popups", {"title": key_word(text), "lines": [], "total": ""}
    if purpose == "punch":
        return "spotlight", {}
    return "none", {}


def classify(text, n, i, prev_purpose, contrast=False):
    if i == 0:
        return "hook"
    if i == n - 1 and CTA.search(text):
        return "cta"
    if i == n - 1:
        return "cta"
    if LIST_CUES.search(text):
        return "list"
    if NUMBER.search(text):
        return "proof"
    if TOOLS.search(text):
        return "tools"
    if contrast and CONTRAST.search(text):
        return "contrast"
    if len(text.split()) <= 6 and (text.rstrip().endswith("!") or prev_purpose in ("list", "proof")):
        return "punch"
    return "point"


# ------------------------------------------------------------------ formats

def _stem(w):
    w = re.sub(r"[^a-z0-9]", "", w.lower())
    w = re.sub(r"ies$", "y", w)
    return re.sub(r"([^s])s$", r"\1", w)


def topic_freq(text):
    f = {}
    for w in text.split():
        k = _stem(w)
        if k and k not in STOP and len(k) >= 3:
            f[k] = f.get(k, 0) + 1
    return f


def topic_word(text, freq):
    """A word from this line the whole script keeps coming back to, else the longest strong word."""
    cands = [re.sub(r"[^A-Za-z0-9']", "", w) for w in text.split()]
    cands = [c for c in cands if c and c.lower() not in STOP and len(c) >= 3]
    if not cands:
        return key_word(text)
    def score(w):
        return freq.get(_stem(w), 0) * 3 + (4 if w[:1].isdigit() else 0) + (1 if w[:1].isupper() else 0) + min(len(w), 10) * 0.1
    return max(cands, key=score).upper()


def clauses(text):
    parts = re.split(r"[,;]|\band\b|\.\s", text)
    return [p.strip().rstrip(".!?") for p in parts if len(p.strip()) > 1]


def params_for(effect, text, freq):
    """Starting params from the spoken line. Effects fall back to the speech for anything left blank."""
    if effect in ("cover-story", "headline-wall", "text-explosion", "glass-type"):
        return {"word": topic_word(text, freq)}
    if effect == "checklist":
        return {"title": " ".join(text.split()[:4]).upper().strip(",."), "items": clauses(text)[1:5]}
    if effect == "freeze-label":
        return {"labels": clauses(text)[:3]}
    if effect == "mock-app-window":
        return {"title": topic_word(text, freq).title(), "items": clauses(text)[:4]}
    if effect == "outro-comment-ui":
        m = KEYWORD_CTA.search(text)
        return {"keyword": m.group(1).upper() if m else key_word(text)}
    if effect == "popups":
        return {"title": topic_word(text, freq).title()}
    if effect == "ui-world":
        return {"lines": clauses(text)[:3]}
    return {}


def _ok(cand, text, can_cutout):
    cond = cand.get("if")
    if cand.get("needs") == "cutout" and not can_cutout:
        return False
    if cond == "short":
        return len(text.split()) <= 8
    if cond == "growth":
        return bool(GROWTH.search(text))
    if cond == "keyword":
        return bool(KEYWORD_CTA.search(text))
    if cond == "items":
        return len(clauses(text)) >= 3
    if cond == "number":
        return bool(NUMBER.search(text))
    if cond == "tier":
        return bool(TIER_WORDS.search(text) or TIER_OF.search(text))
    return True


def pick_from_format(fmt, purpose, text, freq, counters, can_cutout):
    """First matching candidate; rotating specs start from the next slot each time the purpose comes up."""
    spec = fmt["beats"].get(purpose) or fmt["beats"].get("point") or [{"effect": "none"}]
    if isinstance(spec, dict):
        opts = spec["rotate"]
        k = counters.get(purpose, 0)
        counters[purpose] = k + 1
        opts = opts[k % len(opts):] + opts[:k % len(opts)]
    else:
        opts = spec
    cand = next((c for c in opts if _ok(c, text, can_cutout)), {"effect": "none"})
    eff = cand["effect"]
    params = dict(effects.default_params(eff), **params_for(eff, text, freq))
    params.update(cand.get("params", {}))
    return eff, params


def punch_zoom(fmt, eff, i):
    pace = fmt.get("pace", {})
    if eff != "none" and eff not in pace.get("punch_on", []):
        return 1.0
    mode = pace.get("punch", "alternate")
    if mode == "every" or (mode == "alternate" and i % 2 == 1):
        return float(pace.get("punch_scale", 1.1))
    return 1.0


def plan(project, keep_effects=False):
    """Rebuild beats from the transcript. keep_effects keeps manual choices where beats survive."""
    old = {(b["clip"], b["w0"], b["w1"]): b for b in project.get("beats", [])}
    beats = []
    for clip in project["clips"]:
        if not clip.get("words"):
            continue
        for w0, w1 in split_beats(clip):
            beats.append({"id": new_id(), "clip": clip["id"], "w0": w0, "w1": w1, "cut": False,
                          "purpose": "point", "effect": "none", "params": {}, "zoom": 1.0,
                          "transition": "cut", "note": ""})
    clips = {c["id"]: c for c in project["clips"]}

    # retakes: an earlier beat that is repeated soon after is the weaker take
    texts = [_norm(text_of(clips[b["clip"]], b)) for b in beats]
    for i, t in enumerate(texts):
        if len(t.split()) < 3:
            continue
        for j in range(i + 1, min(i + 5, len(beats))):
            u = texts[j]
            if len(u.split()) < 3:
                continue
            r = SequenceMatcher(None, t, u).ratio()
            head = SequenceMatcher(None, t[:40], u[:40]).ratio()
            if r > 0.72 or (head > 0.85 and len(u) >= 0.6 * len(t)):
                beats[i]["cut"] = True
                beats[i]["note"] = "Retake: later take kept (beat %d)" % (j + 1)
                break

    live = [b for b in beats if not b["cut"]]
    fmt = formats.get(project.get("settings", {}).get("format"))
    can_cutout = bool(fmt and fmt.get("cutout")) or any(c.get("matte_status") == "ready" for c in project["clips"])
    freq = topic_freq(" ".join(text_of(clips[b["clip"]], b) for b in live))
    counters = {}
    prev = None
    for i, b in enumerate(live):
        txt = text_of(clips[b["clip"]], b)
        b["purpose"] = classify(txt, len(live), i, prev, contrast=bool(fmt))
        prev = b["purpose"]
        if fmt:
            eff, params = pick_from_format(fmt, b["purpose"], txt, freq, counters, can_cutout)
            b["effect"] = eff
            b["params"] = params
            b["zoom"] = punch_zoom(fmt, eff, i)
        else:
            eff, params = suggest(b["purpose"], txt)
            b["effect"] = eff
            b["params"] = dict(effects.default_params(eff), **params)
            b["zoom"] = 1.1 if (i % 2 == 1 and eff in ("none", "spotlight")) else 1.0
        if keep_effects:
            o = old.get((b["clip"], b["w0"], b["w1"]))
            if o:
                for k in ("effect", "params", "zoom", "transition", "purpose", "cut", "note"):
                    b[k] = o[k]

    project["beats"] = beats
    if not keep_effects:
        enforce_pacing(project)
        if fmt:
            continuity(project, clips)
    return project


def _item_name(text, freq):
    m = TOOLS.search(text)
    if m:
        return m.group(0).title() if m.group(0).islower() else m.group(0)
    caps = [re.sub(r"[^A-Za-z0-9]", "", w) for w in text.split()[1:] if w[:1].isupper()]
    caps = [c for c in caps if c and c.lower() not in STOP and c != "I"]
    return caps[0] if caps else topic_word(text, freq).title()


def _tier_of(text, n):
    m = TIER_OF.search(text)
    if m:
        return m.group(1).upper()
    t = text.lower()
    if re.search(r"\b(goat|the best|top of|top tier)\b", t):
        return "S"
    if re.search(r"\b(trash|the worst|bottom|overrated)\b", t):
        return "D"
    return "SABCD"[min(n, 4)]


def continuity(project, clips):
    """Effects that carry across beats: the tier board fills up, the comment pin enters once then holds."""
    live = [b for b in project["beats"] if not b["cut"]]
    freq = topic_freq(" ".join(text_of(clips[b["clip"]], b) for b in live))
    board, pin = [], None
    for b in live:
        txt = text_of(clips[b["clip"]], b)
        if b["effect"] == "tier-list":
            b["params"]["board"] = list(board)
            hold = str(b["params"].get("hold", "no")) in ("yes", "True", "true")
            if hold and not board and b["purpose"] != "hook":  # nothing ranked yet: stay on the speaker (the hook opens on the empty board)
                b["effect"], b["params"], b["zoom"] = "none", {}, 1.1
            elif not hold:
                add = b["params"].get("add") or _item_name(txt, freq)
                tier = _tier_of(txt, len(board))
                b["params"].update({"add": add, "tier": tier})
                board.append("%s: %s" % (tier, add))
        elif b["effect"] == "comment-pin":
            if pin is None:
                pin = b["params"].get("comment") or txt
                b["params"]["mode"] = "enter"
            else:
                b["params"]["mode"] = "hold"
            b["params"]["comment"] = pin


def enforce_pacing(project):
    """Drop lower-priority big effects that break the gap or count rules (the format sets both)."""
    tl = compute(project)
    dur = max(tl["duration"], 1.0)
    fmt = formats.get(project.get("settings", {}).get("format"))
    pace = (fmt or {}).get("pace", {})
    every, gap = float(pace.get("big_every", 6.5)), float(pace.get("min_gap", 1.5))
    budget = max(3, int(round(dur / every)))
    times = {b["id"]: b for b in tl["beats"]}
    prio = {"hook": 0, "cta": 1, "list": 2, "proof": 3, "contrast": 4, "tools": 5, "punch": 6, "point": 7}
    exempt = set(pace.get("exempt", []))
    big = [b for b in project["beats"] if not b["cut"] and effects.is_big(b["effect"]) and b["effect"] not in exempt]
    sig = set((fmt or {}).get("signature", []))
    big.sort(key=lambda b: (prio.get(b["purpose"], 9), b["effect"] not in sig))
    kept = []
    for b in big:
        t = times[b["id"]]
        clash = any(not (t["out_s"] >= times[k["id"]]["out_e"] + gap or t["out_e"] + gap <= times[k["id"]]["out_s"]) for k in kept)
        if clash or len(kept) >= budget:
            b["effect"] = "none"
            b["params"] = {}
            b["zoom"] = float(pace.get("punch_scale", 1.1))
        else:
            kept.append(b)


def warnings(project, tl):
    """Live pacing checks shown in the UI."""
    out = []
    times = {b["id"]: b for b in tl["beats"]}
    live = [b for b in project["beats"] if not b["cut"] and times[b["id"]]["dur"] > 0]
    big = [b for b in live if effects.is_big(b["effect"])]
    for a, b in zip(big, big[1:]):
        gap = times[b["id"]]["out_s"] - times[a["id"]]["out_e"]
        if gap < 1.5:
            out.append({"beat": b["id"], "msg": "Only %.1fs after the previous big effect (min 1.5s)" % max(gap, 0)})
    dur = tl["duration"]
    if dur > 0:
        budget = max(3, int(round(dur / 6.5)))
        if len(big) > budget:
            out.append({"beat": None, "msg": "%d big effects in %.0fs; aim for %d or fewer" % (len(big), dur, budget)})
    if live and live[0]["effect"] == "none" and float(live[0].get("zoom", 1)) <= 1.0:
        out.append({"beat": live[0]["id"], "msg": "Hook has no effect or punch in"})
    for b in live:
        e = effects.BY_ID.get(b["effect"])
        if b["effect"] == "checklist" and not [x for x in b["params"].get("items", []) if x.strip()]:
            out.append({"beat": b["id"], "msg": "Checklist has no items"})
        if b["effect"] == "popups" and not b["params"].get("lines") and not b["params"].get("title"):
            out.append({"beat": b["id"], "msg": "Pop up card is empty"})
        if e and not e["native"]:
            out.append({"beat": b["id"], "msg": "%s renders in the Claude pass, not in this export" % e["name"]})
    return out
