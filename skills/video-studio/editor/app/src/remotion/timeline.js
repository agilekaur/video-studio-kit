// Output timeline, shared by the in-app Player and the Remotion export.
// Everything is in frames so preview and render can never drift apart.

export const FPS = 30;
export const W = 1080;
export const H = 1920;
const PAD_IN = 0.06;
const PAD_OUT = 0.1;
export const FILLERS = new Set(["um", "uh", "uhm", "umm", "erm", "er", "ah", "hmm", "mm", "mhm"]);

export const isFiller = (w) => FILLERS.has(String(w).toLowerCase().replace(/[^a-z]/g, ""));

// rate for a beat at local progress p (0..1)
function rateAt(beat, tighten, p) {
  const a = (+beat.speed || 1) * tighten;
  if (!beat.ramp || !beat.ramp.to) return a;
  const b = (+beat.ramp.to || 1) * tighten;
  const ease = beat.ramp.ease === "linear" ? p : p * p * (3 - 2 * p);
  return a + (b - a) * ease;
}

export function computeTimeline(project) {
  const st = project.settings || {};
  const fps = FPS;
  const maxGap = +st.max_gap || 0.4;
  const tighten = +st.tighten || 1;
  const clips = Object.fromEntries((project.clips || []).map((c) => [c.id, c]));
  const segments = [];
  const beats = [];
  const words = [];
  let frame = 0;
  const lastEnd = {};

  for (const b of project.beats || []) {
    const info = { id: b.id, from: frame, frames: 0 };
    beats.push(info);
    const clip = clips[b.clip];
    if (!clip || b.cut || !clip.proxy) continue;
    const ws = clip.words || [];
    const idx = [];
    for (let i = b.w0; i <= b.w1; i++) if (ws[i] && !ws[i].cut) idx.push(i);
    if (!idx.length) continue;

    // runs of kept words separated by cuts or long pauses
    const runs = [];
    let cur = [idx[0]];
    for (const i of idx.slice(1)) {
      const p = cur[cur.length - 1];
      if (i === p + 1 && ws[i].s - ws[p].e <= maxGap) cur.push(i);
      else { runs.push(cur); cur = [i]; }
    }
    runs.push(cur);
    const raw = [];
    for (const run of runs) {
      const a = run[0], z = run[run.length - 1];
      let s = ws[a].s - PAD_IN;
      let e = ws[z].e + PAD_OUT;
      if (a > 0) s = Math.max(s, Math.min(ws[a - 1].e, ws[a].s));
      if (z + 1 < ws.length) e = Math.min(e, Math.max(ws[z + 1].s, ws[z].e));
      const le = lastEnd[clip.id];
      if (le != null && s < le && le <= ws[a].s) s = le;
      s = Math.max(0, s);
      e = Math.min(clip.duration || 1e9, e);
      if (e - s >= 2 / fps) raw.push({ s, e, run });
      lastEnd[clip.id] = e;
    }
    const srcTotal = raw.reduce((n, r) => n + (r.e - r.s), 0) || 1;
    const ramped = !!(b.ramp && b.ramp.to);
    let srcDone = 0;
    for (const r of raw) {
      // a ramp is played as short constant-rate steps (about 1/4 s of source each)
      const steps = ramped ? Math.max(1, Math.round((r.e - r.s) / 0.25)) : 1;
      const stepLen = (r.e - r.s) / steps;
      for (let k = 0; k < steps; k++) {
        const s = r.s + k * stepLen;
        const e = s + stepLen;
        const p = (srcDone + (k + 0.5) * stepLen) / srcTotal;
        const rate = rateAt(b, tighten, p);
        const frames = Math.max(1, Math.round(((e - s) * fps) / rate));
        const seg = { kind: "video", clip: clip.id, s, e, rate, from: frame, frames, beat: b.id, volume: b.volume ?? 1 };
        segments.push(seg);
        for (const i of r.run) {
          const w = ws[i];
          if (w.s >= s - 1e-6 && w.s < e + 1e-6 && !(k < steps - 1 && w.s >= e)) {
            const of = frame + ((Math.max(w.s, s) - s) * fps) / rate;
            const oe = Math.min(frame + frames, frame + ((Math.min(w.e, r.e) - s) * fps) / rate);
            words.push({ clip: clip.id, i, text: w.w, from: of, to: Math.max(oe, of + 2), beat: b.id });
          }
        }
        frame += frames;
      }
      srcDone += r.e - r.s;
    }
    if (+b.freeze > 0 && raw.length) {
      const last = raw[raw.length - 1];
      const frames = Math.round(+b.freeze * fps);
      segments.push({ kind: "freeze", clip: clip.id, s: Math.max(0, last.e - 1 / fps), e: last.e, rate: 1, from: frame, frames, beat: b.id, volume: 0 });
      frame += frames;
    }
    info.frames = frame - info.from;
  }
  // words may be pushed twice when a ramp step boundary lands exactly on a word start; keep the first
  const seen = new Set();
  const uniq = words.filter((w) => { const k = w.clip + ":" + w.i; if (seen.has(k)) return false; seen.add(k); return true; });
  uniq.sort((a, b) => a.from - b.from);
  return { fps, segments, beats, words: uniq, chunks: captionChunks(uniq, +st.caption_words || 3), durationInFrames: Math.max(frame, 1) };
}

