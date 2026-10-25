import React, { useEffect, useState } from "react";

let push = () => {};
export function toast(msg, kind = "", ms = 4500, actions = []) { push({ id: Math.random(), msg, kind, ms, actions }); }

export function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => { push = (t) => setList((l) => [...l.slice(-3), t]); }, []);
  useEffect(() => {
    const timers = list.filter((t) => t.ms).map((t) => setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), t.ms));
    return () => timers.forEach(clearTimeout);
  }, [list]);
  return (
    <div className="toasts">
      {list.map((t) => (
        <div key={t.id} className={"toast " + t.kind}>
          <div>{t.msg}</div>
          <div className="row">
            {t.actions.map(([l, fn]) => <button key={l} className="btn ghost small" onClick={() => { fn(); setList((x) => x.filter((y) => y.id !== t.id)); }}>{l}</button>)}
            {!t.ms || t.actions.length ? <button className="btn ghost small" onClick={() => setList((x) => x.filter((y) => y.id !== t.id))}>Close</button> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
