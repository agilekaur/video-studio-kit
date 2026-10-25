"""Effect catalog for the editor.

native=True  -> rendered by this editor (ffmpeg + PIL overlay) on preview and export.
native=False -> planned here, rendered by a Claude /video-studio pass (Remotion, cutouts).
"""

NATIVE = [
    {
        "id": "none", "name": "No effect", "big": False, "native": True,
        "desc": "Plain footage with captions.", "params": [],
    },
    {
        "id": "digital-zoom", "name": "Digital Zoom (punch in)", "big": False, "native": True,
        "desc": "Hard jump cut to a tighter crop on the emphasis line.",
        "params": [{"key": "scale", "label": "Zoom", "type": "select", "options": ["1.10", "1.25", "1.40"], "default": "1.25"}],
    },
    {
        "id": "cover-story", "name": "Cover Story", "big": True, "native": True,
        "desc": "Huge masthead word across the top with a slow push in. Sits in front of the speaker (behind-head needs a cutout pass).",
        "params": [
            {"key": "word", "label": "Word", "type": "text", "default": ""},
            {"key": "color", "label": "Colour", "type": "color", "default": "#FFD400"},
        ],
    },
    {
        "id": "spotlight", "name": "Spotlight", "big": True, "native": True,
        "desc": "Instant darken with a feathered circle on the face for a punch line.",
        "params": [{"key": "radius", "label": "Radius px", "type": "number", "default": 260}],
    },
    {
        "id": "checklist", "name": "Checklist", "big": True, "native": True,
        "desc": "Panel slides in, items tick on as they are spoken (matched against the transcript).",
        "params": [
            {"key": "title", "label": "Title", "type": "text", "default": ""},
            {"key": "items", "label": "Items (one per line)", "type": "list", "default": []},
        ],
    },
    {
        "id": "freeze-label", "name": "Freeze and Label", "big": True, "native": True,
        "desc": "Picture freezes, desaturates and pushes in, numbered callouts draw out, white flash back. Voice keeps playing.",
        "params": [{"key": "labels", "label": "Callouts (one per line)", "type": "list", "default": []}],
    },
    {
        "id": "popups", "name": "Pop up card", "big": True, "native": True,
        "desc": "Stacked cards spring in with your lines; optional red total line.",
        "params": [
            {"key": "title", "label": "Title", "type": "text", "default": ""},
            {"key": "lines", "label": "Lines (one per line)", "type": "list", "default": []},
            {"key": "total", "label": "Total line (red)", "type": "text", "default": ""},
        ],
    },
    {
        "id": "chart-grow", "name": "Chart Grow", "big": True, "native": True,
        "desc": "A rising line chart draws across the frame with a soft gradient fill.",
        "params": [{"key": "label", "label": "Label", "type": "text", "default": ""}],
    },
    {
        "id": "arrows-labels", "name": "Arrows and Labels", "big": False, "native": True,
        "desc": "Hand drawn boiling arrow with a label pointing at the speaker.",
        "params": [{"key": "label", "label": "Label", "type": "text", "default": ""}],
    },
    {
        "id": "outro-comment-ui", "name": "Outro Comment UI", "big": True, "native": True,
        "desc": "Comment card types your keyword, then a reply bubble springs in. Call to action.",
        "params": [
            {"key": "keyword", "label": "Keyword", "type": "text", "default": ""},
            {"key": "handle", "label": "Commenter", "type": "text", "default": "you"},
            {"key": "reply", "label": "Reply", "type": "text", "default": "Sent you the link"},
        ],
    },
]

