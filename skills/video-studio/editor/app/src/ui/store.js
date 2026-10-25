// App state: the project JSON + undo/redo history + debounced autosave.
// The server owns job fields (clip status, transcripts, cutouts, media processing); the app owns the edit.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export async function api(method, url, body, isForm = false) {
  const r = await fetch(url, {
    method,
    headers: body && !isForm ? { "content-type": "application/json" } : {},
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("json") ? await r.json() : null;
  if (!r.ok) throw new Error((data && data.error) || `${r.status} ${r.statusText}`);
  return data;
}

export const uid = () => Math.random().toString(16).slice(2, 10);
const clone = (x) => (typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x)));

// Bring server job state into the local edit without losing local edits.
export function mergeServer(local, server) {
  if (!local || local.id !== server.id) return server;
  const out = { ...local, media: server.media, last_export: server.last_export, last_preview: server.last_preview };
  const lc = Object.fromEntries(local.clips.map((c) => [c.id, c]));
  out.clips = server.clips.map((sc) => {
    const l = lc[sc.id];
    if (l && l.words && sc.words && l.words.length === sc.words.length && l.words.length) return { ...sc, words: l.words };
    return sc;
  });
  const order = local.clips.map((c) => c.id);
  out.clips.sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));
  // beats for clips that just finished transcribing come from the server
  const localClipsWithBeats = new Set(local.beats.map((b) => b.clip));
  const fresh = server.beats.filter((b) => !localClipsWithBeats.has(b.clip));
  const known = new Set(server.clips.map((c) => c.id));
  out.beats = [...local.beats.filter((b) => known.has(b.clip)), ...fresh];
  const ids = out.clips.map((c) => c.id);
  out.beats.sort((a, b) => ids.indexOf(a.clip) - ids.indexOf(b.clip) || 0);
  // keep beats in their local order within a clip, new ones appended by word index
  return out;
}

export function useProject() {
  const [project, setProject] = useState(null);
  const [brand, setBrand] = useState(null);
  const [saveState, setSaveState] = useState("");
  const hist = useRef({ past: [], future: [] });
  const saveTimer = useRef(null);
  const pending = useRef(false);
  const projRef = useRef(null);
  projRef.current = project;

  const flush = useCallback(async () => {
    const p = projRef.current;
    if (!p) return;
    pending.current = false;
    setSaveState("Saving…");
    try {
      const words = Object.fromEntries(p.clips.map((c) => [c.id, (c.words || []).map((w) => ({ w: w.w, cut: !!w.cut }))]));
      const res = await api("PUT", `/api/projects/${p.id}`, {
        name: p.name, settings: p.settings, beats: p.beats, items: p.items || [], words, clip_order: p.clips.map((c) => c.id),
      });
      setBrand(res.brand);
      setSaveState("Saved");
    } catch (e) {
      setSaveState("Save failed: " + e.message);
    }
  }, []);

  const scheduleSave = useCallback(() => {
    pending.current = true;
    setSaveState("Editing…");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 450);
  }, [flush]);

  // mutate(fn, {history}) : fn receives a draft clone and edits it in place
  const mutate = useCallback((fn, { history = true } = {}) => {
    setProject((cur) => {
      if (!cur) return cur;
      const draft = clone(cur);
      fn(draft);
      // bursts (slider drags, typing) collapse into one undo step
      const now = Date.now();
      if (history && now - (hist.current.last || 0) > 600) {
        hist.current.past.push(cur);
        if (hist.current.past.length > 150) hist.current.past.shift();
        hist.current.future = [];
      }
      if (history) hist.current.last = now;
      return draft;
    });
    scheduleSave();
  }, [scheduleSave]);

  const undo = useCallback(() => {
    const h = hist.current;
    if (!h.past.length) return;
    setProject((cur) => { h.future.push(cur); return h.past.pop(); });
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const h = hist.current;
    if (!h.future.length) return;
    setProject((cur) => { h.past.push(cur); return h.future.pop(); });
    scheduleSave();
  }, [scheduleSave]);

  const open = useCallback(async (pid) => {
    clearTimeout(saveTimer.current);
    if (pending.current) await flush();
    const res = await api("GET", `/api/projects/${pid}`);
    hist.current = { past: [], future: [] };
    setProject(res.project);
    setBrand(res.brand);
    setSaveState("");
    location.hash = "p=" + encodeURIComponent(pid);
    return res;
  }, [flush]);

  // Replace from a server response (uploads, re-plan, jobs). Re-plan style calls pass replace=true.
  const fromServer = useCallback((res, { replace = false } = {}) => {
    setBrand(res.brand);
    setProject((cur) => {
      if (replace && cur) hist.current.past.push(cur);
      return replace ? res.project : mergeServer(cur, res.project);
    });
  }, []);

  // poll while server jobs run
  const busy = useMemo(() => !!project && (
    project.clips.some((c) => ["queued", "ingesting", "transcribing"].includes(c.status) || ["queued", "running"].includes(c.matte_status)) ||
    (project.media || []).some((m) => m.status === "processing")), [project]);
  useEffect(() => {
    if (!busy || !project) return;
    const t = setInterval(async () => {
      try {
        const res = await api("GET", `/api/projects/${project.id}`);
        fromServer(res);
      } catch (e) { /* server restarting */ }
    }, 1500);
    return () => clearInterval(t);
  }, [busy, project && project.id, fromServer]);

  useEffect(() => {
    const h = (e) => { if (pending.current) { flush(); e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [flush]);

  return {
    project, brand, setBrand, saveState, mutate, undo, redo, open, fromServer, flush,
    canUndo: hist.current.past.length > 0, canRedo: hist.current.future.length > 0,
  };
}
