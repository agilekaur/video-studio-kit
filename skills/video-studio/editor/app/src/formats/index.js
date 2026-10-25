// Reel formats: one recipe per format (layout, captions, grade, pace and the beat -> effect map).
// The planner (editor/vs/planner.py) reads the same JSON files. Add a new format here and as <id>.json.
import founderStory from "./founder-story.json";
import businessReel from "./business-reel.json";
import caseStudy from "./case-study.json";
import listicle from "./listicle.json";
import toolDemo from "./tool-demo.json";
import visualEssay from "./visual-essay.json";
import panelExplainer from "./panel-explainer.json";
import glassExplainer from "./glass-explainer.json";
import splitDiagram from "./split-diagram.json";
import fittedCaptions from "./fitted-captions.json";
import tierList from "./tier-list.json";
import cutoutGrid from "./cutout-grid.json";
import teardown from "./teardown.json";
import promptReel from "./prompt-reel.json";
import replyToComment from "./reply-to-comment.json";
import newsroom from "./newsroom.json";

export const FORMATS = [founderStory, businessReel, caseStudy, listicle, toolDemo, visualEssay, panelExplainer, glassExplainer, splitDiagram, fittedCaptions, tierList, cutoutGrid, teardown, promptReel, replyToComment, newsroom].sort((a, b) => a.order - b.order);
export const FORMAT_BY_ID = Object.fromEntries(FORMATS.map((f) => [f.id, f]));