_CLAUDE = [
    ("orbit", "Orbit", "3 or 4 vertical cards orbit in 3D around the speaker."),
    ("couch-wall", "Couch Wall", "Curved wall of video cards scrolls behind the cut out speaker."),
    ("ui-world", "UI World", "2D UI bits pop around the speaker, some behind a shoulder."),
    ("frame-break", "Frame Break", "Speaker in a 1:1 window; a hand or head breaks out."),
    ("phone-mockup", "Phone Mockup", "3D phone slides in, screen shows a UI or clip."),
    ("headline-wall", "Headline Wall", "Keyword pattern scrolls behind the cut out speaker."),
    ("zoom-through-cut", "Zoom Through Cut", "Fast zoom into the chest wipes to the next clip."),
    ("pullback-reveal", "Pull back Reveal", "Tight on a UI card, pulls back to a multi plane workspace."),
    ("green-screen", "Green Screen", "Screen recording fills the background, speaker in the corner."),
    ("paper-cut", "Paper Cut", "Cut out speaker on black with a torn paper border."),
    ("doodle-boil", "Doodle Boil", "Hand drawn outline wiggles around the body."),
    ("vertigo", "Vertigo", "Dolly zoom with big text behind the subject."),
    ("glass-type", "Glass Type", "Big refractive glass word in front of the speaker."),
    ("before-after", "Before and After", "Vertical wipe slider between two looks."),
    ("intro-thumbnail-arch", "Intro Thumbnail Arch", "Numbered circles pop in an arch behind the speaker."),
    ("text-explosion", "Text Explosion", "Punch word explodes into sparks or shards."),
    ("collage", "Collage", "Grid of 5 or 12 videos playing at once."),
    ("mock-app-window", "Mock App Window", "App window with a progress bar and checklist."),
    ("timeline-graphic", "Timeline Graphic", "Editor timeline with tracks and clips sliding in."),
    ("split-screen-vs", "Split Screen VS", "Side by side comparison with labels."),
    ("broll-emoji", "B-roll and Emoji", "Brand graphic cuts in, emoji pops by the head."),
    ("captions", "Caption Styles", "One line captioned three ways."),
    ("colour-grade", "Colour Grade Wipe", "Wipe between two labelled grades."),
    ("kinetic-cta", "Kinetic CTA", "Huge outlined words on each spoken word of the closing line."),
    ("layout-switcher", "Layout Switcher", "Split, punched-in speaker, full product screen."),
    ("phone-chat", "Phone Chat", "Phone chat on top, speaker below."),
    ("prompt-countdown-result", "Prompt Countdown Result", "Prompt, countdown, result card."),
    ("proof-pushin", "Proof Push-in", "Result page pushes in, line highlighted, badge."),
    ("screen-fall-3d", "Screen Fall 3D", "Six screens pop in, then fall into fog."),
    ("seam-caption-mono", "Seam Caption Mono", "Product screen on top, mono captions on the seam."),
    ("selection-highlight", "Selection Highlight", "Text selection sweeps a phrase, box snaps."),
    ("speed-ramp-pip", "Speed Ramp PiP", "Slow-mo ramp readout, then screen inset."),
    ("title-lockup", "Title Lockup", "Huge two-line headline pulls into focus."),
    ("transitions", "Transition Sampler", "Four framings joined by flash, whip and cut."),
    ("panel-explainer", "Panel Explainer", "Speaker in a bottom panel, steps, stats or quotes animate above."),
    ("split-diagram", "Split Diagram", "Face on top, a flow, bars, cycle or stack diagram builds below."),
    ("glass-stat", "Glass Stat", "Frosted glass card with a counter ticking up and a self-drawing graph."),
    ("tier-list", "Tier List", "S to D tier board on top; items fly into their row as they are named."),
    ("cutout-grid", "Cut-out Grid", "Speaker cut out and tiled into coloured tiles that reshuffle on words."),
    ("comment-pin", "Comment Pin", "Viewer comment card pinned above the face while you answer it."),
]

BIG_CLAUDE = {"orbit", "couch-wall", "ui-world", "frame-break", "phone-mockup", "headline-wall",
              "zoom-through-cut", "pullback-reveal", "paper-cut", "doodle-boil", "vertigo", "glass-type",
              "text-explosion", "broll-emoji", "colour-grade", "kinetic-cta", "layout-switcher",
              "phone-chat", "prompt-countdown-result", "proof-pushin", "screen-fall-3d", "seam-caption-mono",
              "selection-highlight", "speed-ramp-pip", "title-lockup", "glass-stat", "tier-list", "cutout-grid"}

CLAUDE = [
    {"id": i, "name": n, "big": i in BIG_CLAUDE, "native": False, "desc": d,
     "params": [{"key": "notes", "label": "Notes for the Claude pass", "type": "text", "default": ""}]}
    for i, n, d in _CLAUDE
]

CATALOG = NATIVE + CLAUDE
BY_ID = {e["id"]: e for e in CATALOG}


def is_big(effect_id):
    e = BY_ID.get(effect_id)
    return bool(e and e["big"])


def default_params(effect_id):
    e = BY_ID.get(effect_id)
    if not e:
        return {}
    return {p["key"]: (list(p["default"]) if isinstance(p["default"], list) else p["default"]) for p in e["params"]}
