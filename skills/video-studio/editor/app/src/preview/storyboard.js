// Browser version of the /video-studio storyboard (editor/vs/planner.py): split the transcript into beats,
// drop retakes and filler words, give each beat a purpose, and pick the best-fit effect under the pacing
// rules (one big effect per beat, 1.5 s between big effects, about one per 6.5 s, a strong hook, a CTA last).
// Only effects that look right without a speaker cutout or uploaded media are picked, since the preview
// runs in the browser.
import { CATALOG } from "../remotion/effects/index.js";
import { computeTimeline, isFiller } from "../remotion/timeline.js";

const LIST_CUES = /\b(first|second|third|fourth|step|steps|tips|ways|things|reasons|mistakes|rules|number one|number two|(\d+|two|three|four|five|six|seven) (things|ways|tips|steps|tools|apps|mistakes|lessons|rules|habits|signs))\b/i;
const GROWTH = /\b(grew|grow|growth|doubled|tripled|increase[sd]?|revenue|sales|leads|followers|views|subscribers|went from|up to|percent)\b|%|\$/i;
const NUMBER = /\d|%|\$|\b(hundred|thousand|million|billion|double|triple|half)\b/i;
const CTA = /\b(comment|follow|subscribe|link in|dm me|save this|share this|type)\b/i;
const TOOLS = /\b(chatgpt|claude|gemini|notion|zapier|make\.com|canva|figma|excel|sheets|slack|hubspot|xero|shopify|airtable|perplexity|midjourney|cursor|n8n|lovable|gpt|copilot|ai agent|agents?|app|tool|software|website|dashboard)\b/i;
const STOP = new Set("the a an and or but so to of in on for with is are was were be been it this that i you we they my your our just really very can will would could should do does did have has had not no yes if then than at by from as about into what when how why who which there here".split(" "));

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
const textOf = (words, b) => words.slice(b.w0, b.w1 + 1).filter((w) => !w.cut).map((w) => w.w).join(" ");

const stem = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(ies)$/, "y").replace(/([^s])s$/, "$1");
// The topic word: a word from this line that the whole script keeps coming back to (repeated nouns beat
// long adjectives), falling back to the longest strong word.
export function topicWord(text, freq) {
  const cands = String(text || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !STOP.has(w.toLowerCase()) && w.length >= 3);
  if (!cands.length) return "";
  const score = (w) => (freq[stem(w)] || 0) * 3 + (/^\d/.test(w) ? 4 : 0) + (/^[A-Z]/.test(w) ? 1 : 0) + Math.min(w.length, 10) * 0.1;
  return [...cands].sort((a, b) => score(b) - score(a))[0].toUpperCase();
}
export function topicFreq(text) {
  const f = {};
  String(text || "").split(/\s+/).forEach((w) => { const k = stem(w); if (k && !STOP.has(k) && k.length >= 3) f[k] = (f[k] || 0) + 1; });
  return f;
}

export function keyWord(text) {
  const c = String(text || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !STOP.has(w.toLowerCase()));
  return c.length ? [...c].sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0].toUpperCase() : "";
}

function similarity(a, b) {
  const grams = (s) => { const t = s.split(" "); const g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t[i] + " " + t[i + 1]); return g; };
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach((x) => { if (B.has(x)) n++; });
  return (2 * n) / (A.size + B.size);
}

function splitBeats(words) {
  const beats = [];
  let cur = [];
  words.forEach((w, i) => {
    if (cur.length) {
      const p = words[cur[cur.length - 1]];
      const span = w.e - words[cur[0]].s;
      if (/[.?!]$/.test(p.w) || w.s - p.e > 0.8 || (span > 6 && /[,;:]$/.test(p.w)) || span > 7.5) { beats.push(cur); cur = []; }
    }
    cur.push(i);
  });
  if (cur.length) beats.push(cur);
  const merged = [];
  for (const b of beats) {
    const dur = words[b[b.length - 1]].e - words[b[0]].s;
    const prev = merged[merged.length - 1];
    if (prev && dur < 1.2 && words[prev[prev.length - 1]].e - words[prev[0]].s < 4.5) merged[merged.length - 1] = prev.concat(b);
    else merged.push(b);
  }
  return merged.map((b) => [b[0], b[b.length - 1]]);
}

function classify(text, n, i, prev) {
  if (i === 0) return "hook";
  if (i === n - 1 && CTA.test(text)) return "cta"; // the last beat ends on a call to action only if it asks for one
  if (LIST_CUES.test(text) || text.split(/,|\band\b/).length >= 3) return "list";
  if (NUMBER.test(text)) return "proof";
  if (TOOLS.test(text)) return "tools";
  if (text.split(/\s+/).length <= 6 && (/!$/.test(text) || prev === "list" || prev === "proof")) return "punch";
  return "point";
}

