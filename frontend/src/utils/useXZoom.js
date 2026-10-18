import { useCallback, useRef, useState } from "react";

/* Nice round tick values inside [lo, hi] (0, 2, 4, 6 ... then 0, 1, 2, 3 ... when zoomed in). */
export function niceTicks(lo, hi, target = 5) {
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = Math.max(1, (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag);
  const ticks = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) ticks.push(Math.round(t));
  return ticks;
}

/*
 * X-axis zoom for the SVG charts.
 *   mouse wheel = zoom around the cursor, drag = pan, double-click = reset.
 * fullMax = right end of the full x range (full view is [0, fullMax]).
 */
export function useXZoom({ fullMax, plotLeft, plotW, viewW, minSpan = 8 }) {
  const [view, setView] = useState([0, fullMax]);
  const viewRef = useRef(view);
  viewRef.current = view;
  const cfg = useRef({});
  cfg.current = { fullMax, plotLeft, plotW, viewW, minSpan };
  const nodeRef = useRef(null);
  const wheelRef = useRef(null);
  const drag = useRef(null);

  const clamp = ([lo, hi]) => {
    const c = cfg.current;
    const span = Math.min(Math.max(hi - lo, c.minSpan), c.fullMax);
    const start = Math.min(Math.max(lo, 0), c.fullMax - span);
    return [start, start + span];
  };

  // x position inside the plot as 0..1
  const fracAt = (clientX) => {
    const c = cfg.current;
    const rect = nodeRef.current.getBoundingClientRect();
    return (((clientX - rect.left) / rect.width) * c.viewW - c.plotLeft) / c.plotW;
  };

  if (!wheelRef.current) {
    wheelRef.current = (e) => {
      e.preventDefault(); // wheel zooms the chart instead of scrolling the page
      const [lo, hi] = viewRef.current;
      const f = Math.min(Math.max(fracAt(e.clientX), 0), 1);
      const m = lo + f * (hi - lo);
      const k = e.deltaY < 0 ? 0.8 : 1.25; // zoom in / out
      setView(clamp([m - (m - lo) * k, m + (hi - m) * k]));
    };
  }

  // callback ref: the svg may mount late (after the histogram loads), so attach the listener here
  const svgRef = useCallback((el) => {
    nodeRef.current?.removeEventListener("wheel", wheelRef.current);
    nodeRef.current = el;
    el?.addEventListener("wheel", wheelRef.current, { passive: false });
  }, []);

  const [lo, hi] = view;
  const zoomed = lo > 0 || hi < fullMax;

  return {
    svgRef, lo, hi, zoomed,
    reset: () => setView([0, fullMax]),
    binAt: (clientX) => lo + fracAt(clientX) * (hi - lo),
    onMouseDown: (e) => { drag.current = { x: e.clientX, lo, hi }; },
    endDrag: () => { drag.current = null; },
    dragMove: (e) => {
      const d = drag.current;
      if (!d || !zoomed) return false;
      const shift = -((e.clientX - d.x) / nodeRef.current.getBoundingClientRect().width) * (cfg.current.viewW / cfg.current.plotW) * (d.hi - d.lo);
      setView(clamp([d.lo + shift, d.hi + shift]));
      return true;
    },
  };
}