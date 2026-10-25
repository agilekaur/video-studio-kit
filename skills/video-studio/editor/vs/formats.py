"""Reel formats: recipes that lock layout, captions, grade, pace and the beat -> effect map.

The recipes live in editor/app/src/formats/<id>.json so the app and the planner share them.
"""
import glob
import json
import os

DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "src", "formats")


def load_all():
    out = []
    for f in glob.glob(os.path.join(DIR, "*.json")):
        with open(f) as fh:
            out.append(json.load(fh))
    out.sort(key=lambda r: r.get("order", 99))
    return out


def get(fid):
    if not fid:
        return None
    return next((r for r in load_all() if r["id"] == fid), None)


def summary():
    keys = ("id", "name", "bucket", "order", "tagline", "best_for", "look", "signature", "cutout", "settings")
    return [{k: r.get(k) for k in keys} for r in load_all()]