export function captionChunks(words, maxWords = 3) {
  const out = [];
  let cur = [];
  words.forEach((w, k) => {
    if (cur.length) {
      const p = words[cur[cur.length - 1]];
      if (cur.length >= maxWords || /[.?!,;:]$/.test(p.text.trim()) || w.from - p.to > 9 || w.beat !== p.beat) { out.push(cur); cur = []; }
    }
    cur.push(k);
  });
  if (cur.length) out.push(cur);
  return out.map((c, n) => {
    const s = words[c[0]].from;
    let e = words[c[c.length - 1]].to + 10;
    if (n + 1 < out.length) e = Math.min(e, words[out[n + 1][0]].from);
    return { words: c, from: s, to: Math.max(e, words[c[c.length - 1]].to) };
  });
}

export const beatAtFrame = (tl, f) => tl.beats.find((b) => b.frames > 0 && b.from <= f && f < b.from + b.frames) || null;

// Pacing checks from SKILL.md section 3, computed on the real (speed-adjusted) timeline.
export function pacingWarnings(project, tl, catalog, pace = {}) {
  const out = [];
  const minGap = pace.min_gap || 1.5, every = pace.big_every || 6.5;
  const big = (id) => !!(catalog[id] && catalog[id].big);
  const times = Object.fromEntries(tl.beats.map((b) => [b.id, b]));
  const live = (project.beats || []).filter((b) => !b.cut && times[b.id] && times[b.id].frames > 0);
  const bigs = live.filter((b) => big(b.effect) && !(pace.exempt || []).includes(b.effect));
  for (let i = 1; i < bigs.length; i++) {
    const a = times[bigs[i - 1].id], b = times[bigs[i].id];
    const gap = (b.from - (a.from + a.frames)) / FPS;
    if (gap < minGap) out.push({ beat: bigs[i].id, msg: `Only ${Math.max(gap, 0).toFixed(1)}s after the previous big effect (min ${minGap}s)` });
  }
  const dur = tl.durationInFrames / FPS;
  const budget = Math.max(3, Math.round(dur / every));
  if (bigs.length > budget) out.push({ beat: null, msg: `${bigs.length} big effects in ${dur.toFixed(0)}s; aim for ${budget} or fewer` });
  if (live.length && live[0].effect === "none" && (+live[0].zoom || 1) <= 1) out.push({ beat: live[0].id, msg: "Hook has no effect or punch in" });
  for (const b of live) {
    const e = catalog[b.effect];
    if (e && e.needs && e.needs.includes("cutout")) {
      const c = (project.clips || []).find((c) => c.id === b.clip);
      if (!c || c.matte_status !== "ready") out.push({ beat: b.id, msg: `${e.name} needs a speaker cutout for this clip (Prepare cutout)` });
    }
    if (e && e.needs && e.needs.includes("media") && !(b.params && b.params.media)) out.push({ beat: b.id, msg: `${e.name} needs a media file from the bin` });
  }
  return out;
}
