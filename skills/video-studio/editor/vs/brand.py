"""Brand kit import: turn a dropped-in brand guide, font files, logos or a website URL into brand.json.

Deterministic extraction only (hex codes with their role words, font files, logo images).
Claude can refine a kit afterwards through /video-studio by editing brand.json.
"""
import colorsys
import os
import re
import shutil
import urllib.parse
import urllib.request
from collections import Counter

FONT_EXT = {".ttf", ".otf", ".woff", ".woff2"}
IMG_EXT = {".png", ".svg", ".jpg", ".jpeg", ".webp"}
TEXT_EXT = {".md", ".txt", ".css", ".html", ".htm", ".json", ".yaml", ".yml"}
HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")

ROLES = [  # (role, keywords) checked in order; first match on a line wins
    ("caption_box", ["word box", "spoken-word", "caption box", "highlight box", "active box"]),
    ("caption_outline", ["caption outline", "caption stroke", "text stroke", "outline"]),
    ("caption_text", ["caption letters", "caption text", "caption fill", "subtitle"]),
    ("caption_active", ["active word", "caption highlight", "caption accent"]),
    ("danger", ["danger", "error"]),
    ("accent", ["accent", "highlight", "cta", "call to action", "pop colour", "pop color"]),
    ("primary", ["primary", "brand colour", "brand color", "main colour", "main color"]),
    ("surface", ["background", "ground", "surface", "paper", "base colour", "canvas"]),
    ("surface_text", ["ink", "body text", "text colour", "text color", "foreground"]),
]
WEAK = re.compile(r"\b(tint|faint|pale|light tint|deep|pressed|red-black|hover|disabled|border|hairline)\b", re.I)


def norm_hex(h):
    h = h.lstrip("#").lower()
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return "#" + h


