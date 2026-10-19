import { useState } from "react";

/*
 * Like useState, but the value lives in the parent (App), so it survives when the view unmounts
 * (switching task or Preview <-> Compare).
 * saved: the stored value (undefined the first time) · onSave(updater): parent setter for this key.
 * The setter only takes an updater function: setState((prev) => next).
 */
export function useSaved(saved, onSave, makeInitial) {
  const [initial] = useState(makeInitial); // stable until the first save
  const setState = (updater) => onSave((prev = initial) => updater(prev));
  return [saved ?? initial, setState];
}
