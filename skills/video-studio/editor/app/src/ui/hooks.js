import { useEffect, useState } from "react";
import { frameBus } from "./util.js";

export function useFrame() {
  const [f, setF] = useState(frameBus.get());
  useEffect(() => frameBus.sub(setF), []);
  return f;
}

// re-render only when the derived value changes (e.g. "is this word playing now?")
export function useFrameSelect(fn, deps = []) {
  const [v, setV] = useState(() => fn(frameBus.get()));
  useEffect(() => {
    setV(fn(frameBus.get()));
    return frameBus.sub((f) => setV(fn(f)));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}
