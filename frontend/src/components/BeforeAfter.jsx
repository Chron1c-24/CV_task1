import { useEffect, useState } from "react";
import ImageCard from "./ImageCard.jsx";
import ImageHistogram from "./ImageHistogram.jsx";

/* Original vs result: side by side, or one image with a drag slider, with histograms under each photo. */
export default function BeforeAfter({ before, after, afterLabel }) {
  const [mode, setMode] = useState("side");
  const [split, setSplit] = useState(50); // percent of the width that shows the original
  const [beforeHist, setBeforeHist] = useState(null);
  const [afterHist, setAfterHist] = useState(null);

  useEffect(() => {
    if (!after) setAfterHist(null);
  }, [after]);

  return (
    <section className="panel before-after-panel">
      <div className="panel-head">
        <div className="panel-title-wrap">
          <h3>Before / After</h3>
          {beforeHist?.stats && afterHist?.stats && (
            <div className="panel-diff-badge" title="Intensity shift between Before and After">
              <span>Δμ: {(afterHist.stats.mean - beforeHist.stats.mean > 0 ? "+" : "") + (afterHist.stats.mean - beforeHist.stats.mean).toFixed(1)}</span>
              <span>Δσ: {(afterHist.stats.std - beforeHist.stats.std > 0 ? "+" : "") + (afterHist.stats.std - beforeHist.stats.std).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="toggle">
          <button
            type="button"
            className={mode === "side" ? "active" : ""}
            onClick={() => setMode("side")}
          >
            Side by side
          </button>
          <button
            type="button"
            className={mode === "slider" ? "active" : ""}
            onClick={() => setMode("slider")}
            disabled={!after}
          >
            Slider
          </button>
        </div>
      </div>

      {mode === "slider" && after ? (
        <div className="slider-mode-wrap">
          <div className="slider">
            <img src={after} alt={afterLabel} className="slider-base" />
            <img
              src={before}
              alt="Original"
              className="slider-top"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div className="slider-line" style={{ left: `${split}%` }} />
            <span className="slider-tag left">Original</span>
            <span className="slider-tag right">{afterLabel}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Before / after split"
            />
          </div>

          {/* Histograms under the slider */}
          <div className="grid two slider-hist-grid">
            <figure className="card">
              <figcaption>Original Histogram</figcaption>
              <ImageHistogram
                src={before}
                onDataLoaded={setBeforeHist}
              />
            </figure>
            <figure className="card">
              <figcaption>{afterLabel} Histogram</figcaption>
              <ImageHistogram
                src={after}
                baselineData={beforeHist}
                onDataLoaded={setAfterHist}
              />
            </figure>
          </div>
        </div>
      ) : (
        <div className="grid two">
          <ImageCard
            title="Original"
            src={before}
            onHistogramLoaded={setBeforeHist}
          />
          <ImageCard
            title={afterLabel}
            src={after}
            placeholder="Press Apply to see the result"
            baselineData={beforeHist}
            onHistogramLoaded={setAfterHist}
          />
        </div>
      )}
    </section>
  );
}
