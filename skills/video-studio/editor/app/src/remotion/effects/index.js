import * as none from "./none.jsx";
import * as digital_zoom from "./digital-zoom.jsx";
import * as cover_story from "./cover-story.jsx";
import * as spotlight from "./spotlight.jsx";
import * as checklist from "./checklist.jsx";
import * as freeze_label from "./freeze-label.jsx";
import * as popups from "./popups.jsx";
import * as chart_grow from "./chart-grow.jsx";
import * as arrows_labels from "./arrows-labels.jsx";
import * as outro_comment_ui from "./outro-comment-ui.jsx";
import * as orbit from "./orbit.jsx";
import * as couch_wall from "./couch-wall.jsx";
import * as ui_world from "./ui-world.jsx";
import * as frame_break from "./frame-break.jsx";
import * as phone_mockup from "./phone-mockup.jsx";
import * as headline_wall from "./headline-wall.jsx";
import * as zoom_through_cut from "./zoom-through-cut.jsx";
import * as pullback_reveal from "./pullback-reveal.jsx";
import * as green_screen from "./green-screen.jsx";
import * as paper_cut from "./paper-cut.jsx";
import * as doodle_boil from "./doodle-boil.jsx";
import * as vertigo from "./vertigo.jsx";
import * as glass_type from "./glass-type.jsx";
import * as before_after from "./before-after.jsx";
import * as intro_thumbnail_arch from "./intro-thumbnail-arch.jsx";
import * as text_explosion from "./text-explosion.jsx";
import * as collage from "./collage.jsx";
import * as mock_app_window from "./mock-app-window.jsx";
import * as timeline_graphic from "./timeline-graphic.jsx";
import * as split_screen_vs from "./split-screen-vs.jsx";
import * as broll_emoji from "./broll-emoji.jsx";
import * as captions from "./captions.jsx";
import * as colour_grade from "./colour-grade.jsx";
import * as kinetic_cta from "./kinetic-cta.jsx";
import * as layout_switcher from "./layout-switcher.jsx";
import * as phone_chat from "./phone-chat.jsx";
import * as prompt_countdown_result from "./prompt-countdown-result.jsx";
import * as proof_pushin from "./proof-pushin.jsx";
import * as screen_fall_3d from "./screen-fall-3d.jsx";
import * as seam_caption_mono from "./seam-caption-mono.jsx";
import * as selection_highlight from "./selection-highlight.jsx";
import * as speed_ramp_pip from "./speed-ramp-pip.jsx";
import * as title_lockup from "./title-lockup.jsx";
import * as transitions from "./transitions.jsx";
import * as panel_explainer from "./panel-explainer.jsx";
import * as split_diagram from "./split-diagram.jsx";
import * as glass_stat from "./glass-stat.jsx";
import * as tier_list from "./tier-list.jsx";
import * as cutout_grid from "./cutout-grid.jsx";
import * as comment_pin from "./comment-pin.jsx";

// id -> module {meta, Front?, Behind?, styles?}
export const EFFECTS = {
  "none": none,
  "digital-zoom": digital_zoom,
  "cover-story": cover_story,
  "spotlight": spotlight,
  "checklist": checklist,
  "freeze-label": freeze_label,
  "popups": popups,
  "chart-grow": chart_grow,
  "arrows-labels": arrows_labels,
  "outro-comment-ui": outro_comment_ui,
  "orbit": orbit,
  "couch-wall": couch_wall,
  "ui-world": ui_world,
  "frame-break": frame_break,
  "phone-mockup": phone_mockup,
  "headline-wall": headline_wall,
  "zoom-through-cut": zoom_through_cut,
  "pullback-reveal": pullback_reveal,
  "green-screen": green_screen,
  "paper-cut": paper_cut,
  "doodle-boil": doodle_boil,
  "vertigo": vertigo,
  "glass-type": glass_type,
  "before-after": before_after,
  "intro-thumbnail-arch": intro_thumbnail_arch,
  "text-explosion": text_explosion,
  "collage": collage,
  "mock-app-window": mock_app_window,
  "timeline-graphic": timeline_graphic,
  "split-screen-vs": split_screen_vs,
  "broll-emoji": broll_emoji,
  "captions": captions,
  "colour-grade": colour_grade,
  "kinetic-cta": kinetic_cta,
  "layout-switcher": layout_switcher,
  "phone-chat": phone_chat,
  "prompt-countdown-result": prompt_countdown_result,
  "proof-pushin": proof_pushin,
  "screen-fall-3d": screen_fall_3d,
  "seam-caption-mono": seam_caption_mono,
  "selection-highlight": selection_highlight,
  "speed-ramp-pip": speed_ramp_pip,
  "title-lockup": title_lockup,
  "transitions": transitions,
  "panel-explainer": panel_explainer,
  "split-diagram": split_diagram,
  "glass-stat": glass_stat,
  "tier-list": tier_list,
  "cutout-grid": cutout_grid,
  "comment-pin": comment_pin,
};

export const CATALOG = Object.fromEntries(Object.entries(EFFECTS).map(([k, m]) => [k, m.meta]));
