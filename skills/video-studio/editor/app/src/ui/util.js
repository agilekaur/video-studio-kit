export const FPS = 30;
export const fmt = (frames) => {
  const t = Math.max(0, (frames || 0) / FPS);
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};
export const fmtS = (sec) => fmt((sec || 0) * FPS);

// tiny pub/sub for the playhead so only subscribers re-render each frame
const subs = new Set();
let current = 0;
export const frameBus = {
  get: () => current,
  set: (f) => { current = f; subs.forEach((fn) => fn(f)); },
  sub: (fn) => { subs.add(fn); return () => subs.delete(fn); },
};

export const beatText = (project, b) => {
  const c = project.clips.find((c) => c.id === b.clip);
  if (!c) return "";
  return (c.words || []).slice(b.w0, b.w1 + 1).filter((w) => !w.cut).map((w) => w.w).join(" ");
};

export const keyWord = (txt) => {
  const stop = new Set("the a an and or but so to of in on for with is are was were be it this that i you we they my your our just really very can will have has not".split(" "));
  const c = String(txt || "").split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9']/g, "")).filter((w) => w && !stop.has(w.toLowerCase()));
  if (!c.length) return "";
  return [...c].sort((a, b) => (b.length >= 4) - (a.length >= 4) || b.length - a.length)[0].toUpperCase();
};