def sat(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hsv(r, g, b)


def extract_colors(text):
    """Every line with a hex code votes for the roles its words mention; tints and pressed states vote weakly."""
    found, cands = Counter(), {}
    for n, line in enumerate(text.splitlines()):
        hs = [norm_hex(h) for h in HEX.findall(line)]
        if not hs:
            continue
        for h in hs:
            found[h] += 1
        low = line.lower()
        for role, keys in ROLES:
            if any(k in low for k in keys):
                h = hs[0]  # first column = primary theme value
                score = 2.0 - (1.6 if WEAK.search(line) else 0) + (1.0 if "**" in line or "the accent" in low else 0)
                if role in ("accent", "primary", "caption_box", "caption_active"):
                    score += sat(h)[1]
                cands.setdefault(role, []).append((score, -n, h))
    roles = {r: max(c)[2] for r, c in cands.items()}
    if "accent" not in roles:
        vivid = [h for h, _ in found.most_common() if sat(h)[1] > 0.45 and sat(h)[2] > 0.35]
        if vivid:
            roles["accent"] = vivid[0]
    if "primary" not in roles and "accent" in roles:
        roles["primary"] = roles["accent"]
    if "caption_text" in roles:  # titles on video follow the caption letters, not the web ink
        roles.setdefault("text", roles["caption_text"])
    if "caption_outline" in roles:
        roles.setdefault("outline", roles["caption_outline"])
    return roles, [h for h, _ in found.most_common(16)]


def font_info(path):
    try:
        from fontTools.ttLib import TTFont
        f = TTFont(path, lazy=True)
        name = f["name"]
        fam = name.getDebugName(16) or name.getDebugName(1) or ""
        weight = f["OS/2"].usWeightClass if "OS/2" in f else 400
        if len(fam.strip()) < 2 or fam.strip().lower() in ("false", "true", "none", "null"):
            raise ValueError("unusable family name")
        return fam, int(weight)
    except Exception:
        base = os.path.splitext(os.path.basename(path))[0]
        m = re.search(r"(\d{3})", base)
        return re.sub(r"[-_]?\d{3}$", "", base).replace("-", " "), int(m.group(1)) if m else 400


def pdf_text(path):
    try:
        from pypdf import PdfReader
        return "\n".join((p.extract_text() or "") for p in PdfReader(path).pages[:40])
    except Exception:
        return ""


def fetch(url, dest_dir, max_assets=6):
    """Fetch a website: page text, CSS colours/fonts, logo image. Returns (text, saved_files)."""
    saved = []
    hdr = {"User-Agent": "Mozilla/5.0 VideoStudio brand import"}

    def get(u, binary=False):
        req = urllib.request.Request(u, headers=hdr)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read(6_000_000)
        return data if binary else data.decode("utf-8", "replace")

    html = get(url)
    text = [html]
    css_links = re.findall(r'<link[^>]+rel=["\']?stylesheet["\']?[^>]*href=["\']([^"\']+)', html, re.I)
    css_links += re.findall(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)', html, re.I)
    for href in list(dict.fromkeys(css_links))[:4]:
        try:
            text.append(get(urllib.parse.urljoin(url, href)))
        except Exception:
            pass
    blob = "\n".join(text)
    # fonts referenced by @font-face
    n = 0
    for src in re.findall(r"url\(([^)]+\.woff2[^)]*)\)", blob)[:max_assets]:
        u = urllib.parse.urljoin(url, src.strip("'\" "))
        try:
            data = get(u, True)
            fn = os.path.join(dest_dir, "site-font-%d.woff2" % n)
            with open(fn, "wb") as f:
                f.write(data)
            saved.append(fn)
            n += 1
        except Exception:
            pass
    # logo: <img ... logo ...> or og:image or icon
    cands = re.findall(r'<img[^>]+src=["\']([^"\']*logo[^"\']*)', html, re.I)
    cands += re.findall(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html, re.I)
    for k, c in enumerate(cands[:2]):
        u = urllib.parse.urljoin(url, c)
        ext = os.path.splitext(urllib.parse.urlparse(u).path)[1].lower() or ".png"
        if ext not in IMG_EXT:
            continue
        try:
            data = get(u, True)
            fn = os.path.join(dest_dir, "site-logo-%d%s" % (k, ext))
            with open(fn, "wb") as f:
                f.write(data)
            saved.append(fn)
        except Exception:
            pass
    # css custom properties are good role hints: --accent: #xxx
    hints = "\n".join("%s %s" % (m[0].replace("-", " "), m[1]) for m in re.findall(r"--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})", blob))
    plain = re.sub(r"<[^>]+>", " ", html)
    return hints + "\n" + plain + "\n" + blob, saved


def import_files(brand, bdir, paths, url=None):
    """Merge new sources into brand dict. Files are copied under bdir/files. Returns a report."""
    files_dir = os.path.join(bdir, "files")
    os.makedirs(files_dir, exist_ok=True)
    texts, fonts, logos, report = [], [], [], []
    if url:
        try:
            t, saved = fetch(url, files_dir)
            texts.append(t)
            paths = list(paths) + saved
            report.append("Read %s" % url)
            brand.setdefault("sources", []).append(url)
        except Exception as e:
            report.append("Could not fetch %s: %s" % (url, e))
    for p in paths:
        ext = os.path.splitext(p)[1].lower()
        dest = p if os.path.dirname(os.path.abspath(p)) == os.path.abspath(files_dir) else os.path.join(files_dir, os.path.basename(p))
        if dest != p:
            shutil.copy(p, dest)
        rel = os.path.relpath(dest, bdir)
        if ext in FONT_EXT:
            fam, wt = font_info(dest)
            fonts.append({"family": fam, "weight": wt, "file": rel})
        elif ext in IMG_EXT:
            logos.append({"name": os.path.basename(dest), "file": rel})
        elif ext == ".pdf":
            texts.append(pdf_text(dest))
            brand.setdefault("sources", []).append(os.path.basename(dest))
        elif ext in TEXT_EXT:
            with open(dest, encoding="utf-8", errors="replace") as f:
                texts.append(f.read())
            brand.setdefault("sources", []).append(os.path.basename(dest))
    text = "\n".join(texts)
    if text.strip():
        roles, palette = extract_colors(text)
        brand.setdefault("colors", {}).update(roles)
        brand["palette"] = list(dict.fromkeys(palette + brand.get("palette", [])))[:16]
        report.append("Colours: %s" % (", ".join("%s %s" % (k, v) for k, v in roles.items()) or "none found"))
        notes = brand.get("notes", "")
        brand["notes"] = (notes + "\n\n" + text[:6000]).strip()[:20000]
        m = re.search(r"fonts?[^\n:]*:\s*([^\n]+)", text, re.I)
        if m:
            brand["font_names"] = m.group(1).strip()[:200]
    if fonts:
        lib = brand.setdefault("font_files", [])
        lib.extend(f for f in fonts if f["file"] not in {x["file"] for x in lib})
        heavy = sorted(lib, key=lambda f: -f["weight"])
        fam_heavy = heavy[0]
        others = [f for f in lib if f["family"] != fam_heavy["family"]]
        body = sorted(others or lib, key=lambda f: abs(f["weight"] - 600))[0]
        brand.setdefault("fonts", {})
        brand["fonts"]["heading"] = {"family": fam_heavy["family"], "file": fam_heavy["file"], "weight": fam_heavy["weight"]}
        brand["fonts"]["caption"] = dict(brand["fonts"]["heading"])
        brand["fonts"]["body"] = {"family": body["family"], "file": body["file"], "weight": body["weight"]}
        report.append("Fonts: " + ", ".join("%s %d" % (f["family"], f["weight"]) for f in fonts))
    if logos:
        lib = brand.setdefault("logos", [])
        lib.extend(l for l in logos if l["file"] not in {x["file"] for x in lib})
        light = [l for l in lib if re.search(r"cream|white|light|reverse|inverse", l["name"], re.I)]
        full = [l for l in (light or lib) if not re.search(r"\b(ak|mark|icon|favicon)\b", l["name"], re.I)]
        brand["logo_file"] = (full or light or lib)[0]["file"]
        report.append("Logos: %d (using %s on video)" % (len(lib), os.path.basename(brand["logo_file"])))
    c = brand.get("colors", {})
    if c.get("caption_box"):
        brand.setdefault("caption_style", "brand")
    return report


def resolve(brand, bid):
    """brand.json -> the shape the renderer wants (font/logo URLs)."""
    if not brand:
        return None
    out = dict(brand)
    fonts = {}
    for k, f in (brand.get("fonts") or {}).items():
        if f and f.get("file"):
            fonts[k] = {"family": "B-%s-%s" % (bid, f["family"]), "url": "/api/brands/%s/%s" % (bid, f["file"]), "weight": f.get("weight", 400),
                        "label": f["family"]}
    out["fonts"] = fonts
    out["logo"] = "/api/brands/%s/%s" % (bid, brand["logo_file"]) if brand.get("logo_file") else None
    return out