const clauses = (text) => text.split(/[,;]|\band\b|\.\s/).map((s) => s.trim().replace(/[.!?]$/, "")).filter((s) => s.split(/\s+/).length >= 1 && s.length > 1);

// effect + params for a beat, browser-friendly picks only
export function pickEffect(purpose, text, freq = {}) {
  const words = text.split(/\s+/);
  if (purpose === "hook") return words.length <= 6 ? ["title-lockup", {}] : ["cover-story", { word: topicWord(text, freq) }];
  if (purpose === "cta") {
    const m = text.match(/\b(?:comment|type)\s+["']?([A-Za-z0-9]+)/i);
    return m ? ["outro-comment-ui", { keyword: m[1].toUpperCase(), handle: "you", reply: "Sent you the link" }] : ["kinetic-cta", {}];
  }
  if (purpose === "list") {
    const items = clauses(text).slice(1, 5);
    return items.length >= 2 ? ["checklist", { title: words.slice(0, 4).join(" ").replace(/[,.]$/, "").toUpperCase(), items }] : ["freeze-label", { labels: clauses(text).slice(0, 3) }];
  }
  if (purpose === "proof") return GROWTH.test(text) ? ["chart-grow", { label: "" }] : ["proof-pushin", {}];
  if (purpose === "tools") return ["mock-app-window", { title: keyWord(text), items: clauses(text).slice(0, 4) }];
  if (purpose === "punch") return ["spotlight", {}];
  return ["none", {}];
}

export const PURPOSE_LABEL = { hook: "Hook", point: "Point", list: "List", proof: "Proof", tools: "Tools", punch: "Punch line", cta: "Call to action" };

// words: [{w, s, e}] with real timings. Returns {beats, words} for a project.
export function storyboard(wordsIn, settings) {
  const words = wordsIn.map((w) => ({ ...w, cut: !!w.cut || isFiller(w.w) }));
  const spans = splitBeats(words);
  const beats = spans.map(([w0, w1], k) => ({
    id: "b" + k, clip: "c1", w0, w1, cut: false, purpose: "point", effect: "none", params: {},
    zoom: 1, speed: 1, ramp: null, freeze: 0, volume: 1, transition: "cut", note: "",
  }));
  // retakes: a line said again soon after keeps the later take
  const texts = beats.map((b) => norm(textOf(words, b)));
  texts.forEach((t, i) => {
    if (t.split(" ").length < 3) return;
    for (let j = i + 1; j < Math.min(i + 5, beats.length); j++) {
      if (texts[j].split(" ").length >= 3 && similarity(t, texts[j]) > 0.6) { beats[i].cut = true; beats[i].note = "Retake"; break; }
    }
  });
  const live = beats.filter((b) => !b.cut);
  const freq = topicFreq(words.filter((w) => !w.cut).map((w) => w.w).join(" "));
  let prev = null;
  live.forEach((b, i) => {
    const t = textOf(words, b);
    b.purpose = classify(t, live.length, i, prev);
    prev = b.purpose;
    const [eff, params] = pickEffect(b.purpose, t, freq);
    b.effect = eff;
    b.params = params;
    b.zoom = eff === "none" && i % 2 === 1 ? 1.1 : 1;
  });
  enforcePacing({ clips: [{ id: "c1", proxy: "x", duration: 1e6, words }], beats, settings });
  return { beats, words };
}

function enforcePacing(project) {
  const tl = computeTimeline(project);
  const dur = tl.durationInFrames / 30;
  const budget = Math.max(3, Math.round(dur / 6.5));
  const t = Object.fromEntries(tl.beats.map((b) => [b.id, b]));
  const prio = { hook: 0, cta: 1, list: 2, proof: 3, tools: 4, punch: 5, point: 6 };
  const big = project.beats.filter((b) => !b.cut && CATALOG[b.effect] && CATALOG[b.effect].big).sort((a, b) => prio[a.purpose] - prio[b.purpose]);
  const kept = [];
  for (const b of big) {
    const x = t[b.id];
    const clash = kept.some((k) => { const y = t[k.id]; return !(x.from >= y.from + y.frames + 45 || x.from + x.frames + 45 <= y.from); });
    if (clash || kept.length >= budget) { b.effect = "none"; b.params = {}; b.zoom = 1.1; }
    else kept.push(b);
  }
}
