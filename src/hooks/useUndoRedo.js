import { useRef, useCallback } from "react";

export function useUndoRedo() {
  const historyRef   = useRef([]);
  const futureRef    = useRef([]);
  const katmanSrcRef = useRef(null);
  const drawSrcRef   = useRef(null);

  const init = (ks, ds) => { katmanSrcRef.current = ks; drawSrcRef.current = ds; };

  const pushAdd = useCallback((feature, srcKey) => {
    historyRef.current.push({ type: "add", feature, srcKey });
    futureRef.current = [];
  }, []);

  const pushRemove = useCallback((feature, srcKey) => {
    historyRef.current.push({ type: "remove", feature, srcKey });
    futureRef.current = [];
  }, []);

  const undo = useCallback(() => {
    const last = historyRef.current.pop(); if (!last) return;
    futureRef.current.push(last);
    const src = katmanSrcRef.current?.[last.srcKey] || drawSrcRef.current; if (!src) return;
    if (last.type === "add")    src.removeFeature(last.feature);
    if (last.type === "remove") src.addFeature(last.feature);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop(); if (!next) return;
    historyRef.current.push(next);
    const src = katmanSrcRef.current?.[next.srcKey] || drawSrcRef.current; if (!src) return;
    if (next.type === "add")    src.addFeature(next.feature);
    if (next.type === "remove") src.removeFeature(next.feature);
  }, []);

  return { init, pushAdd, pushRemove, undo, redo };
}